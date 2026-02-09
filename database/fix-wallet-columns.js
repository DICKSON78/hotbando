const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixWalletColumns() {
    let connection;

    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'hotbando'
        });

        console.log('✓ Imeunganishwa na database');

        // Check if columns exist before adding them
        console.log('\n=== Checking Wallets Table ===');

        // Check if total_deposited exists
        const [walletColumns] = await connection.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'wallets'
            AND COLUMN_NAME = 'total_deposited'
        `, [process.env.DB_NAME || 'hotbando']);

        if (walletColumns.length === 0) {
            console.log('Adding total_deposited column to wallets table...');
            await connection.query(`
                ALTER TABLE wallets
                ADD COLUMN total_deposited DECIMAL(10,2) DEFAULT 0.00 AFTER balance
            `);
            console.log('✓ total_deposited column added successfully');
        } else {
            console.log('✓ total_deposited column already exists');
        }

        // Check if total_withdrawn exists
        const [withdrawnColumns] = await connection.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'wallets'
            AND COLUMN_NAME = 'total_withdrawn'
        `, [process.env.DB_NAME || 'hotbando']);

        if (withdrawnColumns.length === 0) {
            console.log('Adding total_withdrawn column to wallets table...');
            await connection.query(`
                ALTER TABLE wallets
                ADD COLUMN total_withdrawn DECIMAL(10,2) DEFAULT 0.00 AFTER total_deposited
            `);
            console.log('✓ total_withdrawn column added successfully');
        } else {
            console.log('✓ total_withdrawn column already exists');
        }

        console.log('\n=== Checking Transactions Table ===');

        // Check if user_id exists in transactions table
        const [transactionColumns] = await connection.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'transactions'
            AND COLUMN_NAME = 'user_id'
        `, [process.env.DB_NAME || 'hotbando']);

        if (transactionColumns.length === 0) {
            console.log('Adding user_id column to transactions table...');
            await connection.query(`
                ALTER TABLE transactions
                ADD COLUMN user_id INT NOT NULL AFTER id,
                ADD INDEX idx_user_id (user_id)
            `);
            console.log('✓ user_id column added successfully with index');
        } else {
            console.log('✓ user_id column already exists');
        }

        // Check if sponsor_id exists (for wallet ownership)
        const [sponsorColumns] = await connection.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'wallets'
            AND COLUMN_NAME = 'sponsor_id'
        `, [process.env.DB_NAME || 'hotbando']);

        if (sponsorColumns.length === 0) {
            console.log('Adding sponsor_id column to wallets table...');
            await connection.query(`
                ALTER TABLE wallets
                ADD COLUMN sponsor_id INT NOT NULL AFTER user_id,
                ADD INDEX idx_sponsor_id (sponsor_id)
            `);
            console.log('✓ sponsor_id column added successfully with index');
        } else {
            console.log('✓ sponsor_id column already exists');
        }

        // Verify wallet table structure
        console.log('\n=== Current Wallets Table Structure ===');
        const [walletStructure] = await connection.query('DESCRIBE wallets');
        console.table(walletStructure);

        // Verify transactions table structure
        console.log('\n=== Current Transactions Table Structure ===');
        const [transactionStructure] = await connection.query('DESCRIBE transactions');
        console.table(transactionStructure);

        console.log('\n✅ Database migration completed successfully!');

    } catch (error) {
        console.error('❌ Error during migration:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✓ Database connection closed');
        }
    }
}

// Run migration
fixWalletColumns()
    .then(() => {
        console.log('\n🎉 Migration script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration script failed:', error);
        process.exit(1);
    });
