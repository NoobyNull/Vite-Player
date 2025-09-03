const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs').promises;

// Import services and routes
const uploadRoutes = require('./routes/upload');
const appsRoutes = require('./routes/apps');
const settingsRoutes = require('./routes/settings');
const AppManager = require('./services/AppManager');
const Logger = require('./services/Logger');

class GoogleAIAppPlayerServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.port = process.env.PORT || 8080;
        this.appManager = new AppManager();
        this.logger = new Logger();
        this.clients = new Set();
        
        this.init();
    }

    async init() {
        await this.setupDirectories();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
        this.start();
    }

    async setupDirectories() {
        const dirs = [
            'apps',
            'uploads', 
            'logs',
            'config'
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(path.join(__dirname, '..', dir), { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    this.logger.error(`Failed to create directory ${dir}:`, error);
                }
            }
        }
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: false, // Disable for development
            crossOriginEmbedderPolicy: false
        }));
        
        // CORS setup
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' ? false : '*',
            credentials: true
        }));

        // Body parsing
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // Static files - serve client directory
        this.app.use(express.static(path.join(__dirname, '..', 'client')));

        // Request logging
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path} - ${req.ip}`);
            next();
        });

        // Attach services to request
        this.app.use((req, res, next) => {
            req.appManager = this.appManager;
            req.logger = this.logger;
            req.wss = this.wss;
            req.broadcast = this.broadcast.bind(this);
            next();
        });
    }

    setupRoutes() {
        // API routes
        this.app.use('/api/upload', uploadRoutes);
        this.app.use('/api/apps', appsRoutes);
        this.app.use('/api/settings', settingsRoutes);

        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                apps: this.appManager.getAppsCount(),
                runningApps: this.appManager.getRunningAppsCount()
            });
        });

        // System status
        this.app.get('/api/status', (req, res) => {
            res.json({
                system: 'online',
                apps: this.appManager.getAllApps(),
                ports: this.appManager.getUsedPorts(),
                settings: this.appManager.getSettings()
            });
        });

        // Serve main dashboard for all non-API routes
        this.app.get('*', (req, res) => {
            if (!req.path.startsWith('/api/')) {
                res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
            } else {
                res.status(404).json({ error: 'API endpoint not found' });
            }
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            this.logger.info('WebSocket client connected');
            this.clients.add(ws);

            // Send initial status
            ws.send(JSON.stringify({
                type: 'connected',
                apps: this.appManager.getAllApps(),
                settings: this.appManager.getSettings()
            }));

            // Handle disconnection
            ws.on('close', () => {
                this.logger.info('WebSocket client disconnected');
                this.clients.delete(ws);
            });

            // Handle errors
            ws.on('error', (error) => {
                this.logger.error('WebSocket error:', error);
                this.clients.delete(ws);
            });

            // Handle incoming messages
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    this.logger.error('Error parsing WebSocket message:', error);
                }
            });
        });

        // Setup app manager event listeners for real-time updates
        this.appManager.on('app_status_changed', (appId, status, port) => {
            this.broadcast({
                type: 'app_status_changed',
                appId,
                status,
                port
            });
        });

        this.appManager.on('app_installed', (app) => {
            this.broadcast({
                type: 'app_installed',
                app
            });
        });

        this.appManager.on('app_deleted', (appId) => {
            this.broadcast({
                type: 'app_deleted',
                appId
            });
        });
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
            
            case 'get_apps':
                ws.send(JSON.stringify({
                    type: 'apps_list',
                    apps: this.appManager.getAllApps()
                }));
                break;

            default:
                this.logger.warn('Unknown WebSocket message type:', data.type);
        }
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                } catch (error) {
                    this.logger.error('Error broadcasting message:', error);
                    this.clients.delete(client);
                }
            }
        });
    }

    setupErrorHandling() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        // Express error handler
        this.app.use((error, req, res, next) => {
            this.logger.error('Express error:', error);
            res.status(500).json({
                error: process.env.NODE_ENV === 'production' 
                    ? 'Internal server error' 
                    : error.message
            });
        });

        // 404 handler for API routes
        this.app.use('/api/*', (req, res) => {
            res.status(404).json({ error: 'API endpoint not found' });
        });
    }

    start() {
        this.server.listen(this.port, () => {
            this.logger.info(`🚀 GoogleAI App Player server running on port ${this.port}`);
            this.logger.info(`📱 Dashboard: http://localhost:${this.port}`);
            this.logger.info(`🔌 WebSocket: ws://localhost:${this.port}/ws`);
            
            // Initialize app manager after server starts
            this.appManager.init().catch(error => {
                this.logger.error('Failed to initialize AppManager:', error);
            });
        });

        // Graceful shutdown
        const shutdown = () => {
            this.logger.info('Shutting down server...');
            
            this.appManager.stopAllApps().then(() => {
                this.server.close(() => {
                    this.logger.info('Server shut down gracefully');
                    process.exit(0);
                });
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
}

// Start the server
if (require.main === module) {
    new GoogleAIAppPlayerServer();
}

module.exports = GoogleAIAppPlayerServer;