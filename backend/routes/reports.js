const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/authMiddleware');

// @route    GET api/report/today
// @desc     Get today's energy report
// @access   Private
router.get('/today', auth, reportController.getTodayReport);

// @route    GET api/report/monthly
// @desc     Get monthly energy report
// @access   Private
router.get('/monthly', auth, reportController.getMonthlyReport);

module.exports = router;
