/**
 * Investor Controller
 * Manages investments, returns, and portfolio for investors
 */

const db = require('../config/database');

const investorController = {
    async getDashboardStats(req, res) {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const [totals] = await db.execute(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total_invested,
                    COUNT(*) AS investment_count
                FROM investors
                WHERE user_id = ?
            `, [user.id]);

            const [returnsAgg] = await db.execute(`
                SELECT COALESCE(SUM(ir.amount), 0) AS total_returns
                FROM investment_returns ir
                JOIN investors i ON ir.investment_id = i.id
                WHERE i.user_id = ?
            `, [user.id]);

            const totalInvested = parseFloat(totals[0].total_invested);
            const totalReturns = parseFloat(returnsAgg[0].total_returns);
            const roiPercentage = totalInvested > 0
                ? ((totalReturns / totalInvested) * 100).toFixed(2)
                : '0.00';

            const [recentTransactions] = await db.execute(`
                SELECT
                    ir.id,
                    ir.amount,
                    ir.period,
                    ir.calculated_at,
                    i.investment_type,
                    i.amount AS investment_amount
                FROM investment_returns ir
                JOIN investors i ON ir.investment_id = i.id
                WHERE i.user_id = ?
                ORDER BY ir.calculated_at DESC
                LIMIT 10
            `, [user.id]);

            const [monthlyReturns] = await db.execute(`
                SELECT
                    DATE_FORMAT(ir.calculated_at, '%Y-%m') AS month,
                    SUM(ir.amount) AS returns
                FROM investment_returns ir
                JOIN investors i ON ir.investment_id = i.id
                WHERE i.user_id = ?
                GROUP BY DATE_FORMAT(ir.calculated_at, '%Y-%m')
                ORDER BY month DESC
                LIMIT 12
            `, [user.id]);

            res.json({
                success: true,
                data: {
                    total_invested: totalInvested,
                    total_returns: totalReturns,
                    roi_percentage: parseFloat(roiPercentage),
                    investment_count: totals[0].investment_count,
                    recent_transactions: recentTransactions,
                    monthly_returns: monthlyReturns.reverse()
                }
            });
        } catch (error) {
            console.error('Error getting investor dashboard stats:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getInvestments(req, res) {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 20;
            const offset = (page - 1) * perPage;

            const statusFilter = req.query.status;
            let query = 'SELECT * FROM investors WHERE user_id = ?';
            const params = [user.id];

            if (statusFilter && ['active', 'completed', 'withdrawn'].includes(statusFilter)) {
                query += ' AND status = ?';
                params.push(statusFilter);
            }

            const [countResult] = await db.execute(
                `SELECT COUNT(*) AS total FROM investors WHERE user_id = ?${statusFilter ? ' AND status = ?' : ''}`,
                statusFilter ? [user.id, statusFilter] : [user.id]
            );

            query += ` ORDER BY invested_at DESC LIMIT ${parseInt(perPage)} OFFSET ${parseInt(offset)}`;

            const [investments] = await db.execute(query, params);

            res.json({
                success: true,
                data: {
                    investments,
                    pagination: {
                        page,
                        per_page: perPage,
                        total: countResult[0].total,
                        total_pages: Math.ceil(countResult[0].total / perPage)
                    }
                }
            });
        } catch (error) {
            console.error('Error getting investments:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async invest(req, res) {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { amount, type, duration_months } = req.body;

            if (!amount || parseFloat(amount) <= 0) {
                return res.status(400).json({ error: 'Invalid investment amount' });
            }

            const investmentType = ['fixed', 'flexible'].includes(type) ? type : 'fixed';
            const duration = parseInt(duration_months) || 12;
            const expectedRoi = investmentType === 'fixed' ? 14.00 : 10.00;

            const maturesAt = new Date();
            maturesAt.setMonth(maturesAt.getMonth() + duration);

            const [result] = await db.execute(`
                INSERT INTO investors (user_id, amount, investment_type, duration_months, expected_roi, status, invested_at, matures_at)
                VALUES (?, ?, ?, ?, ?, 'active', NOW(), ?)
            `, [user.id, parseFloat(amount), investmentType, duration, expectedRoi, maturesAt]);

            await db.execute(`
                INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
                VALUES (?, 'create_investment', 'investor', ?, ?)
            `, [user.id, result.insertId, `New ${investmentType} investment of ${amount} TZS for ${duration} months`]);

            res.json({
                success: true,
                data: {
                    investment_id: result.insertId,
                    amount: parseFloat(amount),
                    investment_type: investmentType,
                    duration_months: duration,
                    expected_roi: expectedRoi,
                    matures_at: maturesAt
                }
            });
        } catch (error) {
            console.error('Error creating investment:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getReturns(req, res) {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 20;
            const offset = (page - 1) * perPage;

            const [countResult] = await db.execute(`
                SELECT COUNT(*) AS total
                FROM investment_returns ir
                JOIN investors i ON ir.investment_id = i.id
                WHERE i.user_id = ?
            `, [user.id]);

            const [returns] = await db.execute(`
                SELECT
                    ir.*,
                    i.amount AS investment_amount,
                    i.investment_type,
                    i.expected_roi
                FROM investment_returns ir
                JOIN investors i ON ir.investment_id = i.id
                WHERE i.user_id = ?
                ORDER BY ir.calculated_at DESC
                LIMIT ${parseInt(perPage)} OFFSET ${parseInt(offset)}
            `, [user.id]);

            res.json({
                success: true,
                data: {
                    returns,
                    pagination: {
                        page,
                        per_page: perPage,
                        total: countResult[0].total,
                        total_pages: Math.ceil(countResult[0].total / perPage)
                    }
                }
            });
        } catch (error) {
            console.error('Error getting returns:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getPortfolio(req, res) {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const [summary] = await db.execute(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total_invested,
                    COALESCE(SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END), 0) AS active_investments,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS completed_investments,
                    COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) AS withdrawn_investments,
                    COUNT(*) AS total_count,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
                    SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) AS withdrawn_count
                FROM investors
                WHERE user_id = ?
            `, [user.id]);

            const [typeBreakdown] = await db.execute(`
                SELECT
                    investment_type,
                    COUNT(*) AS count,
                    COALESCE(SUM(amount), 0) AS total_amount,
                    AVG(expected_roi) AS avg_roi
                FROM investors
                WHERE user_id = ?
                GROUP BY investment_type
            `, [user.id]);

            const [totalReturns] = await db.execute(`
                SELECT COALESCE(SUM(ir.amount), 0) AS total_returns
                FROM investment_returns ir
                JOIN investors i ON ir.investment_id = i.id
                WHERE i.user_id = ?
            `, [user.id]);

            const [upcomingMaturities] = await db.execute(`
                SELECT id, amount, investment_type, matures_at
                FROM investors
                WHERE user_id = ? AND status = 'active' AND matures_at > NOW()
                ORDER BY matures_at ASC
                LIMIT 5
            `, [user.id]);

            const totalInvested = parseFloat(summary[0].total_invested);
            const totalReturnsVal = parseFloat(totalReturns[0].total_returns);
            const overallRoi = totalInvested > 0
                ? ((totalReturnsVal / totalInvested) * 100).toFixed(2)
                : '0.00';

            res.json({
                success: true,
                data: {
                    summary: {
                        ...summary[0],
                        total_returns: totalReturnsVal,
                        overall_roi_percentage: parseFloat(overallRoi)
                    },
                    type_breakdown: typeBreakdown,
                    upcoming_maturities: upcomingMaturities
                }
            });
        } catch (error) {
            console.error('Error getting portfolio:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = investorController;
