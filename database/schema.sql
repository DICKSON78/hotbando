-- ============================================================================
-- HOTBANDO PLATFORM - COMPLETE DATABASE SCHEMA
-- Version: 2.0
-- Date: 2025-12-03
-- Description: Complete schema for WiFi hotspot platform with ad-funded model
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- CORE USER MANAGEMENT TABLES
-- ============================================================================

-- Users table (customers, admins, sponsors, bank partners, franchise owners)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `phone_number` VARCHAR(20) NOT NULL UNIQUE,
  `email` VARCHAR(255) NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('customer', 'admin', 'sponsor', 'bank_partner', 'franchise_owner', 'super_admin') DEFAULT 'customer',

  -- Customer specific fields
  `mac_address` VARCHAR(50) NULL,
  `location` VARCHAR(255) NULL,
  `location_id` INT(11) NULL,
  `last_router_id` VARCHAR(50) NULL,
  `ip_address` VARCHAR(50) NULL,
  `user_type` ENUM('student', 'trader', 'tenant', 'other') DEFAULT 'other',

  -- Subscription & usage
  `package` VARCHAR(100) NULL,
  `usage_start` DATETIME NULL,
  `usage_until` DATETIME NULL,
  `free_bytes` BIGINT DEFAULT 10485760, -- 10MB default
  `last_free_used` DATETIME NULL,
  `total_data_earned` BIGINT DEFAULT 0,
  `total_data_used` BIGINT DEFAULT 0,
  `moneyspent` DECIMAL(10, 2) DEFAULT 0,
  `daily_ad_count` INT DEFAULT 0,
  `last_ad_date` DATE NULL,

  -- Partner specific fields
  `company_name` VARCHAR(255) NULL,
  `company_logo` VARCHAR(500) NULL,
  `bank_code` VARCHAR(50) NULL, -- For bank partners
  `commission_rate` DECIMAL(5, 2) DEFAULT 0, -- For franchise owners
  `parent_franchise_id` INT(11) NULL, -- For sub-franchises

  -- Status & security
  `is_active` TINYINT(1) DEFAULT 1,
  `is_verified` TINYINT(1) DEFAULT 0,
  `verification_code` VARCHAR(10) NULL,
  `reset_token` VARCHAR(255) NULL,
  `reset_token_expiry` DATETIME NULL,
  `last_login` DATETIME NULL,
  `login_attempts` INT DEFAULT 0,
  `locked_until` DATETIME NULL,

  -- Timestamps
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_phone` (`phone_number`),
  KEY `idx_role` (`role`),
  KEY `idx_mac` (`mac_address`),
  KEY `idx_location` (`location_id`),
  KEY `idx_parent_franchise` (`parent_franchise_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User profiles (extended information)
CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `date_of_birth` DATE NULL,
  `gender` ENUM('male', 'female', 'other') NULL,
  `institution` VARCHAR(255) NULL, -- School/university name
  `year_of_study` INT NULL,
  `business_type` VARCHAR(100) NULL, -- For traders
  `id_number` VARCHAR(50) NULL,
  `address` TEXT NULL,
  `city` VARCHAR(100) NULL,
  `region` VARCHAR(100) NULL,
  `preferences` JSON NULL, -- User preferences as JSON
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User suspensions
CREATE TABLE IF NOT EXISTS `user_suspensions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `reason` TEXT NOT NULL,
  `suspended_by` INT(11) NOT NULL,
  `suspended_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `suspended_until` DATETIME NULL,
  `is_permanent` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `unsuspended_at` DATETIME NULL,
  `unsuspended_by` INT(11) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- LOCATION & NETWORK MANAGEMENT
-- ============================================================================

-- Locations (universities, markets, hostels, etc.)
CREATE TABLE IF NOT EXISTS `locations` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `location_type` ENUM('university', 'hostel', 'market', 'mall', 'office', 'other') NOT NULL,
  `address` TEXT NULL,
  `city` VARCHAR(100) NOT NULL,
  `region` VARCHAR(100) NOT NULL,
  `latitude` DECIMAL(10, 8) NULL,
  `longitude` DECIMAL(11, 8) NULL,
  `franchise_owner_id` INT(11) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `max_users` INT DEFAULT 100,
  `bandwidth_limit_mbps` INT DEFAULT 100,
  `operating_hours` JSON NULL, -- Opening/closing hours as JSON
  `contact_person` VARCHAR(255) NULL,
  `contact_phone` VARCHAR(20) NULL,
  `contact_email` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_franchise_owner` (`franchise_owner_id`),
  KEY `idx_type` (`location_type`),
  FOREIGN KEY (`franchise_owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MikroTik routers
