// routes/admin.js - ORGANIZED & CLEANED
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuthController = require('../controllers/adminAuthController');
const { adminAuth } = require('../middleware/authMiddleware');

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

router.post('/login', (req, res) => adminAuthController.login(req, res));
router.post('/logout', (req, res) => adminAuthController.logout(req, res));

// Password change (session required but not full admin auth - redirects to login if no session)
router.get('/change-password', (req, res) => adminAuthController.showChangePassword(req, res));
router.post('/change-password', (req, res) => adminAuthController.changePassword(req, res));

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

router.get('/setup-wizard', (req, res) => {
    res.render('admin/setup-wizard', {
        title: 'Setup Wizard',
        activePage: 'setup-wizard',
        userName: req.session.admin_user?.name || 'Admin',
        userRole: req.session.admin_user?.role || 'admin',
        hotspotAdminPassword: process.env.HOTSPOT_ADMIN_PASSWORD || 'hotbando2024'
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
router.get('/api/video-ads', adminController.getVideoAds);

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