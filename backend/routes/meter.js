const express = require('express');
const router = express.Router();
const meterController = require('../controllers/meterController');
const auth = require('../middleware/authMiddleware');

// @route    POST api/meter
// @desc     Ingest new reading from ESP32
// @access   Public
router.post('/', meterController.ingestReading);

// @route    GET api/meter
// @desc     Get latest meter reading
// @access   Private (Protected for Dashboard)
router.get('/', auth, meterController.getLatestReading);

// @route    GET api/meter/history
// @desc     Get meter readings history (paginated & filtered)
// @access   Private
router.get('/history', auth, meterController.getHistory);

// @route    GET api/meter/charts
// @desc     Get charts aggregation data
// @access   Private
router.get('/charts', auth, meterController.getChartsData);

module.exports = router;
