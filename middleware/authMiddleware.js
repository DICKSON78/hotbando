// middleware/authMiddleware.js

/**
 * Admin authentication - requires admin or super_admin role
 */
const adminAuth = (req, res, next) => {
    const user = req.session.admin_user;

    // Check if user is authenticated as admin or super_admin
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
        return next();
    }

    // Don't redirect for login page itself
    if (req.originalUrl === '/admin/login' || req.originalUrl === '/admin/login/') {
        return next();
    }

    // List of API routes that require admin auth
    const apiRoutes = [
        '/dashboard-stats', '/analytics-data', '/reports-data',
        '/generate-voucher', '/batches', '/vouchers/', '/voucher-report', '/sales-summary',
        '/customers', '/online-customers', '/suspend/', '/unsuspend/', '/adjust-subscription/', '/customer/',
        '/ads-approve', '/approve-ad/', '/decline-ad/', '/my-ads-data', '/create-ad', '/update-ad/',
        '/routers', '/router-health', '/router-sessions/', '/add-router', '/update-router/', '/reboot-router/',
        '/system-settings', '/notifications', '/notification-read/',
        '/ad-views', '/sponsors', '/packages',
        '/set-unlimited', '/user-stats',
        '/api/campaigns/admin', '/api/wallet/admin', '/api/revenue-share/admin', '/api/locations'
    ];

    const isApiRequest = apiRoutes.some(route => req.originalUrl.includes(route));

    if (isApiRequest) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Admin access required'
        });
    }

    // For page requests, redirect to login
    console.log('🔐 Redirecting to login from:', req.originalUrl);
    return res.redirect('/admin/login');
};

/**
 * Sponsor authentication - allows sponsors, bank partners, and admins
 */
const sponsorAuth = (req, res, next) => {
    const user = req.session.sponsor_user || req.session.bank_user || req.session.admin_user;

    if (user && ['sponsor', 'bank_partner', 'admin', 'super_admin'].includes(user.role)) {
        return next();
    }

    const isApiRequest = req.originalUrl.includes('/api/');

    if (isApiRequest) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Partner access required'
        });
    }

    return res.redirect('/admin/login');
};

/**
 * Franchise owner authentication
 */
const franchiseAuth = (req, res, next) => {
    const user = req.session.franchise_user || req.session.admin_user;

    if (user && ['franchise_owner', 'admin', 'super_admin'].includes(user.role)) {
        return next();
    }

    const isApiRequest = req.originalUrl.includes('/api/');

    if (isApiRequest) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Franchise owner access required'
        });
    }

    return res.redirect('/franchise/login');
};

/**
 * Bank partner authentication
 */
const bankAuth = (req, res, next) => {
    const user = req.session.bank_user || req.session.admin_user;

    if (user && ['bank_partner', 'admin', 'super_admin'].includes(user.role)) {
        return next();
    }

    const isApiRequest = req.originalUrl.includes('/api/');

    if (isApiRequest) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Bank partner access required'
        });
    }

    return res.redirect('/bank/login');
};

const customerAuth = (req, res, next) => {
    if (req.session.hotbando_user && req.session.hotbando_user.role === 'customer') {
        return next();
    }
    
    if (req.originalUrl.includes('/api/')) {
        return res.status(401).json({ 
            success: false, 
            message: 'Unauthorized: Please login first' 
        });
    }
    
    return res.redirect('/hotspot/login');
};

module.exports = {
    adminAuth,
    sponsorAuth,
    customerAuth,
    franchiseAuth,
    bankAuth
};