/**
 * Wallet Controller
 * Handles advertiser wallets, deposits, withdrawals, and billing
 */

const Wallet = require('../models/Wallet');
const db = require('../config/database');

const walletController = {
    /**
     * Get wallet details
     */
    async getWallet(req, res) {
        try {
            const user = req.session.sponsor_user || req.session.bank_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const wallet = await Wallet.getByUserId(user.id);
            const stats = await Wallet.getWalletStats(user.id);

            res.json({
                success: true,
                wallet,
                stats
            });
        } catch (error) {
            console.error('Error getting wallet:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get wallet balance
     */
    async getBalance(req, res) {
        try {
            const user = req.session.sponsor_user || req.session.bank_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const balance = await Wallet.getBalance(user.id);

            res.json({
                success: true,
                balance
            });
        } catch (error) {
            console.error('Error getting balance:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Request deposit (initiate M-Pesa payment)
     */
    async requestDeposit(req, res) {
        try {
            const user = req.session.sponsor_user || req.session.bank_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { amount, phone_number, payment_method } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount' });
            }

            if (!phone_number) {
                return res.status(400).json({ error: 'Phone number required' });
            }

            if (!payment_method || !['mpesa', 'tigopesa', 'airtelmoney'].includes(payment_method)) {
                return res.status(400).json({ error: 'Invalid payment method' });
            }

            // TODO: Integrate with actual payment gateway
            // For now, create a pending payment request

            const [result] = await db.query(
                `INSERT INTO payment_requests
                 (user_id, payment_method, amount, phone_number, status, expires_at)
                 VALUES (?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
                [user.id, payment_method, amount, phone_number]
            );

            // In production, this would trigger actual M-Pesa STK push
            // For now, simulate pending status

            res.json({
                success: true,
                message: 'Payment request initiated. Please complete payment on your phone.',
                payment_request_id: result.insertId,
                amount,
                expires_in_seconds: 600
            });
        } catch (error) {
            console.error('Error requesting deposit:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Check payment status
     */
    async checkPaymentStatus(req, res) {
        try {
            const { payment_request_id } = req.params;
            const user = req.session.sponsor_user || req.session.bank_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const [requests] = await db.query(
                'SELECT * FROM payment_requests WHERE id = ? AND user_id = ?',
                [payment_request_id, user.id]
            );

            if (requests.length === 0) {
                return res.status(404).json({ error: 'Payment request not found' });
            }

            const request = requests[0];

            res.json({
                success: true,
                payment_request: {
                    id: request.id,
                    amount: request.amount,
                    status: request.status,
                    payment_method: request.payment_method,
                    created_at: request.created_at,
                    completed_at: request.completed_at
                }
            });
        } catch (error) {
            console.error('Error checking payment status:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Manual deposit (admin only, for testing or manual payments)
     */
    async manualDeposit(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const { user_id, amount, payment_method, payment_reference, description } = req.body;

            if (!user_id || !amount || amount <= 0) {
                return res.status(400).json({ error: 'Invalid parameters' });
            }

            const result = await Wallet.deposit(
                user_id,
                parseFloat(amount),
                payment_method || 'manual',
                payment_reference || `MANUAL-${Date.now()}`,
                description || 'Manual deposit by admin'
            );

            // Log activity
            await db.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
                 VALUES (?, 'manual_deposit', 'wallet', ?, ?)`,
                [user.id, result.wallet_id, `Manual deposit of ${amount} to user ${user_id}`]
            );

            // Notify user
            await db.query(
                `INSERT INTO notifications (user_id, notification_type, title, message)
                 VALUES (?, 'success', 'Deposit Received', ?)`,
                [user_id, `Your wallet has been credited with TZS ${amount.toLocaleString()}`]
            );

            res.json({
                success: true,
                message: 'Deposit successful',
                ...result
            });
        } catch (error) {
            console.error('Error manual deposit:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Request withdrawal
     */
    async requestWithdrawal(req, res) {
        try {
            const user = req.session.sponsor_user || req.session.bank_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { amount, phone_number, payment_method } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount' });
            }

            if (!phone_number) {
                return res.status(400).json({ error: 'Phone number required' });
            }

            // Check if user has sufficient balance
            const balance = await Wallet.getBalance(user.id);

            if (balance < amount) {
                return res.status(400).json({
                    error: 'Insufficient balance',
                    balance,
                    requested: amount
                });
            }

            // Check minimum withdrawal amount
            const minWithdrawal = 10000; // TZS 10,000
            if (amount < minWithdrawal) {
                return res.status(400).json({
                    error: `Minimum withdrawal amount is TZS ${minWithdrawal.toLocaleString()}`
                });
            }

            const result = await Wallet.withdraw(
                user.id,
                parseFloat(amount),
                payment_method || 'mpesa',
                phone_number,
                'Wallet withdrawal'
            );

            // Notify admins
            await db.query(
                `INSERT INTO notifications (user_id, notification_type, title, message)
                 SELECT id, 'info', 'Withdrawal Request', ?
                 FROM users
                 WHERE role IN ('admin', 'super_admin')`,
                [`User ${user.name} (${user.phone_number}) requested withdrawal of TZS ${amount.toLocaleString()}`]
            );

            res.json({
                success: true,
                message: 'Withdrawal request submitted. Processing may take 1-2 business days.',
                transaction_id: result.transaction_id,
                status: result.status
            });
        } catch (error) {
            console.error('Error requesting withdrawal:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get transactions history
     */
    async getTransactions(req, res) {
        try {
            const user = req.session.sponsor_user || req.session.bank_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.per_page) || 50;

            const filters = {
                transaction_type: req.query.transaction_type,
                status: req.query.status,
                start_date: req.query.start_date,
                end_date: req.query.end_date
            };

            const result = await Wallet.getTransactions(user.id, filters, page, perPage);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Error getting transactions:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Get pending withdrawals
     */
    async getPendingWithdrawals(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const [withdrawals] = await db.query(
                `SELECT
                    t.*,
                    u.name as user_name,
                    u.phone_number,
                    u.email,
                    u.company_name
                 FROM transactions t
                 JOIN users u ON t.user_id = u.id
                 WHERE t.transaction_type = 'withdrawal'
                 AND t.status = 'pending'
                 ORDER BY t.created_at ASC`
            );

            res.json({
                success: true,
                withdrawals
            });
        } catch (error) {
            console.error('Error getting pending withdrawals:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Process withdrawal
     */
    async processWithdrawal(req, res) {
        try {
            const { transaction_id } = req.params;
            const { status, payment_reference } = req.body;
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            if (!['completed', 'failed'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status. Use "completed" or "failed"' });
            }

            // Get transaction details
            const [transactions] = await db.query(
                'SELECT * FROM transactions WHERE id = ? AND transaction_type = "withdrawal"',
                [transaction_id]
            );

            if (transactions.length === 0) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            const transaction = transactions[0];

            await Wallet.processWithdrawal(transaction_id, status, payment_reference);

            // Notify user
            const message = status === 'completed'
                ? `Your withdrawal of TZS ${transaction.amount.toLocaleString()} has been completed. Reference: ${payment_reference}`
                : `Your withdrawal of TZS ${transaction.amount.toLocaleString()} failed and has been refunded to your wallet.`;

            await db.query(
                `INSERT INTO notifications (user_id, notification_type, title, message)
                 VALUES (?, ?, 'Withdrawal ${status === 'completed' ? 'Completed' : 'Failed'}', ?)`,
                [transaction.user_id, status === 'completed' ? 'success' : 'error', message]
            );

            // Log activity
            await db.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
                 VALUES (?, 'process_withdrawal', 'transaction', ?, ?)`,
                [user.id, transaction_id, `Processed withdrawal: ${status}`]
            );

            res.json({
                success: true,
                message: `Withdrawal ${status}`
            });
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Set low balance alert threshold
     */
    async setLowBalanceThreshold(req, res) {
        try {
            const user = req.session.sponsor_user || req.session.bank_user || req.session.admin_user;

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { threshold } = req.body;

            if (!threshold || threshold < 0) {
                return res.status(400).json({ error: 'Invalid threshold' });
            }

            await Wallet.setLowBalanceThreshold(user.id, parseFloat(threshold));

            res.json({
                success: true,
                message: 'Low balance threshold updated',
                threshold
            });
        } catch (error) {
            console.error('Error setting threshold:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Admin: Get low balance wallets
     */
    async getLowBalanceWallets(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const wallets = await Wallet.getLowBalanceWallets();

            res.json({
                success: true,
                wallets
            });
        } catch (error) {
            console.error('Error getting low balance wallets:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get wallet statistics (admin)
     */
    async getAllWalletsStats(req, res) {
        try {
            const user = req.session.admin_user;

            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            const [stats] = await db.query(`
                SELECT
                    COUNT(*) as total_wallets,
                    SUM(balance) as total_balance,
                    SUM(total_deposited) as total_deposited,
                    SUM(total_spent) as total_spent,
                    SUM(total_withdrawn) as total_withdrawn,
                    AVG(balance) as avg_balance
                FROM wallets
                WHERE is_active = 1
            `);

            const [recentDeposits] = await db.query(`
                SELECT COUNT(*) as count, SUM(amount) as total
                FROM transactions
                WHERE transaction_type = 'deposit'
                AND status = 'completed'
                AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            const [recentWithdrawals] = await db.query(`
                SELECT COUNT(*) as count, SUM(amount) as total
                FROM transactions
                WHERE transaction_type = 'withdrawal'
                AND status = 'completed'
                AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            res.json({
                success: true,
                stats: {
                    ...stats[0],
                    recent_deposits: recentDeposits[0],
                    recent_withdrawals: recentWithdrawals[0]
                }
            });
        } catch (error) {
            console.error('Error getting wallet stats:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = walletController;
