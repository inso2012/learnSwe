-- LearnSwe D1 Database Schema
-- Migrated from Sequelize/PostgreSQL to Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  registrationDate TEXT DEFAULT (date('now')),
  lastLogin TEXT,
  totalWordsLearned INTEGER DEFAULT 0,
  currentStreak INTEGER DEFAULT 0,
  totalQuizzesTaken INTEGER DEFAULT 0,
  averageQuizScore REAL DEFAULT 0.0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  swedish TEXT NOT NULL,
  english TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('noun','verb','adjective','adverb','pronoun','preposition','conjunction','interjection','prefix','suffix','abbreviation','proper_noun','other')),
  difficultyLevel INTEGER DEFAULT 1 CHECK(difficultyLevel BETWEEN 1 AND 5),
  phonetic TEXT,
  audioUrl TEXT,
  inflections TEXT,
  examples TEXT,
  definitions TEXT,
  createdBy INTEGER REFERENCES users(id),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_words_swedish ON words(swedish);
CREATE INDEX IF NOT EXISTS idx_words_type ON words(type);
CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficultyLevel);

CREATE TABLE IF NOT EXISTS user_word_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id),
  wordId INTEGER NOT NULL REFERENCES words(id),
  masteryLevel TEXT DEFAULT 'learning' CHECK(masteryLevel IN ('shown','learning','practicing','mastered')),
  correctAttempts INTEGER DEFAULT 0,
  totalAttempts INTEGER DEFAULT 0,
  lastReviewDate TEXT,
  nextReviewDate TEXT,
  repetitionInterval INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_word_progress ON user_word_progress(userId, wordId);

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id),
  quizType TEXT NOT NULL CHECK(quizType IN ('vocabulary','translation','multiple_choice','flashcard','mixed')),
  totalQuestions INTEGER NOT NULL,
  correctAnswers INTEGER NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  timeSpent INTEGER,
  completedAt TEXT DEFAULT (datetime('now')),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sessionId INTEGER NOT NULL REFERENCES quiz_sessions(id),
  wordId INTEGER NOT NULL REFERENCES words(id),
  userAnswer TEXT NOT NULL,
  correctAnswer TEXT NOT NULL,
  isCorrect INTEGER NOT NULL DEFAULT 0,
  answerTime INTEGER,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learning_streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  wordsLearned INTEGER DEFAULT 0,
  quizzesTaken INTEGER DEFAULT 0,
  timeSpent INTEGER DEFAULT 0,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_streak ON learning_streaks(userId, date);
