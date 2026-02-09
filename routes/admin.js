// routes/admin.js - ORGANIZED & CLEANED
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// ==================== PUBLIC ROUTES (NO AUTH) ====================
router.get('/login', (req, res) => {
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

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('❌ Invalid password for:', email);
            return res.render('admin/login', {
                title: 'Ingia kama Admin - HotBando',
                error: 'Email au password si sahihi'
            });
        }

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
router.use(adminAuth);

// ==================== PAGE ROUTES (RENDER EJS) ====================
router.get('/dashboard', adminController.renderDashboardPage);
router.get('/users', adminController.renderUsersPage);
router.get('/vouchers', adminController.renderVouchersPage);
router.get('/video-ads', adminController.renderVideoAdsPage);
router.get('/upload-video', adminController.renderUploadVideoPage);
router.get('/analytics', adminController.renderAnalyticsPage);
router.get('/reports', adminController.renderReportsPage);
router.get('/settings', adminController.renderSettingsPage);
router.get('/my-ads', adminController.renderMyAdsPage);

// Static pages (no controller needed)
router.get('/approve-content', (req, res) => {
    res.render('admin/approve-content', {
        title: 'Idhini ya Maudhui',
        activePage: 'approve-content',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

router.get('/generate-vouchers', (req, res) => {
    res.render('admin/generate-vouchers', {
        title: 'Undaa Vouchers',
        activePage: 'generate-vouchers',
        userName: req.session.admin_user?.name || 'Admin'
    });
});

// New feature pages
router.get('/campaigns', (req, res) => {
    res.render('admin/campaigns', {
        title: 'Kampeni',
        activePage: 'campaigns',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/leads', (req, res) => {
    res.render('admin/leads', {
        title: 'Wateja Wapya',
        activePage: 'leads',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/wallet', (req, res) => {
    res.render('admin/wallet', {
        title: 'Pesa Yangu',
        activePage: 'wallet',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/locations', (req, res) => {
    res.render('admin/locations', {
        title: 'Maeneo',
        activePage: 'locations',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/routers', (req, res) => {
    res.render('admin/routers', {
        title: 'Routers',
        activePage: 'routers',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

router.get('/revenue-share', (req, res) => {
    res.render('admin/revenue-share', {
        title: 'Mgawanyo',
        activePage: 'revenue-share',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin'
    });
});

// ==================== API ROUTES (JSON RESPONSES) ====================

// 📊 DASHBOARD & ANALYTICS API
router.get('/dashboard-stats', adminController.dashboardStats);
router.get('/analytics-data', adminController.getAnalyticsData);
router.get('/reports-data', adminController.reportsData);

// 👥 USER MANAGEMENT API
router.get('/customers', adminController.getCustomers);
router.get('/online-customers', adminController.getOnlineCustomers);
router.post('/suspend-customer/:id', adminController.suspendCustomer);
router.post('/unsuspend/:id', adminController.unsuspendCustomer);
router.post('/adjust-subscription/:id', adminController.adjustCustomerSubscription);
router.delete('/delete-customer/:id', adminController.deleteCustomer);

// 📡 ROUTER MANAGEMENT API
router.get('/api/routers', adminController.getRouters);
router.get('/router-sessions/:routerID', adminController.getRouterSessions);
router.post('/reboot-router/:routerID', adminController.rebootRouter);

// 🎫 VOUCHER MANAGEMENT API
router.post('/generate-voucher', adminController.generateVoucher);
router.get('/batches', adminController.getBatches);
router.get('/vouchers/batch/:batchId', adminController.getVouchersByBatch);
router.get('/voucher-report', adminController.getVoucherReport);
router.get('/sales-summary', adminController.getSalesSummary);
router.get('/voucher-stats', adminController.getVoucherStats);

// 📢 ADVERTISEMENT MANAGEMENT API
router.get('/ads-approve', adminController.getAdsToApprove);
router.post('/approve-ad/:id', adminController.approveAd);
router.post('/decline-ad/:id', adminController.declineAd);
router.post('/create-ad', adminController.createAd);
router.put('/update-ad/:id', adminController.updateAd);
router.post('/upload-video', adminController.uploadVideo);
router.get('/video-ads', adminController.getVideoAds);

// ⚙️ SYSTEM & SETTINGS API
router.get('/system-settings', adminController.getSystemSettings);
router.put('/system-settings', adminController.updateSystemSettings);
router.get('/packages', adminController.getPackages);
router.get('/sponsors', adminController.getSponsors);

// 🔔 NOTIFICATIONS API
router.get('/notifications', adminController.getNotifications);
router.put('/notification-read/:id', adminController.markNotificationRead);

// ==================== LEGACY/COMPATIBILITY ROUTES ====================
// These are kept for backward compatibility

// Analytics compatibility routes
router.get('/api/admin/analytics', adminController.adminAnalytics);
router.get('/api/admin/ad-views-data', adminController.getAdViewsData);
router.get('/api/admin/analytics-stats', adminController.getAnalyticsStats);
router.get('/api/admin/ad-views', adminController.getAdViewsForAnalytics);

// Ads compatibility routes
router.get('/api/my-ads', adminController.getMyAdsAPI);

// Router compatibility routes
router.get('/router-health', adminController.getRouterHealth);
router.post('/add-router', adminController.addRouter);
router.put('/update-router/:id', adminController.updateRouter);

// Utility compatibility routes
router.get('/ad-views', adminController.getAdViewsData);

// Legacy user routes (deprecated - use new ones above)
router.post('/set-unlimited', adminController.setUnlimitedStatus);
router.delete('/users/:id', adminController.deleteUser);
router.get('/user-stats', adminController.getUserStats);

module.exports = router;