CREATE TABLE IF NOT EXISTS `mikrotiks` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `router_id` VARCHAR(50) NOT NULL UNIQUE,
  `router_name` VARCHAR(255) NOT NULL,
  `location_id` INT(11) NULL,
  `host` VARCHAR(255) NOT NULL,
  `port` INT DEFAULT 8728,
  `user` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `ssid` VARCHAR(100) NULL,
  `status` ENUM('online', 'offline', 'maintenance', 'error') DEFAULT 'offline',
  `cpu_load` DECIMAL(5, 2) DEFAULT 0,
  `memory_usage` DECIMAL(5, 2) DEFAULT 0,
  `uptime` BIGINT DEFAULT 0,
  `active_users` INT DEFAULT 0,
  `total_bandwidth_mbps` INT DEFAULT 100,
  `last_seen` DATETIME NULL,
  `firmware_version` VARCHAR(50) NULL,
  `model` VARCHAR(100) NULL,
  `serial_number` VARCHAR(100) NULL,
  `latitude` DECIMAL(10, 6) NULL,
  `longitude` DECIMAL(10, 6) NULL,
  `location_name` VARCHAR(255) NULL,
  `location_address` VARCHAR(255) NULL,
  `location_city` VARCHAR(100) NULL,
  `location_region` VARCHAR(100) NULL,
  `location_type` VARCHAR(50) DEFAULT 'other',
  `setup_status` VARCHAR(20) DEFAULT 'pending',
  `setup_step` INT DEFAULT 0,
  `setup_completed_at` DATETIME NULL,
  `wireguard_ip` VARCHAR(50) NULL,
  `wireguard_public_key` TEXT NULL,
  `wireguard_private_key` TEXT NULL,
  `wireguard_preshared_key` TEXT NULL,
  `wireguard_configured` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_location` (`location_id`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User connection logs
CREATE TABLE IF NOT EXISTS `user_connection_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NULL,
  `mac_address` VARCHAR(50) NOT NULL,
  `router_id` INT(11) NOT NULL,
  `location_id` INT(11) NULL,
  `ip_address` VARCHAR(50) NULL,
  `action` ENUM('connect', 'disconnect', 'timeout', 'kicked', 'error') NOT NULL,
  `session_duration` INT DEFAULT 0, -- seconds
  `bytes_uploaded` BIGINT DEFAULT 0,
  `bytes_downloaded` BIGINT DEFAULT 0,
  `error_message` TEXT NULL,
  `user_agent` TEXT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_mac` (`mac_address`),
  KEY `idx_router` (`router_id`),
  KEY `idx_timestamp` (`timestamp`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`router_id`) REFERENCES `mikrotiks`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Router location movement history (setup wizard / auto-detect)
CREATE TABLE IF NOT EXISTS `router_location_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `router_id` VARCHAR(50) NOT NULL,
  `latitude` DECIMAL(10, 6) NULL,
  `longitude` DECIMAL(10, 6) NULL,
  `location_name` VARCHAR(255) NULL,
  `location_type` VARCHAR(50) DEFAULT 'other',
  `moved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_router_loc` (`router_id`),
  KEY `idx_moved_at` (`moved_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CAMPAIGN MANAGEMENT (BANKS & ADVERTISERS)
-- ============================================================================

-- Campaigns (both bank and advertiser campaigns)
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `campaign_name` VARCHAR(255) NOT NULL,
  `campaign_type` ENUM('bank_form', 'app_install', 'ad_video', 'ad_image', 'survey') NOT NULL,
  `owner_id` INT(11) NOT NULL, -- User ID (sponsor, bank partner)
  `owner_type` ENUM('bank', 'advertiser', 'corporate', 'ngo') NOT NULL,

  -- Campaign settings
  `description` TEXT NULL,
  `instructions` TEXT NULL,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NULL,
  `is_active` TINYINT(1) DEFAULT 0,
  `requires_approval` TINYINT(1) DEFAULT 1,
  `approved_by` INT(11) NULL,
  `approved_at` DATETIME NULL,

  -- Targeting
  `target_locations` JSON NULL, -- Array of location IDs
  `target_user_types` JSON NULL, -- Array: student, trader, tenant, other
  `target_age_min` INT NULL,
  `target_age_max` INT NULL,
  `target_gender` ENUM('all', 'male', 'female') DEFAULT 'all',

  -- Budget & rewards
  `total_budget` DECIMAL(10, 2) DEFAULT 0,
  `spent_budget` DECIMAL(10, 2) DEFAULT 0,
  `cost_per_action` DECIMAL(10, 2) DEFAULT 0, -- CPA for advertiser
  `reward_type` ENUM('internet_time', 'data_bytes', 'both') DEFAULT 'data_bytes',
  `reward_duration_hours` INT DEFAULT 0,
  `reward_bytes` BIGINT DEFAULT 0,

  -- Performance limits
  `daily_limit` INT DEFAULT 0, -- Max completions per day (0 = unlimited)
  `total_limit` INT DEFAULT 0, -- Max total completions (0 = unlimited)
  `completions` INT DEFAULT 0,
  `views` INT DEFAULT 0,
  `clicks` INT DEFAULT 0,

  -- Timestamps
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_owner` (`owner_id`),
  KEY `idx_type` (`campaign_type`),
  KEY `idx_active` (`is_active`),
  KEY `idx_dates` (`start_date`, `end_date`),
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campaign content (forms, videos, images)
CREATE TABLE IF NOT EXISTS `campaign_content` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `campaign_id` INT(11) NOT NULL,
  `content_type` ENUM('form', 'video', 'image', 'app_link', 'survey') NOT NULL,

  -- Media files
  `video_url` VARCHAR(500) NULL,
  `image_url` VARCHAR(500) NULL,
  `thumbnail_url` VARCHAR(500) NULL,
  `duration_seconds` INT DEFAULT 0,

  -- Form configuration (for bank forms)
  `form_fields` JSON NULL, -- Array of form field definitions

  -- App install
  `app_name` VARCHAR(255) NULL,
  `app_package` VARCHAR(255) NULL,
  `app_store_url` VARCHAR(500) NULL,
  `play_store_url` VARCHAR(500) NULL,

  -- Status
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_campaign` (`campaign_id`),
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campaign completions & leads
CREATE TABLE IF NOT EXISTS `campaign_completions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `campaign_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `completion_type` ENUM('form_submit', 'video_watch', 'app_install', 'ad_click', 'survey_complete') NOT NULL,

  -- Lead data (for bank campaigns)
  `lead_data` JSON NULL, -- Captured form data
  `lead_status` ENUM('new', 'contacted', 'qualified', 'converted', 'rejected') DEFAULT 'new',
  `lead_notes` TEXT NULL,
  `contacted_at` DATETIME NULL,
  `converted_at` DATETIME NULL,

  -- Engagement data
  `watch_duration_seconds` INT DEFAULT 0,
  `completion_percentage` DECIMAL(5, 2) DEFAULT 0,
  `clicks` INT DEFAULT 0,

  -- Reward given
  `reward_granted` TINYINT(1) DEFAULT 0,
  `reward_type` ENUM('internet_time', 'data_bytes', 'both') NULL,
  `reward_duration_hours` INT DEFAULT 0,
  `reward_bytes` BIGINT DEFAULT 0,

  -- Cost (for advertiser campaigns)
  `cost_charged` DECIMAL(10, 2) DEFAULT 0,

  -- Metadata
  `ip_address` VARCHAR(50) NULL,
  `user_agent` TEXT NULL,
  `location_id` INT(11) NULL,
  `completed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_campaign` (`campaign_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_lead_status` (`lead_status`),
  KEY `idx_completed_at` (`completed_at`),
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- LEGACY ADS SYSTEM (Keeping for backward compatibility)
-- ============================================================================

-- Ads (legacy table - will migrate to campaigns)
CREATE TABLE IF NOT EXISTS `ads` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `image_url` VARCHAR(500) NULL,
  `video_url` VARCHAR(500) NULL,
  `duration` INT NOT NULL DEFAULT 60,
  `reward_bytes` BIGINT NOT NULL DEFAULT 15728640, -- 15MB
  `sponsor_id` INT(11) NOT NULL,
  `approved` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `views_count` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sponsor` (`sponsor_id`),
  KEY `idx_approved` (`approved`),
  FOREIGN KEY (`sponsor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ad views (legacy - will migrate to campaign_completions)
CREATE TABLE IF NOT EXISTS `ad_views` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `ad_id` INT(11) NOT NULL,
  `watched_duration` INT NOT NULL,
  `data_earned` BIGINT NOT NULL,
  `ip_address` VARCHAR(50) NULL,
  `user_agent` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_ad` (`ad_id`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`ad_id`) REFERENCES `ads`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- BILLING & PAYMENTS
-- ============================================================================

-- Partner wallets (for advertisers)
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `balance` DECIMAL(10, 2) DEFAULT 0,
  `total_deposited` DECIMAL(10, 2) DEFAULT 0,
  `total_spent` DECIMAL(10, 2) DEFAULT 0,
  `total_withdrawn` DECIMAL(10, 2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `low_balance_threshold` DECIMAL(10, 2) DEFAULT 10000,
  `auto_topup_enabled` TINYINT(1) DEFAULT 0,
  `auto_topup_amount` DECIMAL(10, 2) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions (deposits, withdrawals, campaign charges)
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `wallet_id` INT(11) NULL,
  `user_id` INT(11) NOT NULL,
  `transaction_type` ENUM('deposit', 'withdrawal', 'campaign_charge', 'refund', 'commission', 'revenue_share') NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `balance_before` DECIMAL(10, 2) DEFAULT 0,
  `balance_after` DECIMAL(10, 2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TZS',

  -- Reference
  `reference_type` ENUM('campaign', 'payment', 'payout', 'manual') NULL,
  `reference_id` INT(11) NULL,
  `description` TEXT NULL,

  -- Status
  `status` ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'pending',
  `processed_at` DATETIME NULL,

  -- Payment details (for deposits/withdrawals)
  `payment_method` ENUM('mpesa', 'tigopesa', 'airtelmoney', 'bank', 'cash', 'system') NULL,
  `payment_reference` VARCHAR(255) NULL,
  `payment_phone` VARCHAR(20) NULL,

  -- Metadata
  `created_by` INT(11) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_wallet` (`wallet_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_type` (`transaction_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment requests (M-Pesa, Tigo Pesa, etc.)
CREATE TABLE IF NOT EXISTS `payment_requests` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `transaction_id` INT(11) NULL,
  `payment_method` ENUM('mpesa', 'tigopesa', 'airtelmoney') NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `phone_number` VARCHAR(20) NOT NULL,
  `reference_number` VARCHAR(255) NULL, -- From payment gateway
  `checkout_request_id` VARCHAR(255) NULL,
  `merchant_request_id` VARCHAR(255) NULL,
  `status` ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'timeout') DEFAULT 'pending',
  `status_message` TEXT NULL,
  `callback_data` JSON NULL,
  `expires_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_transaction` (`transaction_id`),
  KEY `idx_status` (`status`),
  KEY `idx_reference` (`reference_number`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bank partner invoices
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL, -- Bank partner
  `invoice_number` VARCHAR(50) NOT NULL,
  `billing_period_start` DATE NOT NULL,
  `billing_period_end` DATE NOT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `tax_amount` DECIMAL(10, 2) DEFAULT 0,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `status` ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  `due_date` DATE NULL,
  `paid_at` DATETIME NULL,
  `payment_reference` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice line items
CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` INT(11) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `item_type` ENUM('leads', 'subscription', 'app_installs', 'other') NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10, 2) NOT NULL,
  `total_price` DECIMAL(10, 2) NOT NULL,
  `reference_id` INT(11) NULL, -- Campaign ID or other reference
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice` (`invoice_id`),
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- REVENUE SHARING
-- ============================================================================

-- Revenue sharing rules
CREATE TABLE IF NOT EXISTS `revenue_sharing_rules` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `partner_type` ENUM('franchise_owner', 'landlord', 'broker', 'telecom', 'referrer') NOT NULL,
  `location_id` INT(11) NULL, -- NULL means global rule
  `revenue_type` ENUM('ads', 'subscriptions', 'bank_leads', 'all') DEFAULT 'all',
  `share_percentage` DECIMAL(5, 2) NOT NULL, -- e.g., 25.00 for 25%
  `share_amount_fixed` DECIMAL(10, 2) DEFAULT 0, -- Fixed amount per transaction
  `min_payout_amount` DECIMAL(10, 2) DEFAULT 10000, -- Minimum before payout
  `payout_frequency` ENUM('daily', 'weekly', 'monthly') DEFAULT 'monthly',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_location` (`location_id`),
  KEY `idx_partner_type` (`partner_type`),
  FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partner revenue shares (calculated earnings)
CREATE TABLE IF NOT EXISTS `partner_revenue_shares` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `partner_id` INT(11) NOT NULL,
  `partner_type` ENUM('franchise_owner', 'landlord', 'broker', 'telecom', 'referrer') NOT NULL,
  `location_id` INT(11) NULL,
  `rule_id` INT(11) NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `total_revenue` DECIMAL(10, 2) NOT NULL, -- Total revenue generated
  `share_amount` DECIMAL(10, 2) NOT NULL, -- Partner's share
  `share_percentage` DECIMAL(5, 2) NOT NULL,
  `status` ENUM('pending', 'approved', 'paid', 'cancelled') DEFAULT 'pending',
  `approved_by` INT(11) NULL,
  `approved_at` DATETIME NULL,
  `paid_at` DATETIME NULL,
  `payment_reference` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_partner` (`partner_id`),
  KEY `idx_location` (`location_id`),
  KEY `idx_status` (`status`),
  KEY `idx_period` (`period_start`, `period_end`),
  FOREIGN KEY (`partner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`rule_id`) REFERENCES `revenue_sharing_rules`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PACKAGES & VOUCHERS
-- ============================================================================

-- Internet packages
CREATE TABLE IF NOT EXISTS `packages` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `duration_hours` INT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `data_limit_mb` INT DEFAULT 0, -- 0 = unlimited
  `speed_limit_mbps` INT DEFAULT 0, -- 0 = no limit
  `is_active` TINYINT(1) DEFAULT 1,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Voucher batches
CREATE TABLE IF NOT EXISTS `voucher_batches` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `batch_name` VARCHAR(255) NOT NULL,
  `issued_to` VARCHAR(255) NULL,
  `total_vouchers` INT NOT NULL,
  `total_value` DECIMAL(10, 2) NOT NULL,
  `created_by` INT(11) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_created_by` (`created_by`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vouchers
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `voucher_code` VARCHAR(50) NOT NULL,
  `package_id` INT(11) NOT NULL,
  `batch_id` INT(11) NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `is_used` TINYINT(1) DEFAULT 0,
  `used_at` DATETIME NULL,
  `used_by` INT(11) NULL,
  `expires_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `voucher_code` (`voucher_code`),
  KEY `idx_package` (`package_id`),
  KEY `idx_batch` (`batch_id`),
  KEY `idx_used` (`is_used`),
  FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `voucher_batches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`used_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments (cash / pesapal / voucher sales)
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `payment_method` VARCHAR(20) NULL DEFAULT 'cash',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SYSTEM CONFIGURATION & NOTIFICATIONS
-- ============================================================================

-- System settings
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NULL,
  `setting_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  `description` TEXT NULL,
  `is_public` TINYINT(1) DEFAULT 0, -- Can be accessed by non-admins
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NULL, -- NULL means system-wide notification
  `notification_type` ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `action_url` VARCHAR(500) NULL,
  `action_text` VARCHAR(100) NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `read_at` DATETIME NULL,
  `expires_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_read` (`is_read`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity logs
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NULL, -- e.g., 'user', 'campaign', 'ad'
  `entity_id` INT(11) NULL,
  `description` TEXT NULL,
  `ip_address` VARCHAR(50) NULL,
  `user_agent` TEXT NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_entity` (`entity_type`, `entity_id`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SESSION MANAGEMENT (express-mysql-session)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  `expires` INT(11) UNSIGNED NOT NULL,
  `data` MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DEFAULT DATA INSERTS
-- ============================================================================

-- Insert default packages
INSERT INTO `packages` (`name`, `description`, `duration_hours`, `price`, `is_active`, `sort_order`) VALUES
('MASAA 6', '6 hours of internet access', 6, 500.00, 1, 1),
('MASAA 24', '24 hours (1 day) of internet access', 24, 1000.00, 1, 2),
('WIKI 1', '1 week of internet access', 168, 6000.00, 1, 3),
('MWEEZI 1', '1 month of internet access', 720, 20000.00, 1, 4)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Insert default system settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `setting_type`, `description`, `is_public`) VALUES
('default_free_data_mb', '10', 'number', 'Default free data for new users in MB', 0),
('daily_ad_limit', '8', 'number', 'Maximum ads a user can watch per day', 1),
('ad_watch_reward_mb', '15', 'number', 'Data reward for watching one ad (MB)', 1),
('min_ad_watch_percentage', '80', 'number', 'Minimum percentage of ad to watch to get reward', 0),
('session_timeout_hours', '24', 'number', 'User session timeout in hours', 0),
('max_login_attempts', '5', 'number', 'Maximum login attempts before account lock', 0),
('account_lock_duration_minutes', '30', 'number', 'Account lock duration after max login attempts', 0),
('enable_sms_notifications', 'false', 'boolean', 'Enable SMS notifications', 0),
('enable_email_notifications', 'false', 'boolean', 'Enable email notifications', 0),
('platform_commission_percentage', '10', 'number', 'Platform commission on all transactions', 0),
('franchise_default_share_percentage', '25', 'number', 'Default revenue share for franchise owners', 0),
('min_payout_amount', '10000', 'number', 'Minimum amount for partner payout (TZS)', 0),
('currency', 'TZS', 'string', 'Default currency', 1),
('company_name', 'Hotbando', 'string', 'Company name', 1),
('company_email', 'info@hotbando.com', 'string', 'Company contact email', 1),
('company_phone', '+255 XXX XXX XXX', 'string', 'Company contact phone', 1)
ON DUPLICATE KEY UPDATE `setting_key` = VALUES(`setting_key`);

-- Insert super admin (default password: Admin@123)
-- Password hash for 'Admin@123' using bcrypt (10 rounds)
INSERT INTO `users` (`name`, `phone_number`, `email`, `password`, `role`, `is_active`, `is_verified`) VALUES
('Super Admin', '+255700000000', 'admin@hotbando.com', '$2a$10$lJo9dqZ82EHGTPCeOsP8ouXprW2rVWSlTDXEq2w47K.VofafSlx2.', 'super_admin', 1, 1)
ON DUPLICATE KEY UPDATE `phone_number` = VALUES(`phone_number`);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Additional composite indexes for common queries
-- idx_user_role_active: users(role) already has idx_role, composite added by ALTER TABLE if needed
ALTER TABLE users ADD INDEX idx_user_role_active (role, is_active);
ALTER TABLE campaigns ADD INDEX idx_campaign_active_dates (is_active, start_date, end_date);
ALTER TABLE campaign_completions ADD INDEX idx_completion_campaign_user (campaign_id, user_id);
CREATE INDEX idx_transaction_user_type ON transactions(user_id, transaction_type, created_at);
CREATE INDEX idx_connection_user_timestamp ON user_connection_logs(mac_address, created_at);

-- ============================================================================
-- PUBLIC WEBSITE FORMS (partner applications & contact messages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `partner_applications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(255) NOT NULL,
  `location` VARCHAR(255) NULL,
  `business_type` VARCHAR(100) NULL,
  `package_type` VARCHAR(100) NULL,
  `phone_number` VARCHAR(20) NULL,
  `email` VARCHAR(255) NULL,
  `message` TEXT NULL,
  `status` ENUM('pending', 'contacted', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `notes` TEXT NULL,
  `processed_by` INT(11) NULL,
  `processed_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_partner_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `contact_messages` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL,
  `message` TEXT NULL,
  `status` ENUM('unread', 'read', 'replied') NOT NULL DEFAULT 'unread',
  `reply` TEXT NULL,
  `replied_by` INT(11) NULL,
  `replied_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contact_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
