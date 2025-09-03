const fs = require('fs').promises;
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '..', '..', 'logs');
        this.logFile = path.join(this.logDir, 'app.log');
        this.errorFile = path.join(this.logDir, 'error.log');
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = 5;
        
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...(data && { data })
        };
        
        return JSON.stringify(logEntry) + '\n';
    }

    async writeToFile(filename, message) {
        try {
            await fs.appendFile(filename, message);
            await this.rotateLogIfNeeded(filename);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async rotateLogIfNeeded(filename) {
        try {
            const stats = await fs.stat(filename);
            if (stats.size > this.maxLogSize) {
                await this.rotateLogs(filename);
            }
        } catch (error) {
            // File might not exist yet
        }
    }

    async rotateLogs(filename) {
        const basename = path.basename(filename, path.extname(filename));
        const extension = path.extname(filename);
        const dirname = path.dirname(filename);

        try {
            // Shift existing log files
            for (let i = this.maxLogFiles - 1; i >= 1; i--) {
                const oldFile = path.join(dirname, `${basename}.${i}${extension}`);
                const newFile = path.join(dirname, `${basename}.${i + 1}${extension}`);
                
                try {
                    await fs.rename(oldFile, newFile);
                } catch (error) {
                    // File might not exist, which is fine
                }
            }

            // Move current log to .1
            const firstRotated = path.join(dirname, `${basename}.1${extension}`);
            await fs.rename(filename, firstRotated);

        } catch (error) {
            console.error('Failed to rotate logs:', error);
        }
    }

    info(message, data = null) {
        const logMessage = this.formatMessage('info', message, data);
        console.log(`[INFO] ${message}`, data || '');
        this.writeToFile(this.logFile, logMessage);
    }

    warn(message, data = null) {
        const logMessage = this.formatMessage('warn', message, data);
        console.warn(`[WARN] ${message}`, data || '');
        this.writeToFile(this.logFile, logMessage);
    }

    error(message, data = null) {
        const logMessage = this.formatMessage('error', message, data);
        console.error(`[ERROR] ${message}`, data || '');
        this.writeToFile(this.logFile, logMessage);
        this.writeToFile(this.errorFile, logMessage);
    }

    debug(message, data = null) {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
            const logMessage = this.formatMessage('debug', message, data);
            console.debug(`[DEBUG] ${message}`, data || '');
            this.writeToFile(this.logFile, logMessage);
        }
    }

    async getLogs(level = null, limit = 100) {
        try {
            const logFile = level === 'error' ? this.errorFile : this.logFile;
            const data = await fs.readFile(logFile, 'utf8');
            const lines = data.trim().split('\n');
            
            const logs = lines
                .slice(-limit) // Get last N lines
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(log => log !== null);

            return logs.reverse(); // Most recent first
        } catch (error) {
            return [];
        }
    }

    async clearLogs() {
        try {
            await fs.writeFile(this.logFile, '');
            await fs.writeFile(this.errorFile, '');
            this.info('Logs cleared');
        } catch (error) {
            this.error('Failed to clear logs:', error);
        }
    }
}

module.exports = Logger;