/**
 * Wallet Model
 * Manages advertiser wallets, deposits, withdrawals, and billing
 */

const BaseModel = require('./BaseModel');
const db = require('../config/database');

class Wallet extends BaseModel {
    constructor() {
        super('wallets');
    }

    /**
     * Create wallet for user
     */
    async createWallet(userId, initialBalance = 0) {
        try {
            const walletData = {
                user_id: userId,
                balance: initialBalance,
                total_deposited: initialBalance,
                is_active: 1
            };

            return await this.create(walletData);
        } catch (error) {
            console.error('Error creating wallet:', error);
            throw error;
        }
    }

    /**
     * Get wallet by user ID
     */
    async getByUserId(userId) {
        try {
            const wallet = await this.findOne({ user_id: userId });

            if (!wallet) {
                // Auto-create wallet if doesn't exist
                return await this.createWallet(userId);
            }

            return wallet;
        } catch (error) {
            console.error('Error getting wallet:', error);
            throw error;
        }
    }

    /**
     * Deposit money into wallet
     */
    async deposit(userId, amount, paymentMethod, paymentReference, description = 'Wallet deposit') {
        const connection = await this.beginTransaction();

        try {
            // Get or create wallet
            let [wallets] = await connection.query(
                'SELECT * FROM wallets WHERE user_id = ? FOR UPDATE',
                [userId]
            );

            let wallet = wallets[0];

            if (!wallet) {
                // Create wallet
                const [result] = await connection.query(
                    'INSERT INTO wallets (user_id, balance, total_deposited) VALUES (?, ?, ?)',
                    [userId, 0, 0]
                );
                wallet = { id: result.insertId, balance: 0, total_deposited: 0 };
            }

            const balanceBefore = parseFloat(wallet.balance);
            const balanceAfter = balanceBefore + parseFloat(amount);

            // Update wallet
            await connection.query(
                `UPDATE wallets
                 SET balance = ?,
                     total_deposited = total_deposited + ?
                 WHERE id = ?`,
                [balanceAfter, amount, wallet.id]
            );

            // Record transaction
            const transactionData = {
                wallet_id: wallet.id,
                user_id: userId,
                transaction_type: 'deposit',
                amount: amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'completed',
                payment_method: paymentMethod,
                payment_reference: paymentReference,
                description: description,
                processed_at: new Date()
            };

            const [txResult] = await connection.query(
                'INSERT INTO transactions SET ?',
                transactionData
            );

            await connection.commit();
            connection.release();

            return {
                transaction_id: txResult.insertId,
                wallet_id: wallet.id,
                balance: balanceAfter,
                amount: amount
            };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    /**
     * Withdraw money from wallet
     */
    async withdraw(userId, amount, paymentMethod, paymentPhone, description = 'Wallet withdrawal') {
        const connection = await this.beginTransaction();

        try {
            // Get wallet with lock
            const [wallets] = await connection.query(
                'SELECT * FROM wallets WHERE user_id = ? FOR UPDATE',
                [userId]
            );

            if (wallets.length === 0) {
                throw new Error('Wallet not found');
            }

            const wallet = wallets[0];
            const balanceBefore = parseFloat(wallet.balance);

            if (balanceBefore < amount) {
                throw new Error('Insufficient balance');
            }

            const balanceAfter = balanceBefore - parseFloat(amount);

            // Update wallet
            await connection.query(
                `UPDATE wallets
                 SET balance = ?,
                     total_withdrawn = total_withdrawn + ?
                 WHERE id = ?`,
                [balanceAfter, amount, wallet.id]
            );

            // Record transaction
            const transactionData = {
                wallet_id: wallet.id,
                user_id: userId,
                transaction_type: 'withdrawal',
                amount: amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'pending', // Withdrawal needs processing
                payment_method: paymentMethod,
                payment_phone: paymentPhone,
                description: description
            };

            const [txResult] = await connection.query(
                'INSERT INTO transactions SET ?',
                transactionData
            );

            await connection.commit();
            connection.release();

            return {
                transaction_id: txResult.insertId,
                wallet_id: wallet.id,
                balance: balanceAfter,
                amount: amount,
                status: 'pending'
            };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    /**
     * Charge wallet for campaign
     */
    async chargeCampaign(userId, campaignId, amount, description) {
        const connection = await this.beginTransaction();

        try {
            // Get wallet with lock
            const [wallets] = await connection.query(
                'SELECT * FROM wallets WHERE user_id = ? FOR UPDATE',
                [userId]
            );

            if (wallets.length === 0) {
                throw new Error('Wallet not found');
            }

            const wallet = wallets[0];
            const balanceBefore = parseFloat(wallet.balance);

            if (balanceBefore < amount) {
                throw new Error('Insufficient balance. Please top up your wallet.');
            }

            const balanceAfter = balanceBefore - parseFloat(amount);

            // Update wallet
            await connection.query(
                `UPDATE wallets
                 SET balance = ?,
                     total_spent = total_spent + ?
                 WHERE id = ?`,
                [balanceAfter, amount, wallet.id]
            );

            // Record transaction
            const transactionData = {
                wallet_id: wallet.id,
                user_id: userId,
                transaction_type: 'campaign_charge',
                amount: amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'completed',
                reference_type: 'campaign',
                reference_id: campaignId,
                description: description,
                processed_at: new Date()
            };

            const [txResult] = await connection.query(
                'INSERT INTO transactions SET ?',
                transactionData
            );

            await connection.commit();
            connection.release();

            return {
                transaction_id: txResult.insertId,
                balance: balanceAfter,
                charged: amount
            };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance(userId) {
        try {
            const wallet = await this.getByUserId(userId);
            return parseFloat(wallet.balance);
        } catch (error) {
            console.error('Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Check if wallet has sufficient balance
     */
    async hasSufficientBalance(userId, amount) {
        try {
            const balance = await this.getBalance(userId);
            return balance >= parseFloat(amount);
        } catch (error) {
            console.error('Error checking balance:', error);
            return false;
        }
    }

    /**
     * Get wallet transactions
     */
    async getTransactions(userId, filters = {}, page = 1, perPage = 50) {
        try {
            const offset = (page - 1) * perPage;

            let query = `
                SELECT t.*, c.campaign_name
                FROM transactions t
                LEFT JOIN campaigns c ON t.reference_type = 'campaign' AND t.reference_id = c.id
                WHERE t.user_id = ?
            `;

            const params = [userId];

            if (filters.transaction_type) {
                query += ` AND t.transaction_type = ?`;
                params.push(filters.transaction_type);
            }

            if (filters.status) {
                query += ` AND t.status = ?`;
                params.push(filters.status);
            }

            if (filters.start_date) {
                query += ` AND t.created_at >= ?`;
                params.push(filters.start_date);
            }

            if (filters.end_date) {
                query += ` AND t.created_at <= ?`;
                params.push(filters.end_date);
            }

            query += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
            params.push(perPage, offset);

            const [rows] = await this.db.query(query, params);

            // Get total count
            let countQuery = `SELECT COUNT(*) as total FROM transactions WHERE user_id = ?`;
            const countParams = [userId];

            if (filters.transaction_type) {
                countQuery += ` AND transaction_type = ?`;
                countParams.push(filters.transaction_type);
            }

            const [countResult] = await this.db.query(countQuery, countParams);

            return {
                transactions: rows,
                pagination: {
                    page,
                    perPage,
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / perPage)
                }
            };
        } catch (error) {
            console.error('Error getting transactions:', error);
            throw error;
        }
    }

    /**
     * Get wallet statistics
     */
    async getWalletStats(userId) {
        try {
            const query = `
                SELECT
                    w.*,
                    COUNT(CASE WHEN t.transaction_type = 'deposit' AND t.status = 'completed' THEN 1 END) as total_deposits,
                    COUNT(CASE WHEN t.transaction_type = 'withdrawal' THEN 1 END) as total_withdrawals,
                    COUNT(CASE WHEN t.transaction_type = 'campaign_charge' THEN 1 END) as total_charges,
                    SUM(CASE WHEN t.transaction_type = 'deposit' AND t.status = 'completed' THEN t.amount ELSE 0 END) as total_deposited_amount,
                    SUM(CASE WHEN t.transaction_type = 'campaign_charge' THEN t.amount ELSE 0 END) as total_spent_amount,
                    SUM(CASE WHEN t.transaction_type = 'withdrawal' AND t.status = 'completed' THEN t.amount ELSE 0 END) as total_withdrawn_amount
                FROM wallets w
                LEFT JOIN transactions t ON w.id = t.wallet_id
                WHERE w.user_id = ?
                GROUP BY w.id
            `;

            const [rows] = await this.db.query(query, [userId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting wallet stats:', error);
            throw error;
        }
    }

    /**
     * Process pending withdrawal
     */
    async processWithdrawal(transactionId, status, paymentReference = null) {
        const connection = await this.beginTransaction();

        try {
            // Get transaction
            const [transactions] = await connection.query(
                'SELECT * FROM transactions WHERE id = ? AND transaction_type = "withdrawal"',
                [transactionId]
            );

            if (transactions.length === 0) {
                throw new Error('Transaction not found');
            }

            const transaction = transactions[0];

            // If failed, refund to wallet
            if (status === 'failed') {
                await connection.query(
                    `UPDATE wallets
                     SET balance = balance + ?,
                         total_withdrawn = total_withdrawn - ?
                     WHERE id = ?`,
                    [transaction.amount, transaction.amount, transaction.wallet_id]
                );
            }

            // Update transaction
            await connection.query(
                `UPDATE transactions
                 SET status = ?,
                     payment_reference = ?,
                     processed_at = NOW()
                 WHERE id = ?`,
                [status, paymentReference, transactionId]
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
     * Set low balance alert threshold
     */
    async setLowBalanceThreshold(userId, threshold) {
        try {
            const wallet = await this.getByUserId(userId);

            await this.update(wallet.id, {
                low_balance_threshold: threshold
            });

            return true;
        } catch (error) {
            console.error('Error setting low balance threshold:', error);
            throw error;
        }
    }

    /**
     * Check for low balance wallets
     */
    async getLowBalanceWallets() {
        try {
            const query = `
                SELECT w.*, u.name, u.email, u.phone_number, u.company_name
                FROM wallets w
                JOIN users u ON w.user_id = u.id
                WHERE w.is_active = 1
                AND w.balance < w.low_balance_threshold
                AND u.role IN ('sponsor', 'bank_partner')
            `;

            const [rows] = await this.db.query(query);
            return rows;
        } catch (error) {
            console.error('Error getting low balance wallets:', error);
            throw error;
        }
    }
}

module.exports = new Wallet();
