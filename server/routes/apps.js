const express = require('express');
const router = express.Router();

// Get all apps
router.get('/', async (req, res) => {
    const { appManager, logger } = req;
    
    try {
        const apps = appManager.getAllApps();
        res.json(apps);
    } catch (error) {
        logger.error('Failed to get apps:', error);
        res.status(500).json({ error: 'Failed to retrieve applications' });
    }
});

// Get specific app
router.get('/:id', async (req, res) => {
    const { appManager, logger } = req;
    const { id } = req.params;
    
    try {
        const app = appManager.getApp(id);
        if (!app) {
            return res.status(404).json({ error: 'App not found' });
        }
        
        res.json(app);
    } catch (error) {
        logger.error(`Failed to get app ${id}:`, error);
        res.status(500).json({ error: 'Failed to retrieve application' });
    }
});

// Start app
router.post('/:id/start', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    const { id } = req.params;
    
    try {
        const app = appManager.getApp(id);
        if (!app) {
            return res.status(404).json({ error: 'App not found' });
        }

        if (app.status === 'running') {
            return res.status(400).json({ 
                error: 'App is already running',
                port: app.port 
            });
        }

        logger.info(`Starting app: ${app.name} (${id})`);
        const result = await appManager.startApp(id);
        
        broadcast({
            type: 'app_status_changed',
            appId: id,
            status: 'running',
            port: result.port
        });

        res.json({
            success: true,
            message: `App "${app.name}" started successfully`,
            port: result.port,
            status: result.status
        });

    } catch (error) {
        logger.error(`Failed to start app ${id}:`, error);
        
        let statusCode = 500;
        let errorMessage = error.message;

        if (error.message.includes('App not found')) {
            statusCode = 404;
        } else if (error.message.includes('already running')) {
            statusCode = 400;
        } else if (error.message.includes('Maximum number')) {
            statusCode = 409; // Conflict
        } else if (error.message.includes('No available ports')) {
            statusCode = 503; // Service Unavailable
        }

        broadcast({
            type: 'error',
            message: `Failed to start app: ${errorMessage}`
        });

        res.status(statusCode).json({ error: errorMessage });
    }
});

// Stop app
router.post('/:id/stop', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    const { id } = req.params;
    
    try {
        const app = appManager.getApp(id);
        if (!app) {
            return res.status(404).json({ error: 'App not found' });
        }

        if (app.status === 'stopped') {
            return res.json({ 
                message: 'App is already stopped',
                status: 'stopped'
            });
        }

        logger.info(`Stopping app: ${app.name} (${id})`);
        await appManager.stopApp(id);
        
        broadcast({
            type: 'app_status_changed',
            appId: id,
            status: 'stopped'
        });

        res.json({
            success: true,
            message: `App "${app.name}" stopped successfully`,
            status: 'stopped'
        });

    } catch (error) {
        logger.error(`Failed to stop app ${id}:`, error);
        
        let statusCode = 500;
        if (error.message.includes('App not found')) {
            statusCode = 404;
        }

        broadcast({
            type: 'error',
            message: `Failed to stop app: ${error.message}`
        });

        res.status(statusCode).json({ error: error.message });
    }
});

// Restart app
router.post('/:id/restart', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    const { id } = req.params;
    
    try {
        const app = appManager.getApp(id);
        if (!app) {
            return res.status(404).json({ error: 'App not found' });
        }

        logger.info(`Restarting app: ${app.name} (${id})`);
        
        // Stop the app if it's running
        if (app.status === 'running') {
            await appManager.stopApp(id);
            
            broadcast({
                type: 'app_status_changed',
                appId: id,
                status: 'stopped'
            });

            // Wait a moment before starting again
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Start the app
        const result = await appManager.startApp(id);
        
        broadcast({
            type: 'app_status_changed',
            appId: id,
            status: 'running',
            port: result.port
        });

        res.json({
            success: true,
            message: `App "${app.name}" restarted successfully`,
            port: result.port,
            status: result.status
        });

    } catch (error) {
        logger.error(`Failed to restart app ${id}:`, error);
        
        let statusCode = 500;
        if (error.message.includes('App not found')) {
            statusCode = 404;
        }

        broadcast({
            type: 'error',
            message: `Failed to restart app: ${error.message}`
        });

        res.status(statusCode).json({ error: error.message });
    }
});

// Delete app
router.delete('/:id', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    const { id } = req.params;
    
    try {
        const app = appManager.getApp(id);
        if (!app) {
            return res.status(404).json({ error: 'App not found' });
        }

        const appName = app.name;
        logger.info(`Deleting app: ${appName} (${id})`);
        
        await appManager.deleteApp(id);
        
        broadcast({
            type: 'app_deleted',
            appId: id,
            name: appName
        });

        res.json({
            success: true,
            message: `App "${appName}" deleted successfully`
        });

    } catch (error) {
        logger.error(`Failed to delete app ${id}:`, error);
        
        let statusCode = 500;
        if (error.message.includes('App not found')) {
            statusCode = 404;
        }

        broadcast({
            type: 'error',
            message: `Failed to delete app: ${error.message}`
        });

        res.status(statusCode).json({ error: error.message });
    }
});

