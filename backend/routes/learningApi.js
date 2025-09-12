const express = require('express');
const router = express.Router();
const {
    getFlashcards,
    generateVocabularyQuiz,
    getTranslationExercise,
    getWordSuggestions,
    submitLearningSession,
    getWordAlternatives
} = require('../controllers/learningController');
const { authenticateToken } = require('../middleware/auth');

// All learning routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/learning/flashcards
 * @desc    Get flashcards for learning session
 * @access  Private
 * @query   ?limit=10&difficulty=1-5
 */
router.get('/flashcards', getFlashcards);

/**
 * @route   GET /api/learning/quiz/vocabulary
 * @desc    Generate a vocabulary quiz
 * @access  Private
 * @query   ?questions=10&type=mixed&difficulty=1-5
 */
router.get('/quiz/vocabulary', generateVocabularyQuiz);

/**
 * @route   GET /api/learning/exercise/translation
 * @desc    Get translation exercises
 * @access  Private
 * @query   ?count=5&direction=both
 */
router.get('/exercise/translation', getTranslationExercise);

/**
 * @route   GET /api/learning/suggestions
 * @desc    Get personalized word learning suggestions
 * @access  Private
 */
router.get('/suggestions', getWordSuggestions);

/**
 * @route   POST /api/learning/session/submit
 * @desc    Submit learning session results
 * @access  Private
 * @body    { sessionType, results, timeSpent }
 */
router.post('/session/submit', submitLearningSession);

/**
 * @route   GET /api/learning/alternatives
 * @desc    Get alternative translations for a word
 * @access  Private
 * @query   ?word=string&count=number
 */
router.get('/alternatives', getWordAlternatives);

module.exports = router;