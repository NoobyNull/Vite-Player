const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const yauzl = require('yauzl');
const Logger = require('./Logger');

class AppManager extends EventEmitter {
    constructor() {
        super();
        this.apps = new Map();
        this.runningProcesses = new Map();
        this.usedPorts = new Set();
        this.logger = new Logger();
        this.settings = {
            portRange: { min: 3000, max: 3999 },
            maxApps: 5,
            autoStart: true,
            mode: 'single' // single, multi, hybrid
        };
        this.appsDir = path.join(__dirname, '..', '..', 'apps');
        this.uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        this.configFile = path.join(__dirname, '..', '..', 'config', 'apps.json');
    }

    async init() {
        try {
            await this.loadAppsConfig();
            await this.cleanupStaleProcesses();
            this.logger.info('AppManager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize AppManager:', error);
        }
    }

    async loadAppsConfig() {
        try {
            const data = await fs.readFile(this.configFile, 'utf8');
            const config = JSON.parse(data);
            
            if (config.apps) {
                for (const app of config.apps) {
                    this.apps.set(app.id, { ...app, status: 'stopped', port: null });
                }
            }
            
            if (config.settings) {
                this.settings = { ...this.settings, ...config.settings };
                // Parse port range if it's a string
                if (typeof this.settings.portRange === 'string') {
                    const [min, max] = this.settings.portRange.split('-').map(Number);
                    this.settings.portRange = { min, max };
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.logger.warn('Failed to load apps config:', error.message);
            }
            // File doesn't exist, start fresh
            await this.saveAppsConfig();
        }
    }

    async saveAppsConfig() {
        const config = {
            apps: Array.from(this.apps.values()),
            settings: this.settings,
            lastUpdated: new Date().toISOString()
        };

        try {
            await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
        } catch (error) {
            this.logger.error('Failed to save apps config:', error);
        }
    }

    async installApp(zipFilePath, originalName) {
        const appId = uuidv4();
        const appDir = path.join(this.appsDir, appId);
        
        try {
            // Create app directory
            await fs.mkdir(appDir, { recursive: true });
            
            // Extract ZIP file
            const appInfo = await this.extractZipFile(zipFilePath, appDir);
            
            // Validate Vite application
            await this.validateViteApp(appDir);
            
            // Create app metadata
            const app = {
                id: appId,
                name: appInfo.name || this.sanitizeName(originalName),
                version: appInfo.version || '1.0.0',
                description: appInfo.description || '',
                framework: 'Vite',
                path: appDir,
                status: 'stopped',
                port: null,
                createdAt: new Date().toISOString(),
                size: await this.getDirectorySize(appDir)
            };

            // Install dependencies
            await this.installDependencies(appDir);
            
            // Add to apps collection
            this.apps.set(appId, app);
            await this.saveAppsConfig();
            
            // Clean up uploaded file
            try {
                await fs.unlink(zipFilePath);
            } catch (error) {
                this.logger.warn('Failed to clean up uploaded file:', error.message);
            }
            
            this.emit('app_installed', app);
            this.logger.info(`App installed successfully: ${app.name} (${appId})`);
            
            return app;
            
        } catch (error) {
            // Clean up on failure
            try {
                await fs.rmdir(appDir, { recursive: true });
            } catch (cleanupError) {
                this.logger.warn('Failed to cleanup failed installation:', cleanupError.message);
            }
            
            throw error;
        }
    }

    async extractZipFile(zipPath, extractDir) {
        return new Promise((resolve, reject) => {
            yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
                if (err) return reject(err);

                let appInfo = {};
                let extractedFiles = 0;

                zipfile.readEntry();
                
                zipfile.on('entry', async (entry) => {
                    try {
                        if (/\/$/.test(entry.fileName)) {
                            // Directory entry
                            const dirPath = path.join(extractDir, entry.fileName);
                            await fs.mkdir(dirPath, { recursive: true });
                            zipfile.readEntry();
                        } else {
                            // File entry
                            const filePath = path.join(extractDir, entry.fileName);
                            const fileDir = path.dirname(filePath);
                            
                            // Ensure directory exists
                            await fs.mkdir(fileDir, { recursive: true });
                            
                            zipfile.openReadStream(entry, (err, readStream) => {
                                if (err) return reject(err);
                                
                                const writeStream = require('fs').createWriteStream(filePath);
                                
                                writeStream.on('close', async () => {
                                    extractedFiles++;
                                    
                                    // Parse package.json if found
                                    if (entry.fileName.endsWith('package.json')) {
                                        try {
                                            const packageData = await fs.readFile(filePath, 'utf8');
                                            const packageJson = JSON.parse(packageData);
                                            appInfo = {
                                                name: packageJson.name,
                                                version: packageJson.version,
                                                description: packageJson.description
                                            };
                                        } catch (error) {
                                            this.logger.warn('Failed to parse package.json:', error.message);
                                        }
                                    }
                                    
                                    zipfile.readEntry();
                                });
                                
                                writeStream.on('error', reject);
                                readStream.on('error', reject);
                                readStream.pipe(writeStream);
                            });
                        }
                    } catch (error) {
                        reject(error);
                    }
                });

                zipfile.on('end', () => {
                    if (extractedFiles === 0) {
                        reject(new Error('No files were extracted from the ZIP archive'));
                    } else {
                        resolve(appInfo);
                    }
                });

                zipfile.on('error', reject);
            });
        });
    }

    async validateViteApp(appDir) {
        // Check for package.json
        const packageJsonPath = path.join(appDir, 'package.json');
        let packageJson;
        
        try {
            const packageData = await fs.readFile(packageJsonPath, 'utf8');
            packageJson = JSON.parse(packageData);
        } catch (error) {
            throw new Error('Invalid Vite app: package.json not found or invalid');
        }

        // Check for Vite dependency
        const dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
        };

        if (!dependencies.vite) {
            throw new Error('Invalid Vite app: vite dependency not found');
        }

        // Check for common Vite files
        const viteFiles = ['vite.config.js', 'vite.config.ts'];
        const hasViteConfig = await Promise.all(
            viteFiles.map(async (file) => {
                try {
                    await fs.access(path.join(appDir, file));
                    return true;
                } catch {
                    return false;
                }
            })
        );

        if (!hasViteConfig.some(exists => exists)) {
            this.logger.warn('Vite config file not found, but proceeding anyway');
        }

        // Check for index.html
        try {
            await fs.access(path.join(appDir, 'index.html'));
        } catch {
            throw new Error('Invalid Vite app: index.html not found');
        }
    }

    async installDependencies(appDir) {
        return new Promise((resolve, reject) => {
            const npm = spawn('npm', ['install'], {
                cwd: appDir,
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            npm.stdout.on('data', (data) => {
                output += data.toString();
            });

            npm.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            npm.on('close', (code) => {
                if (code === 0) {
                    this.logger.info('Dependencies installed successfully');
                    resolve();
                } else {
                    this.logger.error('Failed to install dependencies:', errorOutput);
                    reject(new Error(`npm install failed with code ${code}: ${errorOutput}`));
                }
            });

            npm.on('error', (error) => {
                this.logger.error('Failed to spawn npm process:', error);
                reject(error);
            });
        });
    }

    async startApp(appId) {
        const app = this.apps.get(appId);
        if (!app) {
            throw new Error('App not found');
        }

        if (app.status === 'running') {
            throw new Error('App is already running');
        }

        // Check mode restrictions
        if (this.settings.mode === 'single') {
            await this.stopAllApps();
        } else if (this.getRunningAppsCount() >= this.settings.maxApps) {
            throw new Error(`Maximum number of concurrent apps (${this.settings.maxApps}) reached`);
        }

        // Find available port
        const port = await this.findAvailablePort();
        
        try {
            // Start Vite dev server
            const viteProcess = spawn('npm', ['run', 'dev', '--', '--port', port.toString(), '--host', '0.0.0.0'], {
                cwd: app.path,
                stdio: 'pipe'
            });

            let startupOutput = '';
            let isStarted = false;

            // Handle process output
            viteProcess.stdout.on('data', (data) => {
                const output = data.toString();
                startupOutput += output;
                
                // Check if Vite has started successfully
                if (output.includes('Local:') || output.includes('ready in')) {
                    if (!isStarted) {
                        isStarted = true;
                        app.status = 'running';
                        app.port = port;
                        this.runningProcesses.set(appId, viteProcess);
                        this.usedPorts.add(port);
                        this.saveAppsConfig();
                        this.emit('app_status_changed', appId, 'running', port);
                        this.logger.info(`App started: ${app.name} on port ${port}`);
                    }
                }
            });

            viteProcess.stderr.on('data', (data) => {
                const errorOutput = data.toString();
                startupOutput += errorOutput;
                this.logger.warn(`App ${app.name} stderr:`, errorOutput);
            });

            viteProcess.on('close', (code) => {
                this.logger.info(`App ${app.name} process exited with code ${code}`);
                this.runningProcesses.delete(appId);
                this.usedPorts.delete(port);
                app.status = 'stopped';
                app.port = null;
                this.saveAppsConfig();
                this.emit('app_status_changed', appId, 'stopped');
            });

            viteProcess.on('error', (error) => {
                this.logger.error(`Failed to start app ${app.name}:`, error);
                this.runningProcesses.delete(appId);
                this.usedPorts.delete(port);
                app.status = 'stopped';
                app.port = null;
                this.saveAppsConfig();
                this.emit('app_status_changed', appId, 'stopped');
            });

            // Wait for startup or timeout
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    if (!isStarted) {
                        viteProcess.kill();
                        reject(new Error('App startup timeout'));
                    }
                }, 30000); // 30 second timeout

                const checkStartup = setInterval(() => {
                    if (isStarted) {
                        clearInterval(checkStartup);
                        clearTimeout(timeout);
                        resolve();
                    }
                }, 1000);
            });

            return { port, status: 'running' };

        } catch (error) {
            this.usedPorts.delete(port);
            app.status = 'stopped';
            app.port = null;
            throw error;
        }
    }

    async stopApp(appId) {
        const app = this.apps.get(appId);
        if (!app) {
            throw new Error('App not found');
        }

        const process = this.runningProcesses.get(appId);
        if (!process) {
            app.status = 'stopped';
            app.port = null;
            return;
        }

        // Graceful shutdown
        process.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
            if (this.runningProcesses.has(appId)) {
                process.kill('SIGKILL');
            }
        }, 5000);

        this.runningProcesses.delete(appId);
        if (app.port) {
            this.usedPorts.delete(app.port);
        }
        
        app.status = 'stopped';
        app.port = null;
        await this.saveAppsConfig();
        this.emit('app_status_changed', appId, 'stopped');
        
        this.logger.info(`App stopped: ${app.name}`);
    }

    async deleteApp(appId) {
        const app = this.apps.get(appId);
        if (!app) {
            throw new Error('App not found');
        }

        // Stop app if running
        if (app.status === 'running') {
            await this.stopApp(appId);
        }

        // Delete app directory
        try {
            await fs.rmdir(app.path, { recursive: true });
        } catch (error) {
            this.logger.warn(`Failed to delete app directory: ${error.message}`);
        }

        // Remove from apps collection
        this.apps.delete(appId);
        await this.saveAppsConfig();
        
        this.emit('app_deleted', appId);
        this.logger.info(`App deleted: ${app.name}`);
    }

    async stopAllApps() {
        const runningApps = Array.from(this.apps.values()).filter(app => app.status === 'running');
        
        for (const app of runningApps) {
            try {
                await this.stopApp(app.id);
            } catch (error) {
                this.logger.error(`Failed to stop app ${app.name}:`, error);
            }
        }
    }

    async findAvailablePort() {
        const { min, max } = this.settings.portRange;
        
        for (let port = min; port <= max; port++) {
            if (!this.usedPorts.has(port)) {
                // Double-check if port is actually available
                const isAvailable = await this.isPortAvailable(port);
                if (isAvailable) {
                    return port;
                }
            }
        }
        
        throw new Error('No available ports in the specified range');
    }

    async isPortAvailable(port) {
        return new Promise((resolve) => {
            const net = require('net');
            const server = net.createServer();
            
            server.listen(port, () => {
                server.once('close', () => resolve(true));
                server.close();
            });
            
            server.on('error', () => resolve(false));
        });
    }

    async cleanupStaleProcesses() {
        // Reset all apps to stopped status on startup
        for (const app of this.apps.values()) {
            if (app.status === 'running') {
                app.status = 'stopped';
                app.port = null;
            }
        }
        this.usedPorts.clear();
        await this.saveAppsConfig();
    }

    async getDirectorySize(dir) {
        const stats = await fs.stat(dir);
        if (stats.isFile()) {
            return this.formatBytes(stats.size);
        }

        let size = 0;
        const files = await fs.readdir(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const fileStats = await fs.stat(filePath);
            
            if (fileStats.isDirectory()) {
                const subSize = await this.getDirectorySize(filePath);
                size += this.parseBytes(subSize);
            } else {
                size += fileStats.size;
            }
        }
        
        return this.formatBytes(size);
    }

    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
    }

    parseBytes(sizeStr) {
        const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB)$/);
        if (!match) return 0;
        
        const [, num, unit] = match;
        const multipliers = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
        return parseFloat(num) * multipliers[unit];
    }

    sanitizeName(filename) {
        return path.basename(filename, '.zip')
            .replace(/[^a-zA-Z0-9\-_\s]/g, '')
            .trim() || 'Untitled App';
    }

    // Getters
    getAllApps() {
        return Array.from(this.apps.values());
    }

    getApp(appId) {
        return this.apps.get(appId);
    }

    getAppsCount() {
        return this.apps.size;
    }

    getRunningAppsCount() {
        return Array.from(this.apps.values()).filter(app => app.status === 'running').length;
    }

    getUsedPorts() {
        return Array.from(this.usedPorts);
    }

    getSettings() {
        return { ...this.settings };
    }

    async updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Parse port range if it's a string
        if (typeof this.settings.portRange === 'string') {
            const [min, max] = this.settings.portRange.split('-').map(Number);
            this.settings.portRange = { min, max };
        }
        
        await this.saveAppsConfig();
        this.logger.info('Settings updated:', this.settings);
    }
}

module.exports = AppManager;