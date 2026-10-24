-- ============================================================================
-- HOTBANDO PLATFORM - NATIONAL HQ MANAGEMENT MIGRATION
-- Version: 1.0
-- Date: 2026-08-20
-- Description: 29 tables + 1 ALTER for national HQ management
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. BRANCH HIERARCHY (4 tables + 1 ALTER)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `regions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `manager_id` INT(11) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_code` (`code`),
  KEY `idx_manager` (`manager_id`),
  KEY `idx_active` (`is_active`),
  FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `districts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `region_id` INT(11) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `manager_id` INT(11) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_region` (`region_id`),
  KEY `idx_code` (`code`),
  KEY `idx_manager` (`manager_id`),
  FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `branches` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `district_id` INT(11) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `address` TEXT NULL,
  `city` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(255) NULL,
  `latitude` DECIMAL(10, 8) NULL,
  `longitude` DECIMAL(11, 8) NULL,
  `manager_id` INT(11) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_district` (`district_id`),
  KEY `idx_code` (`code`),
  KEY `idx_manager` (`manager_id`),
  FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wards` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `branch_id` INT(11) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `supervisor_id` INT(11) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_code` (`code`),
  KEY `idx_supervisor` (`supervisor_id`),
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add branch_id to existing locations table
-- Uses a procedure to safely handle the case where the column already exists
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS `sp_add_branch_id_to_locations`()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'locations'
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE `locations` ADD COLUMN `branch_id` INT(11) NULL AFTER `franchise_owner_id`;
    ALTER TABLE `locations` ADD KEY `idx_branch_id` (`branch_id`);
    ALTER TABLE `locations` ADD CONSTRAINT `fk_locations_branch_id`
      FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL;
  END IF;
END //
DELIMITER ;

CALL `sp_add_branch_id_to_locations`();
DROP PROCEDURE IF EXISTS `sp_add_branch_id_to_locations`;

-- ============================================================================
-- 2. STAFF / HR (7 tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `display_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `level` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `role_id` INT(11) NOT NULL,
  `permission` VARCHAR(100) NOT NULL,
  `resource` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission_unique` (`role_id`, `permission`, `resource`),
  KEY `idx_role` (`role_id`),
  KEY `idx_permission` (`permission`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `role_id` INT(11) NULL,
  `employee_id` VARCHAR(50) NULL UNIQUE,
  `branch_id` INT(11) NULL,
  `department` VARCHAR(100) NULL,
  `job_title` VARCHAR(255) NULL,
  `employment_type` ENUM('full_time', 'part_time', 'contract', 'intern') DEFAULT 'full_time',
  `hire_date` DATE NOT NULL,
  `contract_end_date` DATE NULL,
  `salary` DECIMAL(12, 2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `bank_name` VARCHAR(100) NULL,
  `bank_account_number` VARCHAR(50) NULL,
  `emergency_contact_name` VARCHAR(255) NULL,
  `emergency_contact_phone` VARCHAR(20) NULL,
  `status` ENUM('active', 'on_leave', 'terminated', 'suspended') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_role` (`role_id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_status` (`status`),
  KEY `idx_employee_id` (`employee_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shifts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `branch_id` INT(11) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_branch` (`branch_id`),
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_shifts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `staff_id` INT(11) NOT NULL,
  `shift_id` INT(11) NOT NULL,
  `assigned_date` DATE NOT NULL,
  `status` ENUM('scheduled', 'completed', 'absent', 'swapped') DEFAULT 'scheduled',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_shift_date_unique` (`staff_id`, `shift_id`, `assigned_date`),
  KEY `idx_staff` (`staff_id`),
  KEY `idx_shift` (`shift_id`),
  KEY `idx_date` (`assigned_date`),
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `staff_id` INT(11) NOT NULL,
  `check_in` TIMESTAMP NULL,
  `check_out` TIMESTAMP NULL,
  `attendance_date` DATE NOT NULL,
  `status` ENUM('present', 'absent', 'late', 'half_day', 'on_leave') DEFAULT 'present',
  `hours_worked` DECIMAL(5, 2) DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_date_unique` (`staff_id`, `attendance_date`),
  KEY `idx_staff` (`staff_id`),
  KEY `idx_date` (`attendance_date`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `staff_id` INT(11) NOT NULL,
  `leave_type` ENUM('annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid', 'other') NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `days_requested` INT NOT NULL,
  `reason` TEXT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  `approved_by` INT(11) NULL,
  `approved_at` DATETIME NULL,
  `rejection_reason` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff` (`staff_id`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`start_date`, `end_date`),
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. FINANCIAL MANAGEMENT (4 tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `expense_categories` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `parent_id` INT(11) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  FOREIGN KEY (`parent_id`) REFERENCES `expense_categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `category_id` INT(11) NOT NULL,
  `branch_id` INT(11) NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `expense_date` DATE NOT NULL,
  `payment_method` ENUM('cash', 'mobile_money', 'bank_transfer', 'card', 'other') DEFAULT 'cash',
  `receipt_url` VARCHAR(500) NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'reimbursed') DEFAULT 'pending',
  `approved_by` INT(11) NULL,
  `approved_at` DATETIME NULL,
  `submitted_by` INT(11) NOT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_status` (`status`),
  KEY `idx_date` (`expense_date`),
  KEY `idx_submitted_by` (`submitted_by`),
  FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `budgets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `branch_id` INT(11) NULL,
  `category_id` INT(11) NULL,
  `name` VARCHAR(255) NOT NULL,
  `budget_type` ENUM('operational', 'capital', 'marketing', 'personnel', 'other') DEFAULT 'operational',
  `amount` DECIMAL(12, 2) NOT NULL,
  `spent` DECIMAL(12, 2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `status` ENUM('active', 'exhausted', 'expired', 'cancelled') DEFAULT 'active',
  `approved_by` INT(11) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_period` (`period_start`, `period_end`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `profit_loss_summaries` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `branch_id` INT(11) NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `total_revenue` DECIMAL(12, 2) DEFAULT 0,
  `total_expenses` DECIMAL(12, 2) DEFAULT 0,
  `net_profit` DECIMAL(12, 2) DEFAULT 0,
  `operational_expenses` DECIMAL(12, 2) DEFAULT 0,
  `capital_expenses` DECIMAL(12, 2) DEFAULT 0,
  `marketing_expenses` DECIMAL(12, 2) DEFAULT 0,
  `personnel_expenses` DECIMAL(12, 2) DEFAULT 0,
  `subscription_revenue` DECIMAL(12, 2) DEFAULT 0,
  `ad_revenue` DECIMAL(12, 2) DEFAULT 0,
  `other_revenue` DECIMAL(12, 2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `generated_by` INT(11) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_period` (`period_start`, `period_end`),
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. ASSETS / INVENTORY (4 tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `asset_categories` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `depreciation_rate` DECIMAL(5, 2) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `category_id` INT(11) NOT NULL,
  `branch_id` INT(11) NULL,
  `asset_tag` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `serial_number` VARCHAR(100) NULL,
  `purchase_date` DATE NULL,
  `purchase_cost` DECIMAL(12, 2) DEFAULT 0,
  `current_value` DECIMAL(12, 2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `warranty_expiry` DATE NULL,
  `condition_status` ENUM('new', 'good', 'fair', 'poor', 'disposed') DEFAULT 'new',
  `assigned_to` INT(11) NULL,
  `location_detail` VARCHAR(255) NULL,
  `status` ENUM('active', 'maintenance', 'retired', 'disposed') DEFAULT 'active',
  `last_maintenance` DATE NULL,
  `next_maintenance` DATE NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_asset_tag` (`asset_tag`),
  KEY `idx_status` (`status`),
  KEY `idx_assigned_to` (`assigned_to`),
  FOREIGN KEY (`category_id`) REFERENCES `asset_categories`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `branch_id` INT(11) NULL,
  `supplier_name` VARCHAR(255) NOT NULL,
  `supplier_contact` VARCHAR(255) NULL,
  `supplier_phone` VARCHAR(20) NULL,
  `supplier_email` VARCHAR(255) NULL,
  `total_amount` DECIMAL(12, 2) DEFAULT 0,
  `tax_amount` DECIMAL(12, 2) DEFAULT 0,
  `grand_total` DECIMAL(12, 2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `status` ENUM('draft', 'submitted', 'approved', 'ordered', 'received', 'cancelled') DEFAULT 'draft',
  `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  `expected_delivery` DATE NULL,
  `received_date` DATE NULL,
  `requested_by` INT(11) NOT NULL,
  `approved_by` INT(11) NULL,
  `approved_at` DATETIME NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_order_number` (`order_number`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_status` (`status`),
  KEY `idx_requested_by` (`requested_by`),
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `purchase_order_id` INT(11) NOT NULL,
  `asset_category_id` INT(11) NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12, 2) NOT NULL,
  `total_price` DECIMAL(12, 2) NOT NULL,
  `quantity_received` INT DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purchase_order` (`purchase_order_id`),
  KEY `idx_asset_category` (`asset_category_id`),
  FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`asset_category_id`) REFERENCES `asset_categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. SUPPORT / TICKETS (3 tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `ticket_categories` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `priority_default` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  `sla_hours` INT DEFAULT 48,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ticket_number` VARCHAR(50) NOT NULL UNIQUE,
  `category_id` INT(11) NOT NULL,
  `branch_id` INT(11) NULL,
  `submitted_by` INT(11) NOT NULL,
  `assigned_to` INT(11) NULL,
  `subject` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  `status` ENUM('open', 'in_progress', 'waiting_customer', 'waiting_internal', 'resolved', 'closed') DEFAULT 'open',
  `resolution_notes` TEXT NULL,
  `resolved_at` DATETIME NULL,
  `closed_at` DATETIME NULL,
  `sla_deadline` DATETIME NULL,
  `attachment_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_ticket_number` (`ticket_number`),
  KEY `idx_category` (`category_id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_submitted_by` (`submitted_by`),
  KEY `idx_assigned_to` (`assigned_to`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  FOREIGN KEY (`category_id`) REFERENCES `ticket_categories`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ticket_replies` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `message` TEXT NOT NULL,
  `is_internal` TINYINT(1) DEFAULT 0,
  `attachment_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket` (`ticket_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. AUDIT TRAIL (1 table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `audit_trail` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT(11) NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `description` TEXT NULL,
  `ip_address` VARCHAR(50) NULL,
  `user_agent` TEXT NULL,
  `branch_id` INT(11) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_entity` (`entity_type`, `entity_id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. CONTRACTS / COMPLIANCE (2 tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `contracts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `contract_number` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `contract_type` ENUM('vendor', 'service', 'employment', 'lease', 'partnership', 'other') NOT NULL,
  `branch_id` INT(11) NULL,
  `party_name` VARCHAR(255) NOT NULL,
  `party_contact` VARCHAR(255) NULL,
  `party_email` VARCHAR(255) NULL,
  `party_phone` VARCHAR(20) NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `renewal_date` DATE NULL,
  `auto_renew` TINYINT(1) DEFAULT 0,
  `value` DECIMAL(12, 2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `status` ENUM('draft', 'pending_approval', 'active', 'expired', 'terminated', 'renewed') DEFAULT 'draft',
  `document_url` VARCHAR(500) NULL,
  `approved_by` INT(11) NULL,
  `approved_at` DATETIME NULL,
  `created_by` INT(11) NOT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_contract_number` (`contract_number`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`start_date`, `end_date`),
  KEY `idx_type` (`contract_type`),
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `licenses_permits` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `license_number` VARCHAR(100) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `license_type` ENUM('business', 'telecom', 'health', 'safety', 'tax', 'environmental', 'other') NOT NULL,
  `branch_id` INT(11) NULL,
  `issuing_authority` VARCHAR(255) NOT NULL,
  `issue_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `renewal_reminder_days` INT DEFAULT 30,
  `document_url` VARCHAR(500) NULL,
  `status` ENUM('active', 'expired', 'pending_renewal', 'suspended', 'revoked') DEFAULT 'active',
  `cost` DECIMAL(12, 2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_license_number` (`license_number`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_status` (`status`),
  KEY `idx_expiry` (`expiry_date`),
  KEY `idx_type` (`license_type`),
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. MARKETING (2 tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `marketing_campaigns` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `campaign_name` VARCHAR(255) NOT NULL,
  `campaign_type` ENUM('social_media', 'sms', 'email', 'radio', 'tv', 'flyer', 'event', 'referral', 'other') NOT NULL,
  `description` TEXT NULL,
  `target_audience` TEXT NULL,
  `budget` DECIMAL(12, 2) DEFAULT 0,
  `spent` DECIMAL(12, 2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TZS',
  `start_date` DATE NOT NULL,
  `end_date` DATE NULL,
  `status` ENUM('draft', 'active', 'paused', 'completed', 'cancelled') DEFAULT 'draft',
  `leads_generated` INT DEFAULT 0,
  `conversions` INT DEFAULT 0,
  `cost_per_lead` DECIMAL(10, 2) DEFAULT 0,
  `managed_by` INT(11) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_type` (`campaign_type`),
  KEY `idx_dates` (`start_date`, `end_date`),
  KEY `idx_managed_by` (`managed_by`),
  FOREIGN KEY (`managed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `campaign_branch_allocations` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `campaign_id` INT(11) NOT NULL,
  `branch_id` INT(11) NOT NULL,
  `allocated_budget` DECIMAL(12, 2) DEFAULT 0,
  `spent` DECIMAL(12, 2) DEFAULT 0,
  `target_leads` INT DEFAULT 0,
  `actual_leads` INT DEFAULT 0,
  `status` ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `campaign_branch_unique` (`campaign_id`, `branch_id`),
  KEY `idx_campaign` (`campaign_id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`campaign_id`) REFERENCES `marketing_campaigns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. REPORTING (2 tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `report_templates` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `report_type` ENUM('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom') NOT NULL,
  `category` ENUM('financial', 'operations', 'hr', 'marketing', 'assets', 'tickets', 'compliance', 'other') NOT NULL,
  `sql_query` MEDIUMTEXT NULL,
  `columns_config` JSON NULL,
  `filters_config` JSON NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_by` INT(11) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`report_type`),
  KEY `idx_category` (`category`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_runs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `template_id` INT(11) NULL,
  `report_name` VARCHAR(255) NOT NULL,
  `branch_id` INT(11) NULL,
  `period_start` DATE NULL,
  `period_end` DATE NULL,
  `filters_applied` JSON NULL,
  `result_data` JSON NULL,
  `file_url` VARCHAR(500) NULL,
  `format` ENUM('json', 'csv', 'pdf', 'excel') DEFAULT 'json',
  `status` ENUM('pending', 'generating', 'completed', 'failed') DEFAULT 'pending',
  `error_message` TEXT NULL,
  `generated_by` INT(11) NULL,
  `generated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template` (`template_id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_status` (`status`),
  KEY `idx_generated_at` (`generated_at`),
  FOREIGN KEY (`template_id`) REFERENCES `report_templates`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DONE
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 1;
