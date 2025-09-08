// db.js
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Connect to PostgreSQL (adjust credentials as needed)
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
    }
);

/**
 * Swedish Word Model
 * @property {String} english - The word in English
 * @property {String} swedish - The word in Swedish
 * @property {String} type - Part of speech (e.g., noun, verb, adjective)
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
}, {
    tableName: 'words',
    timestamps: true,
});

module.exports = { Word, sequelize };