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
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (err) {
            console.warn(`[Logger] Cannot create log directory: ${err.message}`);
            this.logDir = null;
        }
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
        return `[${timestamp}] [${level}] ${message}${metaStr}`;
    }

    writeToFile(filename, message) {
        if (!this.logDir) return;
        try {
            const filepath = path.join(this.logDir, filename);
            fs.appendFileSync(filepath, message + '\n');
        } catch (err) {
            // Silent fail - don't crash server over log files
        }
    }

    info(message, meta = {}) {
        const formatted = this.formatMessage('INFO', message, meta);
        console.log(formatted);
        this.writeToFile('app.log', formatted);
    }

    error(message, meta = {}) {
        const formatted = this.formatMessage('ERROR', message, meta);
        console.error(formatted);
        this.writeToFile('error.log', formatted);
    }

    warn(message, meta = {}) {
        const formatted = this.formatMessage('WARN', message, meta);
        console.warn(formatted);
        this.writeToFile('app.log', formatted);
    }

    debug(message, meta = {}) {
        if (process.env.NODE_ENV === 'development') {
            const formatted = this.formatMessage('DEBUG', message, meta);
            console.log(formatted);
        }
    }

    logRequest(req) {
        this.info(`${req.method} ${req.path}`, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            userId: req.session?.user?.id || req.session?.admin_user?.id
        });
    }

    logResponse(req, res, duration) {
        this.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
}

module.exports = new Logger();
