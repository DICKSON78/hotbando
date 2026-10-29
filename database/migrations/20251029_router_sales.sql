CREATE TABLE IF NOT EXISTS router_sales (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_reference VARCHAR(64) NOT NULL,
  router_id VARCHAR(100) NOT NULL,
  assignment_id INT UNSIGNED NULL,
  reseller_user_id INT NULL,
  customer_id INT NULL,
  purpose VARCHAR(50) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'TZS',
  gross_amount DECIMAL(12,2) NOT NULL,
  hq_percent DECIMAL(5,2) NOT NULL,
  hq_amount DECIMAL(12,2) NOT NULL,
  reseller_amount DECIMAL(12,2) NOT NULL,
  status ENUM('credited','reversed') NOT NULL DEFAULT 'credited',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order (order_reference),
  KEY idx_router (router_id),
  KEY idx_reseller (reseller_user_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO router_sales
  (order_reference, router_id, customer_id, purpose, currency, gross_amount, hq_percent, hq_amount, reseller_amount, created_at)
SELECT c.order_reference,
       JSON_UNQUOTE(JSON_EXTRACT(c.extra_data, '$.router_id')),
       c.user_id, c.purpose, 'TZS', c.amount, 100, c.amount, 0, c.created_at
FROM clickpesa_transactions c
WHERE c.purpose = 'package_purchase'
  AND c.status = 'SUCCESS'
  AND JSON_UNQUOTE(JSON_EXTRACT(c.extra_data, '$.router_id')) IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(c.extra_data, '$.router_id')) <> 'null';
