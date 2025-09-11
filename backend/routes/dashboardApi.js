const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getUserProfile,
    getWordStats,
    getUserActivity
} = require('../controllers/dashboardController');

// Get user profile and stats
router.get('/users/:userId', authenticateToken, getUserProfile);

// Get word learning statistics
router.get('/users/:userId/word-stats', authenticateToken, getWordStats);

// Get user's recent activity
router.get('/users/:userId/activity', authenticateToken, getUserActivity);

module.exports = router;
