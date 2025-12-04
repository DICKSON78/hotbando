/**
 * Campaign Routes
 * API endpoints for campaign management (bank & advertiser campaigns)
 */

const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { adminAuth, sponsorAuth, customerAuth } = require('../middleware/authMiddleware');

// Public routes (for splash page)
router.get('/active', campaignController.getActiveCampaigns);

// User routes (authenticated customers)
router.post('/:campaign_id/complete', customerAuth, campaignController.completeCampaign);

// Partner routes (sponsors & bank partners)
router.post('/create', sponsorAuth, campaignController.createCampaign);
router.get('/my-campaigns', sponsorAuth, campaignController.getMyCampaigns);
router.get('/:id', sponsorAuth, campaignController.getCampaignDetails);
router.put('/:id', sponsorAuth, campaignController.updateCampaign);
router.post('/:id/toggle', sponsorAuth, campaignController.toggleCampaign);

// Lead management routes (bank partners)
router.get('/:campaign_id/leads', sponsorAuth, campaignController.getLeads);
router.get('/:campaign_id/leads/export', sponsorAuth, campaignController.exportLeads);
router.put('/leads/:completion_id/status', sponsorAuth, campaignController.updateLeadStatus);

// Admin routes
router.get('/admin/pending', adminAuth, campaignController.getPendingCampaigns);
router.post('/admin/:id/approve', adminAuth, campaignController.approveCampaign);
router.post('/admin/:id/reject', adminAuth, campaignController.rejectCampaign);

module.exports = router;
