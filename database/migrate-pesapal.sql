-- Add pesapal to payment_method ENUM
ALTER TABLE payment_requests MODIFY COLUMN payment_method ENUM('mpesa','tigopesa','airtelmoney','pesapal') NOT NULL;

-- Create payments table if not exists
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'cash',
  `reference` VARCHAR(255) NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add default Pesapal settings entries (skip if already exist)
INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('pesapal_consumer_key', '', 'string', 'PesaPal Consumer Key', 0),
('pesapal_consumer_secret', '', 'string', 'PesaPal Consumer Secret', 0),
('pesapal_env', 'sandbox', 'string', 'PesaPal Environment (sandbox/live)', 0),
('pesapal_callback_url', 'http://localhost:3000/api/payments/callback', 'string', 'PesaPal Callback URL', 0),
('pesapal_ipn_url', 'http://localhost:3000/api/payments/ipn', 'string', 'PesaPal IPN URL', 0);
