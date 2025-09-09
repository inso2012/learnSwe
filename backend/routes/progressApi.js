const express = require('express');
const router = express.Router();
const {
    getStats,
    getReviewWords,
    startQuiz,
    submitAnswer,
    finishQuiz,
    practiceWord,
    getWordProgress,
    getLearningActivity
} = require('../controllers/progressController');
const { authenticateToken } = require('../middleware/auth');

// All progress routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/progress/stats
 * @desc    Get user's learning statistics
 * @access  Private
 */
router.get('/stats', getStats);

/**
 * @route   GET /api/progress/review-words
 * @desc    Get words due for review (spaced repetition)
 * @access  Private
 */
router.get('/review-words', getReviewWords);

/**
 * @route   POST /api/progress/startQuiz
 * @desc    POST Start a new quiz session
 * @access  Private
 */
router.post('/quiz/start', startQuiz);

/**
 * @route   POST /api/progress/submitAnswer
 * @desc    POST Submit an answer to a quiz question
 * @access  Private
 */
router.post('/quiz/:sessionId/answer', submitAnswer);

/**
 * @route   POST /api/progress/finishQuiz
 * @desc    POST Complete a quiz session
 * @access  Private
 */
router.post('/quiz/:sessionId/finish', finishQuiz);

/**
 * @route   POST /api/progress/practiceWord
 * @desc    POST Record individual word practice
 * @access  Private
 */
router.post('/practice-word', practiceWord);

/**
 * @route   GET /api/progress/getWordProgress
 * @desc    GET Get user's progress for a specific word
 * @access  Private
 */
router.get('/word/:wordId', getWordProgress);

/**
 * @route   GET /api/progress/getLearningActivity
 * @desc    GET Get learning activity for dashboard charts
 * @access  Private
 */
router.get('/activity', getLearningActivity);

module.exports = router;