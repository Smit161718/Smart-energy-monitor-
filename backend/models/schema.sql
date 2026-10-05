-- Smart Energy Monitoring System - Database Schema

CREATE DATABASE IF NOT EXISTS smart_energy_db;
USE smart_energy_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Meter Readings Table (Stores ESP32 data)
CREATE TABLE IF NOT EXISTS meter_readings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  voltage FLOAT NOT NULL,
  current FLOAT NOT NULL,
  power FLOAT NOT NULL,
  energy FLOAT NOT NULL,
  bill FLOAT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'INFO', 'WARNING', 'CRITICAL'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Reports Table (Daily/Monthly aggregations)
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_type VARCHAR(20) NOT NULL, -- 'daily', 'monthly'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_energy FLOAT NOT NULL,
  total_bill FLOAT NOT NULL,
  average_power FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Settings Table (User specific settings)
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  electricity_tariff FLOAT DEFAULT 0.15, -- Tariff per kWh ($ or local currency)
  daily_energy_limit FLOAT DEFAULT 15.0,  -- Limit in kWh
  monthly_budget FLOAT DEFAULT 150.0,     -- Budget in currency
  alert_on_limit BOOLEAN DEFAULT TRUE,
  alert_on_budget BOOLEAN DEFAULT TRUE,
  theme VARCHAR(10) DEFAULT 'dark',       -- 'dark' or 'light'
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Login History Table
CREATE TABLE IF NOT EXISTS login_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NOT NULL,
  device VARCHAR(255) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
