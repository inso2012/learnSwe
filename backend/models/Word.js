const { Word } = require('../db');

/**
 * Create a new word
 * @param {Object} data - { english, swedish, type }
 * @returns {Promise<Object>}
 */
async function createWord(data) {
    return await Word.create(data);
}

/**
 * Get all words
 * @returns {Promise<Array>}
 */
async function getWords() {
    return await Word.findAll();
}

/**
 * Update a word by ID
 * @param {number} id
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateWord(id, updates) {
    const word = await Word.findByPk(id);
    if (!word) return null;
    return await word.update(updates);
}

/**
 * Delete a word by ID
 * @param {number} id
 * @returns {Promise<void>}
 */
async function deleteWord(id) {
    const word = await Word.findByPk(id);
    if (word) await word.destroy();
}

module.exports = { createWord, getWords, updateWord, deleteWord };