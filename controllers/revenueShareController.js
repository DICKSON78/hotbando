/**
 * Revenue Share Controller
 * Manages franchise owner revenue sharing and payouts
 */

const RevenueShare = require('../models/RevenueShare');
const db = require('../config/database');

const revenueShareController = {
    /**
     * Get franchise owner dashboard stats
     */
    async getDashboardStats(req, res) {
        try {
            const user = req.session.franchise_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Get partner stats
            const stats = await RevenueShare.getPartnerRevenueStats(user.id);

            // Get pending payouts
            const pendingPayouts = await RevenueShare.getPendingPayouts(user.id);

            // Get total pending amount
            const totalPending = await RevenueShare.getTotalPendingPayout(user.id);

            res.json({
                success: true,
                stats,
                pending_payouts: pendingPayouts,
                total_pending: totalPending
            });
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get payout history
     */
    async getPayoutHistory(req, res) {
        try {
            const user = req.session.franchise_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 20;

            const result = await RevenueShare.getPayoutHistory(user.id, page, perPage);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Error getting payout history:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Calculate revenue shares for period
     */
    async calculateRevenueShares(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const { start_date, end_date } = req.body;

            if (!start_date || !end_date) {
                return res.status(400).json({ error: 'Start date and end date required' });
            }

            const results = await RevenueShare.calculateAllRevenueShares(start_date, end_date);

            res.json({
                success: true,
                message: 'Revenue shares calculated successfully',
                results
            });
        } catch (error) {
            console.error('Error calculating revenue shares:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Calculate revenue share for specific partner/location
     */
    async calculateSingleRevenueShare(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const { partner_id, location_id, start_date, end_date } = req.body;

            if (!partner_id || !location_id || !start_date || !end_date) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            const result = await RevenueShare.calculateRevenueShare(
                partner_id,
                location_id,
                start_date,
                end_date
            );

            res.json({
                success: true,
                message: 'Revenue share calculated',
                result
            });
        } catch (error) {
            console.error('Error calculating revenue share:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Get all pending payouts
     */
    async getAllPendingPayouts(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const minAmount = parseFloat(req.query.min_amount) || 0;

            const payouts = await RevenueShare.getAllPendingPayouts(minAmount);

            // Calculate totals
            const totalAmount = payouts.reduce((sum, p) => sum + parseFloat(p.share_amount), 0);
            const totalPartners = new Set(payouts.map(p => p.partner_id)).size;

            res.json({
                success: true,
                payouts,
                summary: {
                    total_payouts: payouts.length,
                    total_partners: totalPartners,
                    total_amount: totalAmount
                }
            });
        } catch (error) {
            console.error('Error getting pending payouts:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Approve payout
     */
    async approvePayout(req, res) {
        try {
            const { share_id } = req.params;
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            await RevenueShare.approvePayout(share_id, user.id);

            // Log activity
            await db.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
                 VALUES (?, 'approve_payout', 'revenue_share', ?, 'Approved revenue share payout')`,
                [user.id, share_id]
            );

            res.json({
                success: true,
                message: 'Payout approved successfully'
            });
        } catch (error) {
            console.error('Error approving payout:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Batch approve payouts
     */
    async batchApprovePayout(req, res) {
        try {
            const { share_ids } = req.body;
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            if (!Array.isArray(share_ids) || share_ids.length === 0) {
                return res.status(400).json({ error: 'No share IDs provided' });
            }

            const count = await RevenueShare.batchApprovePayout(share_ids, user.id);

            res.json({
                success: true,
                message: `${count} payouts approved successfully`,
                approved_count: count
            });
        } catch (error) {
            console.error('Error batch approving payouts:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Process payout (mark as paid)
     */
    async processPayout(req, res) {
        try {
            const { share_id } = req.params;
            const { payment_reference, notes } = req.body;
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            if (!payment_reference) {
                return res.status(400).json({ error: 'Payment reference required' });
            }

            await RevenueShare.processPayout(share_id, payment_reference, notes);

            // Log activity
            await db.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
                 VALUES (?, 'process_payout', 'revenue_share', ?, ?)`,
                [user.id, share_id, `Processed payout: ${payment_reference}`]
            );

            res.json({
                success: true,
                message: 'Payout processed successfully'
            });
        } catch (error) {
            console.error('Error processing payout:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get revenue sharing rules
     */
    async getRevenueRules(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const [rules] = await db.query(`
                SELECT
                    rsr.*,
                    l.name as location_name,
                    l.location_type
                FROM revenue_sharing_rules rsr
                LEFT JOIN locations l ON rsr.location_id = l.id
                ORDER BY rsr.location_id DESC, rsr.created_at DESC
            `);

            res.json({
                success: true,
                rules
            });
        } catch (error) {
            console.error('Error getting revenue rules:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Create revenue sharing rule
     */
    async createRevenueRule(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const {
                partner_type,
                location_id,
                revenue_type,
                share_percentage,
                share_amount_fixed,
                min_payout_amount,
                payout_frequency
            } = req.body;

            if (!partner_type || !share_percentage) {
                return res.status(400).json({ error: 'Partner type and share percentage required' });
            }

            const ruleData = {
                partner_type,
                location_id: location_id || null,
                revenue_type: revenue_type || 'all',
                share_percentage: parseFloat(share_percentage),
                share_amount_fixed: share_amount_fixed ? parseFloat(share_amount_fixed) : 0,
                min_payout_amount: min_payout_amount ? parseFloat(min_payout_amount) : 10000,
                payout_frequency: payout_frequency || 'monthly',
                is_active: 1
            };

            const [result] = await db.query(
                'INSERT INTO revenue_sharing_rules SET ?',
                ruleData
            );

            res.json({
                success: true,
                message: 'Revenue sharing rule created',
                rule_id: result.insertId
            });
        } catch (error) {
            console.error('Error creating revenue rule:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Update revenue sharing rule
     */
    async updateRevenueRule(req, res) {
        try {
            const { rule_id } = req.params;
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const allowedFields = [
                'share_percentage',
                'share_amount_fixed',
                'min_payout_amount',
                'payout_frequency',
                'is_active'
            ];

            const updateData = {};
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            });

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            await db.query(
                'UPDATE revenue_sharing_rules SET ? WHERE id = ?',
                [updateData, rule_id]
            );

            res.json({
                success: true,
                message: 'Revenue sharing rule updated'
            });
        } catch (error) {
            console.error('Error updating revenue rule:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get revenue reports for franchise owner
     */
    async getRevenueReports(req, res) {
        try {
            const user = req.session.franchise_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { start_date, end_date, location_id } = req.query;

            let query = `
                SELECT
                    prs.*,
                    l.name as location_name,
                    l.location_type
                FROM partner_revenue_shares prs
                LEFT JOIN locations l ON prs.location_id = l.id
                WHERE prs.partner_id = ?
            `;

            const params = [user.id];

            if (start_date) {
                query += ` AND prs.period_start >= ?`;
                params.push(start_date);
            }

            if (end_date) {
                query += ` AND prs.period_end <= ?`;
                params.push(end_date);
            }

            if (location_id) {
                query += ` AND prs.location_id = ?`;
                params.push(location_id);
            }

            query += ` ORDER BY prs.period_end DESC`;

            const [reports] = await db.query(query, params);

            // Calculate totals
            const totals = {
                total_revenue: 0,
                total_share: 0,
                paid: 0,
                pending: 0,
                approved: 0
            };

            reports.forEach(report => {
                totals.total_revenue += parseFloat(report.total_revenue);
                totals.total_share += parseFloat(report.share_amount);

                if (report.status === 'paid') {
                    totals.paid += parseFloat(report.share_amount);
                } else if (report.status === 'pending') {
                    totals.pending += parseFloat(report.share_amount);
                } else if (report.status === 'approved') {
                    totals.approved += parseFloat(report.share_amount);
                }
            });

            res.json({
                success: true,
                reports,
                totals
            });
        } catch (error) {
            console.error('Error getting revenue reports:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = revenueShareController;
