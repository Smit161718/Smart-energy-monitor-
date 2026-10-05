-- ============================================================
--  IoT Smart Energy Monitoring System - MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_energy_db;
USE smart_energy_db;

-- Drop existing tables to ensure clean recreation
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS meter_readings;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL,
  email        VARCHAR(150)  NOT NULL UNIQUE,
  password     VARCHAR(255)  NOT NULL,
  role         ENUM('admin','user') DEFAULT 'user',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table: settings
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  user_id               INT NOT NULL,
  tariff                DECIMAL(10,4) DEFAULT 8.0000,  -- Rs per kWh
  notify_high_power     TINYINT(1) DEFAULT 1,
  notify_bill_exceeded  TINYINT(1) DEFAULT 1,
  notify_power_cut      TINYINT(1) DEFAULT 1,
  notify_offline        TINYINT(1) DEFAULT 1,
  monthly_bill_limit    DECIMAL(10,2) DEFAULT 1000.00,
  high_power_threshold  DECIMAL(10,2) DEFAULT 2000.00, -- Watts
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table: meter_readings
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS meter_readings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  voltage       DECIMAL(7,2)  DEFAULT 0.00,   -- Volts
  current_amp   DECIMAL(7,4)  DEFAULT 0.0000, -- Amperes
  power         DECIMAL(10,2) DEFAULT 0.00,   -- Watts
  energy        DECIMAL(12,4) DEFAULT 0.0000, -- kWh
  frequency     DECIMAL(6,2)  DEFAULT 0.00,   -- Hz
  power_factor  DECIMAL(5,4)  DEFAULT 0.0000,
  bill          DECIMAL(10,4) DEFAULT 0.0000, -- Rs
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
);

-- --------------------------------------------------------
-- Table: notifications
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       ENUM('high_power','bill_exceeded','power_cut','wifi_disconnected','device_offline') NOT NULL,
  message    TEXT NOT NULL,
  is_read    TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
);

-- --------------------------------------------------------
-- Table: password_reset_tokens
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used       TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Seed Data: Default admin user (password: Admin@123)
-- ============================================================
INSERT INTO users (name, email, password) VALUES
  ('Admin', 'admin@energymonitor.com', '$2b$10$rOzJqQ0nW1kZpR6nX7vGHOQ8mFkLbN9QwYkHvLmZKpQ2xYjOeW6Na');

-- Default settings for admin
INSERT INTO settings (user_id, tariff) VALUES (1, 8.00);
