const { 
    User, 
    UserWordProgress, 
    QuizSession, 
    QuizAnswer, 
    LearningStreak,
    Word,
    sequelize 
} = require('../db');
const { Op } = require('sequelize');

/**
 * Record word learning progress for a user
 * @param {number} userId 
 * @param {number} wordId 
 * @param {boolean} isCorrect 
 * @returns {Promise<Object>}
 */
async function recordWordProgress(userId, wordId, isCorrect) {
    const t = await sequelize.transaction();
    
    try {
        // Find or create user word progress record
        let [progress] = await UserWordProgress.findOrCreate({
            where: { userId, wordId },
            defaults: {
                userId,
                wordId,
                masteryLevel: 'learning',
                correctAttempts: 0,
                totalAttempts: 0,
                lastReviewDate: new Date(),
                nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
            },
            transaction: t
        });

        // Update progress
        progress.totalAttempts += 1;
        if (isCorrect) {
            progress.correctAttempts += 1;
        }
        
        progress.lastReviewDate = new Date();
        
        // Calculate mastery level based on success rate and attempts
        const successRate = progress.correctAttempts / progress.totalAttempts;
        
        if (progress.totalAttempts >= 10 && successRate >= 0.9) {
            progress.masteryLevel = 'mastered';
            progress.repetitionInterval = Math.min(progress.repetitionInterval * 2, 30); // Max 30 days
        } else if (progress.totalAttempts >= 5 && successRate >= 0.7) {
            progress.masteryLevel = 'practicing';
            progress.repetitionInterval = Math.min(progress.repetitionInterval * 1.5, 14); // Max 14 days
        } else {
            progress.masteryLevel = 'learning';
            progress.repetitionInterval = isCorrect ? 
                Math.min(progress.repetitionInterval + 1, 7) : // Max 7 days for learning
                Math.max(1, progress.repetitionInterval - 1);   // Min 1 day
        }
        
        // Set next review date based on spaced repetition
        progress.nextReviewDate = new Date(
            Date.now() + progress.repetitionInterval * 24 * 60 * 60 * 1000
        );
        
        await progress.save({ transaction: t });
        
        // Note: totalWordsLearned is updated at session level, not per individual word
        // to avoid double counting when multiple words are learned in a session
        
        await t.commit();
        return progress;
        
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

/**
 * Create a new quiz session
 * @param {number} userId 
 * @param {string} quizType 
 * @param {number} totalQuestions 
 * @returns {Promise<Object>}
 */
async function createQuizSession(userId, quizType, totalQuestions) {
    return await QuizSession.create({
        userId,
        quizType,
        totalQuestions,
        correctAnswers: 0,
        score: 0,
        timeSpent: 0
    });
}

/**
 * Record a quiz answer
 * @param {number} sessionId 
 * @param {number} wordId 
 * @param {string} userAnswer 
 * @param {string} correctAnswer 
 * @param {number} answerTime 
 * @returns {Promise<Object>}
 */
async function recordQuizAnswer(sessionId, wordId, userAnswer, correctAnswer, answerTime) {
    const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    
    const answer = await QuizAnswer.create({
        sessionId,
        wordId,
        userAnswer,
        correctAnswer,
        isCorrect,
        answerTime
    });
    
    // Update quiz session stats
    const session = await QuizSession.findByPk(sessionId);
    if (isCorrect) {
        session.correctAnswers += 1;
    }
    session.score = (session.correctAnswers / session.totalQuestions) * 100;
    await session.save();
    
    return answer;
}

/**
 * Complete a quiz session
 * @param {number} sessionId 
 * @param {number} timeSpent 
 * @returns {Promise<Object>}
 */
async function completeQuizSession(sessionId, timeSpent) {
    const t = await sequelize.transaction();
    
    try {
        const session = await QuizSession.findByPk(sessionId, {
            include: [{ model: QuizAnswer, as: 'answers', include: [{ model: Word, as: 'word' }] }],
            transaction: t
        });
        
        if (!session) {
            throw new Error('Quiz session not found');
        }
        
        session.timeSpent = timeSpent;
        session.completedAt = new Date();
        await session.save({ transaction: t });
        
        // Record word progress for each answer
        for (const answer of session.answers) {
            await recordWordProgress(session.userId, answer.wordId, answer.isCorrect);
        }
        
        // Update user stats
        const user = await User.findByPk(session.userId, { transaction: t });
        user.totalQuizzesTaken += 1;
        
        // Recalculate average quiz score
        const userSessions = await QuizSession.findAll({
            where: { userId: session.userId },
            transaction: t
        });
        
        const totalScore = userSessions.reduce((sum, s) => sum + s.score, 0);
        user.averageQuizScore = totalScore / userSessions.length;
        
        await user.save({ transaction: t });
        
        // Update daily learning streak
        await updateLearningStreak(session.userId, {
            quizzesTaken: 1,
            timeSpent: Math.round(timeSpent / 60) // Convert to minutes
        }, t);
        
        await t.commit();
        return session;
        
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

/**
 * Update daily learning streak
 * @param {number} userId 
 * @param {Object} activity - { wordsLearned, quizzesTaken, timeSpent }
 * @param {Transaction} transaction 
 */
async function updateLearningStreak(userId, activity, transaction) {
    const today = new Date().toISOString().split('T')[0];
    
    const [streak] = await LearningStreak.findOrCreate({
        where: { userId, date: today },
        defaults: {
            userId,
            date: today,
            wordsLearned: activity.wordsLearned || 0,
            quizzesTaken: activity.quizzesTaken || 0,
            timeSpent: activity.timeSpent || 0,
            isActive: true
        },
        transaction
    });
    
    // Update existing streak
    if (activity.wordsLearned) streak.wordsLearned += activity.wordsLearned;
    if (activity.quizzesTaken) streak.quizzesTaken += activity.quizzesTaken;
    if (activity.timeSpent) streak.timeSpent += activity.timeSpent;
    
    await streak.save({ transaction });
    
    // Update user's current streak
    await updateUserStreak(userId, transaction);
}

/**
 * Calculate and update user's current learning streak
 * @param {number} userId 
 * @param {Transaction} transaction 
 */
async function updateUserStreak(userId, transaction) {
    const streaks = await LearningStreak.findAll({
        where: { 
            userId,
            isActive: true 
        },
        order: [['date', 'DESC']],
        transaction
    });
    
    let currentStreak = 0;
    let tempStreak = 0;
    
    // Calculate current streak (consecutive days from today)
    const today = new Date();
    for (const streak of streaks) {
        const streakDate = new Date(streak.date);
        const daysDiff = Math.floor((today - streakDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === currentStreak) {
            currentStreak++;
            tempStreak++;
        } else {
            tempStreak = daysDiff === 0 ? 1 : 0;
        }
    }
    
    // Update user record
    await User.update({
        currentStreak
    }, {
        where: { id: userId },
        transaction
    });
}

/**
 * Get user's learning statistics
 * @param {number} userId 
 * @returns {Promise<Object>}
 */
async function getUserStats(userId) {
    const [user, masteryStats, totalWordsCount] = await Promise.all([
        User.findByPk(userId, {
            attributes: [
                'totalWordsLearned',
                'currentStreak', 
                'totalQuizzesTaken', 
                'averageQuizScore'
            ],
            raw: true
        }),
        UserWordProgress.findAll({
            where: { 
                userId,
                masteryLevel: { [Op.in]: ['practicing', 'mastered'] }
            },
            attributes: [
                'masteryLevel',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['masteryLevel'],
            raw: true
        }),
        UserWordProgress.count({
            where: { 
                userId,
                masteryLevel: { [Op.in]: ['shown', 'practicing', 'mastered'] }
            }
        })
    ]);
    
    console.log('=== GET USER STATS DEBUG ===');
    console.log('User ID:', userId);
    console.log('Total words count from query:', totalWordsCount);
    console.log('User stored totalWordsLearned:', user?.totalWordsLearned);
    
    // Calculate the true total words learned (use the maximum of stored value and progress count)
    const actualTotalWordsLearned = Math.max(
        user?.totalWordsLearned || 0,
        totalWordsCount || 0
    );
    console.log('Calculated actual total:', actualTotalWordsLearned);
    
    // Debug: Get actual records to see what exists
    const debugRecords = await UserWordProgress.findAll({
        where: { 
            userId,
            masteryLevel: { [Op.in]: ['shown', 'practicing', 'mastered'] }
        },
        include: [{
            model: Word,
            as: 'word',
            attributes: ['swedish', 'english']
        }],
        attributes: ['masteryLevel', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 20
    });
    console.log('Recent progress records:', debugRecords.map(r => ({
        word: r.word?.swedish,
        masteryLevel: r.masteryLevel,
        created: r.createdAt
    })));
    
    if (!user) {
        throw new Error('User not found');
    }    // Get recent quiz performance (last 7 days)
    const recentQuizzes = await QuizSession.findAll({
        where: {
            userId,
            completedAt: {
                [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
        },
        order: [['completedAt', 'DESC']],
        limit: 10,
        raw: true
    });
    
    // Get learning activity (last 30 days)
    const learningActivity = await LearningStreak.findAll({
        where: {
            userId,
            date: {
                [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
        },
        order: [['date', 'DESC']],
        raw: true
    });
    
    // Format user stats with defaults
    return {
        ...user,
        totalWordsLearned: actualTotalWordsLearned,
        currentStreak: user.currentStreak || 0,
        totalQuizzesTaken: user.totalQuizzesTaken || 0,
        averageQuizScore: user.averageQuizScore || 0,
        masteryStats: masteryStats.reduce((acc, { masteryLevel, count }) => {
            acc[masteryLevel.toLowerCase()] = parseInt(count);
            return acc;
        }, {}),
        recentQuizzes,
        learningActivity
    };
}

/**
 * Get words due for review (spaced repetition)
 * @param {number} userId 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
async function getWordsForReview(userId, limit = 20) {
    const now = new Date();
    
    return await UserWordProgress.findAll({
        where: {
            userId,
            nextReviewDate: {
                [Op.lte]: now
            }
        },
        include: [{
            model: Word,
            as: 'word'
        }],
        order: [['nextReviewDate', 'ASC']],
        limit
    });
}

/**
 * Update learned words from flashcard session
 * @param {number} userId 
 * @param {string[]} learnedWords - Array of learned Swedish words
 * @returns {Promise<void>}
 */
async function updateLearnedWords(userId, learnedWords) {
    // Handle empty arrays
    if (!learnedWords || learnedWords.length === 0) {
        return;
    }

    const t = await sequelize.transaction();
    
    try {
        // Get Word IDs for the learned words
        const words = await Word.findAll({
            where: {
                swedish: {
                    [Op.in]: learnedWords
                }
            },
            transaction: t
        });

        // Process each word and track which ones are newly learned
        let newlyLearnedCount = 0;
        
        console.log(`Processing ${words.length} words for user ${userId}:`);
        
        for (const word of words) {
            // Check if this word already has progress for this user
            const existingProgress = await UserWordProgress.findOne({
                where: {
                    userId: userId,
                    wordId: word.id
                },
                transaction: t
            });
            
            // If no existing progress, this is a newly learned word
            if (!existingProgress) {
                newlyLearnedCount++;
                console.log(`  - "${word.swedish}" is NEW (will count toward total)`);
            } else {
                console.log(`  - "${word.swedish}" already exists (won't count toward total)`);
            }
            
            await recordWordProgress(userId, word.id, true);
        }

        console.log(`Total words in session: ${words.length}, Newly learned: ${newlyLearnedCount}`);

        // Only increment totalWordsLearned for newly learned words
        if (newlyLearnedCount > 0) {
            await User.increment('totalWordsLearned', {
                by: newlyLearnedCount,
                where: { id: userId },
                transaction: t
            });
            console.log(`Incremented totalWordsLearned by ${newlyLearnedCount}`);
        } else {
            console.log('No new words to count - totalWordsLearned not incremented');
        }

        // Update learning streak with newly learned words count
        await updateLearningStreak(userId, {
            wordsLearned: newlyLearnedCount,
            timeSpent: 0 // We don't track time per word in flashcards
        }, t);

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

/**
 * Mark words as shown to user (to prevent them from appearing again in future sessions)
 */
async function markWordsAsShown(userId, shownWords) {
    // Handle empty arrays
    if (!shownWords || shownWords.length === 0) {
        return;
    }

    const t = await sequelize.transaction();
    
    try {
        // Get Word IDs for the shown words
        const words = await Word.findAll({
            where: {
                swedish: {
                    [Op.in]: shownWords
                }
            },
            transaction: t
        });

        // Create or update UserWordProgress records for shown words
        for (const word of words) {
            // Check if progress record already exists
            const existingProgress = await UserWordProgress.findOne({
                where: {
                    userId: userId,
                    wordId: word.id
                },
                transaction: t
            });

            if (!existingProgress) {
                // Create new progress record marking word as "shown"
                await UserWordProgress.create({
                    userId: userId,
                    wordId: word.id,
                    masteryLevel: 'shown', // New status to indicate word was shown but not necessarily practiced
                    correctAttempts: 0,
                    totalAttempts: 0,
                    lastReviewDate: new Date(),
                    nextReviewDate: null, // No need to review "shown" words unless they become active
                    easeFactor: 2.5,
                    intervalDays: 0,
                    reviewCount: 0
                }, { transaction: t });
            }
            // If record exists, we don't need to do anything - word is already tracked
        }

        await t.commit();
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

module.exports = {
    recordWordProgress,
    createQuizSession,
    recordQuizAnswer,
    completeQuizSession,
    updateLearningStreak,
    getUserStats,
    getWordsForReview,
    updateLearnedWords,
    markWordsAsShown
};