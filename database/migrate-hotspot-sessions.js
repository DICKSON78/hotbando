// Create hotspot_sessions table for tracking active user sessions.
// This table tracks user presence on routers for connection status and active user counts.
const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'hotbando',
    password: process.env.DB_PASSWORD || 'hotbando_pass',
    database: process.env.DB_NAME || 'hotbando'
  });

  console.log('Creating hotspot_sessions table...');
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS hotspot_sessions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      router_id VARCHAR(50) NOT NULL,
      mac_address VARCHAR(17) NOT NULL,
      session_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_session (user_id, router_id, mac_address),
      KEY idx_router_time (router_id, last_activity_at),
      KEY idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✓ hotspot_sessions table created');
  await conn.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
