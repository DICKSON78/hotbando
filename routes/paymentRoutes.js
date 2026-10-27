/**
 * Pesapal payment routes
 *
 * Callback/IPN endpoints must stay public (Pesapal calls them server-to-server).
 * Everything else requires the unified portal session.
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Public gateway callbacks (also covered by the CSRF skip list in index.js)
router.get('/callback', paymentController.paymentCallback);
router.get('/ipn', paymentController.paymentIPN);
router.post('/ipn', paymentController.paymentIPN);

// Customer package purchases
router.post(
  '/initiate',
  authenticate,
  requireRole('customer'),
  paymentController.initiatePayment
);

// Reseller / sponsor / bank wallet top-ups
router.post(
  '/wallet/topup',
  authenticate,
  requireRole('reseller', 'sponsor', 'bank_partner', 'admin', 'super_admin'),
  paymentController.initiateWalletTopup
);

// Payment status polling after returning from the Pesapal checkout page
router.get('/status/:order_tracking_id', authenticate, paymentController.checkPaymentStatus);
router.post('/status', authenticate, paymentController.checkPaymentStatus);

module.exports = router;
