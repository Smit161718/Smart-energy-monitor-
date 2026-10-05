const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_energy_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup
let isDbConnected = false;

async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully to database:', process.env.DB_NAME || 'smart_energy_db');
    connection.release();
    isDbConnected = true;
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    isDbConnected = false;
    return false;
  }
}

checkConnection();

module.exports = {
  pool,
  checkConnection,
  getDbStatus: () => isDbConnected
};
