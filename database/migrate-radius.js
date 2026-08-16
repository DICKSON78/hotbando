/**
 * FreeRADIUS Migration Script
 * Creates SQL views and indexes for FreeRADIUS integration
 * Run: node database/migrate-radius.js
 *
 * This must be run BEFORE starting FreeRADIUS.
 * The views map HotBando's schema to FreeRADIUS-compatible format.
 */

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrateRadius() {
    console.log('🔄 Setting up FreeRADIUS integration...\n');

    try {
        // 1. Create indexes for 1M user performance
        console.log('📊 Creating indexes...');

        const indexes = [
            { name: 'idx_radius_phone', sql: 'CREATE INDEX IF NOT EXISTS idx_radius_phone ON users(phone_number)' },
            { name: 'idx_radius_active', sql: 'CREATE INDEX IF NOT EXISTS idx_radius_active ON users(role, is_active, phone_number)' },
            { name: 'idx_radius_expiry', sql: 'CREATE INDEX IF NOT EXISTS idx_radius_expiry ON users(usage_until)' },
            { name: 'idx_radius_freebytes', sql: 'CREATE INDEX IF NOT EXISTS idx_radius_freebytes ON users(free_bytes)' },
            { name: 'idx_radius_session', sql: 'CREATE INDEX IF NOT EXISTS idx_radius_session ON user_connection_logs(user_id, timestamp)' },
        ];

        for (const idx of indexes) {
            try {
                // MySQL doesn't support IF NOT EXISTS for indexes, check first
                const [rows] = await db.execute(
                    `SELECT 1 FROM information_schema.STATISTICS
                     WHERE TABLE_SCHEMA = DATABASE()
                       AND TABLE_NAME = ?
                       AND INDEX_NAME = ?`,
                    [idx.sql.match(/ON\s+(\w+)/)?.[1] || '', idx.name]
                );
                if (rows.length === 0) {
                    // CREATE INDEX needs IF NOT EXISTS stripped
                    const cleanSql = idx.sql.replace(/IF NOT EXISTS /, '');
                    await db.execute(cleanSql);
                    console.log(`  ✅ Created ${idx.name}`);
                } else {
                    console.log(`  ℹ️  ${idx.name} already exists`);
                }
            } catch (err) {
                if (err.code === 'ER_DUP_KEYNAME') {
                    console.log(`  ℹ️  ${idx.name} already exists`);
                } else {
                    throw err;
                }
            }
        }

        // 2. Create RADIUS SQL views
        console.log('\n👁️  Creating RADIUS views...');

        // Drop views first (in dependency order)
        const views = [
            'radius_active_sessions',
            'radius_radcheck_simple',
            'radius_radacct',
            'radius_radreply',
            'radius_radcheck',
        ];
        for (const view of views) {
            await db.execute(`DROP VIEW IF EXISTS ${view}`);
        }

        // Read and execute the SQL views file
        const sqlPath = path.join(__dirname, 'radius-freeradius-config.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Extract only the CREATE VIEW statements
        const viewStmts = sqlContent.match(/CREATE OR REPLACE VIEW[\s\S]*?;/g);
        if (viewStmts) {
            for (const stmt of viewStmts) {
                const name = stmt.match(/VIEW\s+(\w+)/)?.[1] || 'unknown';
                await db.execute(stmt);
                console.log(`  ✅ Created view: ${name}`);
            }
        }

        // 3. Verify views
        console.log('\n🔍 Verifying views...');
        const [existingViews] = await db.execute(
            `SELECT TABLE_NAME AS name
             FROM information_schema.VIEWS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME LIKE 'radius_%'
             ORDER BY TABLE_NAME`
        );

        if (existingViews.length > 0) {
            console.log(`  ✅ ${existingViews.length} RADIUS views ready:`);
            existingViews.forEach(v => console.log(`     - ${v.name}`));
        }

        console.log('\n✅ FreeRADIUS integration ready!');
        console.log('\n📋 Next steps:');
        console.log('   1. Create DB user: CREATE USER IF NOT EXISTS freeradius@localhost ...');
        console.log('   2. Grant access:   GRANT SELECT, INSERT, UPDATE ON hotbando.* TO freeradius@localhost');
        console.log('   3. Install FR:     sudo bash freeradius/deploy.sh');
        console.log('   4. Test auth:      radtest 0712345678 <password> localhost 0 testing123\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

migrateRadius();
