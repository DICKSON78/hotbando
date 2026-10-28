CREATE TABLE IF NOT EXISTS payment_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(32) NOT NULL DEFAULT 'clickpesa',
  event_type VARCHAR(64) NOT NULL,
  provider_ref VARCHAR(128) NULL,
  order_reference VARCHAR(128) NULL,
  raw_payload LONGTEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'received',
  error_message TEXT NULL,
  processed_at DATETIME NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_provider_event_ref (provider_ref, event_type),
  INDEX idx_order_ref (order_reference),
  INDEX idx_event_type (event_type),
  INDEX idx_received_at (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
