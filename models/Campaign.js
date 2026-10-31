/**
 * Campaign Model
 * Handles bank campaigns, advertiser campaigns, and related operations
 */

const BaseModel = require('./BaseModel');
const db = require('../config/database');

class Campaign extends BaseModel {
    constructor() {
        super('campaigns');
    }

    /**
     * Create a new campaign with content
     */
    async createWithContent(campaignData, contentData) {
        const connection = await this.beginTransaction();

        try {
            // Insert campaign
            const [campaignResult] = await connection.query(
                `INSERT INTO campaigns SET ?`,
                campaignData
            );

            const campaignId = campaignResult.insertId;

            // Insert content if provided
            if (contentData) {
                contentData.campaign_id = campaignId;
                await connection.query(
                    `INSERT INTO campaign_content SET ?`,
                    contentData
                );
            }

            await connection.commit();
            connection.release();

            return { id: campaignId, ...campaignData };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    /**
     * Get campaign with content
     */
    async getCampaignWithContent(campaignId) {
        try {
            const query = `
                SELECT
                    c.*,
                    u.name as owner_name,
                    u.company_name,
                    u.company_logo,
                    cc.id as content_id,
                    cc.content_type,
                    cc.video_url,
                    cc.image_url,
                    cc.thumbnail_url,
                    cc.duration_seconds,
                    cc.form_fields,
                    cc.app_name,
                    cc.app_package,
                    cc.app_store_url,
                    cc.play_store_url
                FROM campaigns c
                LEFT JOIN users u ON c.owner_id = u.id
                LEFT JOIN campaign_content cc ON c.id = cc.campaign_id
                WHERE c.id = ?
            `;

            const [rows] = await this.db.query(query, [campaignId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting campaign with content:', error);
            throw error;
        }
    }

    /**
     * Get active campaigns for a location
     */
    async getActiveCampaignsForLocation(locationId, userType = null) {
        try {
            let query = `
                SELECT
                    c.*,
                    u.company_name,
                    u.company_logo,
                    cc.content_type,
                    cc.video_url,
                    cc.image_url,
                    cc.thumbnail_url,
                    cc.duration_seconds
                FROM campaigns c
                LEFT JOIN users u ON c.owner_id = u.id
                LEFT JOIN campaign_content cc ON c.id = cc.campaign_id
                WHERE c.is_active = 1
                AND c.start_date <= NOW()
                AND (c.end_date IS NULL OR c.end_date >= NOW())
                AND (c.total_limit = 0 OR c.completions < c.total_limit)
                AND (
                    c.target_locations IS NULL
                    OR JSON_CONTAINS(c.target_locations, ?)
                )
            `;

            const params = [JSON.stringify(locationId)];

            if (userType) {
                query += ` AND (c.target_user_types IS NULL OR JSON_CONTAINS(c.target_user_types, ?))`;
                params.push(JSON.stringify(userType));
            }

            query += ` ORDER BY c.created_at DESC`;

            const [rows] = await this.db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error getting active campaigns:', error);
            throw error;
        }
    }

    /**
     * Complete a campaign action (form submit, ad watch, etc.)
     */
    async completeCampaign(campaignId, userId, completionData) {
        const connection = await this.beginTransaction();

        try {
            // Get campaign details
            const [campaigns] = await connection.query(
                'SELECT * FROM campaigns WHERE id = ? AND is_active = 1',
                [campaignId]
            );

            if (campaigns.length === 0) {
                throw new Error('Campaign not found or inactive');
            }

            const campaign = campaigns[0];

            // Check daily limit
            if (campaign.daily_limit > 0) {
                const [todayCount] = await connection.query(
                    `SELECT COUNT(*) as count FROM campaign_completions
                     WHERE campaign_id = ? AND DATE(completed_at) = CURDATE()`,
                    [campaignId]
                );

                if (todayCount[0].count >= campaign.daily_limit) {
                    throw new Error('Daily limit reached for this campaign');
                }
            }

            // Check if user already completed
            const [userCompletions] = await connection.query(
                `SELECT COUNT(*) as count FROM campaign_completions
                 WHERE campaign_id = ? AND user_id = ?`,
                [campaignId, userId]
            );

            if (userCompletions[0].count > 0) {
                throw new Error('You have already completed this campaign');
            }

            // Insert completion
            const completionRecord = {
                campaign_id: campaignId,
                user_id: userId,
                completion_type: completionData.completion_type,
                lead_data: completionData.lead_data ? JSON.stringify(completionData.lead_data) : null,
                watch_duration_seconds: completionData.watch_duration_seconds || 0,
                completion_percentage: completionData.completion_percentage || 100,
                reward_granted: 1,
                reward_type: campaign.reward_type,
                reward_duration_hours: campaign.reward_duration_hours,
                reward_bytes: campaign.reward_bytes,
                cost_charged: campaign.cost_per_action,
                ip_address: completionData.ip_address,
                user_agent: completionData.user_agent,
                location_id: completionData.location_id
            };

            const [completionResult] = await connection.query(
                'INSERT INTO campaign_completions SET ?',
                completionRecord
            );

            // Update campaign stats
            await connection.query(
                `UPDATE campaigns
                 SET completions = completions + 1,
                     spent_budget = spent_budget + ?,
                     views = views + 1
                 WHERE id = ?`,
                [campaign.cost_per_action, campaignId]
            );

            // Grant reward to user
            if (campaign.reward_bytes > 0) {
                await connection.query(
                    `UPDATE users
                     SET free_bytes = free_bytes + ?,
                         total_data_earned = total_data_earned + ?
                     WHERE id = ?`,
                    [campaign.reward_bytes, campaign.reward_bytes, userId]
                );
            }

            if (campaign.reward_duration_hours > 0) {
                await connection.query(
                    `UPDATE users
                     SET usage_until = DATE_ADD(COALESCE(usage_until, NOW()), INTERVAL ? HOUR)
                     WHERE id = ?`,
                    [campaign.reward_duration_hours, userId]
                );
            }

            // Charge advertiser wallet if applicable
            if (campaign.cost_per_action > 0 && campaign.owner_type === 'advertiser') {
                await connection.query(
                    `UPDATE wallets
                     SET balance = balance - ?,
                         total_spent = total_spent + ?
                     WHERE user_id = ?`,
                    [campaign.cost_per_action, campaign.cost_per_action, campaign.owner_id]
                );

                // Record transaction
                await connection.query(
                    `INSERT INTO transactions
                     (wallet_id, user_id, transaction_type, amount, reference_type, reference_id, description, status, processed_at)
                     SELECT id, ?, 'campaign_charge', ?, 'campaign', ?, 'Campaign completion charge', 'completed', NOW()
                     FROM wallets WHERE user_id = ?`,
                    [campaign.owner_id, campaign.cost_per_action, campaignId, campaign.owner_id]
                );
            }

            await connection.commit();
            connection.release();

            return {
                id: completionResult.insertId,
                ...completionRecord,
                campaign
            };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    /**
     * Mirror an approved ad campaign (ad_video / ad_image) into the `ads`
     * table so customers see it through the normal "Watch Ads" flow.
     * Non-ad campaigns (bank forms, surveys, app installs) are left alone.
     */
    async syncAdFromCampaign(campaignId) {
        const [rows] = await this.db.query(
            `SELECT c.*, cc.video_url, cc.image_url, cc.duration_seconds
             FROM campaigns c
             LEFT JOIN campaign_content cc ON cc.campaign_id = c.id
             WHERE c.id = ? LIMIT 1`,
            [campaignId]
        );
        const campaign = rows[0];
        if (!campaign || !['ad_video', 'ad_image'].includes(campaign.campaign_type)) return null;

        const approved = campaign.approved_by ? 1 : 0;
        const now = new Date();
        const started = !campaign.start_date || new Date(campaign.start_date) <= now;
        const ended = campaign.end_date && new Date(campaign.end_date) < now;
        const isActive = approved && Number(campaign.is_active) === 1 && started && !ended ? 1 : 0;
        const duration = Number(campaign.duration_seconds) > 0 ? Number(campaign.duration_seconds) : 30;

        const [existing] = await this.db.query('SELECT id FROM ads WHERE campaign_id = ? LIMIT 1', [campaignId]);
        if (existing.length) {
            await this.db.query(
                `UPDATE ads SET title = ?, description = ?, image_url = ?, video_url = ?, duration = ?,
                        reward_bytes = ?, sponsor_id = ?, approved = ?, is_active = ?, updated_at = NOW()
                 WHERE id = ?`,
                [campaign.campaign_name, campaign.description || '', campaign.image_url || '', campaign.video_url || '',
                 duration, Number(campaign.reward_bytes) || 0, campaign.owner_id, approved, isActive, existing[0].id]
            );
            return existing[0].id;
        }

        const [result] = await this.db.query(
            `INSERT INTO ads (title, description, image_url, video_url, duration, reward_bytes, sponsor_id, campaign_id, approved, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [campaign.campaign_name, campaign.description || '', campaign.image_url || '', campaign.video_url || '',
             duration, Number(campaign.reward_bytes) || 0, campaign.owner_id, campaignId, approved, isActive]
        );
        return result.insertId;
    }

    /**
     * Record a completion for a campaign-backed ad that was already rewarded
     * through the ads flow: logs the lead, bumps campaign stats and charges the
     * advertiser. Returns false when the user already completed this campaign.
     */
    async recordAdCampaignCompletion(campaignId, userId, data = {}) {
        const connection = await this.beginTransaction();
        try {
            const [campaigns] = await connection.query('SELECT * FROM campaigns WHERE id = ? FOR UPDATE', [campaignId]);
            const campaign = campaigns[0];
            if (!campaign) { await connection.rollback(); connection.release(); return false; }

            const [done] = await connection.query(
                'SELECT id FROM campaign_completions WHERE campaign_id = ? AND user_id = ? LIMIT 1',
                [campaignId, userId]
            );
            if (done.length) { await connection.rollback(); connection.release(); return false; }

            const cost = Number(campaign.cost_per_action) || 0;
            await connection.query('INSERT INTO campaign_completions SET ?', {
                campaign_id: campaignId,
                user_id: userId,
                completion_type: 'video_watch',
                watch_duration_seconds: data.watch_duration_seconds || 0,
                completion_percentage: data.completion_percentage || 100,
                reward_granted: 1,
                reward_type: campaign.reward_type,
                reward_duration_hours: 0,
                reward_bytes: data.reward_bytes || campaign.reward_bytes || 0,
                cost_charged: cost,
                ip_address: data.ip_address || null,
                user_agent: data.user_agent || null,
                location_id: data.location_id || null
            });
            await connection.query(
                'UPDATE campaigns SET completions = completions + 1, views = views + 1, spent_budget = spent_budget + ? WHERE id = ?',
                [cost, campaignId]
            );
            if (cost > 0 && campaign.owner_type === 'advertiser') {
                await connection.query(
                    'UPDATE wallets SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?',
                    [cost, cost, campaign.owner_id]
                );
                await connection.query(
                    `INSERT INTO transactions
                     (wallet_id, user_id, transaction_type, amount, reference_type, reference_id, description, status, processed_at)
                     SELECT id, ?, 'campaign_charge', ?, 'campaign', ?, 'Campaign completion charge', 'completed', NOW()
                     FROM wallets WHERE user_id = ?`,
                    [campaign.owner_id, cost, campaignId, campaign.owner_id]
                );
            }
            // Budget exhausted or total limit reached: pause the campaign.
            const spent = Number(campaign.spent_budget) + cost;
            const completions = Number(campaign.completions) + 1;
            const budgetOut = Number(campaign.total_budget) > 0 && spent >= Number(campaign.total_budget);
            const limitOut = Number(campaign.total_limit) > 0 && completions >= Number(campaign.total_limit);
            if (budgetOut || limitOut) {
                await connection.query('UPDATE campaigns SET is_active = 0 WHERE id = ?', [campaignId]);
                await connection.query('UPDATE ads SET is_active = 0 WHERE campaign_id = ?', [campaignId]);
            }
            await connection.commit();
            connection.release();
            return true;
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    /**
     * Get campaign statistics
     */
    async getCampaignStats(campaignId) {
        try {
            const query = `
                SELECT
                    c.*,
                    COUNT(DISTINCT cc.id) as total_completions,
                    COUNT(DISTINCT CASE WHEN DATE(cc.completed_at) = CURDATE() THEN cc.id END) as today_completions,
                    AVG(cc.watch_duration_seconds) as avg_watch_duration,
                    AVG(cc.completion_percentage) as avg_completion_percentage,
                    SUM(cc.cost_charged) as total_cost,
                    COUNT(DISTINCT CASE WHEN cc.lead_status = 'converted' THEN cc.id END) as conversions
                FROM campaigns c
                LEFT JOIN campaign_completions cc ON c.id = cc.campaign_id
                WHERE c.id = ?
                GROUP BY c.id
            `;

            const [rows] = await this.db.query(query, [campaignId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting campaign stats:', error);
            throw error;
        }
    }

    /**
     * Get leads for bank campaign
     */
    async getLeads(campaignId, status = null, page = 1, perPage = 50) {
        try {
            const offset = (page - 1) * perPage;
            let query = `
                SELECT
                    cc.*,
                    u.name as user_name,
                    u.phone_number,
                    u.email,
                    u.user_type,
                    l.name as location_name
                FROM campaign_completions cc
                LEFT JOIN users u ON cc.user_id = u.id
                LEFT JOIN locations l ON cc.location_id = l.id
                WHERE cc.campaign_id = ?
            `;

            const params = [campaignId];

            if (status) {
                query += ` AND cc.lead_status = ?`;
                params.push(status);
            }

            query += ` ORDER BY cc.completed_at DESC LIMIT ? OFFSET ?`;
            params.push(perPage, offset);

            const [rows] = await this.db.query(query, params);

            // Get total count
            let countQuery = `SELECT COUNT(*) as total FROM campaign_completions WHERE campaign_id = ?`;
            const countParams = [campaignId];

            if (status) {
                countQuery += ` AND lead_status = ?`;
                countParams.push(status);
            }

            const [countResult] = await this.db.query(countQuery, countParams);

            return {
                leads: rows,
                pagination: {
                    page,
                    perPage,
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / perPage)
                }
            };
        } catch (error) {
            console.error('Error getting leads:', error);
            throw error;
        }
    }

    /**
     * Update lead status
     */
    async updateLeadStatus(completionId, status, notes = null) {
        try {
            const updateData = {
                lead_status: status,
                lead_notes: notes
            };

            if (status === 'contacted') {
                updateData.contacted_at = new Date();
            } else if (status === 'converted') {
                updateData.converted_at = new Date();
            }

            await this.db.query(
                'UPDATE campaign_completions SET ? WHERE id = ?',
                [updateData, completionId]
            );

            return true;
        } catch (error) {
            console.error('Error updating lead status:', error);
            throw error;
        }
    }

    /**
     * Get campaigns by owner
     */
    async getCampaignsByOwner(ownerId, filters = {}) {
        try {
            let query = `
                SELECT
                    c.*,
                    COUNT(DISTINCT cc.id) as completions_count,
                    SUM(cc.cost_charged) as total_spent
                FROM campaigns c
                LEFT JOIN campaign_completions cc ON c.id = cc.campaign_id
                WHERE c.owner_id = ?
            `;

            const params = [ownerId];

            if (filters.campaign_type) {
                query += ` AND c.campaign_type = ?`;
                params.push(filters.campaign_type);
            }

            if (filters.is_active !== undefined) {
                query += ` AND c.is_active = ?`;
                params.push(filters.is_active);
            }

            query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

            const [rows] = await this.db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error getting campaigns by owner:', error);
            throw error;
        }
    }
}

module.exports = new Campaign();
