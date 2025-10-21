const pool = require('./config/database');

async function createSessionsTable() {
    try {
        // Drop existing sessions table if it exists
        await pool.execute(`DROP TABLE IF EXISTS sessions`);
        
        // Create new sessions table with correct schema
        await pool.execute(`
            CREATE TABLE sessions (
                session_id VARCHAR(128) NOT NULL,
                expires INT(11) UNSIGNED NOT NULL,
                data MEDIUMTEXT,
                PRIMARY KEY (session_id),
                KEY expires_idx (expires)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        console.log('✅ Sessions table created successfully');
        
    } catch (error) {
        console.error('❌ Error creating sessions table:', error.message);
    } finally {
        process.exit();
    }
}

createSessionsTable();