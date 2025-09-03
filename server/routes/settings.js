const express = require('express');
const router = express.Router();

// Get current settings
router.get('/', async (req, res) => {
    const { appManager, logger } = req;
    
    try {
        const settings = appManager.getSettings();
        
        // Format port range for frontend display
        if (settings.portRange && typeof settings.portRange === 'object') {
            settings.portRange = `${settings.portRange.min}-${settings.portRange.max}`;
        }

        res.json(settings);
    } catch (error) {
        logger.error('Failed to get settings:', error);
        res.status(500).json({ error: 'Failed to retrieve settings' });
    }
});

// Update settings
router.post('/', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    const updates = req.body;
    
    try {
        // Validate settings
        const validationErrors = validateSettings(updates);
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                error: 'Invalid settings',
                details: validationErrors
            });
        }

        // Apply updates
        await appManager.updateSettings(updates);
        
        logger.info('Settings updated:', updates);
        
        // Broadcast settings change to connected clients
        broadcast({
            type: 'settings_updated',
            settings: appManager.getSettings()
        });

        // Get formatted settings for response
        const currentSettings = appManager.getSettings();
        if (currentSettings.portRange && typeof currentSettings.portRange === 'object') {
            currentSettings.portRange = `${currentSettings.portRange.min}-${currentSettings.portRange.max}`;
        }

        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: currentSettings
        });

    } catch (error) {
        logger.error('Failed to update settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Reset settings to defaults
router.post('/reset', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    
    try {
        const defaultSettings = {
            portRange: '3000-3999',
            maxApps: 5,
            autoStart: true,
            mode: 'single'
        };

        await appManager.updateSettings(defaultSettings);
        
        logger.info('Settings reset to defaults');
        
        broadcast({
            type: 'settings_updated',
            settings: appManager.getSettings()
        });

        res.json({
            success: true,
            message: 'Settings reset to defaults',
            settings: defaultSettings
        });

    } catch (error) {
        logger.error('Failed to reset settings:', error);
        res.status(500).json({ error: 'Failed to reset settings' });
    }
});

// Export settings
router.get('/export', async (req, res) => {
    const { appManager, logger } = req;
    
    try {
        const settings = appManager.getSettings();
        const apps = appManager.getAllApps().map(app => ({
            id: app.id,
            name: app.name,
            version: app.version,
            description: app.description,
            createdAt: app.createdAt
        }));

        const exportData = {
            settings,
            apps,
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=googleai-app-player-config.json');
        res.json(exportData);

    } catch (error) {
        logger.error('Failed to export settings:', error);
        res.status(500).json({ error: 'Failed to export settings' });
    }
});

// Get system info
router.get('/system', async (req, res) => {
    const { appManager, logger } = req;
    
    try {
        const os = require('os');
        const fs = require('fs').promises;
        const path = require('path');

        // Get disk usage for apps directory
        const appsDir = path.join(__dirname, '..', '..', 'apps');
        let totalSize = 0;
        let appCount = 0;

        try {
            const apps = await fs.readdir(appsDir);
            appCount = apps.length;
            
            for (const app of apps) {
                try {
                    const appPath = path.join(appsDir, app);
                    const stats = await fs.stat(appPath);
                    if (stats.isDirectory()) {
                        const size = await getDirectorySize(appPath);
                        totalSize += size;
                    }
                } catch (error) {
                    // Skip if can't read directory
                }
            }
        } catch (error) {
            // Apps directory might not exist
        }

        const systemInfo = {
            node: {
                version: process.version,
                platform: process.platform,
                arch: process.arch,
                uptime: process.uptime()
            },
            system: {
                hostname: os.hostname(),
                platform: os.platform(),
                release: os.release(),
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                cpus: os.cpus().length
            },
            application: {
                totalApps: appManager.getAppsCount(),
                runningApps: appManager.getRunningAppsCount(),
                usedPorts: appManager.getUsedPorts(),
                totalDiskUsage: formatBytes(totalSize),
                appsDirectory: appsDir
            },
            settings: appManager.getSettings()
        };

        res.json(systemInfo);

    } catch (error) {
        logger.error('Failed to get system info:', error);
        res.status(500).json({ error: 'Failed to retrieve system information' });
    }
});

// Validate port availability
router.post('/validate-ports', async (req, res) => {
    const { portRange } = req.body;
    const { logger } = req;

    try {
        if (!portRange || typeof portRange !== 'string') {
            return res.status(400).json({ error: 'Port range is required' });
        }

        const [minStr, maxStr] = portRange.split('-');
        const min = parseInt(minStr);
        const max = parseInt(maxStr);

        if (isNaN(min) || isNaN(max) || min >= max) {
            return res.status(400).json({ error: 'Invalid port range format' });
        }

        // Check if ports are available
        const net = require('net');
        const availablePorts = [];
        const busyPorts = [];

        const checkPort = (port) => {
            return new Promise((resolve) => {
                const server = net.createServer();
                server.listen(port, () => {
                    server.once('close', () => resolve(true));
                    server.close();
                });
                server.on('error', () => resolve(false));
            });
        };

        // Check a sample of ports (up to 10 to avoid overwhelming)
        const portsToCheck = [];
        const step = Math.max(1, Math.floor((max - min) / 10));
        
        for (let port = min; port <= max; port += step) {
            portsToCheck.push(port);
        }

        for (const port of portsToCheck) {
            const isAvailable = await checkPort(port);
            if (isAvailable) {
                availablePorts.push(port);
            } else {
                busyPorts.push(port);
            }
        }

        res.json({
            valid: true,
            portRange: { min, max },
            totalRange: max - min + 1,
            sampledPorts: portsToCheck.length,
            availablePorts,
            busyPorts,
            availabilityRate: availablePorts.length / portsToCheck.length
        });

    } catch (error) {
        logger.error('Failed to validate ports:', error);
        res.status(500).json({ error: 'Failed to validate port range' });
    }
});

// Helper functions
function validateSettings(settings) {
    const errors = [];

    // Validate port range
    if (settings.portRange) {
        if (typeof settings.portRange === 'string') {
            const [minStr, maxStr] = settings.portRange.split('-');
            const min = parseInt(minStr);
            const max = parseInt(maxStr);

            if (isNaN(min) || isNaN(max)) {
                errors.push('Port range must be in format "min-max" (e.g., "3000-3999")');
            } else if (min >= max) {
                errors.push('Minimum port must be less than maximum port');
            } else if (min < 1000 || max > 65535) {
                errors.push('Port numbers must be between 1000 and 65535');
            }
        } else {
            errors.push('Port range must be a string in format "min-max"');
        }
    }

    // Validate max apps
    if (settings.maxApps !== undefined) {
        if (!Number.isInteger(settings.maxApps) || settings.maxApps < 1 || settings.maxApps > 50) {
            errors.push('Max apps must be an integer between 1 and 50');
        }
    }

    // Validate auto start
    if (settings.autoStart !== undefined && typeof settings.autoStart !== 'boolean') {
        errors.push('Auto start must be a boolean value');
    }

    // Validate mode
    if (settings.mode !== undefined) {
        const validModes = ['single', 'multi', 'hybrid'];
        if (!validModes.includes(settings.mode)) {
            errors.push(`Mode must be one of: ${validModes.join(', ')}`);
        }
    }

    return errors;
}

async function getDirectorySize(dir) {
    const fs = require('fs').promises;
    const path = require('path');
    
    let size = 0;
    const files = await fs.readdir(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
            size += await getDirectorySize(filePath);
        } else {
            size += stats.size;
        }
    }
    
    return size;
}

function formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

module.exports = router;