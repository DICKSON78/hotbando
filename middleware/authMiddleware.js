// middleware/authMiddleware.js — Unified RBAC system
//
// Session keys: admin_user, sponsor_user, bank_user, franchise_user, reseller_user, investor_user, hotbando_user
// Every login sets exactly one key. authenticate() reads all of them.

const SESSION_ROLE_MAP = [
    ['admin_user',     ['admin', 'super_admin']],
    ['sponsor_user',   ['sponsor']],
    ['bank_user',      ['bank_partner']],
    ['franchise_user', ['franchise_owner']],
    ['reseller_user',  ['reseller']],
    ['investor_user',  ['investor']],
    ['hotbando_user',  ['customer']]
];

/**
 * Extract the current user from any session key.
 * Attaches req.user with { id, name, email, role, ... }
 */
function authenticate(req, res, next) {
    for (const [key, allowedRoles] of SESSION_ROLE_MAP) {
        const u = req.session[key];
        if (u && allowedRoles.includes(u.role)) {
            req.user = { ...u };
            return next();
        }
    }
    // No valid session found
    if (req.originalUrl.includes('/api/')) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    return res.redirect('/login');
}

/**
 * Require one or more roles. Must be used AFTER authenticate().
 * Usage: router.get('/foo', authenticate, requireRole('admin', 'super_admin'), handler)
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            if (req.originalUrl.includes('/api/')) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }
            return res.redirect('/login');
        }
        if (!roles.includes(req.user.role)) {
            if (req.originalUrl.includes('/api/')) {
                return res.status(403).json({ success: false, message: 'Insufficient permissions' });
            }
            // Redirect to the correct portal for their role
            const portalRedirect = getDashboardRoute(req.user.role);
            return res.redirect(portalRedirect);
        }
        next();
    };
}

/**
 * Map role → dashboard route
 */
function getDashboardRoute(role) {
    const routes = {
        admin: '/admin/dashboard',
        super_admin: '/admin/dashboard',
        sponsor: '/sponsor/dashboard',
        bank_partner: '/bank/dashboard',
        franchise_owner: '/franchise/dashboard',
        reseller: '/reseller/dashboard',
        investor: '/investor/dashboard',
        customer: '/hotspot/dashboard'
    };
    return routes[role] || '/login';
}

// ==================== Backward-compatible wrappers ====================

/**
 * Admin auth — admin or super_admin only
 */
function adminAuth(req, res, next) {
    for (const [key] of [['admin_user']]) {
        const u = req.session[key];
        if (u && (u.role === 'admin' || u.role === 'super_admin')) {
            req.user = { ...u };
            return next();
        }
    }
    if (req.originalUrl.includes('/api/')) {
        return res.status(401).json({ success: false, message: 'Admin access required' });
    }
    return res.redirect('/login');
}

/**
 * Sponsor auth — sponsor, bank_partner, admin, super_admin
 */
function sponsorAuth(req, res, next) {
    const allowed = ['sponsor', 'bank_partner', 'admin', 'super_admin'];
    for (const [key] of SESSION_ROLE_MAP) {
        const u = req.session[key];
        if (u && allowed.includes(u.role)) {
            req.user = { ...u };
            return next();
        }
    }
    if (req.originalUrl.includes('/api/')) {
        return res.status(401).json({ success: false, message: 'Partner access required' });
    }
    return res.redirect('/login');
}

/**
 * Franchise auth — franchise_owner, admin, super_admin
 */
function franchiseAuth(req, res, next) {
    const allowed = ['franchise_owner', 'admin', 'super_admin'];
    for (const [key] of SESSION_ROLE_MAP) {
        const u = req.session[key];
        if (u && allowed.includes(u.role)) {
            req.user = { ...u };
            return next();
        }
    }
    if (req.originalUrl.includes('/api/')) {
        return res.status(401).json({ success: false, message: 'Franchise access required' });
    }
    return res.redirect('/login');
}

/**
 * Bank partner auth — bank_partner, admin, super_admin
 */
function bankAuth(req, res, next) {
    const allowed = ['bank_partner', 'admin', 'super_admin'];
    for (const [key] of SESSION_ROLE_MAP) {
        const u = req.session[key];
        if (u && allowed.includes(u.role)) {
            req.user = { ...u };
            return next();
        }
    }
    if (req.originalUrl.includes('/api/')) {
        return res.status(401).json({ success: false, message: 'Bank partner access required' });
    }
    return res.redirect('/login');
}

/**
 * Reseller auth — reseller only (plus admin/super_admin for management)
 */
function resellerAuth(req, res, next) {
    const allowed = ['reseller', 'admin', 'super_admin'];
    for (const [key] of SESSION_ROLE_MAP) {
        const u = req.session[key];
        if (u && allowed.includes(u.role)) {
            req.user = { ...u };
            return next();
        }
    }
    if (req.originalUrl.includes('/api/')) {
        return res.status(401).json({ success: false, message: 'Reseller access required' });
    }
    return res.redirect('/login');
}

/**
 * Investor auth — investor, admin, super_admin, franchise_owner
 */
function investorAuth(req, res, next) {
    const allowed = ['investor', 'admin', 'super_admin', 'franchise_owner'];
    for (const [key] of SESSION_ROLE_MAP) {
        const u = req.session[key];
        if (u && allowed.includes(u.role)) {
            req.user = { ...u };
            return next();
        }
    }
    if (req.originalUrl.includes('/api/')) {
        return res.status(401).json({ success: false, message: 'Investor access required' });
    }
    return res.redirect('/login');
}

/**
 * Customer auth — customer only
 */
function customerAuth(req, res, next) {
    const u = req.session.hotbando_user;
    if (u && u.role === 'customer') {
        req.user = { ...u };
        return next();
    }
    if (req.originalUrl.includes('/api/')) {
        return res.status(401).json({ success: false, message: 'Customer login required' });
    }
    return res.redirect('/hotspot/login');
}

module.exports = {
    // New unified RBAC
    authenticate,
    requireRole,
    getDashboardRoute,
    SESSION_ROLE_MAP,
    // Backward-compatible
    adminAuth,
    sponsorAuth,
    customerAuth,
    franchiseAuth,
    bankAuth,
    resellerAuth,
    investorAuth
};
