// Idempotent schema upgrade for live branch and approximate coverage mapping.
const db = require('../config/database');
const { encrypt, isEncrypted } = require('../utils/encryption');

async function ensureColumn(table, column, definition) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (Number(rows[0]?.count || 0) === 0) {
    await db.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`Added ${table}.${column}`);
  } else {
    console.log(`${table}.${column} already exists`);
  }
}

async function migrate() {
  await ensureColumn('locations', 'branch_id', 'INT(11) NULL');
  await ensureColumn('locations', 'coverage_radius_m', 'INT(11) NULL COMMENT \'Configured approximate Wi-Fi coverage radius in metres\'');
  await ensureColumn('vouchers', 'recipient_phone', 'VARCHAR(20) NULL');
  await ensureColumn('vouchers', 'purchased_by_phone', 'VARCHAR(20) NULL');
  await ensureColumn('vouchers', 'payment_order_reference', 'VARCHAR(64) NULL');
  await ensureColumn('users', 'paid_bytes_remaining', 'BIGINT NOT NULL DEFAULT 0');
  await ensureColumn('users', 'paid_data_limit_bytes', 'BIGINT NOT NULL DEFAULT 0 COMMENT \'0 means unlimited data on the active package\'');
  // Re-encrypt legacy router credentials with the stable deployment key.
  const [routers] = await db.execute('SELECT id, password FROM mikrotiks');
  for (const router of routers) {
    if (router.password && !isEncrypted(router.password)) {
      await db.execute('UPDATE mikrotiks SET password = ? WHERE id = ?', [encrypt(router.password), router.id]);
    }
  }
  // Activate the package's published quota for currently active paid users.
  // Previous releases did not account package bytes, so this starts the
  // enforcement counter at the entitlement limit when this migration runs.
  await db.execute(`UPDATE users u
    JOIN packages p ON p.name = u.package
    SET u.paid_data_limit_bytes = p.data_limit_mb * 1024 * 1024,
        u.paid_bytes_remaining = p.data_limit_mb * 1024 * 1024
    WHERE u.role = 'customer' AND u.usage_until > NOW()
      AND p.data_limit_mb > 0 AND u.paid_data_limit_bytes = 0`);
  await db.execute(`CREATE TABLE IF NOT EXISTS radius_usage_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nas_identity VARCHAR(128) NOT NULL,
    acct_session_id VARCHAR(128) NOT NULL,
    username VARCHAR(128) NULL,
    mac_address VARCHAR(50) NULL,
    input_octets BIGINT UNSIGNED NOT NULL DEFAULT 0,
    output_octets BIGINT UNSIGNED NOT NULL DEFAULT 0,
    last_accounting_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uniq_radius_session (nas_identity, acct_session_id),
    KEY idx_radius_session_mac (mac_address), KEY idx_radius_session_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.execute(`CREATE TABLE IF NOT EXISTS payment_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    provider VARCHAR(32) NOT NULL DEFAULT 'clickpesa',
    event_type VARCHAR(64) NOT NULL,
    provider_ref VARCHAR(128) NULL,
    order_reference VARCHAR(128) NULL,
    raw_payload LONGTEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'received',
    error_message TEXT NULL,
    processed_at DATETIME NULL,
    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uniq_provider_event_ref (provider_ref, event_type),
    KEY idx_order_ref (order_reference), KEY idx_event_type (event_type), KEY idx_received_at (received_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

migrate().then(() => process.exit(0)).catch(error => {
  console.error('Location coverage migration failed:', error.message);
  process.exit(1);
});
