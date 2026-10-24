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
router.get('/my-leads', sponsorAuth, async (req, res) => {
  try {
    const db = require('../config/database');
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const [leads] = await db.execute(
      `SELECT cc.*, c.campaign_name as campaign_name, c.campaign_type, c.budget,
              u.name as customer_name, u.phone_number as customer_phone
       FROM campaign_completions cc
       JOIN marketing_campaigns c ON cc.campaign_id = c.id
       LEFT JOIN users u ON cc.user_id = u.id
       WHERE c.managed_by = ?
       ORDER BY cc.completed_at DESC LIMIT 200`,
      [userId]
    );
    res.json({ success: true, leads });
  } catch (error) {
    console.error('My leads error:', error.message);
    res.status(500).json({ error: 'Failed to load leads' });
  }
});
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
