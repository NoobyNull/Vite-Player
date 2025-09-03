const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Validate GitHub repository
router.post('/validate', async (req, res) => {
    const { appManager, logger } = req;
    const { githubUrl } = req.body;
    
    try {
        if (!githubUrl || !isValidGitHubUrl(githubUrl)) {
            return res.status(400).json({ 
                valid: false,
                error: 'Invalid GitHub URL format' 
            });
        }

        logger.info(`Validating GitHub repository: ${githubUrl}`);
        
        // Extract repository info
        const repoInfo = parseGitHubUrl(githubUrl);
        
        // Check if repository is accessible
        const isAccessible = await checkRepositoryAccess(githubUrl, logger);
        
        if (!isAccessible) {
            return res.status(400).json({
                valid: false,
                message: 'Repository is not accessible or does not exist'
            });
        }

        res.json({
            valid: true,
            message: 'Valid Base44 repository detected',
            repoInfo: repoInfo
        });

    } catch (error) {
        logger.error('GitHub validation error:', error);
        res.status(500).json({ 
            valid: false,
            error: 'Failed to validate repository' 
        });
    }
});

// Import GitHub repository
router.post('/import', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    const { githubUrl } = req.body;
    
    try {
        if (!githubUrl || !isValidGitHubUrl(githubUrl)) {
            return res.status(400).json({ error: 'Invalid GitHub URL' });
        }

        logger.info(`Importing from GitHub: ${githubUrl}`);
        
        const repoInfo = parseGitHubUrl(githubUrl);
        const appId = uuidv4();
        
        // Create temporary directory for cloning
        const tempDir = path.join(__dirname, '../../uploads', `temp_${appId}`);
        const appsDir = path.join(__dirname, '../../apps');
        const appDir = path.join(appsDir, appId);
        
        await fs.mkdir(tempDir, { recursive: true });
        
        // Clone repository
        logger.info(`Cloning repository to: ${tempDir}`);
        const cloneSuccess = await cloneRepository(githubUrl, tempDir, logger);
        
        if (!cloneSuccess) {
            await cleanupTempDir(tempDir);
            return res.status(400).json({ error: 'Failed to clone repository' });
        }

        // Validate Base44 app structure
        const validation = await validateBase44App(tempDir, logger);
        if (!validation.valid) {
            await cleanupTempDir(tempDir);
            return res.status(400).json({ error: validation.message });
        }

        // Move to apps directory
        await fs.mkdir(appDir, { recursive: true });
        await copyDirectory(tempDir, appDir);
        await cleanupTempDir(tempDir);

        // Install dependencies
        logger.info(`Installing dependencies for app: ${appId}`);
        const installSuccess = await installDependencies(appDir, logger);
        
        if (!installSuccess) {
            await cleanupDirectory(appDir);
            return res.status(500).json({ error: 'Failed to install dependencies' });
        }

        // Create app metadata
        const appData = {
            id: appId,
            name: validation.packageJson.name || repoInfo.name,
            version: validation.packageJson.version || '1.0.0',
            description: validation.packageJson.description || `Imported from ${repoInfo.name}`,
            status: 'stopped',
            port: null,
            createdAt: new Date().toISOString(),
            source: 'github',
            githubUrl: githubUrl,
            framework: 'vite',
            size: await getDirectorySize(appDir)
        };

        // Register app with AppManager
        await appManager.registerApp(appData);
        
        logger.info(`Successfully imported app: ${appData.name} (${appId})`);
        
        broadcast({
            type: 'app_installed',
            app: appData
        });

        res.json({
            success: true,
            message: `App "${appData.name}" imported successfully`,
            app: appData
        });

    } catch (error) {
        logger.error('GitHub import error:', error);
        res.status(500).json({ error: 'Failed to import repository' });
    }
});

// Helper functions
function isValidGitHubUrl(url) {
    const githubUrlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+(?:\.git)?(?:\/.*)?$/;
    return githubUrlPattern.test(url);
}

function parseGitHubUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!match) {
        throw new Error('Invalid GitHub URL format');
    }
    
    return {
        owner: match[1],
        name: match[2],
        branch: 'main' // Default branch
    };
}

async function checkRepositoryAccess(githubUrl, logger) {
    return new Promise((resolve) => {
        const git = spawn('git', ['ls-remote', githubUrl], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        git.stdout.on('data', (data) => {
            output += data.toString();
        });

        git.stderr.on('data', (data) => {
            error += data.toString();
        });

        git.on('close', (code) => {
            if (code === 0) {
                resolve(true);
            } else {
                logger.warn(`Repository access check failed: ${error}`);
                resolve(false);
            }
        });

        git.on('error', (err) => {
            logger.error('Git command error:', err);
            resolve(false);
        });
    });
}

async function cloneRepository(githubUrl, targetDir, logger) {
    return new Promise((resolve) => {
        const git = spawn('git', ['clone', '--depth', '1', githubUrl, '.'], {
            cwd: targetDir,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let error = '';

        git.stderr.on('data', (data) => {
            error += data.toString();
        });

        git.on('close', (code) => {
            if (code === 0) {
                logger.info('Repository cloned successfully');
                resolve(true);
            } else {
                logger.error(`Git clone failed: ${error}`);
                resolve(false);
            }
        });

        git.on('error', (err) => {
            logger.error('Git clone error:', err);
            resolve(false);
        });
    });
}

async function validateBase44App(appDir, logger) {
    try {
        // Check for package.json
        const packageJsonPath = path.join(appDir, 'package.json');
        const packageJsonExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);
        
        if (!packageJsonExists) {
            return { valid: false, message: 'No package.json found in repository' };
        }

        // Read and validate package.json
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);

        // Check for @base44/sdk dependency
        const hasBase44SDK = packageJson.dependencies && packageJson.dependencies['@base44/sdk'];
        if (!hasBase44SDK) {
            return { valid: false, message: 'Repository does not contain @base44/sdk dependency' };
        }

        // Check for index.html
        const indexHtmlPath = path.join(appDir, 'index.html');
        const indexHtmlExists = await fs.access(indexHtmlPath).then(() => true).catch(() => false);
        
        if (!indexHtmlExists) {
            return { valid: false, message: 'No index.html found in repository' };
        }

        logger.info('Base44 app validation successful');
        return { valid: true, packageJson };

    } catch (error) {
        logger.error('Validation error:', error);
        return { valid: false, message: 'Failed to validate app structure' };
    }
}

async function installDependencies(appDir, logger) {
    return new Promise((resolve) => {
        const npm = spawn('npm', ['install'], {
            cwd: appDir,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let error = '';

        npm.stderr.on('data', (data) => {
            error += data.toString();
        });

        npm.on('close', (code) => {
            if (code === 0) {
                logger.info('Dependencies installed successfully');
                resolve(true);
            } else {
                logger.error(`npm install failed: ${error}`);
                resolve(false);
            }
        });

        npm.on('error', (err) => {
            logger.error('npm install error:', err);
            resolve(false);
        });
    });
}

async function copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        // Skip .git directory
        if (entry.name === '.git') continue;
        
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function cleanupTempDir(tempDir) {
    try {
        await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
        console.warn('Failed to cleanup temp directory:', error);
    }
}

async function cleanupDirectory(dir) {
    try {
        await fs.rmdir(dir, { recursive: true });
    } catch (error) {
        console.warn('Failed to cleanup directory:', error);
    }
}

async function getDirectorySize(dirPath) {
    try {
        let size = 0;
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                size += await getDirectorySize(filePath);
            } else {
                const stats = await fs.stat(filePath);
                size += stats.size;
            }
        }
        
        return formatBytes(size);
    } catch (error) {
        return 'Unknown';
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;