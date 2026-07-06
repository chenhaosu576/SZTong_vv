-- 001-init-core-tables.sql
-- 本文件为 SZTong.sql 的精简子集；SZTong.sql 是全量设计稿，本文件只覆盖 P0 阶段 7 张核心表。
-- 一次性 bootstrap 脚本：只在数据库初始建库时执行；后续 schema 变更请走 sequelize-cli migration。
-- 执行入口：npm run db:migrate:sql（调用 backend/scripts/run-sql.js）

CREATE DATABASE IF NOT EXISTS `sztong`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `sztong`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1) roles（依赖：无）
-- ============================================================
CREATE TABLE `roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(60) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2) service_centers（依赖：无）
-- ============================================================
CREATE TABLE `service_centers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `city` VARCHAR(60) NOT NULL,
  `district` VARCHAR(60) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(10,6) DEFAULT NULL,
  `longitude` DECIMAL(10,6) DEFAULT NULL,
  `business_hours` VARCHAR(60) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `cover_image` VARCHAR(255) DEFAULT NULL,
  `description` TEXT,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_centers_city_district` (`city`, `district`),
  KEY `idx_service_centers_status` (`status`),
  CONSTRAINT `chk_service_centers_status` CHECK (`status` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3) users（依赖：无；后续 P0+ 加 user_addresses/user_checkins/points_logs）
-- ============================================================
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(60) NOT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(60) DEFAULT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `points_balance` INT NOT NULL DEFAULT 0,
  `growth_value` INT NOT NULL DEFAULT 0,
  `carbon_reduction_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_created_at` (`created_at`),
  CONSTRAINT `chk_users_status` CHECK (`status` IN (0, 1)),
  CONSTRAINT `chk_users_points_balance` CHECK (`points_balance` >= 0),
  CONSTRAINT `chk_users_growth_value` CHECK (`growth_value` >= 0),
  CONSTRAINT `chk_users_carbon_reduction_total` CHECK (`carbon_reduction_total` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4) admins（依赖：roles, service_centers）
-- ============================================================
CREATE TABLE `admins` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(60) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `real_name` VARCHAR(60) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `center_id` BIGINT UNSIGNED DEFAULT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admins_username` (`username`),
  KEY `idx_admins_role_id` (`role_id`),
  KEY `idx_admins_center_id` (`center_id`),
  KEY `idx_admins_status` (`status`),
  CONSTRAINT `fk_admins_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_admins_center_id` FOREIGN KEY (`center_id`) REFERENCES `service_centers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_admins_status` CHECK (`status` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5) orders（依赖：users, service_centers, admins）
-- ============================================================
CREATE TABLE `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `order_type` VARCHAR(20) NOT NULL,
  `status` VARCHAR(30) NOT NULL,
  `service_center_id` BIGINT UNSIGNED DEFAULT NULL,
  `courier_id` BIGINT UNSIGNED DEFAULT NULL,
  `contact_name` VARCHAR(60) NOT NULL,
  `contact_phone` VARCHAR(20) NOT NULL,
  `address_snapshot` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(10,6) DEFAULT NULL,
  `longitude` DECIMAL(10,6) DEFAULT NULL,
  `scheduled_date` DATE DEFAULT NULL,
  `scheduled_period` VARCHAR(30) DEFAULT NULL,
  `estimated_weight` DECIMAL(6,2) DEFAULT NULL,
  `actual_weight` DECIMAL(6,2) DEFAULT NULL,
  `estimated_points` INT NOT NULL DEFAULT 0,
  `granted_points` INT NOT NULL DEFAULT 0,
  `note` VARCHAR(255) DEFAULT NULL,
  `cancel_reason` VARCHAR(120) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_order_no` (`order_no`),
  KEY `idx_orders_user_id_created_at` (`user_id`, `created_at`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_type_status` (`order_type`, `status`),
  KEY `idx_orders_service_center_id` (`service_center_id`),
  KEY `idx_orders_courier_id` (`courier_id`),
  KEY `idx_orders_scheduled_date` (`scheduled_date`),
  CONSTRAINT `fk_orders_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_service_center_id` FOREIGN KEY (`service_center_id`) REFERENCES `service_centers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_courier_id` FOREIGN KEY (`courier_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_orders_order_type` CHECK (`order_type` IN ('recycle', 'donation')),
  CONSTRAINT `chk_orders_estimated_weight` CHECK (`estimated_weight` IS NULL OR `estimated_weight` >= 0),
  CONSTRAINT `chk_orders_actual_weight` CHECK (`actual_weight` IS NULL OR `actual_weight` >= 0),
  CONSTRAINT `chk_orders_estimated_points` CHECK (`estimated_points` >= 0),
  CONSTRAINT `chk_orders_granted_points` CHECK (`granted_points` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6) recycle_orders（依赖：orders）
-- ============================================================
CREATE TABLE `recycle_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `weight_band` VARCHAR(20) DEFAULT NULL,
  `item_images` JSON DEFAULT NULL,
  `pickup_code` VARCHAR(20) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_recycle_orders_order_id` (`order_id`),
  KEY `idx_recycle_orders_category` (`category`),
  CONSTRAINT `fk_recycle_orders_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7) donation_orders（依赖：orders；P0 阶段不依赖 charity_projects，
--    因 charity_projects 不在 7 张核心表范围）
-- ============================================================
CREATE TABLE `donation_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `charity_project_id` BIGINT UNSIGNED DEFAULT NULL,
  `item_type` VARCHAR(50) NOT NULL,
  `item_name` VARCHAR(100) NOT NULL,
  `quantity_text` VARCHAR(50) DEFAULT NULL,
  `weight_text` VARCHAR(50) DEFAULT NULL,
  `condition_text` VARCHAR(100) DEFAULT NULL,
  `logistics_type` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_donation_orders_order_id` (`order_id`),
  KEY `idx_donation_orders_item_type` (`item_type`),
  CONSTRAINT `fk_donation_orders_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;