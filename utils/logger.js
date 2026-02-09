/**
 * Logger Utility
 * Centralized logging system for the application
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
        return `[${timestamp}] [${level}] ${message} ${metaStr}\n`;
    }

    writeToFile(filename, message) {
        const filepath = path.join(this.logDir, filename);
        fs.appendFileSync(filepath, message);
    }

    info(message, meta = {}) {
        const formatted = this.formatMessage('INFO', message, meta);
        console.log(formatted.trim());
        this.writeToFile('app.log', formatted);
    }

    error(message, meta = {}) {
        const formatted = this.formatMessage('ERROR', message, meta);
        console.error(formatted.trim());
        this.writeToFile('error.log', formatted);
    }

    warn(message, meta = {}) {
        const formatted = this.formatMessage('WARN', message, meta);
        console.warn(formatted.trim());
        this.writeToFile('app.log', formatted);
    }

    debug(message, meta = {}) {
        if (process.env.NODE_ENV === 'development') {
            const formatted = this.formatMessage('DEBUG', message, meta);
            console.log(formatted.trim());
        }
    }

    // Log API requests
    logRequest(req) {
        this.info(`${req.method} ${req.path}`, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            userId: req.session?.user?.id || req.session?.admin_user?.id
        });
    }

    // Log API responses
    logResponse(req, res, duration) {
        this.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
}

module.exports = new Logger();
