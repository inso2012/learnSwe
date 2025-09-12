const {
    recordWordProgress,
    createQuizSession,
    recordQuizAnswer,
    completeQuizSession,
    getUserStats,
    getWordsForReview,
    updateLearnedWords,
    markWordsAsShown
} = require('../models/Progress');

const { UserWordProgress, Word, LearningStreak, sequelize } = require('../db');
const { Op } = require('sequelize');

/**
 * Get user's learning statistics
 */
async function getStats(req, res) {
    try {
        const userId = req.userId;
        const stats = await getUserStats(userId);
        
        // Get word type statistics
        const wordTypeStats = await UserWordProgress.findAll({
            attributes: [
                [sequelize.col('word.type'), 'type'],
                [sequelize.fn('COUNT', sequelize.col('UserWordProgress.id')), 'count']
            ],
            include: [{
                model: Word,
                as: 'word',
                attributes: []
            }],
            where: { 
                userId,
                masteryLevel: { [Op.in]: ['practicing', 'mastered'] }
            },
            group: ['word.type'],
            raw: true
        });

        // Format the response with default values for empty states
        const formattedStats = {
            ...stats,
            totalWordsLearned: stats.totalWordsLearned || 0,
            currentStreak: stats.currentStreak || 0,
            totalQuizzesTaken: stats.totalQuizzesTaken || 0,
            averageQuizScore: stats.averageQuizScore || 0,
            wordTypeStats: wordTypeStats.reduce((acc, curr) => {
                acc[curr.type.toLowerCase()] = parseInt(curr.count || 0);
                return acc;
            }, {
                nouns: 0,
                verbs: 0,
                adjectives: 0,
                other: 0
            })
        };

        res.status(200).json({
            success: true,
            data: formattedStats
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get words due for review (spaced repetition)
 */
async function getReviewWords(req, res) {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 20;
        
        const words = await getWordsForReview(userId, limit);
        
        res.status(200).json({
            success: true,
            data: words,
            count: words.length
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Start a new quiz session
 */
async function startQuiz(req, res) {
    try {
        const userId = req.userId;
        const { quizType, totalQuestions } = req.body;
        
        if (!quizType || !totalQuestions) {
            return res.status(400).json({
                success: false,
                error: 'Quiz type and total questions are required'
            });
        }

        const validQuizTypes = ['vocabulary', 'translation', 'multiple_choice', 'flashcard', 'mixed'];
        if (!validQuizTypes.includes(quizType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid quiz type. Must be one of: ${validQuizTypes.join(', ')}`
            });
        }
        
        const session = await createQuizSession(userId, quizType, totalQuestions);
        
        res.status(201).json({
            success: true,
            data: session,
            message: 'Quiz session started'
        });
        
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Submit an answer to a quiz question
 */
async function submitAnswer(req, res) {
    try {
        const { sessionId } = req.params;
        const { wordId, userAnswer, correctAnswer, answerTime } = req.body;
        
        if (!wordId || !userAnswer || !correctAnswer) {
            return res.status(400).json({
                success: false,
                error: 'Word ID, user answer, and correct answer are required'
            });
        }
        
        const answer = await recordQuizAnswer(
            sessionId, 
            wordId, 
            userAnswer, 
            correctAnswer, 
            answerTime || 0
        );
        
        // Also record word progress
        const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        await recordWordProgress(req.userId, wordId, isCorrect);
        
        res.status(201).json({
            success: true,
            data: answer,
            isCorrect
        });
        
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Complete a quiz session
 */
async function finishQuiz(req, res) {
    try {
        const { sessionId } = req.params;
        const { timeSpent } = req.body;
        
        if (!timeSpent) {
            return res.status(400).json({
                success: false,
                error: 'Time spent is required'
            });
        }
        
        const session = await completeQuizSession(sessionId, timeSpent);
        
        res.status(200).json({
            success: true,
            data: session,
            message: 'Quiz completed successfully'
        });
        
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Record individual word practice (outside of quiz)
 */
async function practiceWord(req, res) {
    try {
        const userId = req.userId;
        const { wordId, isCorrect } = req.body;
        
        if (!wordId || typeof isCorrect !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'Word ID and isCorrect (boolean) are required'
            });
        }
        
        const progress = await recordWordProgress(userId, wordId, isCorrect);
        
        res.status(200).json({
            success: true,
            data: progress,
            message: 'Word practice recorded'
        });
        
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get user's progress for a specific word
 */
async function getWordProgress(req, res) {
    try {
        const userId = req.userId;
        const { wordId } = req.params;
        
        const progress = await UserWordProgress.findOne({
            where: { userId, wordId },
            include: [{
                model: Word,
                as: 'word'
            }]
        });
        
        if (!progress) {
            return res.status(404).json({
                success: false,
                error: 'No progress found for this word'
            });
        }
        
        res.status(200).json({
            success: true,
            data: progress
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get learning activity for dashboard charts
 */
async function getLearningActivity(req, res) {
    try {
        const userId = req.userId;
        const days = parseInt(req.query.days) || 30;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const activity = await LearningStreak.findAll({
            where: {
                userId,
                date: {
                    [Op.gte]: startDate
                }
            },
            order: [['date', 'ASC']],
            attributes: ['date', 'wordsLearned', 'quizzesTaken', 'timeSpent', 'isActive']
        });
        
        res.status(200).json({
            success: true,
            data: activity
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Update learned words from flashcard session
 */
async function updateFlashcardProgress(req, res) {
    try {
        const userId = req.userId;
        const { sessionStats, cards, learnedWords, shownWords } = req.body;
        
        console.log('=== FLASHCARD PROGRESS UPDATE ===');
        console.log('User ID:', userId);
        console.log('Learned Words:', learnedWords);
        console.log('Shown Words:', shownWords);
        console.log('Session Stats:', sessionStats);

        // Validate required data
        if (!Array.isArray(learnedWords)) {
            console.log('ERROR: learnedWords is not an array:', learnedWords);
            return res.status(400).json({
                success: false,
                error: 'learnedWords array is required'
            });
        }

        // Track all words shown in this session (to prevent them from appearing again)
        if (shownWords && Array.isArray(shownWords) && shownWords.length > 0) {
            console.log('Calling markWordsAsShown with:', shownWords.length, 'words');
            await markWordsAsShown(userId, shownWords);
            console.log('markWordsAsShown completed');
        }

        // Update learned words in the database
        if (learnedWords.length > 0) {
            console.log('Calling updateLearnedWords with:', learnedWords.length, 'words');
            await updateLearnedWords(userId, learnedWords);
            console.log('updateLearnedWords completed');
        }

        res.status(200).json({
            success: true,
            message: 'Flashcard progress updated successfully',
            wordsProcessed: learnedWords.length,
            shownWordsTracked: shownWords ? shownWords.length : 0
        });
    } catch (error) {
        console.error('Error updating flashcard progress:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    getStats,
    getReviewWords,
    startQuiz,
    submitAnswer,
    finishQuiz,
    practiceWord,
    getWordProgress,
    getLearningActivity,
    updateFlashcardProgress
};