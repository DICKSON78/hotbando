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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
