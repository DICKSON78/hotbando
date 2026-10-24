// index.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const db = require('./config/database');
const { connectRedis } = require('./config/redis');
const { securityHeaders, sanitizeBody, rateLimit, csrfProtection } = require('./middleware/security');

const app = express();

// Trust the first proxy hop (nginx in front). This makes req.ip the real
// client IP so rate limiting/session tracking are per-user, not shared.
app.set('trust proxy', 1);

// Hardened security headers via Helmet (applied before custom headers)
app.use(helmet({
    contentSecurityPolicy: false, // Custom CSP handled below for SPA/CDN flexibility
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Custom security headers (CSP + extra protections)
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
});
app.use(securityHeaders);

// Rate limiting for API endpoints (generous: hotspots share IPs via NAT/CGNAT)
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeBody);

// CSRF protection for state-changing requests (skip webhooks/zero-touch/public provisioning)
app.use((req, res, next) => {
    const skipPaths = [
        '/api/payments/ipn',
        '/api/payments/callback',
        '/api/clickpesa/webhook',
        '/api/clickpesa/ussd-webhook'
    ];
    if (skipPaths.some(p => req.path === p || req.path.startsWith(p + '/'))) {
        return next();
    }
    if (req.path.startsWith('/api/zero-touch/')) {
        return next();
    }
    // Skip for some public endpoints that don't use sessions
    if (req.path === '/api/packages' && req.method === 'GET') {
        return next();
    }
    return csrfProtection.validate(req, res, next);
});

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

const isProd = process.env.NODE_ENV === 'production';
app.use(session({
    key: 'hotbando_session',
    secret: process.env.SESSION_SECRET || require('crypto').randomBytes(64).toString('hex'),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: isProd ? true : 'auto', // HTTPS when behind proxy, HTTP otherwise
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProd ? 'lax' : 'lax',
        path: '/'
    },
    name: 'hotbando.sid'
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
const mikrotikSetupRoutes = require('./routes/mikrotikSetup');
const sponsorRoutes = require('./routes/sponsor');
const investorRoutes = require('./routes/investor');
const resellerRoutes = require('./routes/reseller');
const clickpesaRoutes = require('./routes/clickpesa');
const hqRoutes = require('./routes/hq');
const paymentController = require('./controllers/paymentController');

// Vue SPA build — served for ALL portals
const frontendDist = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendDist, { index: false }));

// Return 404 for missing static assets instead of falling through to SPA catch-all
app.use('/assets', (req, res) => {
    res.set('Content-Type', 'application/json');
    res.status(404).json({ error: 'Asset not found' });
});

function serveSPA(req, res) {
    const indexFile = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexFile)) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.sendFile(indexFile);
    } else {
        res.status(404).json({ error: 'Frontend not built. Run: cd frontend && npm run build' });
    }
}

// ALL API routes FIRST (before SPA catch-all)
app.use('/api/hotspot', hotspotApiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/revenue-share', revenueShareRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/routers', routerRoutes);
app.use('/api/setup-wizard', setupWizardRoutes);
app.use('/api/auto-detect', autoDetectRoutes);
app.use('/api/admin/mikrotik-setup', mikrotikSetupRoutes);

// Zero-touch router provisioning (public, secret-gated)
const zeroTouchRoutes = require('./routes/zeroTouch');
app.use('/api/zero-touch', zeroTouchRoutes);

const businessRoutes = require('./routes/business');
app.use('/api/admin/business', businessRoutes);
app.use('/api/investor', investorRoutes);
app.use('/api/reseller', resellerRoutes);
app.use('/api/clickpesa', clickpesaRoutes);

