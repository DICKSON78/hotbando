/**
 * Database Migration Script
 * Adds new tables and columns to existing database
 * Run: node database/migrate.js
 */

const db = require('../config/database');

async function migrate() {
    console.log('🔄 Starting database migration...\n');

    try {
        // 1. Add new columns to users table
        console.log('📝 Updating users table...');

        // Check and add user_type column
        try {
            await db.execute(`
                ALTER TABLE users
                ADD COLUMN user_type ENUM('student', 'tenant', 'other') DEFAULT 'other' AFTER role
            `);
            console.log('  ✅ Added user_type column');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
            console.log('  ℹ️  user_type column already exists');
        }

        // Check and add company_name column
        try {
            await db.execute(`
                ALTER TABLE users
                ADD COLUMN company_name VARCHAR(255) NULL AFTER user_type
            `);
            console.log('  ✅ Added company_name column');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
            console.log('  ℹ️  company_name column already exists');
        }

        // Check and add commission_rate column
        try {
            await db.execute(`
                ALTER TABLE users
                ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.00 AFTER company_name
            `);
            console.log('  ✅ Added commission_rate column');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
            console.log('  ℹ️  commission_rate column already exists');
        }

        // Check and add gender column
        try {
            await db.execute(`
                ALTER TABLE users
                ADD COLUMN gender ENUM('male', 'female', 'other') NULL AFTER commission_rate
            `);
            console.log('  ✅ Added gender column');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
            console.log('  ℹ️  gender column already exists');
        }

        // Check and add age column
        try {
            await db.execute(`
                ALTER TABLE users
                ADD COLUMN age INT NULL AFTER gender
            `);
            console.log('  ✅ Added age column');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') throw err;
            console.log('  ℹ️  age column already exists');
        }

        // 2. Create locations table
        console.log('\n📍 Creating locations table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS locations (
                id INT PRIMARY KEY AUTO_INCREMENT,
                location_name VARCHAR(255) NOT NULL,
                city VARCHAR(100) NOT NULL,
                region VARCHAR(100) NOT NULL,
                address TEXT,
                location_type ENUM('university', 'college', 'hostel', 'mall', 'restaurant', 'other') DEFAULT 'other',
                owner_id INT NULL COMMENT 'Franchise owner user_id',
                commission_rate DECIMAL(5,2) DEFAULT 10.00,
                latitude DECIMAL(10,8) NULL,
                longitude DECIMAL(11,8) NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Locations table created');

        // 3. Create campaigns table
        console.log('\n📢 Creating campaigns table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS campaigns (
                id INT PRIMARY KEY AUTO_INCREMENT,
                campaign_name VARCHAR(255) NOT NULL,
                description TEXT,
                campaign_type ENUM('ad_video', 'ad_image', 'bank_form', 'app_install', 'survey') NOT NULL,
                owner_type ENUM('advertiser', 'bank', 'app_developer') NOT NULL,
                owner_id INT NOT NULL COMMENT 'User ID of campaign owner',
                company_name VARCHAR(255),
                total_budget DECIMAL(15,2) DEFAULT 0.00,
                spent_budget DECIMAL(15,2) DEFAULT 0.00,
                cost_per_completion DECIMAL(10,2) NOT NULL COMMENT 'Cost per lead/view/install',
                reward_bytes BIGINT DEFAULT 0 COMMENT 'Data reward in bytes',
                target_user_types JSON COMMENT 'Array of targeted user types',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Campaigns table created');

        // 4. Create campaign_content table
        console.log('\n📄 Creating campaign_content table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS campaign_content (
                id INT PRIMARY KEY AUTO_INCREMENT,
                campaign_id INT NOT NULL,
                video_url VARCHAR(500) NULL,
                video_duration INT NULL COMMENT 'Duration in seconds',
                image_url VARCHAR(500) NULL,
                form_fields JSON NULL COMMENT 'Form fields for bank forms',
                product_details TEXT NULL,
                app_name VARCHAR(255) NULL,
                app_url VARCHAR(500) NULL,
                app_icon_url VARCHAR(500) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Campaign content table created');

        // 5. Create campaign_completions table
        console.log('\n👥 Creating campaign_completions table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS campaign_completions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                campaign_id INT NOT NULL,
                user_id INT NOT NULL,
                lead_status ENUM('new', 'contacted', 'qualified', 'converted', 'rejected') DEFAULT 'new',
                lead_data JSON NULL COMMENT 'Form submission data',
                notes TEXT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_campaign (user_id, campaign_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Campaign completions table created');

        // 6. Create wallets table
        console.log('\n💰 Creating wallets table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS wallets (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                balance DECIMAL(15,2) DEFAULT 0.00,
                low_balance_threshold DECIMAL(15,2) DEFAULT 10000.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_wallet (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Wallets table created');

        // 7. Create transactions table
        console.log('\n💸 Creating transactions table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                wallet_id INT NOT NULL,
                transaction_type ENUM('deposit', 'withdrawal', 'campaign_spend', 'revenue_share', 'refund') NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                description TEXT,
                status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
                reference_id VARCHAR(100) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Transactions table created');

        // 8. Create payment_requests table
        console.log('\n🏦 Creating payment_requests table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS payment_requests (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                request_type ENUM('deposit', 'withdrawal') NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                payment_method ENUM('mpesa', 'tigopesa', 'airtel_money', 'bank_transfer') NOT NULL,
                phone_number VARCHAR(20) NULL,
                bank_details JSON NULL,
                status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
                payment_reference VARCHAR(100) NULL,
                processed_by INT NULL,
                processed_at TIMESTAMP NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Payment requests table created');

        // 9. Create partner_revenue_shares table
        console.log('\n💵 Creating partner_revenue_shares table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS partner_revenue_shares (
                id INT PRIMARY KEY AUTO_INCREMENT,
                partner_id INT NOT NULL COMMENT 'Franchise owner user_id',
                location_id INT NOT NULL,
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                total_revenue DECIMAL(15,2) NOT NULL,
                share_percentage DECIMAL(5,2) NOT NULL,
                share_amount DECIMAL(15,2) NOT NULL,
                status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
                approved_by INT NULL,
                approved_at TIMESTAMP NULL,
                payment_reference VARCHAR(100) NULL,
                paid_at TIMESTAMP NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
                FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Partner revenue shares table created');

        // 10. Create indexes for better performance
        console.log('\n⚡ Creating indexes...');

        try {
            await db.execute('CREATE INDEX idx_campaigns_owner ON campaigns(owner_id, is_active)');
            console.log('  ✅ Campaign owner index created');
        } catch (err) {
            if (err.code !== 'ER_DUP_KEYNAME') throw err;
        }

        try {
            await db.execute('CREATE INDEX idx_completions_campaign ON campaign_completions(campaign_id, lead_status)');
            console.log('  ✅ Campaign completions index created');
        } catch (err) {
            if (err.code !== 'ER_DUP_KEYNAME') throw err;
        }

        try {
            await db.execute('CREATE INDEX idx_transactions_wallet ON transactions(wallet_id, created_at)');
            console.log('  ✅ Transactions index created');
        } catch (err) {
            if (err.code !== 'ER_DUP_KEYNAME') throw err;
        }

        try {
            await db.execute('CREATE INDEX idx_revenue_partner ON partner_revenue_shares(partner_id, status)');
            console.log('  ✅ Revenue shares index created');
        } catch (err) {
            if (err.code !== 'ER_DUP_KEYNAME') throw err;
        }

        console.log('\n✅ Database migration completed successfully!\n');
        console.log('📊 Summary of Changes:');
        console.log('   - Added 6 columns to users table');
        console.log('   - Created 8 new tables');
        console.log('   - Created performance indexes');
        console.log('   - All existing data preserved\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration error:', error);
        console.error('\n💡 Tip: Make sure your database is running and config/database.js is configured correctly\n');
        process.exit(1);
    }
}

// Run migration
migrate();
