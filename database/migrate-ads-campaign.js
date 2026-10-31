// Link legacy `ads` rows to partner `campaigns` so an approved ad campaign
// is served to customers through the existing ads flow.
// Usage: node database/migrate-ads-campaign.js
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

    if (!(await hasColumn('ads', 'campaign_id'))) {
        await conn.execute('ALTER TABLE ads ADD COLUMN campaign_id INT NULL AFTER sponsor_id, ADD KEY idx_ads_campaign (campaign_id)');
        console.log('✅ ads.campaign_id added');
    } else {
        console.log('ℹ️ ads.campaign_id already exists');
    }

    // Platform-owned ads have no sponsor.
    await conn.execute('ALTER TABLE ads MODIFY sponsor_id INT NULL');
    console.log('✅ ads.sponsor_id is nullable');

    await conn.end();
}

main().catch((err) => { console.error('❌ Migration failed:', err.message); process.exit(1); });
