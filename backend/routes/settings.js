const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const auth = require('../middleware/authMiddleware');

// @route    GET api/settings
// @desc     Get user settings
// @access   Private
router.get('/', auth, settingsController.getSettings);

// @route    PUT api/settings
// @desc     Update user settings
// @access   Private
router.put('/', auth, settingsController.updateSettings);

module.exports = router;
