// middleware/authMiddleware.js
const adminAuth = (req, res, next) => {
    // Check if user is authenticated as admin
    if (req.session.admin_user && req.session.admin_user.role === 'admin') {
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
        '/set-unlimited', '/user-stats'
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

const sponsorAuth = (req, res, next) => {
    if (req.session.admin_user && 
        (req.session.admin_user.role === 'sponsor' || req.session.admin_user.role === 'admin')) {
        return next();
    }
    
    const sponsorRoutes = ['/my-ads', '/create-ad', '/update-ad'];
    const isSponsorRequest = sponsorRoutes.some(route => req.originalUrl.includes(route));

    if (isSponsorRequest) {
        return res.status(401).json({ 
            success: false, 
            message: 'Unauthorized: Sponsor or Admin access required' 
        });
    }
    
    return res.redirect('/admin/login');
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

module.exports = { adminAuth, sponsorAuth, customerAuth };