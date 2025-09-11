const { User, Word, UserWordProgress, sequelize } = require('../db');
const { Op } = require('sequelize');

/**
 * Get user profile with learning statistics
 */
async function getUserProfile(req, res) {
    try {
        const userId = req.params.userId;
        const user = await User.findByPk(userId, {
            attributes: [
                'username', 
                'createdAt', 
                'totalWordsLearned',
                'currentStreak', 
                'longestStreak',
                'totalQuizzesTaken',
                'averageQuizScore'
            ]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get word learning statistics by type
 */
async function getWordStats(req, res) {
    try {
        const userId = req.params.userId;

        // Get total words by type
        const totalWords = await Word.findAll({
            attributes: [
                'type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['type']
        });

        // Get learned words by type
        const learnedWords = await UserWordProgress.findAll({
            attributes: [
                [sequelize.col('Word.type'), 'type'],
                [sequelize.fn('COUNT', sequelize.col('UserWordProgress.id')), 'count']
            ],
            include: [{
                model: Word,
                attributes: []
            }],
            where: {
                userId,
                masteryLevel: { [Op.gte]: 0.8 } // Consider words with 80% mastery as learned
            },
            group: ['Word.type']
        });

        // Format statistics
        const stats = {
            nouns: { total: 0, learned: 0 },
            verbs: { total: 0, learned: 0 },
            adjectives: { total: 0, learned: 0 },
            other: { total: 0, learned: 0 }
        };

        totalWords.forEach(row => {
            const type = row.type in stats ? row.type : 'other';
            stats[type].total = parseInt(row.dataValues.count);
        });

        learnedWords.forEach(row => {
            const type = row.type in stats ? row.type : 'other';
            stats[type].learned = parseInt(row.dataValues.count);
        });

        res.json(stats);
    } catch (error) {
        console.error('Error fetching word stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get user's recent learning activities
 */
async function getUserActivity(req, res) {
    try {
        const userId = req.params.userId;
        const limit = 10; // Number of recent activities to return

        // Get recent word progress updates
        const wordProgress = await UserWordProgress.findAll({
            attributes: [
                'updatedAt',
                'masteryLevel',
                [sequelize.literal('"word_progress"'), 'type']
            ],
            include: [{
                model: Word,
                attributes: ['swedish']
            }],
            where: { userId },
            order: [['updatedAt', 'DESC']],
            limit
        });

        // Format activities
        const activities = wordProgress.map(progress => ({
            timestamp: progress.updatedAt,
            description: `Practiced "${progress.Word.swedish}" - Mastery: ${Math.round(progress.masteryLevel * 100)}%`,
            type: 'word_progress'
        }));

        res.json(activities);
    } catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getUserProfile,
    getWordStats,
    getUserActivity
};
