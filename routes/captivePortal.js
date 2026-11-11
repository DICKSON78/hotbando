/**
 * Captive Portal Routes - Handles the redirect and login flow
 * This ensures users MUST authenticate before accessing internet
 */

const express = require('express');
const router = express.Router();

/**
 * Captive Portal Detection Route
 * MikroTik redirects users here when they first connect
 * 
 * Examples:
 * - http://example.com/hotspot/redirect (MikroTik redirect)
 * - http://192.168.1.1:8900/ (HotBando Portal)
 * - http://hotbandowifi.online/hotspot (Our portal)
 */
router.get('/redirect', (req, res) => {
  // MikroTik commonly redirects to this
  // We send back HTML that loads our Vue app
  res.redirect('/hotspot');
});

/**
 * Common captive portal check routes
 * Many devices make these requests to detect captive portal
 */
router.get('/generate_204', (req, res) => {
  // Android device captive portal check
  // If not authenticated, should return 200 (there IS captive portal)
  if (!req.session.hotbando_user) {
    return res.status(200).send(); // Yes, there's a captive portal
  }
  // If authenticated, return 204 (no portal)
  res.status(204).send();
});

router.get('/ncsi.txt', (req, res) => {
  // Windows captive portal check
  if (!req.session.hotbando_user) {
    return res.status(200).send('Microsoft NCSI');
  }
  res.status(204).send();
});

router.get('/hotspotdetect.html', (req, res) => {
  // Apple captive portal check
  if (!req.session.hotbando_user) {
    return res.status(200).send('<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>');
  }
  res.status(204).send();
});

/**
 * Status endpoint
 * Shows user's authentication status
 */
router.get('/status', (req, res) => {
  const user = req.session.hotbando_user;
  res.json({
    authenticated: !!user,
    user: user ? {
      id: user.id,
      name: user.name,
      phone: user.phone_number,
      package: user.package
    } : null,
    onWifi: !!req.session.onWifi,
    timestamp: new Date().toISOString()
  });
});

/**
 * Logout Endpoint
 * Clears user session completely
 */
router.get('/logout', async (req, res) => {
  const user = req.session.hotbando_user;
  
  // Disconnect from router first (best-effort; capped by the operation timeout
  // inside the mikrotik service so an unreachable router can't stall logout)
  if (user && user.mac_address && user.last_router_id) {
    try {
      const mikrotikService = require('../utils/mikrotik');
      await mikrotikService.removeUserFromRouter(user.mac_address, user.last_router_id);
    } catch (e) {
      console.warn('Router disconnect during logout failed:', e.message);
    }
  }
  
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    // Redirect to login
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

module.exports = router;
