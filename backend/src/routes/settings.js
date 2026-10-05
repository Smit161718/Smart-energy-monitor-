// src/routes/settings.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/',                    authenticateToken, settingsController.getSettings);
router.put('/tariff',              authenticateToken, settingsController.updateTariff);
router.put('/notifications',       authenticateToken, settingsController.updateNotifications);
router.put('/profile',             authenticateToken, settingsController.updateProfile);
router.put('/password',            authenticateToken, settingsController.updatePassword);
router.get('/notifications-list',  authenticateToken, settingsController.getNotifications);
router.put('/notifications-read',  authenticateToken, settingsController.markAllRead);

module.exports = router;
