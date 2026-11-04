// Reseller selling price (profit model), and a separate payment ledger table.
// Idempotent. Usage: node database/migrate-reseller-profit.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hotbando',
    });
    const dbName = process.env.DB_NAME || 'hotbando';

    const [cols] = await conn.execute(
        "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vouchers' AND COLUMN_NAME = 'reseller_profit'",
        [dbName]
    );
    if (cols[0].c === 0) {
        await conn.execute('ALTER TABLE vouchers ADD COLUMN reseller_profit TINYINT(1) NOT NULL DEFAULT 0');
        console.log('✅ vouchers.reseller_profit added');
    } else {
        console.log('ℹ️ vouchers.reseller_profit already exists');
    }

    // Ledger for ClickPesa payments. The legacy `payments` table keeps its
    // purchase records; this table holds the double-entry style ledger rows.
    await conn.execute(`CREATE TABLE IF NOT EXISTS payment_ledger (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        business_id BIGINT UNSIGNED NULL,
        partner_id BIGINT UNSIGNED NULL,
        customer_id BIGINT UNSIGNED NULL,
        order_reference VARCHAR(128) NULL,
        payment_request_id BIGINT UNSIGNED NULL,
        clickpesa_transaction_id BIGINT UNSIGNED NULL,
        type ENUM('payment','payout','refund','reversal') NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(8) NOT NULL DEFAULT 'TZS',
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        provider VARCHAR(32) NOT NULL DEFAULT 'clickpesa',
        provider_ref VARCHAR(128) NULL,
        description TEXT NULL,
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ledger_customer (customer_id),
        INDEX idx_ledger_order (order_reference),
        INDEX idx_ledger_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('✅ payment_ledger ready');

    await conn.end();
}

main().catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
