CREATE TABLE IF NOT EXISTS equipment_partners (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(150) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(190) NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS equipment_plans (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id INT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  plan_type ENUM('hq_supplied','outright','financed') NOT NULL,
  equipment_list TEXT NULL,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
  financed_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  repayment_percent DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT 'percent of the reseller share taken for repayment',
  maintenance_percent DECIMAL(5,2) NOT NULL DEFAULT 10 COMMENT 'percent HQ keeps after ownership transfer',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reseller_applications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_ref VARCHAR(20) NOT NULL,
  name VARCHAR(150) NOT NULL,
  business_name VARCHAR(150) NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(190) NULL,
  password_hash VARCHAR(255) NOT NULL,
  region VARCHAR(80) NOT NULL,
  district VARCHAR(80) NOT NULL,
  ward VARCHAR(80) NULL,
  address VARCHAR(255) NULL,
  landmark VARCHAR(255) NULL,
  business_type VARCHAR(80) NULL,
  expected_customers INT NULL,
  plan_id INT UNSIGNED NULL,
  notes TEXT NULL,
  status ENUM('new','reviewing','approved','scheduled','installed','rejected') NOT NULL DEFAULT 'new',
  rejection_reason VARCHAR(500) NULL,
  admin_notes TEXT NULL,
  user_id INT NULL,
  install_date DATE NULL,
  install_time VARCHAR(20) NULL,
  technician VARCHAR(100) NULL,
  install_notes VARCHAR(500) NULL,
  created_ip VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ref (application_ref),
  KEY idx_phone (phone),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reseller_financings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id INT UNSIGNED NULL,
  reseller_user_id INT NOT NULL,
  plan_id INT UNSIGNED NULL,
  partner_id INT UNSIGNED NULL,
  router_id VARCHAR(100) NULL,
  principal DECIMAL(12,2) NOT NULL,
  balance DECIMAL(12,2) NOT NULL,
  repayment_percent DECIMAL(5,2) NOT NULL,
  maintenance_percent DECIMAL(5,2) NOT NULL DEFAULT 10,
  status ENUM('pending','active','completed','cancelled') NOT NULL DEFAULT 'pending',
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  ownership_transferred_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reseller (reseller_user_id, status),
  KEY idx_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS financing_repayments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  financing_id INT UNSIGNED NOT NULL,
  order_reference VARCHAR(64) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order (order_reference),
  KEY idx_fin (financing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS partner_payouts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference VARCHAR(100) NULL,
  note VARCHAR(500) NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'router_sales' AND column_name = 'repayment_amount');
SET @s := IF(@c = 0, 'ALTER TABLE router_sales ADD COLUMN repayment_amount DECIMAL(12,2) NOT NULL DEFAULT 0, ADD COLUMN financing_id INT UNSIGNED NULL', 'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
