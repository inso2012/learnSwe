/**
 * Shared Utility Functions
 * Used across both frontend and backend
 */

/**
 * Format date to readable string
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
    if (!date) return '';
    
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format datetime to readable string
 * @param {Date} date 
 * @returns {string}
 */
function formatDateTime(date) {
    if (!date) return '';
    
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Calculate days between two dates
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {number}
 */
function daysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate accuracy percentage
 * @param {number} correct 
 * @param {number} total 
 * @returns {number}
 */
function calculateAccuracy(correct, total) {
    if (!total || total === 0) return 0;
    return Math.round((correct / total) * 100);
}

/**
 * Generate random ID
 * @returns {string}
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array 
 * @returns {Array}
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Debounce function calls
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Capitalize first letter of string
 * @param {string} str 
 * @returns {string}
 */
function capitalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Check if running in browser environment
 * @returns {boolean}
 */
function isBrowser() {
    return typeof window !== 'undefined';
}

/**
 * Check if running in Node.js environment
 * @returns {boolean}
 */
function isNode() {
    return typeof process !== 'undefined' && process.versions && process.versions.node;
}

/**
 * Safe JSON parse with fallback
 * @param {string} jsonString 
 * @param {*} fallback 
 * @returns {*}
 */
function safeJsonParse(jsonString, fallback = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        return fallback;
    }
}

module.exports = {
    formatDate,
    formatDateTime,
    daysBetween,
    calculateAccuracy,
    generateId,
    shuffleArray,
    debounce,
    capitalize,
    isBrowser,
    isNode,
    safeJsonParse
};