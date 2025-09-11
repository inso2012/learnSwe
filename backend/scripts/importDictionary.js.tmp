require('dotenv').config();
const { createWord } = require('../models/Word');
const { sequelize } = require('../db');
const fs = require('fs');
const path = require('path');

// Read words from JSON file
const wordsData = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../data/swedish-words.json'),
    'utf8'
));

console.log('Loaded words from swedish-words.json');

// Convert structured word data into a flat list with types
const dictionaryWords = Object.entries(wordsData).flatMap(([type, words]) => {
    // Remove 's' from type to match our schema (nouns -> noun, verbs -> verb)
    const wordType = type.endsWith('s') ? type.slice(0, -1) : type;
    return words.map(word => ({
        ...word,
        type: wordType,
        difficultyLevel: 1 // Default difficulty for dictionary words
    }));
});

// Common words with carefully chosen types and difficulties
const commonWords = [
    { swedish: 'hej', english: 'hello', type: 'interjection', difficultyLevel: 1 },
    { swedish: 'tack', english: 'thank you', type: 'interjection', difficultyLevel: 1 },
    { swedish: 'ja', english: 'yes', type: 'interjection', difficultyLevel: 1 },
    { swedish: 'nej', english: 'no', type: 'interjection', difficultyLevel: 1 },
    { swedish: 'och', english: 'and', type: 'conjunction', difficultyLevel: 1 },
    { swedish: 'är', english: 'is/are', type: 'verb', difficultyLevel: 1 },
    { swedish: 'jag', english: 'I', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'du', english: 'you', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'han', english: 'he', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'hon', english: 'she', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'det', english: 'it/that', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'den', english: 'it/that', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'en', english: 'a/an/one', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'ett', english: 'a/an/one', type: 'pronoun', difficultyLevel: 1 },
    { swedish: 'mat', english: 'food', type: 'noun', difficultyLevel: 1 },
    { swedish: 'vatten', english: 'water', type: 'noun', difficultyLevel: 1 },
    { swedish: 'bil', english: 'car', type: 'noun', difficultyLevel: 1 },
    { swedish: 'hus', english: 'house', type: 'noun', difficultyLevel: 1 },
    { swedish: 'dag', english: 'day', type: 'noun', difficultyLevel: 1 },
    { swedish: 'natt', english: 'night', type: 'noun', difficultyLevel: 1 },
    { swedish: 'stor', english: 'big', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'liten', english: 'small', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'god', english: 'good', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'dålig', english: 'bad', type: 'adjective', difficultyLevel: 1 },
    { swedish: 'gå', english: 'walk/go', type: 'verb', difficultyLevel: 1 },
    { swedish: 'komma', english: 'come', type: 'verb', difficultyLevel: 1 },
    { swedish: 'se', english: 'see', type: 'verb', difficultyLevel: 1 },
    { swedish: 'höra', english: 'hear', type: 'verb', difficultyLevel: 2 },
    { swedish: 'äta', english: 'eat', type: 'verb', difficultyLevel: 1 },
    { swedish: 'dricka', english: 'drink', type: 'verb', difficultyLevel: 2 }
];

async function importWords(words) {
    console.log('Importing words...');
    let imported = 0;
    let errors = 0;

    for (const word of words) {
        try {
            await createWord({
                swedish: word.swedish,
                english: word.english,
                type: word.type,
                difficultyLevel: word.difficultyLevel || 1
            });
            imported++;
            
            if (imported % 100 === 0) {
                console.log(`Imported ${imported} words...`);
            }
        } catch (error) {
            errors++;
            console.error(`Error importing word: ${word.swedish}`, error.message);
        }
    }

    return { imported, errors };
}

async function main() {
    try {
        // First import common words
        console.log('Importing common words...');
        const { imported: commonImported, errors: commonErrors } = await importWords(commonWords);
        
        console.log('\nCommon words import completed:');
        console.log(`Successfully imported: ${commonImported} words`);
        console.log(`Errors: ${commonErrors}`);
        
        // Then import dictionary words
        console.log('\nImporting dictionary words...');
        const { imported: dictionaryImported, errors: dictionaryErrors } = await importWords(dictionaryWords);
        
        console.log('\nDictionary words import completed:');
        console.log(`Successfully imported: ${dictionaryImported} words`);
        console.log(`Errors: ${dictionaryErrors}`);
        
        console.log('\nTotal import completed:');
        console.log(`Successfully imported: ${commonImported + dictionaryImported} words`);
        console.log(`Total errors: ${commonErrors + dictionaryErrors}`);
        
    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        process.exit();
    }
}

// Run the import
main();
