require('dotenv').config();
const { createWord } = require('../models/Word');
const { sequelize } = require('../db');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Function to determine word type based on part of speech tags
function determineWordType(pos) {
    const typeMap = {
        'noun': ['noun', 'n', 'substantiv'],
        'verb': ['verb', 'v', 'verb'],
        'adjective': ['adj', 'adjective', 'adjektiv'],
        'adverb': ['adv', 'adverb', 'adverb'],
        'pronoun': ['pron', 'pronoun', 'pronomen'],
        'preposition': ['prep', 'preposition', 'preposition'],
        'conjunction': ['conj', 'conjunction', 'konjunktion'],
        'interjection': ['interj', 'interjection', 'interjektion']
    };

    for (const [type, patterns] of Object.entries(typeMap)) {
        if (patterns.some(pattern => pos.toLowerCase().includes(pattern))) {
            return type;
        }
    }
    return 'other';
}

// Function to determine difficulty level based on word frequency
function determineDifficultyLevel(frequency) {
    if (frequency > 80) return 1;  // Very common words
    if (frequency > 50) return 2;  // Common words
    return 3;                      // Less common words
}

async function importWordsFromWiktionary() {
    const batchSize = 100;
    let imported = 0;
    let errors = 0;
    let skipCount = 0;

    try {
        // Download Swedish frequency list
        console.log('Downloading Swedish frequency list...');
        const response = await axios.get('https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/sv/sv_50k.txt');
        const words = response.data.split('\\n')
            .map(line => {
                const [word, freq] = line.split(' ');
                return { word, frequency: parseInt(freq) || 0 };
            })
            .filter(w => w.word && w.word.length > 1);  // Filter out single letters and empty strings

        console.log(`Processing ${words.length} Swedish words...`);

        // Process words in batches
        for (let i = 0; i < words.length; i += batchSize) {
            const batch = words.slice(i, i + batchSize);
            
            // Process each word in the batch
            for (const { word, frequency } of batch) {
                try {
                    // Check if word already exists
                    const existing = await sequelize.models.Word.findOne({
                        where: { swedish: word }
                    });

                    if (existing) {
                        skipCount++;
                        continue;
                    }

                    // Get English translation from Wiktionary
                    const wiktResponse = await axios.get(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`);
                    
                    if (wiktResponse.data && wiktResponse.data.sv) {
                        const definitions = wiktResponse.data.sv;
                        for (const def of definitions) {
                            const wordType = determineWordType(def.partOfSpeech || '');
                            const difficultyLevel = determineDifficultyLevel(frequency);

                            await createWord({
                                swedish: word,
                                english: def.definition,
                                type: wordType,
                                difficultyLevel: difficultyLevel
                            });
                            
                            imported++;
                            if (imported % 10 === 0) {
                                console.log(`Imported ${imported} words...`);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error processing word "${word}":`, error.message);
                    errors++;
                }

                // Small delay to avoid hitting API limits
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`Processed ${i + batchSize} words...`);
        }

        return { imported, errors, skipCount };
    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('Starting Swedish-English dictionary import...');
        const { imported, errors, skipCount } = await importWordsFromWiktionary();
        
        console.log('\nImport completed:');
        console.log(`Successfully imported: ${imported} words`);
        console.log(`Skipped (already exists): ${skipCount} words`);
        console.log(`Errors: ${errors}`);
        
    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        process.exit();
    }
}

// Run the import
main();
