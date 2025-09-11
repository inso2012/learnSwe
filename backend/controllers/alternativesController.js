const { Word } = require('../db');
const { Op } = require('sequelize');

/**
 * Get alternative wrong answers for a word
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAlternatives(req, res) {
    try {
        const { wordId, count = 3, skipTypeMatch = false } = req.query;
        
        // Get the correct word first
        const correctWord = await Word.findByPk(wordId);
        if (!correctWord) {
            return res.status(404).json({
                success: false,
                error: 'Word not found'
            });
        }

        // Build where clause based on parameters
        const whereClause = {
            id: { [Op.ne]: wordId }, // not the same word
            english: { [Op.ne]: correctWord.english }, // not the same translation
        };

        // Add type matching if not skipped
        if (!skipTypeMatch) {
            whereClause.type = correctWord.type;
        }

        // Add difficulty level constraint
        whereClause.difficultyLevel = {
            [Op.between]: [
                Math.max(1, correctWord.difficultyLevel - 1),
                Math.min(5, correctWord.difficultyLevel + 1)
            ]
        };

        // Find words with similar characteristics
        let alternatives = await Word.findAll({
            where: whereClause,
            order: [
                [Word.sequelize.random(), 'DESC'] // Random order
            ],
            limit: parseInt(count),
            attributes: ['english', 'type', 'difficultyLevel'] // Get additional attributes for better filtering
        });

        // If we don't have enough alternatives with the current criteria
        if (alternatives.length < count) {
            // Try finding more words by relaxing the type constraint
            const remainingCount = count - alternatives.length;
            const existingIds = alternatives.map(a => a.id);
            
            const randomAlternatives = await Word.findAll({
                where: {
                    id: { 
                        [Op.ne]: wordId,
                        [Op.notIn]: existingIds
                    },
                    english: { [Op.ne]: correctWord.english }
                },
                order: [
                    [Word.sequelize.random(), 'DESC']
                ],
                limit: remainingCount,
                attributes: ['english', 'type', 'difficultyLevel']
            });
            
            alternatives = [...alternatives, ...randomAlternatives];
        }

        // Sort alternatives to prioritize same type and similar difficulty
        alternatives.sort((a, b) => {
            // Give higher priority to words of the same type
            if (a.type === correctWord.type && b.type !== correctWord.type) return -1;
            if (b.type === correctWord.type && a.type !== correctWord.type) return 1;
            
            // Then sort by difficulty difference
            const diffA = Math.abs(a.difficultyLevel - correctWord.difficultyLevel);
            const diffB = Math.abs(b.difficultyLevel - correctWord.difficultyLevel);
            return diffA - diffB;
        });

        res.status(200).json({
            success: true,
            data: alternatives.slice(0, count).map(alt => alt.english)
        });

    } catch (error) {
        console.error('Error getting alternatives:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get alternative answers'
        });
    }
}

module.exports = {
    getAlternatives
};
