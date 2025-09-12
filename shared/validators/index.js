/**
 * Shared Validation Functions
 * Used across both frontend and backend
 */

const { WORD_TYPES, DIFFICULTY_LEVELS, VALIDATION_LIMITS } = require('../constants/app');

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= VALIDATION_LIMITS.EMAIL.MAX;
}

/**
 * Validate password strength
 * @param {string} password 
 * @returns {boolean}
 */
function isValidPassword(password) {
    if (!password || typeof password !== 'string') return false;
    
    return password.length >= VALIDATION_LIMITS.PASSWORD.MIN && 
           password.length <= VALIDATION_LIMITS.PASSWORD.MAX;
}

/**
 * Validate first name
 * @param {string} firstName 
 * @returns {boolean}
 */
function isValidFirstName(firstName) {
    if (!firstName || typeof firstName !== 'string') return false;
    
    return firstName.length >= VALIDATION_LIMITS.FIRST_NAME.MIN && 
           firstName.length <= VALIDATION_LIMITS.FIRST_NAME.MAX;
}

/**
 * Validate last name
 * @param {string} lastName 
 * @returns {boolean}
 */
function isValidLastName(lastName) {
    if (!lastName || typeof lastName !== 'string') return false;
    
    return lastName.length >= VALIDATION_LIMITS.LAST_NAME.MIN && 
           lastName.length <= VALIDATION_LIMITS.LAST_NAME.MAX;
}

/**
 * Validate username
 * @param {string} username 
 * @returns {boolean}
 */
function isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    return usernameRegex.test(username) &&
           username.length >= VALIDATION_LIMITS.USERNAME.MIN && 
           username.length <= VALIDATION_LIMITS.USERNAME.MAX;
}

/**
 * Validate Swedish word
 * @param {string} word 
 * @returns {boolean}
 */
function isValidSwedishWord(word) {
    if (!word || typeof word !== 'string') return false;
    
    const trimmed = word.trim();
    return trimmed.length >= VALIDATION_LIMITS.SWEDISH_WORD.MIN && 
           trimmed.length <= VALIDATION_LIMITS.SWEDISH_WORD.MAX;
}

/**
 * Validate English word
 * @param {string} word 
 * @returns {boolean}
 */
function isValidEnglishWord(word) {
    if (!word || typeof word !== 'string') return false;
    
    const trimmed = word.trim();
    return trimmed.length >= VALIDATION_LIMITS.ENGLISH_WORD.MIN && 
           trimmed.length <= VALIDATION_LIMITS.ENGLISH_WORD.MAX;
}

/**
 * Validate word type
 * @param {string} type 
 * @returns {boolean}
 */
function isValidWordType(type) {
    return WORD_TYPES.includes(type);
}

/**
 * Validate difficulty level
 * @param {number} level 
 * @returns {boolean}
 */
function isValidDifficultyLevel(level) {
    return Number.isInteger(level) && 
           level >= DIFFICULTY_LEVELS.MIN && 
           level <= DIFFICULTY_LEVELS.MAX;
}

/**
 * Sanitize input by trimming and removing dangerous characters
 * @param {string} input 
 * @returns {string}
 */
function sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    return input.trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/['"]/g, '') // Remove quotes that could cause issues
        .substring(0, 1000);  // Limit length for safety
}

/**
 * Validate flashcard session data
 * @param {Object} sessionData 
 * @returns {boolean}
 */
function isValidFlashcardSession(sessionData) {
    if (!sessionData || typeof sessionData !== 'object') return false;
    
    const { learnedWords, shownWords } = sessionData;
    
    return Array.isArray(learnedWords) && 
           Array.isArray(shownWords) &&
           learnedWords.every(word => typeof word === 'string' && word.length > 0) &&
           shownWords.every(word => typeof word === 'string' && word.length > 0);
}

module.exports = {
    isValidEmail,
    isValidPassword, 
    isValidFirstName,
    isValidLastName,
    isValidUsername,
    isValidSwedishWord,
    isValidEnglishWord,
    isValidWordType,
    isValidDifficultyLevel,
    sanitizeInput,
    isValidFlashcardSession
};