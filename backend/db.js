require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Database configuration - supports both PostgreSQL (production) and SQLite (testing)
let sequelize;

if (process.env.NODE_ENV === 'test') {
    // Use SQLite for testing
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: process.env.DB_STORAGE || ':memory:',
        logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    });
} else {
    // Use PostgreSQL for development/production
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT, 
            dialect: 'postgres',
        }
    );
}

/**
 * User Model
 * @property {String} firstName - User's first name
 * @property {String} lastName - User's last name
 * @property {String} username - Unique username
 * @property {String} email - User's email address
 * @property {String} password - Hashed password
 * @property {Date} registrationDate - Date when user registered
 * @property {Date} lastLogin - Last login timestamp
 * @property {Integer} totalWordsLearned - Count of words learned
 * @property {Integer} currentStreak - Current learning streak in days
 */
const User = sequelize.define('User', {
    firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 50]
        }
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 50]
        }
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 30],
            isAlphanumeric: true
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [6, 255]
        }
    },
    registrationDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
    },
    totalWordsLearned: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    currentStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    totalQuizzesTaken: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    averageQuizScore: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0
    }
}, {
    tableName: 'users',
    timestamps: true,
});

/**
 * Swedish Word Model
 * @property {String} english - The word in English
 * @property {String} swedish - The word in Swedish
 * @property {String} type - Part of speech (e.g., noun, verb, adjective)
 * @property {Integer} difficultyLevel - Difficulty level (1-5)
 * @property {Integer} createdBy - User ID who created the word (optional)
 */
const Word = sequelize.define('Word', {
    english: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    swedish: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM(
            'noun',
            'verb',
            'adjective',
            'adverb',
            'pronoun',
            'preposition',
            'conjunction',
            'interjection'
        ),
        allowNull: false,
    },
    difficultyLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: {
            min: 1,
            max: 5
        }
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    tableName: 'words',
    timestamps: true,
});

/**
 * UserWordProgress - Tracks individual word learning progress
 */
const UserWordProgress = sequelize.define('UserWordProgress', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    wordId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Word,
            key: 'id'
        }
    },
    masteryLevel: {
        type: DataTypes.ENUM('shown', 'learning', 'practicing', 'mastered'),
        defaultValue: 'learning'
    },
    correctAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    totalAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    lastReviewDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    nextReviewDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    repetitionInterval: {
        type: DataTypes.INTEGER,
        defaultValue: 1, // Days until next review
        comment: 'Days until next review (spaced repetition)'
    }
}, {
    tableName: 'user_word_progress',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'wordId']
        }
    ]
});

/**
 * QuizSession - Records each quiz attempt
 */
const QuizSession = sequelize.define('QuizSession', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    quizType: {
        type: DataTypes.ENUM(
            'vocabulary',
            'translation',
            'multiple_choice',
            'flashcard',
            'mixed'
        ),
        allowNull: false
    },
    totalQuestions: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    correctAnswers: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    score: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: 'Percentage score (0-100)'
    },
    timeSpent: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time spent in seconds'
    },
    completedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'quiz_sessions',
    timestamps: true,
});

/**
 * QuizAnswer - Individual answers within a quiz session
 */
const QuizAnswer = sequelize.define('QuizAnswer', {
    sessionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: QuizSession,
            key: 'id'
        }
    },
    wordId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Word,
            key: 'id'
        }
    },
    userAnswer: {
        type: DataTypes.STRING,
        allowNull: false
    },
    correctAnswer: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isCorrect: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    answerTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time to answer in seconds'
    }
}, {
    tableName: 'quiz_answers',
    timestamps: true,
});

/**
 * LearningStreak - Daily learning activity tracking
 */
const LearningStreak = sequelize.define('LearningStreak', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    wordsLearned: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    quizzesTaken: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    timeSpent: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Time spent learning in minutes'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether user was active this day'
    }
}, {
    tableName: 'learning_streaks',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'date']
        }
    ]
});

// Define associations
User.hasMany(Word, { 
    foreignKey: 'createdBy', 
    as: 'createdWords' 
});
Word.belongsTo(User, { 
    foreignKey: 'createdBy', 
    as: 'creator' 
});
// User-Word Progress associations
User.hasMany(UserWordProgress, { 
    foreignKey: 'userId', 
    as: 'wordProgress' 
});
UserWordProgress.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
});

Word.hasMany(UserWordProgress, { 
    foreignKey: 'wordId', 
    as: 'userProgress' 
});
UserWordProgress.belongsTo(Word, { 
    foreignKey: 'wordId', 
    as: 'word' 
});

// Quiz associations
User.hasMany(QuizSession, { 
    foreignKey: 'userId', 
    as: 'quizSessions' 
});
QuizSession.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
});

QuizSession.hasMany(QuizAnswer, { 
    foreignKey: 'sessionId', 
    as: 'answers' 
});
QuizAnswer.belongsTo(QuizSession, { 
    foreignKey: 'sessionId', 
    as: 'session' 
});

Word.hasMany(QuizAnswer, { 
    foreignKey: 'wordId', 
    as: 'quizAnswers' 
});
QuizAnswer.belongsTo(Word, { 
    foreignKey: 'wordId', 
    as: 'word' 
});

// Learning Streak associations
User.hasMany(LearningStreak, { 
    foreignKey: 'userId', 
    as: 'learningStreaks' 
});
LearningStreak.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
});

module.exports = { 
    User, 
    Word, 
    UserWordProgress,
    QuizSession,
    QuizAnswer,
    LearningStreak,
    sequelize 
};