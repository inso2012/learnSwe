require('dotenv').config();
const { createWord } = require('../models/Word');
const { sequelize } = require('../db');
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

// Frequency-based difficulty levels (1-3)
function getDifficultyLevel(index) {
    if (index < 1000) return 1;  // Most common words
    if (index < 3000) return 2;  // Common words
    return 3;                    // Less common words
}

// Convert word types from Folkets to our format
function convertWordType(type) {
    const typeMap = {
        'nn': 'noun',
        'vb': 'verb',
        'jj': 'adjective',
        'ab': 'adverb',
        'in': 'interjection',
        'pp': 'preposition',
        'pn': 'pronoun',
        'kn': 'conjunction'
    };
    return typeMap[type] || 'other';
}

async function fetchAndParseWords() {
    try {
        // Download the lexicon from the new URL
        console.log('Downloading Folkets lexicon...');
        const response = await axios.get('https://folkets-lexikon.csc.kth.se/folkets/static/xml/folkets_sv_en.xml');
        
        // Parse XML
        console.log('Parsing lexicon data...');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        // Process words
        const words = [];
        let wordIndex = 0;
        
        if (result.dictionary && result.dictionary.word) {
            for (const entry of result.dictionary.word) {
                if (entry.$ && entry.$.value && entry.translation) {
                    const swedish = entry.$.value;
                    const translations = entry.translation.map(t => t.$.value);
                    const type = entry.pos ? convertWordType(entry.pos[0]) : 'other';
                    
                    if (swedish && translations.length > 0) {
                        words.push({
                            swedish,
                            english: translations.join('; '),
                            type,
                            difficultyLevel: getDifficultyLevel(wordIndex++)
                        });
                    }
                }
            }
        }
        
        return words;
    } catch (error) {
        console.error('Error fetching/parsing lexicon:', error);
        return [];
    }
}

async function importWords(words) {
    console.log('Importing words...');
    let imported = 0;
    let errors = 0;
    let skipCount = 0;

    for (const word of words) {
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
            
            if (imported % 100 === 0) {
                console.log(`Imported ${imported} words...`);
            }
        } catch (error) {
            console.error(`Error importing word "${word.swedish}":`, error.message);
            errors++;
        }
    }

    return { imported, errors, skipCount };
}

async function main() {
    try {
        // First install xml2js if not already installed
        if (!fs.existsSync(path.join(__dirname, '../node_modules/xml2js'))) {
            console.log('Installing required dependencies...');
            require('child_process').execSync('npm install xml2js', {
                stdio: 'inherit',
                cwd: path.join(__dirname, '..')
            });
        }

        console.log('Starting Folkets lexicon import...');
        const words = await fetchAndParseWords();
        console.log(`Found ${words.length} words in lexicon`);
        
        const results = await importWords(words);
        
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
