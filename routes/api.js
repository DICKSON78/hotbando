const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// API routes
router.post('/generate-voucher', adminController.generateVoucher);
router.get('/batches', adminController.getBatches);
router.get('/batches/:batchId/vouchers', adminController.getVouchersByBatch);
router.get('/sales-summary', adminController.getSalesSummary); 
router.post('/set-unlimited', adminController.setUnlimitedStatus);
router.delete('/users/:id', adminController.deleteUser);
router.get('/video-ads', adminController.getVideoAds);
router.get('/sponsors', adminController.getSponsors);

module.exports = router;