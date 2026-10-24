-- ============================================================================
-- HotBando migration 001 — business-model fixes
-- Applies to: fresh installs (mirrored in database/schema.sql) + live DBs
-- Run: mysql hotbando < database/migrations/001-business-fixes.sql
-- Safe to re-run: each ALTER is guarded by a column-existence check.
-- ============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS hb_add_column$$
CREATE PROCEDURE hb_add_column(
    IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
    ) THEN
        SET @q = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
        PREPARE stmt FROM @q;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- 1. payments.package_id — purchase verification + revenue attribution
CALL hb_add_column('payments', 'package_id', '`package_id` INT NULL AFTER `user_id`, ADD KEY `idx_package` (`package_id`)');

-- 1b. payments.activated — atomic claim so one payment extends time exactly once
CALL hb_add_column('payments', 'activated', '`activated` TINYINT(1) NOT NULL DEFAULT 0');

-- 2. user_connection_logs.bytes_charged — free-tier consumption marker
CALL hb_add_column('user_connection_logs', 'bytes_charged', '`bytes_charged` TINYINT(1) NOT NULL DEFAULT 0');

-- 2b. user_connection_logs.action — allow connect_failed (written by mikrotik.js)
SET @has_cf = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_connection_logs'
      AND COLUMN_NAME = 'action' AND COLUMN_TYPE LIKE '%connect_failed%');
SET @q2 = IF(@has_cf = 0,
    'ALTER TABLE `user_connection_logs` MODIFY `action` ENUM(''connect'',''disconnect'',''timeout'',''kicked'',''error'',''connect_failed'') NOT NULL',
    'SELECT 1');
PREPARE stmt2 FROM @q2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 2c. payment_requests.payment_method — allow pesapal (used by paymentController)
SET @has_pp = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_requests'
      AND COLUMN_NAME = 'payment_method' AND COLUMN_TYPE LIKE '%pesapal%');
SET @qpp = IF(@has_pp = 0,
    'ALTER TABLE `payment_requests` MODIFY `payment_method` ENUM(''mpesa'',''tigopesa'',''airtelmoney'',''pesapal'') NOT NULL',
    'SELECT 1');
PREPARE stmtpp FROM @qpp;
EXECUTE stmtpp;
DEALLOCATE PREPARE stmtpp;

-- 3. resellers tier/commission/sales columns (referenced by business.js + tier endpoint)
CALL hb_add_column('resellers', 'tier', "`tier` VARCHAR(20) NOT NULL DEFAULT 'bronze'");
CALL hb_add_column('resellers', 'commission_rate', '`commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 10.00');
CALL hb_add_column('resellers', 'total_vouchers_sold', '`total_vouchers_sold` INT NOT NULL DEFAULT 0');

-- 3b. reseller_withdrawals — align live DBs (older schema) with repo schema:
-- request records need owner + payout details, not just reseller_id/amount.
CALL hb_add_column('reseller_withdrawals', 'user_id', '`user_id` INT NULL AFTER `reseller_id`');
CALL hb_add_column('reseller_withdrawals', 'payment_method', '`payment_method` VARCHAR(50) NULL AFTER `amount`');
SET @pm_is_enum = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reseller_withdrawals'
      AND COLUMN_NAME = 'payment_method' AND COLUMN_TYPE LIKE 'enum%');
SET @qpm = IF(@pm_is_enum > 0,
    'ALTER TABLE `reseller_withdrawals` MODIFY `payment_method` VARCHAR(50) NULL DEFAULT ''mobile_money''',
    'SELECT 1');
PREPARE stmtpm FROM @qpm;
EXECUTE stmtpm;
DEALLOCATE PREPARE stmtpm;
CALL hb_add_column('reseller_withdrawals', 'payment_phone', '`payment_phone` VARCHAR(20) NULL AFTER `payment_method`');
CALL hb_add_column('reseller_withdrawals', 'processed_by', '`processed_by` INT NULL');
CALL hb_add_column('reseller_withdrawals', 'notes', '`notes` TEXT NULL');
CALL hb_add_column('reseller_withdrawals', 'created_at', '`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP');

DROP PROCEDURE IF EXISTS hb_add_column;

-- 4. Canonical package spelling: MWEZI 1 (matches UI + seed-comprehensive)
UPDATE `packages` SET `name` = 'MWEZI 1' WHERE `name` = 'MWEEZI 1';

-- 5. Backfill users.package: numeric ids -> package names
UPDATE `users` SET `package` = CASE `package`
    WHEN '1' THEN 'MASAA 6'
    WHEN '2' THEN 'MASAA 24'
    WHEN '3' THEN 'WIKI 1'
    WHEN '4' THEN 'MWEZI 1'
    ELSE `package` END
WHERE `package` IN ('1','2','3','4');
