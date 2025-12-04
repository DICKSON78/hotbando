/**
 * Revenue Share Model
 * Manages revenue sharing with franchise owners, landlords, and other partners
 */

const BaseModel = require('./BaseModel');
const db = require('../config/database');

class RevenueShare extends BaseModel {
    constructor() {
        super('partner_revenue_shares');
    }

    /**
     * Calculate revenue share for a partner
     */
    async calculateRevenueShare(partnerId, locationId, startDate, endDate) {
        const connection = await this.beginTransaction();

        try {
            // Get partner details
            const [partners] = await connection.query(
                'SELECT * FROM users WHERE id = ? AND role = "franchise_owner"',
                [partnerId]
            );

            if (partners.length === 0) {
                throw new Error('Partner not found');
            }

            const partner = partners[0];

            // Get revenue sharing rule for this location
            const [rules] = await connection.query(
                `SELECT * FROM revenue_sharing_rules
                 WHERE (location_id = ? OR location_id IS NULL)
                 AND partner_type = 'franchise_owner'
                 AND is_active = 1
                 ORDER BY location_id DESC
                 LIMIT 1`,
                [locationId]
            );

            if (rules.length === 0) {
                throw new Error('No revenue sharing rule found');
            }

            const rule = rules[0];

            // Calculate total revenue from this location in the period
            const [revenueResult] = await connection.query(
                `SELECT
                    SUM(cc.cost_charged) as total_revenue,
                    COUNT(DISTINCT cc.id) as total_completions
                 FROM campaign_completions cc
                 JOIN campaigns c ON cc.campaign_id = c.id
                 WHERE cc.location_id = ?
                 AND cc.completed_at BETWEEN ? AND ?
                 AND cc.cost_charged > 0`,
                [locationId, startDate, endDate]
            );

            const totalRevenue = parseFloat(revenueResult[0].total_revenue || 0);
            const totalCompletions = parseInt(revenueResult[0].total_completions || 0);

            if (totalRevenue === 0) {
                return {
                    total_revenue: 0,
                    share_amount: 0,
                    share_percentage: rule.share_percentage,
                    message: 'No revenue generated in this period'
                };
            }

            // Calculate partner's share
            let shareAmount = 0;

            if (partner.commission_rate > 0) {
                // Use partner-specific rate
                shareAmount = (totalRevenue * partner.commission_rate) / 100;
            } else {
                // Use rule's percentage
                shareAmount = (totalRevenue * rule.share_percentage) / 100;
            }

            // Add fixed amount per transaction if applicable
            if (rule.share_amount_fixed > 0) {
                shareAmount += rule.share_amount_fixed * totalCompletions;
            }

            // Check if share already exists for this period
            const [existing] = await connection.query(
                `SELECT * FROM partner_revenue_shares
                 WHERE partner_id = ?
                 AND location_id = ?
                 AND period_start = ?
                 AND period_end = ?`,
                [partnerId, locationId, startDate, endDate]
            );

            let shareRecord;

            if (existing.length > 0) {
                // Update existing record
                await connection.query(
                    `UPDATE partner_revenue_shares
                     SET total_revenue = ?,
                         share_amount = ?,
                         share_percentage = ?
                     WHERE id = ?`,
                    [totalRevenue, shareAmount, rule.share_percentage, existing[0].id]
                );

                shareRecord = {
                    id: existing[0].id,
                    partner_id: partnerId,
                    location_id: locationId,
                    total_revenue: totalRevenue,
                    share_amount: shareAmount,
                    share_percentage: rule.share_percentage
                };
            } else {
                // Create new record
                const shareData = {
                    partner_id: partnerId,
                    partner_type: 'franchise_owner',
                    location_id: locationId,
                    rule_id: rule.id,
                    period_start: startDate,
                    period_end: endDate,
                    total_revenue: totalRevenue,
                    share_amount: shareAmount,
                    share_percentage: partner.commission_rate || rule.share_percentage,
                    status: 'pending'
                };

                const [result] = await connection.query(
                    'INSERT INTO partner_revenue_shares SET ?',
                    shareData
                );

                shareRecord = {
                    id: result.insertId,
                    ...shareData
                };
            }

            await connection.commit();
            connection.release();

            return shareRecord;
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    /**
     * Calculate revenue shares for all partners
     */
    async calculateAllRevenueShares(startDate, endDate) {
        try {
            // Get all active franchise locations with owners
            const [locations] = await this.db.query(
                `SELECT DISTINCT l.id as location_id, l.franchise_owner_id as partner_id
                 FROM locations l
                 WHERE l.is_active = 1
                 AND l.franchise_owner_id IS NOT NULL`
            );

            const results = [];

            for (const loc of locations) {
                try {
                    const share = await this.calculateRevenueShare(
                        loc.partner_id,
                        loc.location_id,
                        startDate,
                        endDate
                    );
                    results.push(share);
                } catch (error) {
                    console.error(`Error calculating share for location ${loc.location_id}:`, error.message);
                    results.push({
                        location_id: loc.location_id,
                        partner_id: loc.partner_id,
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('Error calculating all revenue shares:', error);
            throw error;
        }
    }

    /**
     * Get pending payouts for a partner
     */
    async getPendingPayouts(partnerId) {
        try {
            const query = `
                SELECT
                    prs.*,
                    l.name as location_name,
                    l.location_type
                FROM partner_revenue_shares prs
                LEFT JOIN locations l ON prs.location_id = l.id
                WHERE prs.partner_id = ?
                AND prs.status = 'pending'
                ORDER BY prs.period_end DESC
            `;

            const [rows] = await this.db.query(query, [partnerId]);
            return rows;
        } catch (error) {
            console.error('Error getting pending payouts:', error);
            throw error;
        }
    }

    /**
     * Get total pending payout amount for a partner
     */
    async getTotalPendingPayout(partnerId) {
        try {
            const [result] = await this.db.query(
                `SELECT SUM(share_amount) as total
                 FROM partner_revenue_shares
                 WHERE partner_id = ?
                 AND status = 'pending'`,
                [partnerId]
            );

            return parseFloat(result[0].total || 0);
        } catch (error) {
            console.error('Error getting total pending payout:', error);
            throw error;
        }
    }

    /**
     * Approve payout
     */
    async approvePayout(shareId, approvedBy) {
        const connection = await this.beginTransaction();

        try {
            // Get share record
            const [shares] = await connection.query(
                'SELECT * FROM partner_revenue_shares WHERE id = ?',
                [shareId]
            );

            if (shares.length === 0) {
                throw new Error('Share record not found');
            }

            const share = shares[0];

            if (share.status !== 'pending') {
                throw new Error('Payout already processed');
            }

            // Update status to approved
            await connection.query(
                `UPDATE partner_revenue_shares
                 SET status = 'approved',
                     approved_by = ?,
                     approved_at = NOW()
                 WHERE id = ?`,
                [approvedBy, shareId]
            );

            // Create notification for partner
            await connection.query(
                `INSERT INTO notifications (user_id, notification_type, title, message)
                 VALUES (?, 'success', 'Payout Approved', ?)`,
                [
                    share.partner_id,
                    `Your payout of TZS ${share.share_amount.toLocaleString()} has been approved and will be processed shortly.`
                ]
            );

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
     * Process payout (mark as paid)
     */
    async processPayout(shareId, paymentReference, notes = null) {
        const connection = await this.beginTransaction();

        try {
            // Get share record
            const [shares] = await connection.query(
                'SELECT * FROM partner_revenue_shares WHERE id = ?',
                [shareId]
            );

            if (shares.length === 0) {
                throw new Error('Share record not found');
            }

            const share = shares[0];

            if (share.status !== 'approved') {
                throw new Error('Payout must be approved first');
            }

            // Update status to paid
            await connection.query(
                `UPDATE partner_revenue_shares
                 SET status = 'paid',
                     paid_at = NOW(),
                     payment_reference = ?,
                     notes = ?
                 WHERE id = ?`,
                [paymentReference, notes, shareId]
            );

            // Create transaction record for partner
            await connection.query(
                `INSERT INTO transactions
                 (user_id, transaction_type, amount, reference_type, reference_id, description, status, payment_reference, processed_at)
                 VALUES (?, 'revenue_share', ?, 'payout', ?, ?, 'completed', ?, NOW())`,
                [
                    share.partner_id,
                    share.share_amount,
                    shareId,
                    `Revenue share payout for period ${share.period_start} to ${share.period_end}`,
                    paymentReference
                ]
            );

            // Create notification
            await connection.query(
                `INSERT INTO notifications (user_id, notification_type, title, message)
                 VALUES (?, 'success', 'Payout Processed', ?)`,
                [
                    share.partner_id,
                    `Your payout of TZS ${share.share_amount.toLocaleString()} has been processed. Reference: ${paymentReference}`
                ]
            );

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
     * Get payout history for a partner
     */
    async getPayoutHistory(partnerId, page = 1, perPage = 20) {
        try {
            const offset = (page - 1) * perPage;

            const query = `
                SELECT
                    prs.*,
                    l.name as location_name,
                    l.location_type,
                    approver.name as approved_by_name
                FROM partner_revenue_shares prs
                LEFT JOIN locations l ON prs.location_id = l.id
                LEFT JOIN users approver ON prs.approved_by = approver.id
                WHERE prs.partner_id = ?
                ORDER BY prs.created_at DESC
                LIMIT ? OFFSET ?
            `;

            const [rows] = await this.db.query(query, [partnerId, perPage, offset]);

            // Get total count
            const [countResult] = await this.db.query(
                'SELECT COUNT(*) as total FROM partner_revenue_shares WHERE partner_id = ?',
                [partnerId]
            );

            return {
                payouts: rows,
                pagination: {
                    page,
                    perPage,
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / perPage)
                }
            };
        } catch (error) {
            console.error('Error getting payout history:', error);
            throw error;
        }
    }

    /**
     * Get revenue statistics for a partner
     */
    async getPartnerRevenueStats(partnerId) {
        try {
            const query = `
                SELECT
                    SUM(CASE WHEN status = 'pending' THEN share_amount ELSE 0 END) as pending_amount,
                    SUM(CASE WHEN status = 'approved' THEN share_amount ELSE 0 END) as approved_amount,
                    SUM(CASE WHEN status = 'paid' THEN share_amount ELSE 0 END) as paid_amount,
                    SUM(total_revenue) as total_revenue_generated,
                    COUNT(DISTINCT location_id) as total_locations,
                    COUNT(*) as total_payouts
                FROM partner_revenue_shares
                WHERE partner_id = ?
            `;

            const [rows] = await this.db.query(query, [partnerId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting partner revenue stats:', error);
            throw error;
        }
    }

    /**
     * Get all pending payouts (for admin)
     */
    async getAllPendingPayouts(minAmount = 0) {
        try {
            const query = `
                SELECT
                    prs.*,
                    u.name as partner_name,
                    u.phone_number as partner_phone,
                    u.email as partner_email,
                    l.name as location_name,
                    l.location_type
                FROM partner_revenue_shares prs
                LEFT JOIN users u ON prs.partner_id = u.id
                LEFT JOIN locations l ON prs.location_id = l.id
                WHERE prs.status = 'pending'
                AND prs.share_amount >= ?
                ORDER BY prs.created_at ASC
            `;

            const [rows] = await this.db.query(query, [minAmount]);
            return rows;
        } catch (error) {
            console.error('Error getting all pending payouts:', error);
            throw error;
        }
    }

    /**
     * Batch approve payouts
     */
    async batchApprovePayout(shareIds, approvedBy) {
        const connection = await this.beginTransaction();

        try {
            if (!Array.isArray(shareIds) || shareIds.length === 0) {
                throw new Error('No share IDs provided');
            }

            // Update all shares
            const placeholders = shareIds.map(() => '?').join(',');
            await connection.query(
                `UPDATE partner_revenue_shares
                 SET status = 'approved',
                     approved_by = ?,
                     approved_at = NOW()
                 WHERE id IN (${placeholders})
                 AND status = 'pending'`,
                [approvedBy, ...shareIds]
            );

            // Get approved shares to create notifications
            const [approvedShares] = await connection.query(
                `SELECT * FROM partner_revenue_shares WHERE id IN (${placeholders})`,
                shareIds
            );

            // Create notifications
            for (const share of approvedShares) {
                await connection.query(
                    `INSERT INTO notifications (user_id, notification_type, title, message)
                     VALUES (?, 'success', 'Payout Approved', ?)`,
                    [
                        share.partner_id,
                        `Your payout of TZS ${share.share_amount.toLocaleString()} has been approved.`
                    ]
                );
            }

            await connection.commit();
            connection.release();

            return approvedShares.length;
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }
}

module.exports = new RevenueShare();
