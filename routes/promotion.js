const express = require('express');
const router = express.Router();
const promotionsController = require('../controllers/promotionsController');
const adminAuth = require('../middlewares/auth');

router.post('/redeem', promotionsController.redeemPromotion);
router.post('/add', adminAuth, promotionsController.addPromotion);

module.exports = router;