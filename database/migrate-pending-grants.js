// Packages gifted to another registered customer, waiting to start on their
// first connection. Idempotent. Usage: node database/migrate-pending-grants.js
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

    await conn.execute(`CREATE TABLE IF NOT EXISTS pending_package_grants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        package_id INT NOT NULL,
        order_reference VARCHAR(64) NOT NULL UNIQUE,
        purchased_by_phone VARCHAR(20) NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        claimed_at DATETIME NULL,
        INDEX idx_pending_grants_user (user_id, status)
    )`);
    console.log('✅ pending_package_grants ready');

    const [prices] = await conn.execute(
        "UPDATE packages SET price = 40000 WHERE duration_hours = 720 AND name = 'MWEZI 1' AND price <> 40000"
    );
    console.log(`✅ monthly package price set to TSh 40,000 (${prices.affectedRows} row(s) changed)`);

    await conn.end();
}

main().catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
