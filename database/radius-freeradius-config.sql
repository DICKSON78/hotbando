-- ============================================================================
-- HotBando FreeRADIUS SQL Views
-- Maps HotBando's application schema to FreeRADIUS-compatible format
-- ============================================================================

-- View: RADIUS check items (user authentication)
CREATE OR REPLACE VIEW radius_radcheck AS
SELECT
    u.id AS id,
    u.phone_number AS username,
    'Cleartext-Password' AS attribute,
    ':=' AS op,
    u.password AS value
FROM users u
WHERE u.is_active = 1
  AND u.role IN ('customer', 'reseller')
  AND ((u.usage_until > NOW() AND (u.paid_data_limit_bytes = 0 OR u.paid_bytes_remaining > 0)) OR u.free_bytes > 0);

-- View: RADIUS reply items (session parameters)
CREATE OR REPLACE VIEW radius_radreply AS
SELECT u.id, u.phone_number AS username, 'Mikrotik-Rate-Limit' AS attribute, ':=' AS op,
       CASE WHEN u.usage_until > NOW() THEN '10M/10M 1M/1M 5000/5000' ELSE '2M/2M 512K/512K 2000/2000' END AS value
FROM users u WHERE u.is_active = 1 AND u.role IN ('customer', 'reseller')
  AND ((u.usage_until > NOW() AND (u.paid_data_limit_bytes = 0 OR u.paid_bytes_remaining > 0)) OR u.free_bytes > 0)
UNION ALL
SELECT u.id, u.phone_number, 'Session-Timeout', ':=', CAST(GREATEST(TIMESTAMPDIFF(SECOND, NOW(), u.usage_until), 0) AS CHAR)
FROM users u WHERE u.is_active = 1 AND u.role IN ('customer', 'reseller') AND u.usage_until > NOW()
  AND (u.paid_data_limit_bytes = 0 OR u.paid_bytes_remaining > 0)
UNION ALL
SELECT u.id, u.phone_number, 'Mikrotik-Total-Limit', ':=', CAST(u.paid_bytes_remaining AS CHAR)
FROM users u WHERE u.is_active = 1 AND u.role IN ('customer', 'reseller')
  AND u.usage_until > NOW() AND u.paid_data_limit_bytes > 0 AND u.paid_bytes_remaining > 0
UNION ALL
SELECT u.id, u.phone_number, 'Mikrotik-Total-Limit', ':=', CAST(u.free_bytes AS CHAR)
FROM users u WHERE u.is_active = 1 AND u.role IN ('customer', 'reseller')
  AND u.free_bytes > 0 AND (u.usage_until IS NULL OR u.usage_until <= NOW() OR (u.paid_data_limit_bytes > 0 AND u.paid_bytes_remaining <= 0));

-- View: RADIUS accounting
CREATE OR REPLACE VIEW radius_radacct AS
SELECT
    cl.id AS radacctid,
    u.phone_number AS username,
    cl.mac_address AS callingstationid,
    cl.ip_address AS framedipaddress,
    cl.router_id AS nasipaddress,
    cl.session_duration AS acctsessiontime,
    cl.bytes_uploaded AS acctinputoctets,
    cl.bytes_downloaded AS acctoutputoctets,
    cl.action AS acctstatustype,
    cl.timestamp AS acctstarttime
FROM user_connection_logs cl
LEFT JOIN users u ON cl.user_id = u.id;

-- View: Simple RADIUS check for fast authentication
CREATE OR REPLACE VIEW radius_radcheck_simple AS
SELECT
    u.id AS id,
    u.phone_number AS username,
    'Cleartext-Password' AS attribute,
    ':=' AS op,
    u.password AS value
FROM users u
WHERE u.is_active = 1
  AND u.role IN ('customer', 'reseller')
  AND (u.locked_until IS NULL OR u.locked_until < NOW());

-- View: Active sessions
CREATE OR REPLACE VIEW radius_active_sessions AS
SELECT
    cl.id AS session_id,
    u.phone_number AS username,
    cl.mac_address AS mac,
    cl.ip_address AS ip,
    cl.router_id AS router,
    cl.session_duration AS duration,
    cl.timestamp AS started_at
FROM user_connection_logs cl
JOIN users u ON cl.user_id = u.id
WHERE cl.action = 'connect'
  AND NOT EXISTS (
    SELECT 1 FROM user_connection_logs cl2
    WHERE cl2.user_id = cl.user_id
      AND cl2.action = 'disconnect'
      AND cl2.timestamp > cl.timestamp
  );
