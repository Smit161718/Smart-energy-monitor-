// src/config/db.js
// MySQL connection pool using mysql2/promise

const mysql = require('mysql2/promise');
require('dotenv').config();

const isRemoteHost = process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1';

const pool = process.env.DATABASE_URL
  ? mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+05:30',
      ssl: { rejectUnauthorized: false }
    })
  : mysql.createPool({
      host:               process.env.DB_HOST     || 'localhost',
      port:               parseInt(process.env.DB_PORT) || 3306,
      user:               process.env.DB_USER     || 'root',
      password:           process.env.DB_PASSWORD || '',
      database:           process.env.DB_NAME     || 'smart_energy_db',
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
      timezone:           '+05:30',   // IST
      ssl: process.env.DB_SSL === 'true' || isRemoteHost ? { rejectUnauthorized: false } : undefined,
    });

// Test the connection and auto-initialize tables on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        name         VARCHAR(100)  NOT NULL,
        email        VARCHAR(150)  NOT NULL UNIQUE,
        password     VARCHAR(255)  NOT NULL,
        role         ENUM('admin','user') DEFAULT 'user',
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id                    INT AUTO_INCREMENT PRIMARY KEY,
        user_id               INT NOT NULL,
        tariff                DECIMAL(10,4) DEFAULT 8.0000,
        notify_high_power     TINYINT(1) DEFAULT 1,
        notify_bill_exceeded  TINYINT(1) DEFAULT 1,
        notify_power_cut      TINYINT(1) DEFAULT 1,
        notify_offline        TINYINT(1) DEFAULT 1,
        monthly_bill_limit    DECIMAL(10,2) DEFAULT 1000.00,
        high_power_threshold  DECIMAL(10,2) DEFAULT 2000.00,
        created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS meter_readings (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        voltage       DECIMAL(7,2)  DEFAULT 0.00,
        current_amp   DECIMAL(7,4)  DEFAULT 0.0000,
        power         DECIMAL(10,2) DEFAULT 0.00,
        energy        DECIMAL(12,4) DEFAULT 0.0000,
        frequency     DECIMAL(6,2)  DEFAULT 0.00,
        power_factor  DECIMAL(5,4)  DEFAULT 0.0000,
        bill          DECIMAL(10,4) DEFAULT 0.0000,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at)
      )
    `);

    await conn.query(`
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
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    INT NOT NULL,
        token      VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used       TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    conn.release();
    console.log('✅ Database tables verified/initialized successfully');
  } catch (err) {
    console.error('❌ MySQL initialization error:', err.message);
  }
})();

module.exports = pool;
