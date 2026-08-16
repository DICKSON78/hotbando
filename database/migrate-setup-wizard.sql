-- ============================================================================
-- Setup Wizard: Add setup tracking columns to mikrotiks table
-- Run this migration to enable the setup wizard
-- ============================================================================

-- Add setup tracking columns
ALTER TABLE `mikrotiks`
  ADD COLUMN IF NOT EXISTS `setup_status` ENUM('pending', 'configuring', 'configured', 'failed') DEFAULT 'pending' AFTER `is_active`,
  ADD COLUMN IF NOT EXISTS `setup_step` INT(1) DEFAULT 0 AFTER `setup_status`,
  ADD COLUMN IF NOT EXISTS `setup_error` TEXT NULL AFTER `setup_step`,
  ADD COLUMN IF NOT EXISTS `setup_config` JSON NULL AFTER `setup_error`,
  ADD COLUMN IF NOT EXISTS `setup_completed_at` DATETIME NULL AFTER `setup_config`,
  ADD COLUMN IF NOT EXISTS `hotspot_server_name` VARCHAR(50) DEFAULT 'hotbando-server' AFTER `setup_completed_at`,
  ADD COLUMN IF NOT EXISTS `hotspot_ip` VARCHAR(50) DEFAULT '10.5.50.1' AFTER `hotspot_server_name`,
  ADD COLUMN IF NOT EXISTS `hotspot_interface` VARCHAR(50) DEFAULT 'wlan1' AFTER `hotspot_ip`,
  ADD COLUMN IF NOT EXISTS `radius_secret` VARCHAR(255) DEFAULT 'CHANGE-ME-IN-PRODUCTION' AFTER `hotspot_interface`;

-- Add index for setup status
ALTER TABLE `mikrotiks`
  ADD INDEX IF NOT EXISTS `idx_setup_status` (`setup_status`);
