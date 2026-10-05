// src/routes/meter.js
const express = require('express');
const router = express.Router();
const meterController = require('../controllers/meterController');
const { authenticateToken, authenticateDevice } = require('../middleware/auth');

// ESP32 posts data here — protected by device API key
router.post('/',           authenticateDevice, meterController.postReading);

// Frontend reads — protected by user JWT
router.get('/latest',      authenticateToken,  meterController.getLatest);
router.get('/history',     authenticateToken,  meterController.getHistory);
router.get('/daily',       authenticateToken,  meterController.getDaily);
router.get('/weekly',      authenticateToken,  meterController.getWeekly);
router.get('/monthly',     authenticateToken,  meterController.getMonthly);
router.get('/bill',        authenticateToken,  meterController.getBill);
router.get('/chart',       authenticateToken,  meterController.getChartData);

module.exports = router;
