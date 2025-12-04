/**
 * Public Routes - Website form submissions
 */

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { adminAuth } = require('../middleware/authMiddleware');

// Public routes (no authentication required)
router.post('/partner-application', publicController.submitPartnerApplication);
router.post('/contact-message', publicController.submitContactMessage);

// Admin routes (require authentication)
router.get('/partner-applications', adminAuth, publicController.getPartnerApplications);
router.get('/contact-messages', adminAuth, publicController.getContactMessages);
router.put('/partner-applications/:id', adminAuth, publicController.updatePartnerApplicationStatus);
router.put('/contact-messages/:id', adminAuth, publicController.updateContactMessageStatus);

module.exports = router;
