// index.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/database');
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
        secure: process.env.NODE_ENV === 'production',
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
const adminRoutes = require('./routes/admin');
const campaignRoutes = require('./routes/campaignRoutes');
const walletRoutes = require('./routes/walletRoutes');
const revenueShareRoutes = require('./routes/revenueShareRoutes');
const locationRoutes = require('./routes/locationRoutes');
const publicRoutes = require('./routes/publicRoutes');
const routerRoutes = require('./routes/routerRoutes');

// Use routes
app.use('/hotspot', hotspotRoutes);
app.use('/admin', adminRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/revenue-share', revenueShareRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/routers', routerRoutes);

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
    console.error('Server Error:', err);
    res.status(500).render('error', {
        title: 'Hitilafu ya Mfumo',
        message: 'Kumetokea hitilafu kwenye server. Tafadhali jaribu tena baadaye.',
        showAdminLogin: true
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`HotBando server inafanya kazi kwenye http://localhost:${PORT}`);
    console.log(`Hotspot: http://localhost:${PORT}/hotspot`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
    console.log(` Mfumo upo tayari kutumika!`);
});