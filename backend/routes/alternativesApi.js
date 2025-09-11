const express = require('express');
const router = express.Router();
const { getAlternatives } = require('../controllers/alternativesController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   GET /api/learning/alternatives
 * @desc    Get alternative wrong answers for a word
 * @access  Private
 */
router.get('/alternatives', authenticateToken, getAlternatives);

module.exports = router;
