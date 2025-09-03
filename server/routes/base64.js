const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Upload and install app from Base64 string
router.post('/upload', async (req, res) => {
    const { appManager, logger, broadcast } = req;
    
    try {
        const { base64Data, name, description } = req.body;
        
        if (!base64Data || typeof base64Data !== 'string') {
            return res.status(400).json({ 
                error: 'Base64 data is required' 
            });
        }

        logger.info(`Processing Base64 upload: ${name || 'Unnamed App'}`);

        // Validate and decode Base64
        let decodedData;
        try {
            // Remove data URL prefix if present (data:application/zip;base64,...)
            const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');
            decodedData = Buffer.from(base64String, 'base64');
        } catch (error) {
            return res.status(400).json({ 
                error: 'Invalid Base64 data format' 
            });
        }

        if (decodedData.length === 0) {
            return res.status(400).json({ 
                error: 'Empty Base64 data' 
            });
        }

        // Create temporary file
        const tempFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.zip`;
        const tempFilePath = path.join(__dirname, '..', '..', 'uploads', tempFileName);
        
        await fs.writeFile(tempFilePath, decodedData);

        // Install the app using existing AppManager
        const appName = name || `Base64-App-${Date.now()}`;
        const app = await appManager.installApp(tempFilePath, `${appName}.zip`);

        // Add metadata if provided
        if (description) {
            app.description = description;
            await appManager.saveAppsConfig();
        }

        // Broadcast to connected clients
        broadcast({
            type: 'app_installed',
            app: app
        });

        res.json({
            success: true,
            app: app,
            message: `App "${app.name}" installed successfully from Base64 data`
        });

    } catch (error) {
        logger.error('Base64 upload failed:', error);

        let statusCode = 500;
        let errorMessage = error.message;

        if (error.message.includes('Invalid Vite app')) {
            statusCode = 400;
        } else if (error.message.includes('npm install failed')) {
            statusCode = 422;
            errorMessage = 'Failed to install app dependencies. Please ensure the Base64 data contains a valid Vite application.';
        } else if (error.message.includes('No files were extracted')) {
            statusCode = 400;
            errorMessage = 'Invalid or corrupted Base64 data';
        }

        broadcast({
            type: 'error',
            message: errorMessage
        });

        res.status(statusCode).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Validate Base64 data before installation
router.post('/validate', async (req, res) => {
    const { logger } = req;
    
    try {
        const { base64Data } = req.body;
        
        if (!base64Data || typeof base64Data !== 'string') {
            return res.status(400).json({ 
                error: 'Base64 data is required for validation' 
            });
        }

        // Decode Base64
        let decodedData;
        try {
            const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');
            decodedData = Buffer.from(base64String, 'base64');
        } catch (error) {
            return res.status(400).json({
                valid: false,
                error: 'Invalid Base64 format'
            });
        }

        if (decodedData.length === 0) {
            return res.status(400).json({
                valid: false,
                error: 'Empty Base64 data'
            });
        }

        // Create temporary file for validation
        const tempFileName = `validate-${Date.now()}.zip`;
        const tempFilePath = path.join(__dirname, '..', '..', 'uploads', tempFileName);
        
        await fs.writeFile(tempFilePath, decodedData);

        // Validate using yauzl
        const yauzl = require('yauzl');
        
        const validationResult = await new Promise((resolve) => {
            yauzl.open(tempFilePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    resolve({
                        isValid: false,
                        error: 'Invalid ZIP data in Base64'
                    });
                    return;
                }

                let hasPackageJson = false;
                let hasIndexHtml = false;
                let fileCount = 0;
                let hasViteConfig = false;

                zipfile.readEntry();

                zipfile.on('entry', (entry) => {
                    fileCount++;
                    
                    if (entry.fileName.endsWith('package.json')) {
                        hasPackageJson = true;
                    }
                    if (entry.fileName.endsWith('index.html')) {
                        hasIndexHtml = true;
                    }
                    if (entry.fileName.includes('vite.config')) {
                        hasViteConfig = true;
                    }

                    zipfile.readEntry();
                });

                zipfile.on('end', () => {
                    resolve({
                        isValid: hasPackageJson && hasIndexHtml && fileCount > 0,
                        hasPackageJson,
                        hasIndexHtml,
                        hasViteConfig,
                        fileCount,
                        size: formatBytes(decodedData.length)
                    });
                });

                zipfile.on('error', () => {
                    resolve({
                        isValid: false,
                        error: 'Corrupted ZIP data'
                    });
                });
            });
        });

        // Clean up validation file
        await fs.unlink(tempFilePath);

        if (validationResult.isValid) {
            res.json({
                valid: true,
                message: 'Base64 data contains a valid Vite application',
                details: {
                    hasPackageJson: validationResult.hasPackageJson,
                    hasIndexHtml: validationResult.hasIndexHtml,
                    hasViteConfig: validationResult.hasViteConfig,
                    fileCount: validationResult.fileCount,
                    decodedSize: validationResult.size
                }
            });
        } else {
            res.status(400).json({
                valid: false,
                message: 'Base64 data does not contain a valid Vite application',
                details: validationResult
            });
        }

    } catch (error) {
        logger.error('Base64 validation failed:', error);

        // Clean up file on error
        try {
            const tempFileName = `validate-${Date.now()}.zip`;
            const tempFilePath = path.join(__dirname, '..', '..', 'uploads', tempFileName);
            await fs.unlink(tempFilePath);
        } catch (cleanupError) {
            logger.warn('Failed to cleanup validation file:', cleanupError.message);
        }

        res.status(500).json({ 
            valid: false,
            error: 'Validation failed',
            details: error.message
        });
    }
});

// Convert uploaded file to Base64 (for sharing/export)
router.post('/export/:id', async (req, res) => {
    const { appManager, logger } = req;
    const { id } = req.params;
    
    try {
        const app = appManager.getApp(id);
        if (!app) {
            return res.status(404).json({ error: 'App not found' });
        }

        // Create ZIP from app directory
        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        let base64Data = '';
        const buffers = [];

        archive.on('data', (chunk) => {
            buffers.push(chunk);
        });

        archive.on('end', () => {
            const zipBuffer = Buffer.concat(buffers);
            const base64String = zipBuffer.toString('base64');
            
            res.json({
                success: true,
                appName: app.name,
                base64Data: base64String,
                size: formatBytes(zipBuffer.length),
                message: `App "${app.name}" exported as Base64`
            });
        });

        archive.on('error', (err) => {
            logger.error(`Export failed for app ${id}:`, err);
            res.status(500).json({ error: 'Failed to export app' });
        });

        // Add app files to archive
        archive.directory(app.path, false);
        archive.finalize();

    } catch (error) {
        logger.error(`Export failed for app ${id}:`, error);
        res.status(500).json({ error: 'Failed to export app' });
    }
});

// Helper function to format bytes
function formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

module.exports = router;