const express = require('express');
const router = express.Router();
const resellerController = require('../controllers/resellerController');
const { resellerAuth } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', (req, res) => resellerController.register(req, res));
router.post('/login', (req, res) => resellerController.login(req, res));

// Protected routes — reseller session
router.use(resellerAuth);

router.get('/dashboard', (req, res) => resellerController.getDashboard(req, res));
router.get('/earnings', (req, res) => resellerController.getDashboard(req, res));
router.get('/vouchers', (req, res) => resellerController.getVouchers(req, res));
router.post('/vouchers/generate', (req, res) => resellerController.generateVouchers(req, res));
router.delete('/vouchers/:id', (req, res) => resellerController.deleteVoucher(req, res));
router.post('/topup', (req, res) => resellerController.topUp(req, res));
router.get('/topups', (req, res) => resellerController.getTopups(req, res));
router.get('/withdrawals', (req, res) => resellerController.getWithdrawals(req, res));
router.post('/withdraw', (req, res) => resellerController.requestWithdrawal(req, res));
router.delete('/withdrawals/:id', (req, res) => resellerController.cancelWithdrawal(req, res));
router.get('/settings', (req, res) => resellerController.getSettings(req, res));
router.put('/settings/profile', (req, res) => resellerController.updateProfile(req, res));
router.post('/settings/change-password', (req, res) => resellerController.changePassword(req, res));

module.exports = router;
