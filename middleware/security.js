/**
 * Security Middleware
 * Implements CSRF protection, input validation, rate limiting, and security headers
 */

const crypto = require('crypto');

/**
 * CSRF Token Generation and Validation
 */
const csrfProtection = {
    // Generate CSRF token for session
    generateToken: (req) => {
        if (!req.session.csrfToken) {
            req.session.csrfToken = crypto.randomBytes(32).toString('hex');
        }
        return req.session.csrfToken;
    },

    // Middleware to validate CSRF token
    validate: (req, res, next) => {
        // Skip CSRF for GET, HEAD, OPTIONS
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            return next();
        }

        const token = req.body._csrf || req.headers['x-csrf-token'];
        const sessionToken = req.session.csrfToken;

        if (!token || !sessionToken || token !== sessionToken) {
            return res.status(403).json({
                success: false,
                error: 'Invalid CSRF token'
            });
        }

        next();
    }
};

/**
 * Input Sanitization
 */
const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        // Remove potential XSS vectors
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }
    return input;
};

/**
 * Sanitize request body
 */
const sanitizeBody = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeInput(req.body[key]);
            }
        });
    }
    next();
};

/**
 * Rate Limiting
 */
const rateLimitStore = new Map();

const rateLimit = (options = {}) => {
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    const max = options.max || 100; // 100 requests per window

    return (req, res, next) => {
        const identifier = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        // Clean old entries
        for (const [key, value] of rateLimitStore.entries()) {
            if (now - value.resetTime > windowMs) {
                rateLimitStore.delete(key);
            }
        }

        // Get or create rate limit entry
        let rateData = rateLimitStore.get(identifier);
        
        if (!rateData || now - rateData.resetTime > windowMs) {
            rateData = {
                count: 0,
                resetTime: now
            };
            rateLimitStore.set(identifier, rateData);
        }

        rateData.count++;

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - rateData.count));
        res.setHeader('X-RateLimit-Reset', new Date(rateData.resetTime + windowMs).toISOString());

        if (rateData.count > max) {
            return res.status(429).json({
                success: false,
                error: 'Too many requests, please try again later',
                retryAfter: Math.ceil((rateData.resetTime + windowMs - now) / 1000)
            });
        }

        next();
    };
};

/**
 * Security Headers
 */
const securityHeaders = (req, res, next) => {
    // Prevent XSS attacks
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Content Security Policy - Allow Tailwind CDN, Leaflet.js, OpenStreetMap and inline styles
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; " +
        "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://unpkg.com; " +
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
        "img-src 'self' data: https: blob: https://*.tile.openstreetmap.org https://*.openstreetmap.org; " +
        "connect-src 'self' https://*.tile.openstreetmap.org;"
    );

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
};

/**
 * Input Validation Helpers
 */
const validators = {
    // Validate phone number (Tanzania format)
    isValidPhone: (phone) => {
        const phoneRegex = /^\+255[67]\d{8}$/;
        return phoneRegex.test(phone);
    },

    // Validate email
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate password strength
    isStrongPassword: (password) => {
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    },

    // Validate numeric input
    isNumeric: (value) => {
        return !isNaN(parseFloat(value)) && isFinite(value);
    },

    // Validate date format
    isValidDate: (date) => {
        const dateObj = new Date(date);
        return dateObj instanceof Date && !isNaN(dateObj);
    }
};

/**
 * Request Validation Middleware
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
        const errors = [];

        Object.keys(schema).forEach(field => {
            const rules = schema[field];
            const value = req.body[field];

            // Required check
            if (rules.required && !value) {
                errors.push(`${field} is required`);
                return;
            }

            // Skip other validations if not required and empty
            if (!value && !rules.required) return;

            // Type validation
            if (rules.type === 'email' && !validators.isValidEmail(value)) {
                errors.push(`${field} must be a valid email`);
            }

            if (rules.type === 'phone' && !validators.isValidPhone(value)) {
                errors.push(`${field} must be a valid phone number (+255...)`);
            }

            if (rules.type === 'number' && !validators.isNumeric(value)) {
                errors.push(`${field} must be a number`);
            }

            // Min/Max validation
            if (rules.min !== undefined && value.length < rules.min) {
                errors.push(`${field} must be at least ${rules.min} characters`);
            }

            if (rules.max !== undefined && value.length > rules.max) {
                errors.push(`${field} must not exceed ${rules.max} characters`);
            }
        });

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                errors: errors
            });
        }

        next();
    };
};

module.exports = {
    csrfProtection,
    sanitizeInput,
    sanitizeBody,
    rateLimit,
    securityHeaders,
    validators,
    validateRequest
};
