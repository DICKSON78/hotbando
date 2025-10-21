// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// ==================== ADMIN LOGIN ROUTES (NO AUTH) ====================
router.get('/login', (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session.admin_user) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', {
        title: 'Ingia kama Admin - HotBando',
        error: null
    });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Login attempt:', { email });
        
        if (!email || !password) {
            return res.render('admin/login', {
                title: 'Ingia kama Admin - HotBando',
                error: 'Tafadhali ingiza email na password'
            });
        }

        // Check if user exists and is admin
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ? AND role = "admin"',
            [email]
        );

        if (users.length === 0) {
            console.log('❌ Admin not found:', email);
            return res.render('admin/login', {
                title: 'Ingia kama Admin - HotBando',
                error: 'Email au password si sahihi'
            });
        }

        const user = users[0];
        console.log('✅ Admin found:', user.name);

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('❌ Invalid password for:', email);
            return res.render('admin/login', {
                title: 'Ingia kama Admin - HotBando',
                error: 'Email au password si sahihi'
            });
        }

        // Set admin session
        req.session.admin_user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            location: user.location,
            login_time: new Date()
        };

        console.log(`✅ Admin ${user.name} logged in successfully`);
        return res.redirect('/admin/dashboard');

    } catch (error) {
        console.error('❌ Admin login error:', error);
        return res.render('admin/login', {
            title: 'Ingia kama Admin - HotBando',
            error: 'Hitilafu imetokea. Tafadhali jaribu tena.'
        });
    }
});

router.post('/logout', (req, res) => {
    console.log('👋 Admin logging out');
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        return res.redirect('/admin/login');
    });
});

// ==================== PROTECTED ROUTES (WITH AUTH) ====================

// Apply admin auth middleware to ALL routes below this line
router.use(adminAuth);

// ==================== EJS PAGE ROUTES ====================
router.get('/dashboard', (req, res) => {
    res.render('admin/dashboard', {
        title: 'Dashibodi',
        activePage: 'dashboard',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

router.get('/my-ads', (req, res) => {
    res.render('admin/my-ads', {
        title: 'Matangazo Yangu',
        activePage: 'my-ads',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

router.get('/upload-video', async (req, res) => {
    try {
        const [sponsors] = await db.execute('SELECT id, name FROM users WHERE role = "sponsor"');
        
        res.render('admin/upload-video', {
            title: 'Pakia Video',
            activePage: 'upload-video',
            userName: req.session.admin_user?.name || 'Admin',
            sponsors: sponsors
        });
    } catch (error) {
        res.render('admin/upload-video', {
            title: 'Pakia Video',
            activePage: 'upload-video',
            userName: req.session.admin_user?.name || 'Admin',
            sponsors: []
        });
    }
});

router.get('/analytics', (req, res) => {
    res.render('admin/analytics', {
        title: 'Takwimu za Matangazo',
        activePage: 'analytics',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

router.get('/approve-content', (req, res) => {
    res.render('admin/approve-content', {
        title: 'Idhini ya Maudhui',
        activePage: 'approve-content',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

router.get('/reports', (req, res) => {
    res.render('admin/reports', {
        title: 'Ripoti',
        activePage: 'reports',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

router.get('/users', (req, res) => {
    res.render('admin/users', {
        title: 'Watumiaji',
        activePage: 'users',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

router.get('/settings', (req, res) => {
    res.render('admin/settings', {
        title: 'Mipangilio',
        activePage: 'settings',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

// ... (REST OF YOUR API ROUTES REMAIN THE SAME) ...
// ==================== API ROUTES ====================

// Dashboard & Analytics
router.get('/dashboard-stats', adminController.dashboardStats);
router.get('/analytics-data', adminController.adminAnalytics);
router.get('/reports-data', adminController.reportsData);

// Voucher routes
router.post('/generate-voucher', adminController.generateVoucher);
router.get('/batches', adminController.getBatches);
router.get('/vouchers/batch/:batchId', adminController.getVouchersByBatch);
router.get('/voucher-report', adminController.getVoucherReport);
router.get('/sales-summary', adminController.getSalesSummary);

// User management
router.get('/customers', adminController.getCustomers);
router.get('/online-customers', adminController.getOnlineCustomers);
router.post('/suspend/:id', adminController.suspendCustomer);
router.post('/unsuspend/:id', adminController.unsuspendCustomer);
router.post('/adjust-subscription/:id', adminController.adjustCustomerSubscription);
router.delete('/customer/:id', adminController.deleteCustomer);

// Advertisement routes
router.get('/ads-approve', adminController.getAdsToApprove);
router.post('/approve-ad/:id', adminController.approveAd);
router.post('/decline-ad/:id', adminController.declineAd);
router.get('/my-ads-data', adminController.getMyAds);
router.post('/create-ad', adminController.createAd);
router.put('/update-ad/:id', adminController.updateAd);

// Router management
router.get('/routers', adminController.getRouters);
router.get('/router-health', adminController.getRouterHealth);
router.get('/router-sessions/:routerID', adminController.getRouterSessions);
router.post('/add-router', adminController.addRouter);
router.put('/update-router/:id', adminController.updateRouter);
router.post('/reboot-router/:routerID', adminController.rebootRouter);

// System settings
router.get('/system-settings', adminController.getSystemSettings);
router.put('/system-settings', adminController.updateSystemSettings);

// Notifications
router.get('/notifications', adminController.getNotifications);
router.put('/notification-read/:id', adminController.markNotificationRead);

// EJS Compatibility
router.get('/ad-views', adminController.getAdViewsData);
router.get('/sponsors', adminController.getSponsors);
router.get('/packages', adminController.getPackages);

// Legacy API routes
router.post('/set-unlimited', adminController.setUnlimitedStatus);
router.delete('/users/:id', adminController.deleteUser);
router.get('/user-stats', adminController.getUserStats);

module.exports = router;