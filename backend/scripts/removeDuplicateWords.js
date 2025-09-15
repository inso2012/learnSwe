const { Sequelize, DataTypes } = require('sequelize');

// PostgreSQL configuration
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: 'localhost', // Update with your PostgreSQL host
    port: 5432,        // Update with your PostgreSQL port
    database: 'your_database_name', // Update with your database name
    username: 'your_username',      // Update with your username
    password: 'your_password',      // Update with your password
    logging: false // Disable logging for cleaner output
});

// Define Word model for PostgreSQL
const Word = sequelize.define('Word', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    english: {
        type: DataTypes.STRING,
        allowNull: false
    },
    swedish: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    difficultyLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: true
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'words',
    timestamps: false
});

// Define UserWordProgress model
const UserWordProgress = sequelize.define('UserWordProgress', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    wordId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    masteryLevel: {
        type: DataTypes.STRING,
        defaultValue: 'shown'
    },
    correctAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    totalAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'user_word_progress',
    timestamps: false
});

async function removeDuplicateWords() {
    console.log('🔍 Starting duplicate word removal process...\n');
    
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.\n');
        
        // Start transaction for safety
        const transaction = await sequelize.transaction();
        
        try {
            // Step 1: Find all duplicate Swedish words
            console.log('📊 Analyzing duplicate words...');
            const duplicateQuery = `
                SELECT swedish, COUNT(*) as count, ARRAY_AGG(id ORDER BY id) as ids
                FROM words 
                GROUP BY swedish 
                HAVING COUNT(*) > 1
                ORDER BY count DESC, swedish
            `;
            
            const [duplicates] = await sequelize.query(duplicateQuery, { transaction });
            
            if (duplicates.length === 0) {
                console.log('✅ No duplicate words found! Database is clean.\n');
                await transaction.rollback();
                return;
            }
            
            console.log(`\n🔍 Found ${duplicates.length} Swedish words with duplicates:`);
            console.log('='.repeat(60));
            
            let totalDuplicates = 0;
            let wordsToDelete = [];
            
            duplicates.forEach(duplicate => {
                const ids = duplicate.ids; // PostgreSQL returns array directly
                const duplicateCount = duplicate.count - 1; // Keep first occurrence
                totalDuplicates += duplicateCount;
                
                console.log(`📝 "${duplicate.swedish}": ${duplicate.count} occurrences (IDs: ${ids.join(',')})`);
                
                // Keep the first ID, mark others for deletion
                const idsToDelete = ids.slice(1);
                wordsToDelete.push(...idsToDelete);
            });
            
            console.log('\n' + '='.repeat(60));
            console.log(`📊 Summary: ${totalDuplicates} duplicate records will be removed`);
            console.log(`🗑️  Word IDs to delete: ${wordsToDelete.join(', ')}`);
            
            // Step 2: Simple approach - delete progress records for duplicates
            console.log('\n🗑️  Removing progress records for duplicate words...');
            const deletedProgress = await UserWordProgress.destroy({
                where: {
                    wordId: wordsToDelete
                },
                transaction
            });
            console.log(`✅ Removed ${deletedProgress} progress records.`);
            
            // Step 3: Delete duplicate words
            console.log('\n🗑️  Deleting duplicate word records...');
            const deleteResult = await Word.destroy({
                where: {
                    id: wordsToDelete
                },
                transaction
            });
            
            console.log(`✅ Successfully deleted ${deleteResult} duplicate word records.`);
            
            // Step 4: Verify results
            console.log('\n🔍 Verifying cleanup results...');
            const remainingDuplicates = await sequelize.query(duplicateQuery, { transaction });
            
            if (remainingDuplicates[0].length === 0) {
                console.log('✅ Verification successful: No duplicate words remain!');
            } else {
                console.log('⚠️  Warning: Some duplicates still exist:', remainingDuplicates[0]);
            }
            
            // Step 5: Show final statistics
            const totalWords = await Word.count({ transaction });
            console.log(`\n📊 Final statistics:`);
            console.log(`   • Total words in database: ${totalWords}`);
            console.log(`   • Duplicates removed: ${deleteResult}`);
            console.log(`   • Progress records removed: ${deletedProgress}`);
            
            // Commit transaction
            await transaction.commit();
            console.log('\n✅ All changes have been committed successfully!');
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('\n❌ Error during duplicate removal:', error);
        console.error('All changes have been rolled back.');
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('\n🔒 Database connection closed.');
    }
}

// Add confirmation prompt
async function confirmDeletion() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question('\n⚠️  This will permanently remove duplicate words from the database.\n   Continue? (yes/no): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

// Main execution
async function main() {
    console.log('🧹 Swedish Learning Database - Duplicate Word Cleaner (PostgreSQL)');
    console.log('='.repeat(60));
    
    const confirmed = await confirmDeletion();
    
    if (!confirmed) {
        console.log('\n❌ Operation cancelled by user.');
        process.exit(0);
    }
    
    await removeDuplicateWords();
    console.log('\n🎉 Duplicate word removal completed successfully!');
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

module.exports = { removeDuplicateWords };