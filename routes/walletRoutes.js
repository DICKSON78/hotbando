/**
 * Wallet Routes
 * API endpoints for wallet management, deposits, and withdrawals
 */

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { adminAuth, sponsorAuth } = require('../middleware/authMiddleware');

// Get wallet details
router.get('/', sponsorAuth, walletController.getWallet);
router.get('/balance', sponsorAuth, walletController.getBalance);

// Deposits
router.post('/deposit/request', sponsorAuth, walletController.requestDeposit);
router.get('/payment/:payment_request_id', sponsorAuth, walletController.checkPaymentStatus);

// Withdrawals
router.post('/withdraw/request', sponsorAuth, walletController.requestWithdrawal);

// Transactions
router.get('/transactions', sponsorAuth, walletController.getTransactions);

// Settings
router.post('/settings/low-balance', sponsorAuth, walletController.setLowBalanceThreshold);

// Admin routes
router.post('/admin/deposit', adminAuth, walletController.manualDeposit);
router.get('/admin/withdrawals/pending', adminAuth, walletController.getPendingWithdrawals);
router.post('/admin/withdrawals/:transaction_id/process', adminAuth, walletController.processWithdrawal);
router.get('/admin/low-balance', adminAuth, walletController.getLowBalanceWallets);
router.get('/admin/stats', adminAuth, walletController.getAllWalletsStats);

module.exports = router;
