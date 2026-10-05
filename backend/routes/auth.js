const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

// @route    POST api/auth/register
// @desc     Register user
// @access   Public
router.post('/register', authController.register);

// @route    POST api/auth/login
// @desc     Authenticate user & get token
// @access   Public
router.post('/login', authController.login);

// @route    GET api/auth/profile
// @desc     Get user profile
// @access   Private
router.get('/profile', auth, authController.getProfile);

// @route    PUT api/auth/profile
// @desc     Update user profile
// @access   Private
router.put('/profile', auth, authController.updateProfile);

module.exports = router;
