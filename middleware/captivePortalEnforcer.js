/**
 * Captive Portal Enforcer Middleware
 * 
 * This middleware ensures that:
 * 1. All unauthenticated WiFi users see the login page
 * 2. No user can bypass login to access dashboard or internet
 * 3. Direct access to protected resources requires authentication
 */

/**
 * Check if user is authenticated
 * Returns true if user has valid session
 */
const isAuthenticated = (req) => {
  return req.session && req.session.hotbando_user && req.session.hotbando_user.id;
};

/**
 * Middleware: Check if WiFi device is authenticated
 * If not authenticated, redirect to login or show portal status
 */
const ensureWiFiAuth = (req, res, next) => {
  // If user is authenticated, continue
  if (isAuthenticated(req)) {
    return next();
  }

  // Check if this is a captive portal detection request
  const path = req.path.toLowerCase();
  const isPortalDetection = [
    '/generate_204',
    '/ncsi.txt',
    '/hotspotdetect.html',
    '/captive.portal',
    '/connectivity-check'
  ].some(p => path.includes(p));

  if (isPortalDetection) {
    // Return 200 to indicate captive portal exists
    return res.status(200).send('Portal Detection');
  }

  // Check if requesting the login page itself
  if (path.includes('/hotspot/login') || path.includes('/hotspot') && !path.includes('/api')) {
    return next(); // Let Vue router handle it
  }

  // Check if requesting API login
  if (path.includes('/api/hotspot/login') || path.includes('/api/hotspot/register')) {
    return next(); // Public API endpoints
  }

  // For all other requests without authentication, show portal
  const referrer = req.get('referer') || '';
  const isAjax = req.xhr || req.get('accept') === 'application/json';

  if (isAjax) {
    // AJAX request: return 401
    return res.status(401).json({
      error: 'Unauthenticated',
      message: 'Please login to the WiFi portal first',
      redirect: '/hotspot/login'
    });
  }

  // Regular browser request: redirect to login
  return res.redirect('/hotspot/login');
};

/**
 * Middleware: Block dashboard access without auth
 */
const protectDashboard = (req, res, next) => {
  if (!isAuthenticated(req)) {
    const isAjax = req.xhr || req.get('accept') === 'application/json';
    if (isAjax) {
      return res.status(401).json({
        error: 'Session Expired',
        message: 'Tafadhali ingia kwenye akaunti yako tena.',
        redirect: '/hotspot/login'
      });
    }
    return res.redirect('/hotspot/login');
  }
  next();
};

/**
 * Middleware: Block API access without auth
 */
const protectAPI = (req, res, next) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
      code: 'UNAUTHENTICATED'
    });
  }
  next();
};

module.exports = {
  isAuthenticated,
  ensureWiFiAuth,
  protectDashboard,
  protectAPI
};
