/**
 * Shared Application Constants
 * Used across both frontend and backend
 */

// Word Types
const WORD_TYPES = [
    'noun',
    'verb',
    'adjective', 
    'adverb',
    'pronoun',
    'preposition',
    'conjunction',
    'interjection'
];

// Progress Mastery Levels
const MASTERY_LEVELS = [
    'shown',      // Word has been shown to user
    'learning',   // User is learning the word
    'practicing', // User is practicing the word
    'mastered'    // User has mastered the word
];

// Difficulty Levels
const DIFFICULTY_LEVELS = {
    MIN: 1,
    MAX: 5,
    DEFAULT: 1
};

// Validation Limits
const VALIDATION_LIMITS = {
    FIRST_NAME: {
        MIN: 1,
        MAX: 50
    },
    LAST_NAME: {
        MIN: 1,
        MAX: 50  
    },
    USERNAME: {
        MIN: 3,
        MAX: 30
    },
    PASSWORD: {
        MIN: 6,
        MAX: 128
    },
    EMAIL: {
        MAX: 255
    },
    SWEDISH_WORD: {
        MIN: 1,
        MAX: 100
    },
    ENGLISH_WORD: {
        MIN: 1,
        MAX: 100
    },
    SENTENCE_LIMIT: 5
};

// Grammar Rule Types  
const GRAMMAR_RULE_TYPES = [
    'article',
    'noun-gender', 
    'verb-conjugation',
    'adjective-agreement',
    'pronoun-usage',
    'sentence-structure',
    'preposition-usage',
    'question-formation',
    'negation',
    'other'
];

// Default Query Limits
const DEFAULT_LIMITS = {
    FLASHCARDS: 10,
    SENTENCES: 5,
    WORDS_PER_PAGE: 20,
    PROGRESS_HISTORY: 30
};

module.exports = {
    WORD_TYPES,
    MASTERY_LEVELS,
    DIFFICULTY_LEVELS,
    VALIDATION_LIMITS,
    GRAMMAR_RULE_TYPES,
    DEFAULT_LIMITS
};