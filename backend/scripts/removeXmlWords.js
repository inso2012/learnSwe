const { Word } = require('../db');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

async function removeXmlWords() {
    try {
        // Read and parse the XML file to get the list of words to remove
        const xmlPath = path.join(__dirname, '..', 'data', 'swe_eng.xml');
        console.log('Reading XML file to get words to remove...');
        const xmlData = fs.readFileSync(xmlPath, 'utf8');
        
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);
        
        // Get all Swedish words from the XML
        const swedishWords = result.Dictionary.Word.map(entry => entry.$.Value);
        
        // Remove these words from the database
        const deleteResult = await Word.destroy({
            where: {
                swedish: swedishWords
            }
        });

        console.log(`Successfully removed ${deleteResult} words that were imported from swe_eng.xml`);
    } catch (error) {
        console.error('Error removing words:', error);
    } finally {
        process.exit();
    }
}

removeXmlWords();
