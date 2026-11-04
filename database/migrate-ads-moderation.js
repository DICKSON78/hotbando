// Ads moderation, expiry and categories.
// Idempotent: safe to run more than once.
// Usage: node database/migrate-ads-moderation.js
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

    async function hasColumn(table, column) {
        const [rows] = await conn.execute(
            'SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [dbName, table, column]
        );
        return rows[0].c > 0;
    }

    async function addColumn(column, definition) {
        if (await hasColumn('ads', column)) {
            console.log(`ℹ️ ads.${column} already exists`);
            return;
        }
        await conn.execute(`ALTER TABLE ads ADD COLUMN ${column} ${definition}`);
        console.log(`✅ ads.${column} added`);
    }

    await conn.execute(`CREATE TABLE IF NOT EXISTS ad_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#FF7A30',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await addColumn('duration_options', "VARCHAR(50) DEFAULT '1d,5d,1w,2w,1m' AFTER duration");
    await addColumn('price_shilling', 'DECIMAL(10,2) DEFAULT 0 AFTER reward_bytes');
    await addColumn('category_id', 'INT NULL AFTER price_shilling');
    await addColumn('expires_at', 'DATETIME NULL AFTER is_active');
    await addColumn('deleted_at', 'DATETIME NULL AFTER expires_at');
    await addColumn('deleted_by', 'INT NULL AFTER deleted_at');
    await addColumn('delete_reason', 'VARCHAR(500) NULL AFTER deleted_by');

    const [fks] = await conn.execute(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ads' AND COLUMN_NAME = 'category_id' AND REFERENCED_TABLE_NAME = 'ad_categories'`,
        [dbName]
    );
    if (fks[0].c === 0) {
        await conn.execute('ALTER TABLE ads ADD CONSTRAINT fk_ads_category FOREIGN KEY (category_id) REFERENCES ad_categories(id)');
        console.log('✅ fk_ads_category added');
    }

    // Ads that were live before this migration keep running for one month
    // from now instead of being treated as already expired.
    const [backfill] = await conn.execute(
        'UPDATE ads SET expires_at = DATE_ADD(NOW(), INTERVAL 1 MONTH) WHERE expires_at IS NULL AND deleted_at IS NULL'
    );
    console.log(`✅ expires_at backfilled for ${backfill.affectedRows} existing ad(s)`);

    await conn.end();
}

main().catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
