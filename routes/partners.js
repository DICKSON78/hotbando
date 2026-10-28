const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');

router.post('/register', (req, res) => partnerController.register(req, res));

module.exports = router;