// Get app logs
router.get('/:id/logs', async (req, res) => {
    const { appManager, logger } = req;
    const { id } = req.params;
    const { lines = 100, level = 'all' } = req.query;
    
    try {
        const app = appManager.getApp(id);
        if (!app) {
            return res.status(404).json({ error: 'App not found' });
        }

        // For now, return empty logs - this could be enhanced to capture actual Vite logs
        const logs = [];

        res.json({
            appId: id,
            appName: app.name,
            logs: logs,
            totalLines: logs.length
        });

    } catch (error) {
        logger.error(`Failed to get logs for app ${id}:`, error);
        res.status(500).json({ error: 'Failed to retrieve app logs' });
    }
});

// Get app status
router.get('/:id/status', async (req, res) => {
    const { appManager, logger } = req;
    const { id } = req.params;
    
    try {
        const app = appManager.getApp(id);
        if (!app) {
            return res.status(404).json({ error: 'App not found' });
        }

        res.json({
            id: app.id,
            name: app.name,
            status: app.status,
            port: app.port,
            url: app.port ? `http://localhost:${app.port}` : null,
            uptime: app.startedAt ? Date.now() - new Date(app.startedAt).getTime() : null
        });

    } catch (error) {
        logger.error(`Failed to get status for app ${id}:`, error);
        res.status(500).json({ error: 'Failed to retrieve app status' });
    }
});

// Update app metadata
router.patch('/:id', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    const { id } = req.params;
    const updates = req.body;
    
    try {
        const app = appManager.getApp(id);
        if (!app) {
            return res.status(404).json({ error: 'App not found' });
        }

        // Only allow certain fields to be updated
        const allowedFields = ['name', 'description'];
        const validUpdates = {};
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                validUpdates[field] = updates[field];
            }
        }

        if (Object.keys(validUpdates).length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }

        // Update the app
        Object.assign(app, validUpdates);
        await appManager.saveAppsConfig();

        broadcast({
            type: 'app_updated',
            appId: id,
            updates: validUpdates
        });

        res.json({
            success: true,
            message: 'App updated successfully',
            app: app
        });

    } catch (error) {
        logger.error(`Failed to update app ${id}:`, error);
        res.status(500).json({ error: 'Failed to update app' });
    }
});

// Bulk operations
router.post('/bulk/start', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    const { appIds } = req.body;
    
    if (!Array.isArray(appIds) || appIds.length === 0) {
        return res.status(400).json({ error: 'App IDs array is required' });
    }

    const results = [];
    const errors = [];

    for (const appId of appIds) {
        try {
            const app = appManager.getApp(appId);
            if (!app) {
                errors.push({ appId, error: 'App not found' });
                continue;
            }

            if (app.status === 'running') {
                results.push({ appId, status: 'already_running', port: app.port });
                continue;
            }

            const result = await appManager.startApp(appId);
            results.push({ appId, status: 'started', port: result.port });

            broadcast({
                type: 'app_status_changed',
                appId: appId,
                status: 'running',
                port: result.port
            });

        } catch (error) {
            logger.error(`Failed to start app ${appId}:`, error);
            errors.push({ appId, error: error.message });
        }
    }

    res.json({
        success: results,
        errors: errors,
        summary: {
            total: appIds.length,
            succeeded: results.length,
            failed: errors.length
        }
    });
});

router.post('/bulk/stop', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    const { appIds } = req.body;
    
    if (!Array.isArray(appIds) || appIds.length === 0) {
        return res.status(400).json({ error: 'App IDs array is required' });
    }

    const results = [];
    const errors = [];

    for (const appId of appIds) {
        try {
            const app = appManager.getApp(appId);
            if (!app) {
                errors.push({ appId, error: 'App not found' });
                continue;
            }

            if (app.status === 'stopped') {
                results.push({ appId, status: 'already_stopped' });
                continue;
            }

            await appManager.stopApp(appId);
            results.push({ appId, status: 'stopped' });

            broadcast({
                type: 'app_status_changed',
                appId: appId,
                status: 'stopped'
            });

        } catch (error) {
            logger.error(`Failed to stop app ${appId}:`, error);
            errors.push({ appId, error: error.message });
        }
    }

    res.json({
        success: results,
        errors: errors,
        summary: {
            total: appIds.length,
            succeeded: results.length,
            failed: errors.length
        }
    });
});

module.exports = router;