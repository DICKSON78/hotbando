/**
 * Database Setup & Migration Utility
 * Run this to set up the complete Hotbando database schema
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotbando',
    multipleStatements: true
};

async function setupDatabase() {
    let connection;

    try {
        console.log('🚀 Starting Hotbando Database Setup...\n');

        // Connect to MySQL (without database first)
        const tempConfig = { ...dbConfig };
        const dbName = tempConfig.database;
        delete tempConfig.database;

        connection = await mysql.createConnection(tempConfig);
        console.log('✅ Connected to MySQL server');

        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Database '${dbName}' ready`);

        // Use the database
        await connection.query(`USE \`${dbName}\``);

        // Read and execute schema file
        console.log('\n📄 Reading schema file...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');

        console.log('⚙️  Executing schema...');
        await connection.query(schema);

        console.log('✅ Schema created successfully\n');

        // Verify tables
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`✅ Created ${tables.length} tables:`);
        tables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`   ${index + 1}. ${tableName}`);
        });

        // Check for default data
        console.log('\n🔍 Verifying default data...');

        const [packages] = await connection.query('SELECT COUNT(*) as count FROM packages');
        console.log(`   ✅ Packages: ${packages[0].count} records`);

        const [settings] = await connection.query('SELECT COUNT(*) as count FROM system_settings');
        console.log(`   ✅ System Settings: ${settings[0].count} records`);

        const [admins] = await connection.query("SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'");
        console.log(`   ✅ Super Admin: ${admins[0].count} account(s)`);

        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📝 Default Admin Credentials:');
        console.log('   Phone: +255700000000');
        console.log('   Password: Admin@123');
        console.log('   ⚠️  Please change the password after first login!\n');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.error('\nError details:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function resetDatabase() {
    let connection;

    try {
        console.log('⚠️  WARNING: This will DROP and recreate the database!');
        console.log('⚠️  All existing data will be LOST!\n');

        // Wait 3 seconds to give user time to cancel
        await new Promise(resolve => setTimeout(resolve, 3000));

        const tempConfig = { ...dbConfig };
        const dbName = tempConfig.database;
        delete tempConfig.database;

        connection = await mysql.createConnection(tempConfig);

        console.log('🗑️  Dropping existing database...');
        await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
        console.log('✅ Database dropped\n');

        await connection.end();

        // Now run normal setup
        await setupDatabase();

    } catch (error) {
        console.error('❌ Reset failed:', error.message);
        process.exit(1);
    }
}

async function checkDatabase() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connection successful\n');

        // Check tables
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`📊 Total tables: ${tables.length}\n`);

        // Check key tables and their counts
        const keyTables = [
            'users', 'locations', 'mikrotiks', 'campaigns', 'campaign_completions',
            'wallets', 'transactions', 'packages', 'vouchers', 'ads'
        ];

        console.log('📈 Table Statistics:');
        for (const table of keyTables) {
            try {
                const [result] = await connection.query(`SELECT COUNT(*) as count FROM \`${table}\``);
                console.log(`   ${table.padEnd(25)} : ${result[0].count} records`);
            } catch (err) {
                console.log(`   ${table.padEnd(25)} : ❌ Not found`);
            }
        }

        console.log('\n✅ Database check completed\n');

    } catch (error) {
        console.error('❌ Check failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Command line interface
const command = process.argv[2];

switch (command) {
    case 'setup':
        setupDatabase();
        break;
    case 'reset':
        resetDatabase();
        break;
    case 'check':
        checkDatabase();
        break;
    default:
        console.log('Hotbando Database Management');
        console.log('Usage: node database/setup.js [command]\n');
        console.log('Commands:');
        console.log('  setup  - Set up database schema (safe, keeps existing data)');
        console.log('  reset  - Drop and recreate database (⚠️  DESTRUCTIVE!)');
        console.log('  check  - Check database status and table counts\n');
        break;
}
