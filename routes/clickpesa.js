const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clickpesaController');

// Admin-only auth middleware
function requireAdmin(req, res, next) {
  const user = req.session?.admin_user || req.session?.user;
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.post('/pay', ctrl.initiatePayment);
router.post('/preview', ctrl.previewPayment);
router.get('/status/:orderReference', ctrl.checkStatus);
router.get('/confirm/:orderReference', ctrl.confirmPayment);
router.post('/webhook', express.raw({ type: 'application/json' }), ctrl.webhook);
router.get('/transactions', requireAdmin, ctrl.getTransactions);
router.get('/balance', requireAdmin, ctrl.getBalance);

module.exports = router;
