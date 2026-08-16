// index.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const db = require('./config/database');
const { connectRedis } = require('./config/redis');
const { securityHeaders, sanitizeBody, rateLimit, csrfProtection } = require('./middleware/security');

const app = express();

// Security headers (apply first)
app.use(securityHeaders);

// Rate limiting for API endpoints
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeBody);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const MySQLStore = require('express-mysql-session')(session);
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotbando',
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 minutes
    expiration: 86400000 // 24 hours
});

app.use(session({
    key: 'hotbando_session',
    secret: process.env.SESSION_SECRET || 'hotbando-secret-key-2025',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: 'auto', // HTTPS when behind proxy, HTTP otherwise
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
    }
}));

// Make CSRF token available to all views
app.use((req, res, next) => {
    res.locals.csrfToken = csrfProtection.generateToken(req);
    res.locals.user = req.session.user || req.session.admin_user || null;
    next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const hotspotRoutes = require('./routes/hotspot');
const hotspotApiRoutes = require('./routes/hotspotApi');
const adminRoutes = require('./routes/admin');
const campaignRoutes = require('./routes/campaignRoutes');
const walletRoutes = require('./routes/walletRoutes');
const revenueShareRoutes = require('./routes/revenueShareRoutes');
const locationRoutes = require('./routes/locationRoutes');
const publicRoutes = require('./routes/publicRoutes');
const routerRoutes = require('./routes/routerRoutes');
const setupWizardRoutes = require('./routes/setupWizard');
const autoDetectRoutes = require('./routes/autoDetect');
const sponsorRoutes = require('./routes/sponsor');
const paymentController = require('./controllers/paymentController');

// Use routes
app.use('/api/hotspot', hotspotApiRoutes);

// Vue SPA build (served for the hotspot user experience)
const frontendDist = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendDist, { index: false }));
app.get(['/hotspot', '/hotspot/*'], (req, res, next) => {
    const indexFile = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
    } else {
        next();
    }
});

app.use('/hotspot', hotspotRoutes);
app.use('/admin', adminRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/revenue-share', revenueShareRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/routers', routerRoutes);
app.use('/api/setup-wizard', setupWizardRoutes);
app.use('/api/auto-detect', autoDetectRoutes);
app.use('/sponsor', sponsorRoutes);

// PesaPal webhooks (must be raw/query based - handled in controller)
app.get('/api/payments/callback', paymentController.paymentCallback);
app.get('/api/payments/ipn', paymentController.paymentIPN);
app.post('/api/payments/ipn', paymentController.paymentIPN);

// Health check endpoint (used by Docker healthcheck)
app.get('/health', async (req, res) => {
    const health = { status: 'ok', uptime: process.uptime() };
    try {
        const db = require('./config/database');
        await db.query('SELECT 1');
        health.database = 'connected';
    } catch (err) {
        health.database = 'disconnected';
        health.status = 'degraded';
    }
    try {
        const { getRedisClient } = require('./config/redis');
        const redis = getRedisClient();
        if (redis && redis.status === 'ready') {
            await redis.ping();
            health.redis = 'connected';
        } else {
            health.redis = 'unavailable';
        }
    } catch (err) {
        health.redis = 'disconnected';
    }
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

// Home route
app.get('/', (req, res) => {
    res.redirect('/hotspot');
});

// Admin login route (fallback)
app.get('/admin/login', (req, res) => {
    if (req.session.admin_user) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', {
        title: 'Ingia kama Admin - HotBando',
        error: null
    });
});

// Simple 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Ukurasa Haupo',
        message: 'Ukurasa ulioutafuta haupo au umehamishwa.',
        showAdminLogin: true
    });
});

// Simple error handler
app.use((err, req, res, next) => {
    const logger = require('./utils/logger');
    logger.error('Server Error:', { message: err.message, stack: err.stack });
    res.status(500).render('error', {
        title: 'Hitilafu ya Mfumo',
        message: 'Kumetokea hitilafu kwenye server. Tafadhali jaribu tena baadaye.',
        showAdminLogin: true
    });
});

const PORT = process.env.PORT || 3000;

// Connect Redis before starting server
connectRedis().then(() => {
    app.listen(PORT, () => {
        const logger = require('./utils/logger');
        logger.info(`HotBando server started on http://localhost:${PORT}`);
        logger.info(`Hotspot: http://localhost:${PORT}/hotspot`);
        logger.info(`Admin: http://localhost:${PORT}/admin`);
    });
}).catch(() => {
    app.listen(PORT, () => {
        const logger = require('./utils/logger');
        logger.warn('Starting without Redis');
        logger.info(`HotBando server started on http://localhost:${PORT}`);
    });
});