// src/app.js
// Main Express application entry point

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const authRoutes     = require('./routes/auth');
const meterRoutes    = require('./routes/meter');
const settingsRoutes = require('./routes/settings');

// Initialize DB connection pool (also tests connection on startup)
require('./config/db');

const app  = express();
app.set('trust proxy', 1); // Trust first proxy (Cloudflare, localtunnel, etc.)
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter for auth routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/meter',    meterRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's',
  });
});

const path = require('path');

// Serve static frontend files from compiled dist
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));

// SPA Fallback: Any non-API route serves index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Smart Energy Monitor API running on http://0.0.0.0:${PORT}`);
  console.log(`📡 ESP32 endpoint: POST http://localhost:${PORT}/api/meter`);
  console.log(`🌐 Health check:   GET  http://localhost:${PORT}/api/health\n`);
});
