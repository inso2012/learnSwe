const { Word, UserWordProgress, sequelize } = require('../db');
const { recordWordProgress, getUserStats } = require('../models/Progress');
const { Op } = require('sequelize');

/**
 * Get flashcards for learning session
 * Prioritizes words due for review, then new words
 */
async function getFlashcards(req, res) {
    try {
        const userId = req.userId;
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50); // Min 1, Max 50
        const difficulty = req.query.difficulty; // 1-5 or 'all'
        
        // Build word filter
        const wordFilter = {};
        if (difficulty && difficulty !== 'all') {
            wordFilter.difficultyLevel = parseInt(difficulty);
        }
        
        // Get words user is currently learning (due for review)
        const reviewWords = await UserWordProgress.findAll({
            where: {
                userId,
                nextReviewDate: {
                    [Op.lte]: new Date()
                },
                masteryLevel: {
                    [Op.in]: ['learning', 'practicing']
                }
            },
            include: [{
                model: Word,
                as: 'word',
                where: wordFilter
            }],
            order: [['nextReviewDate', 'ASC']],
            limit: Math.ceil(limit * 0.7) // 70% review words
        }).catch(error => {
        console.error('Error fetching review words:', error);
        return [];
        });

        const reviewWordsCount = reviewWords.length;
        const remainingSlots = limit - reviewWordsCount;
        
        // Get new words user hasn't seen yet
        const learnedWordIds = await UserWordProgress.findAll({
            where: { userId },
            attributes: ['wordId'],
            raw: true
        }).then(results => results.map(r => r.wordId));
        
        const newWords = await Word.findAll({
            where: {
                ...wordFilter,
                id: {
                    [Op.notIn]: learnedWordIds.length > 0 ? learnedWordIds : [0]
                }
            },
            order: [['difficultyLevel', 'ASC'], ['createdAt', 'ASC']],
            limit: remainingSlots > 0 ? remainingSlots : 3 // At least 3 new words
        });
        
        // Combine and shuffle
        const allWords = [
            ...reviewWords.map(rw => ({
                ...rw.word.toJSON(),
                progress: {
                    masteryLevel: rw.masteryLevel,
                    correctAttempts: rw.correctAttempts,
                    totalAttempts: rw.totalAttempts,
                    successRate: rw.totalAttempts > 0 ? (rw.correctAttempts / rw.totalAttempts * 100).toFixed(1) : 0
                }
            })),
            ...newWords.map(word => ({
                ...word.toJSON(),
                progress: {
                    masteryLevel: 'new',
                    correctAttempts: 0,
                    totalAttempts: 0,
                    successRate: 0
                }
            }))
        ];
        
        // Shuffle array for variety
        const shuffled = allWords.sort(() => Math.random() - 0.5);
        
        res.status(200).json({
            success: true,
            data: shuffled.slice(0, limit),
            meta: {
                reviewWords: reviewWordsCount,
                newWords: newWords.length,
                totalAvailable: allWords.length
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Generate a vocabulary quiz
 */
async function generateVocabularyQuiz(req, res) {
    try {
        const userId = req.userId;
        const questionCount = parseInt(req.query.questions) || 10;
        const quizType = req.query.type || 'mixed'; // 'swedish-to-english', 'english-to-swedish', 'mixed'
        const difficulty = req.query.difficulty;
        
        // Get words for quiz (mix of review and random)
        const wordFilter = {};
        if (difficulty && difficulty !== 'all') {
            wordFilter.difficultyLevel = parseInt(difficulty);
        }
        
        // Get some words user has learned for review
        const reviewWords = await UserWordProgress.findAll({
            where: { userId },
            include: [{
                model: Word,
                as: 'word',
                where: wordFilter
            }],
            limit: Math.ceil(questionCount * 0.6),
            order: sequelize.random()
        });
        
        // Get additional random words
        const reviewWordIds = reviewWords.map(rw => rw.wordId);
        const additionalWords = await Word.findAll({
            where: {
                ...wordFilter,
                id: {
                    [Op.notIn]: reviewWordIds.length > 0 ? reviewWordIds : [0]
                }
            },
            limit: questionCount - reviewWords.length,
            order: sequelize.random()
        });
        
        // Combine words
        const allQuizWords = [
            ...reviewWords.map(rw => rw.word),
            ...additionalWords
        ];
        
        // Generate quiz questions
        const questions = await Promise.all(
            allQuizWords.map(async (word, index) => {
                const questionType = quizType === 'mixed' 
                    ? (Math.random() > 0.5 ? 'swedish-to-english' : 'english-to-swedish')
                    : quizType;
                
                const isSwedishToEnglish = questionType === 'swedish-to-english';
                
                // Get wrong answers for multiple choice
                const wrongAnswers = await Word.findAll({
                    where: {
                        id: { [Op.ne]: word.id },
                        type: word.type // Same part of speech
                    },
                    order: sequelize.random(),
                    limit: 3
                });
                
                const options = [
                    isSwedishToEnglish ? word.english : word.swedish,
                    ...wrongAnswers.map(w => isSwedishToEnglish ? w.english : w.swedish)
                ].sort(() => Math.random() - 0.5);
                
                return {
                    id: index + 1,
                    wordId: word.id,
                    question: isSwedishToEnglish ? word.swedish : word.english,
                    correctAnswer: isSwedishToEnglish ? word.english : word.swedish,
                    options: options,
                    type: questionType,
                    wordType: word.type,
                    difficulty: word.difficultyLevel
                };
            })
        );
        
        res.status(200).json({
            success: true,
            data: {
                questions: questions.slice(0, questionCount),
                quizMeta: {
                    type: quizType,
                    questionCount: Math.min(questionCount, questions.length),
                    difficulty: difficulty || 'all',
                    reviewWords: reviewWords.length,
                    newWords: additionalWords.length
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get translation exercise
 */
async function getTranslationExercise(req, res) {
    try {
        const userId = req.userId;
        const count = parseInt(req.query.count) || 5;
        const direction = req.query.direction || 'both'; // 'to-swedish', 'to-english', 'both'
        
        // Get words for translation practice
        const userProgress = await UserWordProgress.findAll({
            where: { 
                userId,
                masteryLevel: {
                    [Op.in]: ['learning', 'practicing']
                }
            },
            include: [{
                model: Word,
                as: 'word'
            }],
            order: [['lastReviewDate', 'ASC']],
            limit: count * 2 // Get more to have options
        });
        
        // If user has no progress, get random words
        let wordsToUse;
        if (userProgress.length === 0) {
            wordsToUse = await Word.findAll({
                order: sequelize.random(),
                limit: count
            });
        } else {
            wordsToUse = userProgress.map(up => up.word);
        }
        
        const exercises = wordsToUse.slice(0, count).map((word, index) => {
            let exerciseDirection;
            if (direction === 'both') {
                exerciseDirection = Math.random() > 0.5 ? 'to-swedish' : 'to-english';
            } else {
                exerciseDirection = direction;
            }
            
            const isToSwedish = exerciseDirection === 'to-swedish';
            
            return {
                id: index + 1,
                wordId: word.id,
                prompt: isToSwedish ? word.english : word.swedish,
                correctAnswer: isToSwedish ? word.swedish : word.english,
                direction: exerciseDirection,
                type: word.type,
                hint: `This is a ${word.type}`,
                difficulty: word.difficultyLevel
            };
        });
        
        res.status(200).json({
            success: true,
            data: exercises
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Get word suggestions for learning
 */
async function getWordSuggestions(req, res) {
    try {
        const userId = req.userId;
        const userStats = await getUserStats(userId);
        
        // Suggest words based on user's progress
        const suggestions = {
            reviewDue: [],
            newToLearn: [],
            practiceMore: []
        };
        
        // Words due for review
        const dueWords = await UserWordProgress.findAll({
            where: {
                userId,
                nextReviewDate: {
                    [Op.lte]: new Date()
                }
            },
            include: [{
                model: Word,
                as: 'word'
            }],
            order: [['nextReviewDate', 'ASC']],
            limit: 5
        });
        
        suggestions.reviewDue = dueWords.map(uw => ({
            ...uw.word.toJSON(),
            masteryLevel: uw.masteryLevel,
            daysSinceReview: Math.floor((new Date() - new Date(uw.lastReviewDate)) / (1000 * 60 * 60 * 24))
        }));
        
        // New words to learn (based on difficulty progression)
        const learnedWordIds = await UserWordProgress.findAll({
            where: { userId },
            attributes: ['wordId'],
            raw: true
        }).then(results => results.map(r => r.wordId));
        
        const newWords = await Word.findAll({
            where: {
                id: {
                    [Op.notIn]: learnedWordIds.length > 0 ? learnedWordIds : [0]
                },
                difficultyLevel: {
                    [Op.lte]: Math.max(1, userStats.user?.totalWordsLearned > 20 ? 3 : 2)
                }
            },
            order: [['difficultyLevel', 'ASC']],
            limit: 5
        });
        
        suggestions.newToLearn = newWords.map(word => word.toJSON());
        
        // Words that need more practice (low success rate)
        const practiceWords = await UserWordProgress.findAll({
            where: {
                userId,
                masteryLevel: 'learning',
                totalAttempts: {
                    [Op.gte]: 3
                }
            },
            include: [{
                model: Word,
                as: 'word'
            }],
            order: sequelize.literal('CAST("correctAttempts" AS FLOAT) / "totalAttempts" ASC'),
            limit: 5
        });
        
        suggestions.practiceMore = practiceWords.map(uw => ({
            ...uw.word.toJSON(),
            masteryLevel: uw.masteryLevel,
            successRate: ((uw.correctAttempts / uw.totalAttempts) * 100).toFixed(1)
        }));
        
        res.status(200).json({
            success: true,
            data: suggestions
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Submit learning session results
 */
async function submitLearningSession(req, res) {
    try {
        const userId = req.userId;
        const { sessionType, results, timeSpent } = req.body;
        
        if (!results || !Array.isArray(results)) {
            return res.status(400).json({
                success: false,
                error: 'Results array is required'
            });
        }
        
        // Process each result
        const processedResults = [];
        for (const result of results) {
            const { wordId, isCorrect, userAnswer, correctAnswer } = result;
            
            if (!wordId || typeof isCorrect !== 'boolean') {
                continue;
            }
            
            // Record progress for this word
            const progress = await recordWordProgress(userId, wordId, isCorrect);
            
            processedResults.push({
                wordId,
                isCorrect,
                userAnswer,
                correctAnswer,
                newMasteryLevel: progress.masteryLevel,
                successRate: ((progress.correctAttempts / progress.totalAttempts) * 100).toFixed(1)
            });
        }
        
        // Calculate session stats
        const correctCount = processedResults.filter(r => r.isCorrect).length;
        const sessionScore = (correctCount / processedResults.length * 100).toFixed(1);
        
        res.status(200).json({
            success: true,
            data: {
                sessionType,
                totalQuestions: processedResults.length,
                correctAnswers: correctCount,
                score: parseFloat(sessionScore),
                timeSpent,
                results: processedResults
            },
            message: `Learning session completed! Score: ${sessionScore}%`
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    getFlashcards,
    generateVocabularyQuiz,
    getTranslationExercise,
    getWordSuggestions,
    submitLearningSession
};