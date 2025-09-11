const { Sequelize } = require('sequelize');
const { Word } = require('../models/Word');
const path = require('path');

async function removeRecentWords() {
    try {
        // Calculate the timestamp for 5 minutes ago to ensure we only delete recent imports
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

        // Delete words that were created in the last 5 minutes
        const result = await Word.destroy({
            where: {
                createdAt: {
                    [Sequelize.Op.gte]: fiveMinutesAgo
                }
            }
        });

        console.log(`Successfully removed ${result} recently imported words`);
    } catch (error) {
        console.error('Error removing words:', error);
    } finally {
        process.exit();
    }
}

removeRecentWords();
