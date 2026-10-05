// src/scripts/initDb.js
// Script to initialize the MySQL database and tables directly via Node.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initializeDatabase() {
  console.log('🔄 Initializing Database Schema...');

  // Read setup environment variables
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT) || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const schemaPath = path.join(__dirname, '../../../database/schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found at: ${schemaPath}`);
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Step 1: Connect to MySQL without database selected to create it
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL server successfully.');
  } catch (err) {
    console.error('❌ Failed to connect to MySQL. Verify that:');
    console.error(`   1. MySQL service is running.`);
    console.error(`   2. Host (${dbHost}) and Port (${dbPort}) are correct.`);
    console.error(`   3. DB_PASSWORD in your backend/.env matches your root password (currently set to "${dbPassword}").`);
    console.error(`\nError details:`, err.message);
    process.exit(1);
  }

  // Step 2: Run the entire schema script in one go
  try {
    console.log('👉 Executing database schema script...');
    await connection.query(schemaSql);
    console.log('\n🎉 Database and tables initialized successfully!');
  } catch (err) {
    console.error('❌ Error executing schema:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

initializeDatabase();
