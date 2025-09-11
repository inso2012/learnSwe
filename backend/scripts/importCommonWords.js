require('dotenv').config();
const { createWord } = require('../models/Word');
const { sequelize } = require('../db');

// Common Swedish words with their translations and types
const commonWords = [
    // Basic pronouns and articles
    { swedish: 'och', english: 'and', type: 'conjunction', difficultyLevel: 1 },
    { swedish: 'är', english: 'is/are', type: 'verb', difficultyLevel: 1 },
    { swedish: 'det', english: 'it/that', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'jag', english: 'I', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'du', english: 'you', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'att', english: 'to/that', type: 'conjunction', difficultyLevel: 1 },
    { swedish: 'en', english: 'a/an/one', type: 'article', difficultyLevel: 1 },
    { swedish: 'ett', english: 'a/an/one', type: 'article', difficultyLevel: 1 },
    { swedish: 'på', english: 'on/at', type: 'preposition', difficultyLevel: 1 },
    { swedish: 'som', english: 'as/that/who', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'har', english: 'have/has', type: 'verb', difficultyLevel: 1 },
    { swedish: 'med', english: 'with', type: 'preposition', difficultyLevel: 1 },
    { swedish: 'för', english: 'for', type: 'preposition', difficultyLevel: 1 },
    { swedish: 'inte', english: 'not', type: 'adverb', difficultyLevel: 1 },
    { swedish: 'till', english: 'to/until', type: 'preposition', difficultyLevel: 1 },
    { swedish: 'kan', english: 'can', type: 'verb', difficultyLevel: 1 },
    { swedish: 'av', english: 'of/by', type: 'preposition', difficultyLevel: 1 },
    { swedish: 'vad', english: 'what', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'vara', english: 'to be', type: 'verb', difficultyLevel: 1 },
    { swedish: 'den', english: 'it/that', type: 'pronoun', difficultyLevel: 1 },
    // Common verbs
    { swedish: 'gå', english: 'to go/walk', type: 'verb', difficultyLevel: 1 },
    { swedish: 'komma', english: 'to come', type: 'verb', difficultyLevel: 1 },
    { swedish: 'se', english: 'to see', type: 'verb', difficultyLevel: 1 },
    { swedish: 'få', english: 'to get/receive', type: 'verb', difficultyLevel: 1 },
    { swedish: 'göra', english: 'to do/make', type: 'verb', difficultyLevel: 1 },
    // Common nouns
    { swedish: 'hus', english: 'house', type: 'noun', difficultyLevel: 1 },
    { swedish: 'bil', english: 'car', type: 'noun', difficultyLevel: 1 },
    { swedish: 'dag', english: 'day', type: 'noun', difficultyLevel: 1 },
    { swedish: 'mat', english: 'food', type: 'noun', difficultyLevel: 1 },
    { swedish: 'tid', english: 'time', type: 'noun', difficultyLevel: 1 },
    // Common adjectives
    { swedish: 'bra', english: 'good', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'stor', english: 'big/large', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'liten', english: 'small', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'ny', english: 'new', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'gammal', english: 'old', type: 'adjective', difficultyLevel: 1 },
    // Level 2 words
    { swedish: 'behöva', english: 'to need', type: 'verb', difficultyLevel: 2 },
    { swedish: 'mellan', english: 'between', type: 'preposition', difficultyLevel: 2 },
    { swedish: 'fortfarande', english: 'still', type: 'adverb', difficultyLevel: 2 },
    { swedish: 'fönster', english: 'window', type: 'noun', difficultyLevel: 2 },
    { swedish: 'möjlig', english: 'possible', type: 'adjective', difficultyLevel: 2 },
    // Level 3 words
    { swedish: 'förutsättning', english: 'prerequisite/condition', type: 'noun', difficultyLevel: 3 },
    { swedish: 'utveckling', english: 'development', type: 'noun', difficultyLevel: 3 },
    { swedish: 'omfattande', english: 'extensive/comprehensive', type: 'adjective', difficultyLevel: 3 },
    { swedish: 'tillräcklig', english: 'sufficient', type: 'adjective', difficultyLevel: 3 },
    { swedish: 'samtidigt', english: 'simultaneously', type: 'adverb', difficultyLevel: 3 },
    
    // Common food and drink items (Level 1)
    { swedish: 'kaffe', english: 'coffee', type: 'noun', difficultyLevel: 1 },
    { swedish: 'vatten', english: 'water', type: 'noun', difficultyLevel: 1 },
    { swedish: 'bröd', english: 'bread', type: 'noun', difficultyLevel: 1 },
    { swedish: 'mjölk', english: 'milk', type: 'noun', difficultyLevel: 1 },
    { swedish: 'frukt', english: 'fruit', type: 'noun', difficultyLevel: 1 },

    // Family members (Level 1)
    { swedish: 'mamma', english: 'mother', type: 'noun', difficultyLevel: 1 },
    { swedish: 'pappa', english: 'father', type: 'noun', difficultyLevel: 1 },
    { swedish: 'syster', english: 'sister', type: 'noun', difficultyLevel: 1 },
    { swedish: 'bror', english: 'brother', type: 'noun', difficultyLevel: 1 },
    { swedish: 'familj', english: 'family', type: 'noun', difficultyLevel: 1 },

    // Common places (Level 1-2)
    { swedish: 'skola', english: 'school', type: 'noun', difficultyLevel: 1 },
    { swedish: 'affär', english: 'store/shop', type: 'noun', difficultyLevel: 1 },
    { swedish: 'restaurang', english: 'restaurant', type: 'noun', difficultyLevel: 2 },
    { swedish: 'sjukhus', english: 'hospital', type: 'noun', difficultyLevel: 2 },
    { swedish: 'bibliotek', english: 'library', type: 'noun', difficultyLevel: 2 },

    // Common verbs (Level 1-2)
    { swedish: 'äta', english: 'to eat', type: 'verb', difficultyLevel: 1 },
    { swedish: 'dricka', english: 'to drink', type: 'verb', difficultyLevel: 1 },
    { swedish: 'sova', english: 'to sleep', type: 'verb', difficultyLevel: 1 },
    { swedish: 'prata', english: 'to talk/speak', type: 'verb', difficultyLevel: 1 },
    { swedish: 'lyssna', english: 'to listen', type: 'verb', difficultyLevel: 1 },

    // Time-related words (Level 1-2)
    { swedish: 'idag', english: 'today', type: 'adverb', difficultyLevel: 1 },
    { swedish: 'imorgon', english: 'tomorrow', type: 'adverb', difficultyLevel: 1 },
    { swedish: 'igår', english: 'yesterday', type: 'adverb', difficultyLevel: 1 },
    { swedish: 'vecka', english: 'week', type: 'noun', difficultyLevel: 1 },
    { swedish: 'månad', english: 'month', type: 'noun', difficultyLevel: 1 },

    // Colors (Level 1)
    { swedish: 'röd', english: 'red', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'blå', english: 'blue', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'grön', english: 'green', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'gul', english: 'yellow', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'svart', english: 'black', type: 'adjective', difficultyLevel: 1 },

    // Weather (Level 2)
    { swedish: 'regn', english: 'rain', type: 'noun', difficultyLevel: 2 },
    { swedish: 'sol', english: 'sun', type: 'noun', difficultyLevel: 1 },
    { swedish: 'varm', english: 'warm', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'kall', english: 'cold', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'väder', english: 'weather', type: 'noun', difficultyLevel: 1 },

    // Numbers (Level 1)
    { swedish: 'ett', english: 'one', type: 'noun', difficultyLevel: 1 },
    { swedish: 'två', english: 'two', type: 'noun', difficultyLevel: 1 },
    { swedish: 'tre', english: 'three', type: 'noun', difficultyLevel: 1 },
    { swedish: 'fyra', english: 'four', type: 'noun', difficultyLevel: 1 },
    { swedish: 'fem', english: 'five', type: 'noun', difficultyLevel: 1 },

    // Common adjectives (Level 2)
    { swedish: 'trevlig', english: 'nice/pleasant', type: 'adjective', difficultyLevel: 2 },
    { swedish: 'svår', english: 'difficult', type: 'adjective', difficultyLevel: 2 },
    { swedish: 'lätt', english: 'easy/light', type: 'adjective', difficultyLevel: 2 },
    { swedish: 'rolig', english: 'fun/funny', type: 'adjective', difficultyLevel: 2 },
    { swedish: 'trött', english: 'tired', type: 'adjective', difficultyLevel: 2 }
];

async function importWords() {
    console.log('Starting word import...');
    let imported = 0;
    let errors = 0;
    let skipCount = 0;

    for (const word of commonWords) {
        try {
            // Check if word already exists
            const existing = await sequelize.models.Word.findOne({
                where: { swedish: word.swedish }
            });

            if (existing) {
                skipCount++;
                continue;
            }

            await createWord(word);
            imported++;
            console.log(`Imported: ${word.swedish}`);
        } catch (error) {
            console.error(`Error importing word "${word.swedish}":`, error.message);
            errors++;
        }
    }

    return { imported, errors, skipCount };
}

async function main() {
    try {
        console.log('Starting common Swedish words import...');
        const results = await importWords();
        
        console.log('\nImport completed:');
        console.log(`Successfully imported: ${results.imported} words`);
        console.log(`Skipped (already exists): ${results.skipCount} words`);
        console.log(`Errors: ${results.errors}`);
        
    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        process.exit();
    }
}

// Run the import
main();
