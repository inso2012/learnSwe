# Database Schema Documentation

Complete database schema and entity relationship documentation for the Swedish Learning Application.

## 📋 Table of Contents

- [Overview](#overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Table Definitions](#table-definitions)
- [Relationships](#relationships)
- [Indexes](#indexes)
- [Constraints](#constraints)

## 🏗️ Overview

The database uses **PostgreSQL** for production and **SQLite** for testing. The schema is designed to support:

- User management and authentication
- Vocabulary word storage with metadata
- Progress tracking with spaced repetition
- Grammar rules and lessons
- Learning session analytics

### Database Configuration
- **Production**: PostgreSQL 12+
- **Testing**: SQLite (in-memory)
- **ORM**: Sequelize
- **Migrations**: Sequelize migrations
- **Connection Pool**: Configurable pool size

---

## 🔗 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Users       │       │     Words       │       │ UserWordProgress│
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ firstName       │       │ swedish         │       │ userId (FK)     │
│ lastName        │       │ english         │       │ wordId (FK)     │
│ username        │       │ type            │       │ masteryLevel    │
│ email           │       │ difficultyLevel │       │ correctAttempts │
│ password        │       │ createdAt       │       │ totalAttempts   │
│ registrationDate│       │ updatedAt       │       │ lastReviewed    │
│ lastLogin       │       └─────────────────┘       │ nextReview      │
│ totalWordsLearned│                                │ createdAt       │
│ currentStreak   │                                │ updatedAt       │
│ createdAt       │                                └─────────────────┘
│ updatedAt       │                                         │
└─────────────────┘                                         │
         │                                                  │
         └──────────────────────────────────────────────────┘
                                    │
                                    │
┌─────────────────┐                 │
│   GrammarRules  │                 │
├─────────────────┤                 │
│ id (PK)         │                 │
│ title           │                 │
│ category        │                 │
│ explanation     │                 │
│ examples        │                 │
│ difficultyLevel │                 │
│ createdAt       │                 │
│ updatedAt       │                 │
└─────────────────┘                 │
                                    │
┌─────────────────┐                 │
│   UserSessions  │                 │
├─────────────────┤                 │
│ id (PK)         │                 │
│ userId (FK)     │─────────────────┘
│ sessionType     │
│ duration        │
│ wordsStudied    │
│ accuracy        │
│ createdAt       │
└─────────────────┘
```

---

## 📊 Table Definitions

### Users Table

Stores user account information and learning statistics.

```sql
CREATE TABLE "Users" (
    id SERIAL PRIMARY KEY,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL, 
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    registrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastLogin TIMESTAMP,
    totalWordsLearned INTEGER DEFAULT 0,
    currentStreak INTEGER DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions**:
- `id`: Auto-incrementing primary key
- `firstName`: User's first name (1-50 characters)
- `lastName`: User's last name (1-50 characters)  
- `username`: Unique username (3-30 alphanumeric + underscore/hyphen)
- `email`: Unique email address (valid email format)
- `password`: Bcrypt hashed password
- `registrationDate`: Account creation timestamp
- `lastLogin`: Last successful login timestamp
- `totalWordsLearned`: Count of words user has learned
- `currentStreak`: Current consecutive days of activity

**Indexes**:
- Primary key on `id`
- Unique index on `email`
- Unique index on `username`
- Index on `lastLogin` for activity queries

---

### Words Table

Stores Swedish vocabulary words with English translations and metadata.

```sql
CREATE TABLE "Words" (
    id SERIAL PRIMARY KEY,
    swedish VARCHAR(100) NOT NULL,
    english VARCHAR(100) NOT NULL,
    type ENUM('noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection') NOT NULL,
    difficultyLevel INTEGER CHECK (difficultyLevel >= 1 AND difficultyLevel <= 5) DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions**:
- `id`: Auto-incrementing primary key
- `swedish`: Swedish word or phrase (1-100 characters)
- `english`: English translation (1-100 characters)
- `type`: Grammatical type (enum constraint)
- `difficultyLevel`: Difficulty rating from 1 (easiest) to 5 (hardest)

**Indexes**:
- Primary key on `id`
- Index on `swedish` for word lookups
- Index on `type` for filtering
- Index on `difficultyLevel` for difficulty-based queries
- Composite index on `(type, difficultyLevel)`

**Word Types**:
- `noun`: Substantiv (house, cat, person)
- `verb`: Verb (run, eat, sleep) 
- `adjective`: Adjektiv (big, red, beautiful)
- `adverb`: Adverb (quickly, often, here)
- `pronoun`: Pronomen (he, she, it)
- `preposition`: Preposition (in, on, under)
- `conjunction`: Konjunktion (and, but, or)
- `interjection`: Interjektion (hello, ouch, wow)

---

### UserWordProgress Table

Tracks individual user progress for each vocabulary word using spaced repetition.

```sql
CREATE TABLE "UserWordProgress" (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    wordId INTEGER NOT NULL REFERENCES "Words"(id) ON DELETE CASCADE,
    masteryLevel ENUM('shown', 'learning', 'practicing', 'mastered') DEFAULT 'learning',
    correctAttempts INTEGER DEFAULT 0,
    totalAttempts INTEGER DEFAULT 0,
    lastReviewed TIMESTAMP,
    nextReview TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, wordId)
);
```

**Field Descriptions**:
- `id`: Auto-incrementing primary key
- `userId`: Foreign key to Users table
- `wordId`: Foreign key to Words table  
- `masteryLevel`: Learning progress stage
- `correctAttempts`: Number of correct answers
- `totalAttempts`: Total number of attempts
- `lastReviewed`: Last time word was studied
- `nextReview`: When word should be reviewed next (spaced repetition)

**Mastery Levels**:
- `shown`: Word has been shown to user but not yet practiced
- `learning`: User is learning the word (< 70% accuracy)
- `practicing`: User is practicing the word (70-90% accuracy)
- `mastered`: User has mastered the word (> 90% accuracy with 10+ attempts)

**Indexes**:
- Primary key on `id`
- Unique composite index on `(userId, wordId)`
- Index on `userId` for user progress queries
- Index on `wordId` for word statistics
- Index on `nextReview` for spaced repetition scheduling
- Index on `masteryLevel` for progress filtering

---

### GrammarRules Table

Stores Swedish grammar rules and explanations.

```sql
CREATE TABLE "GrammarRules" (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category ENUM('article', 'noun-gender', 'verb-conjugation', 'adjective-agreement', 'pronoun-usage', 'sentence-structure', 'preposition-usage', 'question-formation', 'negation', 'other') NOT NULL,
    explanation TEXT NOT NULL,
    examples TEXT,
    difficultyLevel INTEGER CHECK (difficultyLevel >= 1 AND difficultyLevel <= 5) DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions**:
- `id`: Auto-incrementing primary key
- `title`: Grammar rule title
- `category`: Grammar category (enum constraint)
- `explanation`: Detailed explanation of the rule
- `examples`: JSON array of example sentences
- `difficultyLevel`: Difficulty rating 1-5

**Grammar Categories**:
- `article`: Articles (en/ett, den/det)
- `noun-gender`: Noun gender rules
- `verb-conjugation`: Verb conjugation patterns
- `adjective-agreement`: Adjective agreement rules
- `pronoun-usage`: Pronoun usage rules
- `sentence-structure`: Word order and sentence structure
- `preposition-usage`: Preposition usage
- `question-formation`: How to form questions
- `negation`: Negation patterns
- `other`: Other grammar topics

---

### UserSessions Table

Tracks user learning sessions for analytics.

```sql
CREATE TABLE "UserSessions" (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    sessionType ENUM('flashcards', 'grammar', 'review', 'quiz') NOT NULL,
    duration INTEGER, -- duration in seconds
    wordsStudied INTEGER DEFAULT 0,
    accuracy DECIMAL(5,2), -- percentage (0.00-100.00)
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions**:
- `id`: Auto-incrementing primary key
- `userId`: Foreign key to Users table
- `sessionType`: Type of learning session
- `duration`: Session length in seconds
- `wordsStudied`: Number of words studied in session
- `accuracy`: Session accuracy percentage

**Session Types**:
- `flashcards`: Vocabulary flashcard session
- `grammar`: Grammar lesson session
- `review`: Review of previously learned words
- `quiz`: Quiz or test session

---

## 🔗 Relationships

### One-to-Many Relationships

1. **Users → UserWordProgress**
   - One user can have progress records for many words
   - Foreign key: `UserWordProgress.userId` → `Users.id`
   - Cascade delete: When user is deleted, all progress is deleted

2. **Words → UserWordProgress** 
   - One word can have progress records for many users
   - Foreign key: `UserWordProgress.wordId` → `Words.id`
   - Cascade delete: When word is deleted, all progress is deleted

3. **Users → UserSessions**
   - One user can have many learning sessions
   - Foreign key: `UserSessions.userId` → `Users.id`
   - Cascade delete: When user is deleted, all sessions are deleted

### Many-to-Many Relationships

**Users ↔ Words** (through UserWordProgress)
- Many users can learn many words
- Junction table: `UserWordProgress`
- Additional data: progress tracking, mastery level, timing

---

## 📈 Indexes

### Primary Keys
All tables have auto-incrementing integer primary keys for optimal performance.

### Foreign Key Indexes
```sql
-- UserWordProgress table
CREATE INDEX idx_userwordprogress_userid ON "UserWordProgress"(userId);
CREATE INDEX idx_userwordprogress_wordid ON "UserWordProgress"(wordId);

-- UserSessions table  
CREATE INDEX idx_usersessions_userid ON "UserSessions"(userId);
```

### Unique Constraints
```sql
-- Users table
CREATE UNIQUE INDEX idx_users_email ON "Users"(email);
CREATE UNIQUE INDEX idx_users_username ON "Users"(username);

-- UserWordProgress table
CREATE UNIQUE INDEX idx_userwordprogress_user_word ON "UserWordProgress"(userId, wordId);
```

### Query Optimization Indexes
```sql
-- For spaced repetition queries
CREATE INDEX idx_userwordprogress_nextreview ON "UserWordProgress"(nextReview);
CREATE INDEX idx_userwordprogress_mastery ON "UserWordProgress"(masteryLevel);

-- For word filtering
CREATE INDEX idx_words_type ON "Words"(type);
CREATE INDEX idx_words_difficulty ON "Words"(difficultyLevel);
CREATE INDEX idx_words_type_difficulty ON "Words"(type, difficultyLevel);

-- For analytics queries
CREATE INDEX idx_usersessions_created ON "UserSessions"(createdAt);
CREATE INDEX idx_usersessions_type ON "UserSessions"(sessionType);
```

---

## ⚡ Constraints

### Check Constraints
```sql
-- Difficulty levels must be 1-5
ALTER TABLE "Words" ADD CONSTRAINT chk_words_difficulty 
    CHECK (difficultyLevel >= 1 AND difficultyLevel <= 5);

ALTER TABLE "GrammarRules" ADD CONSTRAINT chk_grammar_difficulty 
    CHECK (difficultyLevel >= 1 AND difficultyLevel <= 5);

-- Accuracy must be 0-100
ALTER TABLE "UserSessions" ADD CONSTRAINT chk_sessions_accuracy 
    CHECK (accuracy >= 0 AND accuracy <= 100);

-- Attempts must be non-negative
ALTER TABLE "UserWordProgress" ADD CONSTRAINT chk_progress_attempts 
    CHECK (correctAttempts >= 0 AND totalAttempts >= 0 AND correctAttempts <= totalAttempts);
```

### Enum Constraints
Enum values are enforced at the database level for data integrity:

```sql
-- Word types
ALTER TABLE "Words" ADD CONSTRAINT chk_words_type 
    CHECK (type IN ('noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection'));

-- Mastery levels  
ALTER TABLE "UserWordProgress" ADD CONSTRAINT chk_progress_mastery 
    CHECK (masteryLevel IN ('shown', 'learning', 'practicing', 'mastered'));

-- Grammar categories
ALTER TABLE "GrammarRules" ADD CONSTRAINT chk_grammar_category 
    CHECK (category IN ('article', 'noun-gender', 'verb-conjugation', 'adjective-agreement', 'pronoun-usage', 'sentence-structure', 'preposition-usage', 'question-formation', 'negation', 'other'));

-- Session types
ALTER TABLE "UserSessions" ADD CONSTRAINT chk_sessions_type 
    CHECK (sessionType IN ('flashcards', 'grammar', 'review', 'quiz'));
```

---

## 🔄 Spaced Repetition Algorithm

The `nextReview` field in `UserWordProgress` implements spaced repetition:

### Review Intervals
```
Initial: 1 day
Correct answer: Multiply interval by factor (1.3-2.5 based on performance)
Wrong answer: Reset to shorter interval (0.5-1 days)

Example progression:
New word → 1 day → 2 days → 4 days → 7 days → 14 days → 30 days → 60 days
```

### Mastery Progression
```sql
-- Calculation logic (pseudocode)
accuracy = correctAttempts / totalAttempts * 100

IF totalAttempts < 3 THEN
    masteryLevel = 'learning'
ELSIF accuracy < 70 THEN  
    masteryLevel = 'learning'
ELSIF accuracy >= 70 AND accuracy < 90 THEN
    masteryLevel = 'practicing'  
ELSIF accuracy >= 90 AND totalAttempts >= 10 THEN
    masteryLevel = 'mastered'
END IF
```

---

## 📝 Sample Data

### Users
```sql
INSERT INTO "Users" (firstName, lastName, username, email, password) VALUES
('Erik', 'Andersson', 'erik_a', 'erik@example.com', '$2b$10$hashedpassword'),
('Anna', 'Johansson', 'anna_j', 'anna@example.com', '$2b$10$hashedpassword');
```

### Words  
```sql
INSERT INTO "Words" (swedish, english, type, difficultyLevel) VALUES
('hus', 'house', 'noun', 1),
('springa', 'run', 'verb', 2),
('stor', 'big', 'adjective', 1),
('snabbt', 'quickly', 'adverb', 2);
```

### Progress
```sql
INSERT INTO "UserWordProgress" (userId, wordId, masteryLevel, correctAttempts, totalAttempts, lastReviewed, nextReview) VALUES
(1, 1, 'practicing', 7, 10, '2025-09-12 10:00:00', '2025-09-14 10:00:00'),
(1, 2, 'learning', 2, 5, '2025-09-12 11:00:00', '2025-09-13 11:00:00');
```