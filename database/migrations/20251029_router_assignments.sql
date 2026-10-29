CREATE TABLE IF NOT EXISTS router_assignments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  router_id VARCHAR(100) NOT NULL,
  reseller_user_id INT NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 20.00 COMMENT 'percent HQ keeps',
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unassigned_at DATETIME NULL,
  assigned_by INT NULL,
  unassigned_by INT NULL,
  active_key VARCHAR(100) GENERATED ALWAYS AS (IF(unassigned_at IS NULL, router_id, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_active_router (active_key),
  KEY idx_router (router_id),
  KEY idx_reseller (reseller_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
