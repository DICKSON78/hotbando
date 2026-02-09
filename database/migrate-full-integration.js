/**
 * Full Integration Migration
 * Adds all missing tables and columns needed for complete project integration
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hotbando'
    });

    console.log('Connected to database\n');

    // Helper: check if column exists
    async function columnExists(table, column) {
      const [rows] = await conn.query(
        `SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [process.env.DB_NAME || 'hotbando', table, column]
      );
      return rows[0].c > 0;
    }

    // Helper: check if table exists
    async function tableExists(table) {
      const [rows] = await conn.query(
        `SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [process.env.DB_NAME || 'hotbando', table]
      );
      return rows[0].c > 0;
    }

    // Helper: add column if not exists
    async function addColumn(table, column, definition) {
      if (!(await columnExists(table, column))) {
        await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`  + ${table}.${column}`);
      } else {
        console.log(`  = ${table}.${column} (already exists)`);
      }
    }

    // =========================================================
    // 1. CREATE MISSING TABLES
    // =========================================================
    console.log('=== CREATING MISSING TABLES ===\n');

    // activity_logs table
    if (!(await tableExists('activity_logs'))) {
      await conn.query(`
        CREATE TABLE activity_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50),
          entity_id INT,
          description TEXT,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_action (action),
          INDEX idx_created_at (created_at)
        )
      `);
      console.log('  + Created activity_logs table');
    } else {
      console.log('  = activity_logs (already exists)');
    }

    // revenue_sharing_rules table
    if (!(await tableExists('revenue_sharing_rules'))) {
      await conn.query(`
        CREATE TABLE revenue_sharing_rules (
          id INT AUTO_INCREMENT PRIMARY KEY,
          partner_type ENUM('franchise_owner', 'landlord', 'broker', 'telecom', 'referrer') NOT NULL DEFAULT 'franchise_owner',
          revenue_type ENUM('ads', 'subscriptions', 'bank_leads', 'all') NOT NULL DEFAULT 'all',
          location_id INT,
          share_percentage DECIMAL(5,2) NOT NULL DEFAULT 25.00,
          share_amount_fixed DECIMAL(10,2) DEFAULT 0.00,
          min_payout DECIMAL(10,2) DEFAULT 10000.00,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_partner_type (partner_type),
          INDEX idx_location_id (location_id),
          INDEX idx_is_active (is_active)
        )
      `);
      console.log('  + Created revenue_sharing_rules table');
    } else {
      console.log('  = revenue_sharing_rules (already exists)');
    }

    // =========================================================
    // 2. ADD MISSING COLUMNS TO campaign_completions
    // =========================================================
    console.log('\n=== campaign_completions columns ===');
    await addColumn('campaign_completions', 'completion_type', "VARCHAR(50) DEFAULT 'view' AFTER user_id");
    await addColumn('campaign_completions', 'watch_duration_seconds', 'INT DEFAULT 0 AFTER completion_type');
    await addColumn('campaign_completions', 'completion_percentage', 'DECIMAL(5,2) DEFAULT 0 AFTER watch_duration_seconds');
    await addColumn('campaign_completions', 'reward_granted', 'TINYINT(1) DEFAULT 0 AFTER completion_percentage');
    await addColumn('campaign_completions', 'reward_type', "VARCHAR(50) DEFAULT 'data' AFTER reward_granted");
    await addColumn('campaign_completions', 'reward_duration_hours', 'INT DEFAULT 0 AFTER reward_type');
    await addColumn('campaign_completions', 'reward_bytes', 'BIGINT DEFAULT 0 AFTER reward_duration_hours');
    await addColumn('campaign_completions', 'cost_charged', 'DECIMAL(10,2) DEFAULT 0.00 AFTER reward_bytes');
    await addColumn('campaign_completions', 'location_id', 'INT AFTER cost_charged');

    // =========================================================
    // 3. ADD MISSING COLUMNS TO campaigns
    // =========================================================
    console.log('\n=== campaigns columns ===');
    await addColumn('campaigns', 'start_date', 'DATE AFTER target_user_types');
    await addColumn('campaigns', 'end_date', 'DATE AFTER start_date');
    await addColumn('campaigns', 'total_limit', 'INT DEFAULT 0 AFTER end_date');
    await addColumn('campaigns', 'daily_limit', 'INT DEFAULT 0 AFTER total_limit');
    await addColumn('campaigns', 'completions', 'INT DEFAULT 0 AFTER daily_limit');
    await addColumn('campaigns', 'views', 'INT DEFAULT 0 AFTER completions');
    await addColumn('campaigns', 'target_locations', 'JSON AFTER views');
    await addColumn('campaigns', 'requires_approval', 'TINYINT(1) DEFAULT 1 AFTER target_locations');
    await addColumn('campaigns', 'approved_by', 'INT AFTER requires_approval');
    await addColumn('campaigns', 'approved_at', 'TIMESTAMP NULL AFTER approved_by');

    // =========================================================
    // 4. ADD MISSING COLUMNS TO wallets
    // =========================================================
    console.log('\n=== wallets columns ===');
    await addColumn('wallets', 'total_spent', 'DECIMAL(15,2) DEFAULT 0.00 AFTER total_withdrawn');
    await addColumn('wallets', 'auto_topup_enabled', 'TINYINT(1) DEFAULT 0 AFTER low_balance_threshold');

    // =========================================================
    // 5. ADD MISSING COLUMNS TO transactions
    // =========================================================
    console.log('\n=== transactions columns ===');
    await addColumn('transactions', 'balance_before', 'DECIMAL(15,2) DEFAULT 0.00 AFTER amount');
    await addColumn('transactions', 'balance_after', 'DECIMAL(15,2) DEFAULT 0.00 AFTER balance_before');
    await addColumn('transactions', 'payment_method', "VARCHAR(50) AFTER status");
    await addColumn('transactions', 'reference_type', "VARCHAR(50) AFTER reference_id");
    await addColumn('transactions', 'payment_reference', 'VARCHAR(100) AFTER reference_type');
    await addColumn('transactions', 'processed_at', 'TIMESTAMP NULL AFTER payment_reference');

    // Fix transactions enum to include campaign_charge
    try {
      await conn.query(`ALTER TABLE transactions MODIFY COLUMN transaction_type ENUM('deposit','withdrawal','campaign_spend','campaign_charge','revenue_share','refund','commission') NOT NULL`);
      console.log('  + Updated transactions.transaction_type enum');
    } catch (e) {
      console.log('  = transactions.transaction_type enum (already updated or error: ' + e.message + ')');
    }

    // =========================================================
    // 6. ADD MISSING COLUMNS TO users
    // =========================================================
    console.log('\n=== users columns ===');
    await addColumn('users', 'total_data_earned', 'BIGINT DEFAULT 0 AFTER free_bytes');

    // =========================================================
    // 7. ADD MISSING COLUMNS TO locations
    // =========================================================
    console.log('\n=== locations columns ===');
    await addColumn('locations', 'max_users', 'INT DEFAULT 100 AFTER is_active');
    await addColumn('locations', 'bandwidth_limit_mbps', 'INT DEFAULT 10 AFTER max_users');
    await addColumn('locations', 'operating_hours', 'VARCHAR(100) AFTER bandwidth_limit_mbps');
    await addColumn('locations', 'contact_person', 'VARCHAR(255) AFTER operating_hours');
    await addColumn('locations', 'contact_phone', 'VARCHAR(20) AFTER contact_person');
    await addColumn('locations', 'contact_email', 'VARCHAR(255) AFTER contact_phone');

    // =========================================================
    // 8. ADD MISSING COLUMNS TO mikrotiks
    // =========================================================
    console.log('\n=== mikrotiks columns ===');
    await addColumn('mikrotiks', 'model', 'VARCHAR(100) AFTER router_name');
    await addColumn('mikrotiks', 'serial_number', 'VARCHAR(100) AFTER model');
    await addColumn('mikrotiks', 'cpu_load', 'INT DEFAULT 0 AFTER active_users');
    await addColumn('mikrotiks', 'memory_usage', 'INT DEFAULT 0 AFTER cpu_load');
    await addColumn('mikrotiks', 'firmware_version', 'VARCHAR(50) AFTER memory_usage');

    // =========================================================
    // 9. ADD MISSING COLUMNS TO payment_requests
    // =========================================================
    console.log('\n=== payment_requests columns ===');
    await addColumn('payment_requests', 'expires_at', 'TIMESTAMP NULL AFTER notes');

    // =========================================================
    // 10. ADD MISSING COLUMNS TO partner_revenue_shares
    // =========================================================
    console.log('\n=== partner_revenue_shares columns ===');
    await addColumn('partner_revenue_shares', 'partner_type', "VARCHAR(50) DEFAULT 'franchise_owner' AFTER partner_id");
    await addColumn('partner_revenue_shares', 'rule_id', 'INT AFTER partner_type');

    // =========================================================
    // 11. ADD user_profiles IF NOT EXISTS
    // =========================================================
    if (!(await tableExists('user_profiles'))) {
      await conn.query(`
        CREATE TABLE user_profiles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL UNIQUE,
          date_of_birth DATE,
          institution VARCHAR(255),
          preferences JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id)
        )
      `);
      console.log('\n  + Created user_profiles table');
    }

    // =========================================================
    // 12. Insert default revenue sharing rules
    // =========================================================
    console.log('\n=== Seeding default data ===');
    const [existingRules] = await conn.query('SELECT COUNT(*) as c FROM revenue_sharing_rules');
    if (existingRules[0].c === 0) {
      await conn.query(`
        INSERT INTO revenue_sharing_rules (partner_type, revenue_type, share_percentage, min_payout, is_active) VALUES
        ('franchise_owner', 'all', 25.00, 10000.00, 1),
        ('landlord', 'all', 15.00, 10000.00, 1),
        ('broker', 'all', 5.00, 5000.00, 1)
      `);
      console.log('  + Inserted default revenue sharing rules');
    }

    console.log('\n=========================================');
    console.log('Migration completed successfully!');
    console.log('=========================================');

  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));
