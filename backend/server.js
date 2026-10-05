const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { checkConnection, pool, getDbStatus } = require('./config/db');
const meterController = require('./controllers/meterController');

const app = express();

// Init Middleware
app.use(cors());
app.use(express.json());

// Check DB Connection and Log Startup Notifications
async function initStartup() {
  const dbConnected = await checkConnection();
  if (dbConnected) {
    try {
      // Log DB Connection notification
      await pool.query(
        "INSERT INTO notifications (type, message) VALUES ('INFO', 'Database Connected successfully.')"
      );
      // Log Server Running notification
      await pool.query(
        "INSERT INTO notifications (type, message) VALUES ('INFO', 'Server started. Smart Energy Monitoring API is active.')"
      );
    } catch (e) {
      console.error('Error writing startup notifications:', e.message);
    }
  }
}
initStartup();

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/meter', require('./routes/meter'));
app.use('/api/report', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));

// Status route for Navbar indicators
app.get('/api/status', (req, res) => {
  const lastTime = meterController.getLastReadingTime();
  const deviceOnline = lastTime ? (Date.now() - lastTime.getTime() < 15000) : false;

  res.json({
    serverRunning: true,
    databaseConnected: getDbStatus(),
    deviceOnline,
    wifiConnected: deviceOnline, // ESP32 is connected to Wi-Fi if it can push data
  });
});

// Periodic ESP32 status checker
let isDeviceOnline = false;

setInterval(async () => {
  const lastTime = meterController.getLastReadingTime();
  const currentlyOnline = lastTime ? (Date.now() - lastTime.getTime() < 15000) : false;

  if (currentlyOnline !== isDeviceOnline) {
    isDeviceOnline = currentlyOnline;
    const type = isDeviceOnline ? 'INFO' : 'WARNING';
    const message = isDeviceOnline 
      ? 'ESP32 Connected: Live energy telemetry stream started.' 
      : 'ESP32 Offline: Telemetry stream interrupted. Check connection and power.';
    
    console.log(`[Status Change] ESP32 is now ${isDeviceOnline ? 'ONLINE' : 'OFFLINE'}`);

    if (getDbStatus()) {
      try {
        await pool.query(
          'INSERT INTO notifications (type, message) VALUES (?, ?)',
          [type, message]
        );
      } catch (err) {
        console.error('Error logging status notification:', err.message);
      }
    }
  }
}, 5000);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
