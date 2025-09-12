/**
 * Script to fix double-counted totalWordsLearned due to bug where
 * words were counted both individually and at session level
 */

const { sequelize, User, UserWordProgress } = require('../db');

async function fixDoubleCountedWords() {
    try {
        console.log('Starting fix for double-counted words...');
        
        // Get all users who might be affected
        const users = await User.findAll({
            where: {
                totalWordsLearned: { [require('sequelize').Op.gt]: 0 }
            }
        });
        
        console.log(`Found ${users.length} users with learned words to check`);
        
        for (const user of users) {
            console.log(`\nProcessing user ${user.id} (${user.email}):`);
            console.log(`  Current totalWordsLearned: ${user.totalWordsLearned}`);
            
            // Count actual distinct words this user has progress for
            const actualLearnedWords = await UserWordProgress.count({
                where: {
                    userId: user.id
                },
                distinct: true,
                col: 'wordId'
            });
            
            console.log(`  Actual distinct words with progress: ${actualLearnedWords}`);
            
            // If there's a discrepancy, update the count
            if (user.totalWordsLearned !== actualLearnedWords) {
                await User.update(
                    { totalWordsLearned: actualLearnedWords },
                    { where: { id: user.id } }
                );
                console.log(`  ✅ Updated totalWordsLearned from ${user.totalWordsLearned} to ${actualLearnedWords}`);
            } else {
                console.log(`  ✅ Count is correct, no update needed`);
            }
        }
        
        console.log('\n✅ Double counting fix completed!');
        
    } catch (error) {
        console.error('❌ Error fixing double counting:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the fix if this script is executed directly
if (require.main === module) {
    fixDoubleCountedWords();
}

module.exports = { fixDoubleCountedWords };