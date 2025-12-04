/**
 * Campaign Controller
 * Handles bank campaigns, advertiser campaigns, lead management, and form submissions
 */

const Campaign = require('../models/Campaign');
const Wallet = require('../models/Wallet');
const db = require('../config/database');

const campaignController = {
    /**
     * Create new campaign (bank or advertiser)
     */
    async createCampaign(req, res) {
        try {
            const {
                campaign_name,
                campaign_type,
                description,
                instructions,
                start_date,
                end_date,
                target_locations,
                target_user_types,
                target_age_min,
                target_age_max,
                target_gender,
                total_budget,
                cost_per_action,
                reward_type,
                reward_duration_hours,
                reward_bytes,
                daily_limit,
                total_limit,
                // Content data
                content_type,
                video_url,
                image_url,
                form_fields,
                app_name,
                app_package,
                app_store_url,
                play_store_url
            } = req.body;

            const user = req.session.admin_user || req.session.sponsor_user || req.session.bank_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Determine owner type
            let owner_type = 'advertiser';
            if (user.role === 'bank_partner') {
                owner_type = 'bank';
            } else if (user.role === 'sponsor') {
                owner_type = 'advertiser';
            }

            // For advertisers, check wallet balance
            if (owner_type === 'advertiser' && total_budget > 0) {
                const balance = await Wallet.getBalance(user.id);
                if (balance < total_budget) {
                    return res.status(400).json({
                        error: 'Insufficient wallet balance',
                        balance,
                        required: total_budget
                    });
                }
            }

            // Prepare campaign data
            const campaignData = {
                campaign_name,
                campaign_type,
                owner_id: user.id,
                owner_type,
                description,
                instructions,
                start_date,
                end_date: end_date || null,
                is_active: 0, // Needs approval
                requires_approval: 1,
                target_locations: target_locations ? JSON.stringify(target_locations) : null,
                target_user_types: target_user_types ? JSON.stringify(target_user_types) : null,
                target_age_min: target_age_min || null,
                target_age_max: target_age_max || null,
                target_gender: target_gender || 'all',
                total_budget: total_budget || 0,
                cost_per_action: cost_per_action || 0,
                reward_type: reward_type || 'data_bytes',
                reward_duration_hours: reward_duration_hours || 0,
                reward_bytes: reward_bytes || 0,
                daily_limit: daily_limit || 0,
                total_limit: total_limit || 0
            };

            // Prepare content data
            let contentData = null;
            if (content_type) {
                contentData = {
                    content_type,
                    video_url: video_url || null,
                    image_url: image_url || null,
                    duration_seconds: req.body.duration_seconds || 0,
                    form_fields: form_fields ? JSON.stringify(form_fields) : null,
                    app_name: app_name || null,
                    app_package: app_package || null,
                    app_store_url: app_store_url || null,
                    play_store_url: play_store_url || null
                };
            }

            // Create campaign with content
            const campaign = await Campaign.createWithContent(campaignData, contentData);

            // Log activity
            await db.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
                 VALUES (?, 'create_campaign', 'campaign', ?, ?)`,
                [user.id, campaign.id, `Created campaign: ${campaign_name}`]
            );

            res.json({
                success: true,
                message: 'Campaign created successfully. Awaiting admin approval.',
                campaign
            });
        } catch (error) {
            console.error('Error creating campaign:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get campaigns for current user
     */
    async getMyCampaigns(req, res) {
        try {
            const user = req.session.admin_user || req.session.sponsor_user || req.session.bank_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const filters = {
                campaign_type: req.query.campaign_type,
                is_active: req.query.is_active
            };

            const campaigns = await Campaign.getCampaignsByOwner(user.id, filters);

            res.json({
                success: true,
                campaigns
            });
        } catch (error) {
            console.error('Error getting campaigns:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get campaign details with stats
     */
    async getCampaignDetails(req, res) {
        try {
            const { id } = req.params;
            const user = req.session.admin_user || req.session.sponsor_user || req.session.bank_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const campaign = await Campaign.getCampaignWithContent(id);

            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            // Check ownership (unless admin)
            if (user.role !== 'admin' && user.role !== 'super_admin' && campaign.owner_id !== user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get stats
            const stats = await Campaign.getCampaignStats(id);

            res.json({
                success: true,
                campaign,
                stats
            });
        } catch (error) {
            console.error('Error getting campaign details:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Update campaign
     */
    async updateCampaign(req, res) {
        try {
            const { id } = req.params;
            const user = req.session.admin_user || req.session.sponsor_user || req.session.bank_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const campaign = await Campaign.findById(id);

            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            // Check ownership
            if (user.role !== 'admin' && user.role !== 'super_admin' && campaign.owner_id !== user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const allowedFields = [
                'campaign_name', 'description', 'instructions', 'end_date',
                'target_locations', 'target_user_types', 'target_age_min', 'target_age_max',
                'target_gender', 'total_budget', 'daily_limit', 'total_limit'
            ];

            const updateData = {};
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            });

            await Campaign.update(id, updateData);

            res.json({
                success: true,
                message: 'Campaign updated successfully'
            });
        } catch (error) {
            console.error('Error updating campaign:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Toggle campaign active status
     */
    async toggleCampaign(req, res) {
        try {
            const { id } = req.params;
            const user = req.session.admin_user || req.session.sponsor_user || req.session.bank_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const campaign = await Campaign.findById(id);

            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            // Check ownership
            if (user.role !== 'admin' && user.role !== 'super_admin' && campaign.owner_id !== user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const newStatus = campaign.is_active ? 0 : 1;

            await Campaign.update(id, { is_active: newStatus });

            res.json({
                success: true,
                message: `Campaign ${newStatus ? 'activated' : 'deactivated'} successfully`,
                is_active: newStatus
            });
        } catch (error) {
            console.error('Error toggling campaign:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get active campaigns for splash page
     */
    async getActiveCampaigns(req, res) {
        try {
            const { location_id, user_type } = req.query;

            if (!location_id) {
                return res.status(400).json({ error: 'Location ID required' });
            }

            const campaigns = await Campaign.getActiveCampaignsForLocation(
                parseInt(location_id),
                user_type
            );

            res.json({
                success: true,
                campaigns
            });
        } catch (error) {
            console.error('Error getting active campaigns:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Complete campaign (user submits form, watches ad, installs app)
     */
    async completeCampaign(req, res) {
        try {
            const { campaign_id } = req.params;
            const user = req.session.hotbando_user;

            if (!user) {
                return res.status(401).json({ error: 'Please login first' });
            }

            const completionData = {
                completion_type: req.body.completion_type,
                lead_data: req.body.lead_data || {},
                watch_duration_seconds: req.body.watch_duration_seconds || 0,
                completion_percentage: req.body.completion_percentage || 100,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                location_id: req.body.location_id || user.location_id
            };

            const result = await Campaign.completeCampaign(campaign_id, user.id, completionData);

            // Update session with new data balance
            req.session.hotbando_user.free_bytes = user.free_bytes + result.campaign.reward_bytes;

            res.json({
                success: true,
                message: 'Campaign completed successfully!',
                reward: {
                    type: result.campaign.reward_type,
                    bytes: result.campaign.reward_bytes,
                    duration_hours: result.campaign.reward_duration_hours
                }
            });
        } catch (error) {
            console.error('Error completing campaign:', error);
            res.status(400).json({ error: error.message });
        }
    },

    /**
     * Get leads for bank campaign
     */
    async getLeads(req, res) {
        try {
            const { campaign_id } = req.params;
            const user = req.session.admin_user || req.session.bank_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const campaign = await Campaign.findById(campaign_id);

            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            // Check ownership
            if (user.role !== 'admin' && user.role !== 'super_admin' && campaign.owner_id !== user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 50;
            const status = req.query.status || null;

            const result = await Campaign.getLeads(campaign_id, status, page, perPage);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Error getting leads:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Export leads to CSV
     */
    async exportLeads(req, res) {
        try {
            const { campaign_id } = req.params;
            const user = req.session.admin_user || req.session.bank_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const campaign = await Campaign.findById(campaign_id);

            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            // Check ownership
            if (user.role !== 'admin' && user.role !== 'super_admin' && campaign.owner_id !== user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get all leads
            const result = await Campaign.getLeads(campaign_id, null, 1, 10000);
            const leads = result.leads;

            // Convert to CSV
            const csvHeader = 'ID,User Name,Phone,Email,User Type,Lead Status,Lead Data,Location,Completed At\n';
            const csvRows = leads.map(lead => {
                const leadData = lead.lead_data ? JSON.stringify(lead.lead_data).replace(/"/g, '""') : '';
                return [
                    lead.id,
                    lead.user_name || '',
                    lead.phone_number || '',
                    lead.email || '',
                    lead.user_type || '',
                    lead.lead_status,
                    `"${leadData}"`,
                    lead.location_name || '',
                    lead.completed_at
                ].join(',');
            });

            const csv = csvHeader + csvRows.join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=leads-${campaign_id}-${Date.now()}.csv`);
            res.send(csv);
        } catch (error) {
            console.error('Error exporting leads:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Update lead status
     */
    async updateLeadStatus(req, res) {
        try {
            const { completion_id } = req.params;
            const { status, notes } = req.body;
            const user = req.session.admin_user || req.session.bank_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'rejected'];

            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            await Campaign.updateLeadStatus(completion_id, status, notes);

            res.json({
                success: true,
                message: 'Lead status updated successfully'
            });
        } catch (error) {
            console.error('Error updating lead status:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Get all campaigns for approval
     */
    async getPendingCampaigns(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const [campaigns] = await db.query(
                `SELECT
                    c.*,
                    u.name as owner_name,
                    u.company_name,
                    u.role as owner_role
                 FROM campaigns c
                 LEFT JOIN users u ON c.owner_id = u.id
                 WHERE c.requires_approval = 1 AND c.approved_by IS NULL
                 ORDER BY c.created_at DESC`
            );

            res.json({
                success: true,
                campaigns
            });
        } catch (error) {
            console.error('Error getting pending campaigns:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Approve campaign
     */
    async approveCampaign(req, res) {
        try {
            const { id } = req.params;
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            await db.query(
                `UPDATE campaigns
                 SET approved_by = ?,
                     approved_at = NOW(),
                     is_active = 1
                 WHERE id = ?`,
                [user.id, id]
            );

            // Get campaign details for notification
            const [campaigns] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
            const campaign = campaigns[0];

            // Notify owner
            await db.query(
                `INSERT INTO notifications (user_id, notification_type, title, message)
                 VALUES (?, 'success', 'Campaign Approved', ?)`,
                [campaign.owner_id, `Your campaign "${campaign.campaign_name}" has been approved and is now active.`]
            );

            res.json({
                success: true,
                message: 'Campaign approved successfully'
            });
        } catch (error) {
            console.error('Error approving campaign:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Reject campaign
     */
    async rejectCampaign(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            // Get campaign details
            const [campaigns] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
            const campaign = campaigns[0];

            // Delete campaign
            await Campaign.delete(id);

            // Notify owner
            await db.query(
                `INSERT INTO notifications (user_id, notification_type, title, message)
                 VALUES (?, 'error', 'Campaign Rejected', ?)`,
                [campaign.owner_id, `Your campaign "${campaign.campaign_name}" was rejected. Reason: ${reason || 'No reason provided'}`]
            );

            res.json({
                success: true,
                message: 'Campaign rejected'
            });
        } catch (error) {
            console.error('Error rejecting campaign:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = campaignController;