// Public packages listing (used by reseller portal)
app.get('/api/packages', async (req, res) => {
  try {
    const db = require('./config/database');
    const [packages] = await db.execute('SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC');
    res.json({ success: true, packages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load packages' });
  }
});

// Legacy EJS portal routes (SPA handles all /hotspot/* now — only POST API routes kept)
const hotspotEjsApi = require('./routes/hotspot');
app.use('/hotspot', (req, res, next) => {
    // Only allow POST/PUT/DELETE through the legacy route handlers
    // GET /hotspot/* is handled by the SPA (Vue router)
    if (req.method === 'GET') return next();
    hotspotEjsApi(req, res, next);
});
app.use('/sponsor', sponsorRoutes);

// PesaPal webhooks (must be raw/query based - handled in controller)
app.get('/api/payments/callback', paymentController.paymentCallback);
app.get('/api/payments/ipn', paymentController.paymentIPN);
app.post('/api/payments/ipn', paymentController.paymentIPN);

// ==================== Website / portal auth API (JSON) ====================

const DASHBOARD_ROUTES = {
    admin: '/admin/dashboard',
    super_admin: '/admin/dashboard',
    sponsor: '/sponsor/dashboard',
    bank_partner: '/bank/dashboard',
    franchise_owner: '/franchise/dashboard',
    reseller: '/reseller/dashboard',
    investor: '/investor/dashboard'
};

function currentSessionUser(req) {
    const map = [
        ['admin_user', 'admin'],
        ['sponsor_user', 'sponsor'],
        ['bank_user', 'bank_partner'],
        ['franchise_user', 'franchise_owner'],
        ['reseller_user', 'reseller'],
        ['investor_user', 'investor'],
        ['hotbando_user', 'customer']
    ];
    for (const [field, role] of map) {
        const u = req.session[field];
        if (u) return { ...u, role: u.role || role };
    }
    return null;
}

// GET /api/me — current logged-in user (never 401s)
app.get('/api/me', (req, res) => {
    const user = currentSessionUser(req);
    if (!user) return res.json({ user: null });
    res.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone_number: user.phone_number,
            location: user.location
        },
        redirect: DASHBOARD_ROUTES[user.role] || (user.role === 'customer' ? '/hotspot/dashboard' : '/login')
    });
});

// POST /api/login — JSON login for all partner/admin accounts
app.post('/api/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, key: (req) => (req.body && req.body.email) || '' }),
  rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }),
  async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const bcrypt = require('bcryptjs');
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ? AND role IN ("admin","super_admin","sponsor","bank_partner","franchise_owner","reseller","investor") AND is_active = 1',
            [email]
        );
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const user = users[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Build session data
        const sessionData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone_number: user.phone_number,
            location: user.location,
            login_time: new Date()
        };
        delete sessionData.password;
        // Regenerate session ID to prevent session fixation
        await new Promise((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        // Set role-specific session key (exactly one per login)
        if (user.role === 'admin' || user.role === 'super_admin') req.session.admin_user = sessionData;
        else if (user.role === 'sponsor') req.session.sponsor_user = sessionData;
        else if (user.role === 'bank_partner') req.session.bank_user = sessionData;
        else if (user.role === 'franchise_owner') req.session.franchise_user = sessionData;
        else if (user.role === 'reseller') req.session.reseller_user = sessionData;
        else if (user.role === 'investor') req.session.investor_user = sessionData;
        res.json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role, phone_number: user.phone_number, location: user.location },
            redirect: DASHBOARD_ROUTES[user.role] || '/login'
        });
    } catch (err) {
        console.error('API login error:', err.message);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

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

// All portal paths → Vue SPA (AFTER all API routes)
app.get(['/hotspot', '/hotspot/*'], serveSPA);
app.get(['/admin', '/admin/*'], serveSPA);
app.get(['/franchise', '/franchise/*'], serveSPA);
app.get(['/sponsor', '/sponsor/*'], serveSPA);
app.get(['/bank', '/bank/*'], serveSPA);
app.get(['/reseller', '/reseller/*'], serveSPA);
app.get(['/investor', '/investor/*'], serveSPA);
app.get(['/login'], serveSPA);
app.get(['/services', '/pricing', '/about', '/partners', '/contact'], serveSPA);

// Home route — the hotspot portal lives at the root
app.get('/', (req, res, next) => {
    const indexFile = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexFile)) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.sendFile(indexFile);
    } else {
        next();
    }
});

// Admin login handled by Vue SPA at /login

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
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
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

        // Start background scheduler for expired package disconnection
        const expiryScheduler = require('./utils/expiryScheduler');
        expiryScheduler.start(60000); // Check every 60 seconds
    });
}).catch(() => {
    app.listen(PORT, () => {
        const logger = require('./utils/logger');
        logger.warn('Starting without Redis');
        logger.info(`HotBando server started on http://localhost:${PORT}`);

        const expiryScheduler = require('./utils/expiryScheduler');
        expiryScheduler.start(60000);
    });
});