const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/zip' || 
            file.mimetype === 'application/x-zip-compressed' ||
            path.extname(file.originalname).toLowerCase() === '.zip') {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed'), false);
        }
    }
});

// Upload and install app
router.post('/', upload.single('app'), async (req, res) => {
    const { appManager, logger, broadcast } = req;
    
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file uploaded or invalid file format' 
            });
        }

        logger.info(`Processing upload: ${req.file.originalname}`);

        // Install the app
        const app = await appManager.installApp(req.file.path, req.file.originalname);

        // Broadcast to connected clients
        broadcast({
            type: 'app_installed',
            app: app
        });

        res.json({
            success: true,
            app: app,
            message: `App "${app.name}" installed successfully`
        });

    } catch (error) {
        logger.error('Upload failed:', error);

        // Clean up uploaded file on error
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                logger.warn('Failed to cleanup uploaded file:', cleanupError.message);
            }
        }

        // Send appropriate error response
        let statusCode = 500;
        let errorMessage = error.message;

        if (error.message.includes('Invalid Vite app')) {
            statusCode = 400;
        } else if (error.message.includes('npm install failed')) {
            statusCode = 422;
            errorMessage = 'Failed to install app dependencies. Please ensure your package.json is valid.';
        } else if (error.message.includes('No files were extracted')) {
            statusCode = 400;
            errorMessage = 'Invalid or corrupted ZIP file';
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

// Upload progress endpoint (for large files)
router.post('/progress', (req, res) => {
    // This would be used for chunked uploads or progress tracking
    // For now, we'll use WebSocket for real-time progress updates
    res.json({ message: 'Progress tracking via WebSocket' });
});

// Validate ZIP file before upload
router.post('/validate', upload.single('app'), async (req, res) => {
    const { logger } = req;
    
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file provided for validation' 
            });
        }

        // Basic validation - check if it's a valid ZIP
        const yauzl = require('yauzl');
        
        const isValidZip = await new Promise((resolve) => {
            yauzl.open(req.file.path, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    resolve(false);
                    return;
                }

                let hasPackageJson = false;
                let hasIndexHtml = false;
                let fileCount = 0;

                zipfile.readEntry();

                zipfile.on('entry', (entry) => {
                    fileCount++;
                    
                    if (entry.fileName.endsWith('package.json')) {
                        hasPackageJson = true;
                    }
                    if (entry.fileName.endsWith('index.html')) {
                        hasIndexHtml = true;
                    }

                    zipfile.readEntry();
                });

                zipfile.on('end', () => {
                    resolve({
                        isValid: hasPackageJson && hasIndexHtml && fileCount > 0,
                        hasPackageJson,
                        hasIndexHtml,
                        fileCount
                    });
                });

                zipfile.on('error', () => resolve(false));
            });
        });

        // Clean up the validation file
        await fs.unlink(req.file.path);

        if (isValidZip.isValid) {
            res.json({
                valid: true,
                message: 'ZIP file appears to be a valid Vite application',
                details: {
                    hasPackageJson: isValidZip.hasPackageJson,
                    hasIndexHtml: isValidZip.hasIndexHtml,
                    fileCount: isValidZip.fileCount
                }
            });
        } else {
            res.status(400).json({
                valid: false,
                message: 'ZIP file does not appear to be a valid Vite application',
                details: isValidZip
            });
        }

    } catch (error) {
        logger.error('Validation failed:', error);

        // Clean up file on error
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                logger.warn('Failed to cleanup validation file:', cleanupError.message);
            }
        }

        res.status(500).json({ 
            error: 'Validation failed',
            details: error.message
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    const { logger } = req;
    
    if (error instanceof multer.MulterError) {
        logger.error('Multer error:', error);
        
        let message = 'File upload error';
        let statusCode = 400;

        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'File too large. Maximum size is 100MB.';
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files. Only one file is allowed.';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected field name. Use "app" as the field name.';
                break;
            default:
                message = error.message;
        }

        return res.status(statusCode).json({ error: message });
    }

    if (error.message === 'Only ZIP files are allowed') {
        return res.status(400).json({ 
            error: 'Only ZIP files are allowed. Please upload a .zip file.' 
        });
    }

    next(error);
});

module.exports = router;