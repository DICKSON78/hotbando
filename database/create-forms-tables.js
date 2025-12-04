/**
 * Create Tables for Website Forms
 * Run: node database/create-forms-tables.js
 */

const db = require('../config/database');

async function createFormsTables() {
    console.log('🔧 Creating forms tables...\n');

    try {
        // 1. Partner Applications Table
        console.log('📝 Creating partner_applications table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS partner_applications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                full_name VARCHAR(255) NOT NULL,
                location VARCHAR(255) NOT NULL,
                business_type ENUM('apartment', 'bar', 'hostel', 'recreational', 'other') NOT NULL,
                package_type ENUM('starter', 'pro', 'elite') NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                email VARCHAR(255) NULL,
                message TEXT NULL,
                status ENUM('pending', 'contacted', 'approved', 'rejected') DEFAULT 'pending',
                notes TEXT NULL,
                processed_by INT NULL,
                processed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Partner applications table created');

        // 2. Contact Messages Table
        console.log('\n💬 Creating contact_messages table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status ENUM('unread', 'read', 'replied') DEFAULT 'unread',
                reply TEXT NULL,
                replied_by INT NULL,
                replied_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('  ✅ Contact messages table created');

        console.log('\n✅ Forms tables created successfully!\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createFormsTables();
