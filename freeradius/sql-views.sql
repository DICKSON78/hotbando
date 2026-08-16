-- ============================================================================
-- HotBando FreeRADIUS SQL Views — Production (1M+ users)
-- Run this on the HotBando MySQL database BEFORE starting FreeRADIUS
-- Usage: mysql -u root hotbando < freeradius/sql-views.sql
-- ============================================================================

-- Required indexes for 1M user performance
-- Check and create if missing
SET @db = DATABASE();

-- Index for RADIUS lookups (phone_number is the username)
SELECT IFNULL(
    (SELECT 1 FROM information_schema.STATISTICS 
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' 
       AND INDEX_NAME = 'idx_radius_phone' LIMIT 1), 0) INTO @has_idx;

SET @sql = IF(@has_idx = 0, 
    'CREATE INDEX idx_radius_phone ON users(phone_number)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index for active customer lookups
SELECT IFNULL(
    (SELECT 1 FROM information_schema.STATISTICS 
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' 
       AND INDEX_NAME = 'idx_radius_active' LIMIT 1), 0) INTO @has_idx;

SET @sql = IF(@has_idx = 0,
    'CREATE INDEX idx_radius_active ON users(role, is_active, phone_number)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index for usage_until expiry checks
SELECT IFNULL(
    (SELECT 1 FROM information_schema.STATISTICS 
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' 
       AND INDEX_NAME = 'idx_radius_expiry' LIMIT 1), 0) INTO @has_idx;

SET @sql = IF(@has_idx = 0,
    'CREATE INDEX idx_radius_expiry ON users(usage_until)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index for free_bytes > 0 lookups
SELECT IFNULL(
    (SELECT 1 FROM information_schema.STATISTICS 
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' 
       AND INDEX_NAME = 'idx_radius_freebytes' LIMIT 1), 0) INTO @has_idx;

SET @sql = IF(@has_idx = 0,
    'CREATE INDEX idx_radius_freebytes ON users(free_bytes)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index for user_connection_logs (RADIUS accounting lookups)
SELECT IFNULL(
    (SELECT 1 FROM information_schema.STATISTICS 
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_connection_logs' 
       AND INDEX_NAME = 'idx_radius_session' LIMIT 1), 0) INTO @has_idx;

SET @sql = IF(@has_idx = 0,
    'CREATE INDEX idx_radius_session ON user_connection_logs(user_id, timestamp)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- VIEWS: FreeRADIUS reads these to authenticate and authorize users
-- ============================================================================

-- 1. radcheck: Authentication — does the password match?
-- Uses Crypt-Password attribute so FreeRADIUS calls crypt() to verify
-- against bcrypt hash ($2b$ prefix). Ubuntu 22.04+ supports bcrypt in crypt().
CREATE OR REPLACE VIEW radius_radcheck AS
SELECT
    u.id AS id,
    u.phone_number AS username,
    'Crypt-Password' AS attribute,
    ':=' AS op,
    u.password AS value
FROM users u
WHERE u.role = 'customer'
  AND u.is_active = 1
  AND (u.usage_until > NOW() OR u.free_bytes > 0);

-- 2. radreply: Authorization — what bandwidth/limits does the user get?
CREATE OR REPLACE VIEW radius_radreply AS
SELECT
    u.id AS id,
    u.phone_number AS username,
    'Mikrotik-Rate-Limit' AS attribute,
    ':=' AS op,
    CASE
        WHEN u.usage_until > NOW() THEN '10M/10M 1M/1M 5000/5000'
        ELSE '2M/2M 512K/512K 2000/2000'
    END AS value
FROM users u
WHERE u.role = 'customer'
  AND u.is_active = 1
  AND (u.usage_until > NOW() OR u.free_bytes > 0);

-- 3. radacct: Active sessions for accounting
CREATE OR REPLACE VIEW radius_radacct AS
SELECT
    l.id AS radacctid,
    COALESCE(u.phone_number, CONCAT('mac-', REPLACE(l.mac_address, ':', ''))) AS username,
    l.timestamp AS acctstarttime,
    NULL AS acctstoptime,
    l.session_duration AS acctsessiontime,
    COALESCE(l.bytes_uploaded, 0) AS acctinputoctets,
    COALESCE(l.bytes_downloaded, 0) AS acctoutputoctets,
    l.mac_address AS callingstationid,
    CONCAT('router-', l.router_id) AS nasipaddress,
    'HotBando-WiFi' AS servicetype,
    CONCAT('hb-', l.id) AS acctsessionid,
    CASE l.action
        WHEN 'connect' THEN ''
        WHEN 'disconnect' THEN 'User-Request'
        ELSE l.action
    END AS acctterminatecause
FROM user_connection_logs l
LEFT JOIN users u ON l.user_id = u.id;

-- 4. radcheck_simple: Quick check whether user can connect at all
-- (FreeRADIUS can use this as a pre-auth filter)
CREATE OR REPLACE VIEW radius_radcheck_simple AS
SELECT
    u.id AS id,
    u.phone_number AS username,
    'Auth-Type' AS attribute,
    ':=' AS op,
    'PAP' AS value
FROM users u
WHERE u.role = 'customer'
  AND u.is_active = 1
  AND (u.usage_until > NOW() OR u.free_bytes > 0);

-- ============================================================================
-- VIEWS: For HotBando Node.js to read RADIUS session data
-- ============================================================================

-- Active sessions summary (for admin dashboard)
CREATE OR REPLACE VIEW radius_active_sessions AS
SELECT
    u.phone_number,
    u.name,
    l.mac_address,
    l.router_id,
    l.timestamp AS connected_since,
    TIMESTAMPDIFF(SECOND, l.timestamp, NOW()) AS session_seconds,
    COALESCE(l.bytes_uploaded, 0) + COALESCE(l.bytes_downloaded, 0) AS total_bytes,
    CASE WHEN u.usage_until > NOW() THEN 'premium'
         WHEN u.free_bytes > 0 THEN 'free'
         ELSE 'expired'
    END AS access_type
FROM user_connection_logs l
JOIN users u ON l.user_id = u.id
WHERE l.action = 'connect'
  AND l.timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY l.timestamp DESC;
