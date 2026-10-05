// src/middleware/auth.js
// JWT Authentication Middleware

const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT from the Authorization header.
 * Attaches decoded user payload to req.user.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired, please login again' });
    }
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * Verifies the ESP32 device API key from the X-Device-Key header.
 * Used to protect the meter POST endpoint.
 */
const authenticateDevice = (req, res, next) => {
  const deviceKey = req.headers['x-device-key'];
  if (process.env.DEVICE_API_KEY && process.env.DEVICE_API_KEY !== 'none') {
    if (!deviceKey || deviceKey !== process.env.DEVICE_API_KEY) {
      console.warn('⚠️ Rejected unauthorized device request (missing or invalid x-device-key header)');
      return res.status(401).json({ success: false, message: 'Invalid device key' });
    }
  }
  next();
};

module.exports = { authenticateToken, authenticateDevice };
