// index.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/database');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: 'hotbando-secret-key-2025',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

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

// Use routes
app.use('/hotspot', hotspotRoutes);
app.use('/admin', adminRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/revenue-share', revenueShareRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/public', publicRoutes);

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
    console.log(`🚀 HotBando server inafanya kazi kwenye http://localhost:${PORT}`);
    console.log(`📱 Hotspot: http://localhost:${PORT}/hotspot`);
    console.log(`👨‍💼 Admin: http://localhost:${PORT}/admin`);
    console.log(` Mfumo upo tayari kutumika!`);
});