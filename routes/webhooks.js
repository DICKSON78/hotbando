const express = require('express');
const router = express.Router();
const webhookCtrl = require('../controllers/clickpesaWebhookController');
const { rateLimit } = require('../middleware/security');

// Rate limit for webhooks
const webhookRateLimit = rateLimit({
  windowMs: parseInt(process.env.CLICKPESA_WEBHOOK_RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.CLICKPESA_WEBHOOK_RATE_LIMIT_MAX || '60'),
});

// Raw body parser for signature verification
router.post('/clickpesa',
  webhookRateLimit,
  express.raw({ type: '*/*', limit: process.env.CLICKPESA_WEBHOOK_MAX_BODY_BYTES || '1mb' }),
  (req, res, next) => {
    req.rawBody = req.body;
    try {
      if (Buffer.isBuffer(req.body)) {
        req.body = JSON.parse(req.body.toString());
      }
    } catch (e) {
      // keep as buffer, controller will handle
    }
    next();
  },
  webhookCtrl.handleWebhook
);

module.exports = router;
