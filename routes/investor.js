/**
 * Investor Routes
 * API endpoints for investment management and portfolio
 */

const express = require('express');
const router = express.Router();
const investorController = require('../controllers/investorController');
const { investorAuth } = require('../middleware/authMiddleware');

// All investor routes require investor/admin/franchise access
router.use(investorAuth);

router.get('/dashboard', investorController.getDashboardStats);
router.get('/investments', investorController.getInvestments);
router.post('/invest', investorController.invest);
router.get('/returns', investorController.getReturns);
router.get('/portfolio', investorController.getPortfolio);

module.exports = router;
