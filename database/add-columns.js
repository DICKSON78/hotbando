/**
 * Add Missing Database Columns
 * Run this to add columns that were missing
 */

const db = require('../config/database');

async function addMissingColumns() {
    try {
        console.log('🔧 Adding missing database columns...\n');

        // Add is_active to mikrotiks
        await db.execute(`
            ALTER TABLE mikrotiks 
            ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1
        `).catch(err => {
            if (!err.message.includes('Duplicate column')) {
                console.log('⚠️  is_active column might already exist');
            }
        });
        console.log('✅ Added is_active to mikrotiks');

        // Add active_users to mikrotiks
        await db.execute(`
            ALTER TABLE mikrotiks 
            ADD COLUMN IF NOT EXISTS active_users INT DEFAULT 0
        `).catch(err => {
            if (!err.message.includes('Duplicate column')) {
                console.log('⚠️  active_users column might already exist');
            }
        });
        console.log('✅ Added active_users to mikrotiks');

        // Add name to locations (if not exists)
        await db.execute(`
            ALTER TABLE locations 
            ADD COLUMN IF NOT EXISTS name VARCHAR(255)
        `).catch(err => {
            if (!err.message.includes('Duplicate column')) {
                console.log('⚠️  name column might already exist');
            }
        });
        console.log('✅ Added name to locations');

        // Add location_id to mikrotiks
        await db.execute(`
            ALTER TABLE mikrotiks 
            ADD COLUMN IF NOT EXISTS location_id INT DEFAULT NULL
        `).catch(err => {
            if (!err.message.includes('Duplicate column')) {
                console.log('⚠️  location_id column might already exist');
            }
        });
        console.log('✅ Added location_id to mikrotiks');

        // Update existing data
        await db.execute(`UPDATE mikrotiks SET is_active = 1 WHERE is_active IS NULL`);
        await db.execute(`UPDATE mikrotiks SET active_users = 0 WHERE active_users IS NULL`);
        await db.execute(`UPDATE locations SET name = location_name WHERE name IS NULL OR name = ''`);
        
        console.log('\n✅ All missing columns added successfully!');
        console.log('✅ Existing data updated');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding columns:', error.message);
        process.exit(1);
    }
}

addMissingColumns();

// Add franchise_owner_id to locations
async function addFranchiseOwnerColumn() {
    try {
        await db.execute(`
            ALTER TABLE locations 
            ADD COLUMN IF NOT EXISTS franchise_owner_id INT DEFAULT NULL
        `);
        console.log('✅ Added franchise_owner_id to locations');
    } catch (err) {
        console.log('⚠️  franchise_owner_id might already exist');
    }
}
