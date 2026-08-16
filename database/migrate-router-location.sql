-- ============================================================================
-- Migration: Add GPS location fields to mikrotiks table
-- and enhance location tracking for router mobility
-- ============================================================================

-- Add direct GPS fields to mikrotiks (for quick location capture during setup)
ALTER TABLE `mikrotiks`
  ADD COLUMN IF NOT EXISTS `latitude` DECIMAL(10, 8) NULL AFTER `setup_completed_at`,
  ADD COLUMN IF NOT EXISTS `longitude` DECIMAL(11, 8) NULL AFTER `latitude`,
  ADD COLUMN IF NOT EXISTS `location_name` VARCHAR(255) NULL AFTER `longitude`,
  ADD COLUMN IF NOT EXISTS `location_address` TEXT NULL AFTER `location_name`,
  ADD COLUMN IF NOT EXISTS `location_city` VARCHAR(100) NULL AFTER `location_address`,
  ADD COLUMN IF NOT EXISTS `location_region` VARCHAR(100) NULL AFTER `location_city`,
  ADD COLUMN IF NOT EXISTS `location_type` ENUM('university', 'hostel', 'market', 'mall', 'office', 'home', 'other') DEFAULT 'other' AFTER `location_region`,
  ADD COLUMN IF NOT EXISTS `moved_from_location_id` INT(11) NULL AFTER `location_type`,
  ADD COLUMN IF NOT EXISTS `last_moved_at` DATETIME NULL AFTER `moved_from_location_id`;

-- Add indexes for location queries
ALTER TABLE `mikrotiks`
  ADD INDEX IF NOT EXISTS `idx_lat_lng` (`latitude`, `longitude`),
  ADD INDEX IF NOT EXISTS `idx_location_name` (`location_name`);

-- Create router_location_history table for tracking movements
CREATE TABLE IF NOT EXISTS `router_location_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `router_id` VARCHAR(50) NOT NULL,
  `location_id` INT(11) NULL,
  `latitude` DECIMAL(10, 8) NULL,
  `longitude` DECIMAL(11, 8) NULL,
  `location_name` VARCHAR(255) NULL,
  `moved_by` INT(11) NULL,
  `move_reason` TEXT NULL,
  `moved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_router` (`router_id`),
  KEY `idx_moved_at` (`moved_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
