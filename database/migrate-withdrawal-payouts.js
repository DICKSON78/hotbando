// Reseller withdrawals paid through ClickPesa mobile money payouts.
// Idempotent. Usage: node database/migrate-withdrawal-payouts.js
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

    const [enumRow] = await conn.execute(
        "SELECT COLUMN_TYPE AS t FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'reseller_withdrawals' AND COLUMN_NAME = 'status'",
        [dbName]
    );
    if (!enumRow[0].t.includes("'sending'")) {
        await conn.execute("ALTER TABLE reseller_withdrawals MODIFY status ENUM('pending','approved','processed','rejected','sending','sent','failed') NOT NULL DEFAULT 'pending'");
        console.log('✅ reseller_withdrawals.status extended');
    }

    const columns = {
        fee: 'DECIMAL(10,2) NULL',
        payout_amount: 'DECIMAL(10,2) NULL',
        order_reference: 'VARCHAR(40) NULL',
        provider_ref: 'VARCHAR(64) NULL',
        attempts: 'INT NOT NULL DEFAULT 0',
        last_error: 'VARCHAR(255) NULL',
        sent_at: 'DATETIME NULL',
    };
    for (const [name, definition] of Object.entries(columns)) {
        const [rows] = await conn.execute(
            'SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [dbName, 'reseller_withdrawals', name]
        );
        if (rows[0].c === 0) {
            await conn.execute(`ALTER TABLE reseller_withdrawals ADD COLUMN ${name} ${definition}`);
            console.log(`✅ reseller_withdrawals.${name} added`);
        }
    }

    await conn.end();
}

main().catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
