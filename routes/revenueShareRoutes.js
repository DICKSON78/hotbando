/**
 * Revenue Share Routes
 * API endpoints for franchise owner revenue sharing and payouts
 */

const express = require('express');
const router = express.Router();
const revenueShareController = require('../controllers/revenueShareController');
const { adminAuth } = require('../middleware/authMiddleware');

// Franchise owner routes (using custom auth or admin auth)
const franchiseAuth = (req, res, next) => {
    const user = req.session.franchise_user || req.session.admin_user;
    if (!user || (user.role !== 'franchise_owner' && user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ error: 'Franchise owner access required' });
    }
    next();
};

// Franchise owner dashboard
router.get('/dashboard', franchiseAuth, revenueShareController.getDashboardStats);
router.get('/payouts/history', franchiseAuth, revenueShareController.getPayoutHistory);
router.get('/reports', franchiseAuth, revenueShareController.getRevenueReports);

// Admin routes
router.post('/admin/calculate', adminAuth, revenueShareController.calculateRevenueShares);
router.post('/admin/calculate-single', adminAuth, revenueShareController.calculateSingleRevenueShare);
router.get('/admin/payouts/pending', adminAuth, revenueShareController.getAllPendingPayouts);
router.post('/admin/payouts/:share_id/approve', adminAuth, revenueShareController.approvePayout);
router.post('/admin/payouts/batch-approve', adminAuth, revenueShareController.batchApprovePayout);
router.post('/admin/payouts/:share_id/process', adminAuth, revenueShareController.processPayout);

// Revenue rules management
router.get('/admin/rules', adminAuth, revenueShareController.getRevenueRules);
router.post('/admin/rules', adminAuth, revenueShareController.createRevenueRule);
router.put('/admin/rules/:rule_id', adminAuth, revenueShareController.updateRevenueRule);

module.exports = router;
