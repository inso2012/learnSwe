/**
 * Progress service - replaces backend/models/Progress.js
 * Handles spaced repetition, quiz sessions, streaks, and learning stats
 */
import { now, today, inClause } from '../db/queries.js';
import type { UserWordProgress, QuizSession, QuizAnswer, LearningStreak, User, Word } from '../types.js';

/**
 * Record word learning progress with spaced repetition algorithm
 */
export async function recordWordProgress(db: D1Database, userId: number, wordId: number, isCorrect: boolean) {
  // Find existing progress
  let progress = await db
    .prepare('SELECT * FROM user_word_progress WHERE userId = ? AND wordId = ?')
    .bind(userId, wordId)
    .first<UserWordProgress>();

  const timestamp = now();

  if (!progress) {
    // Create new progress record
    const nextReview = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db
      .prepare(
        `INSERT INTO user_word_progress (userId, wordId, masteryLevel, correctAttempts, totalAttempts, lastReviewDate, nextReviewDate, repetitionInterval, createdAt, updatedAt)
         VALUES (?, ?, 'learning', ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(userId, wordId, isCorrect ? 1 : 0, 1, timestamp, nextReview, timestamp, timestamp)
      .run();

    progress = await db
      .prepare('SELECT * FROM user_word_progress WHERE userId = ? AND wordId = ?')
      .bind(userId, wordId)
      .first<UserWordProgress>();

    return progress;
  }

  // Update progress
  const totalAttempts = progress.totalAttempts + 1;
  const correctAttempts = progress.correctAttempts + (isCorrect ? 1 : 0);
  const successRate = correctAttempts / totalAttempts;

  let masteryLevel = progress.masteryLevel;
  let repetitionInterval = progress.repetitionInterval;

  if (totalAttempts >= 10 && successRate >= 0.9) {
    masteryLevel = 'mastered';
    repetitionInterval = Math.min(repetitionInterval * 2, 30);
  } else if (totalAttempts >= 5 && successRate >= 0.7) {
    masteryLevel = 'practicing';
    repetitionInterval = Math.min(Math.floor(repetitionInterval * 1.5), 14);
  } else {
    masteryLevel = 'learning';
    repetitionInterval = isCorrect
      ? Math.min(repetitionInterval + 1, 7)
      : Math.max(1, repetitionInterval - 1);
  }

  const nextReviewDate = new Date(Date.now() + repetitionInterval * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare(
      `UPDATE user_word_progress
       SET totalAttempts = ?, correctAttempts = ?, masteryLevel = ?,
           repetitionInterval = ?, lastReviewDate = ?, nextReviewDate = ?, updatedAt = ?
       WHERE userId = ? AND wordId = ?`
    )
    .bind(totalAttempts, correctAttempts, masteryLevel, repetitionInterval, timestamp, nextReviewDate, timestamp, userId, wordId)
    .run();

  return db
    .prepare('SELECT * FROM user_word_progress WHERE userId = ? AND wordId = ?')
    .bind(userId, wordId)
    .first<UserWordProgress>();
}

/**
 * Create a new quiz session
 */
export async function createQuizSession(db: D1Database, userId: number, quizType: string, totalQuestions: number) {
  const timestamp = now();
  return db
    .prepare(
      `INSERT INTO quiz_sessions (userId, quizType, totalQuestions, correctAnswers, score, timeSpent, completedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, 0, 0, 0, ?, ?, ?)
       RETURNING *`
    )
    .bind(userId, quizType, totalQuestions, timestamp, timestamp, timestamp)
    .first<QuizSession>();
}

/**
 * Record a quiz answer
 */
export async function recordQuizAnswer(
  db: D1Database,
  sessionId: number,
  wordId: number,
  userAnswer: string,
  correctAnswer: string,
  answerTime: number
) {
  const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim() ? 1 : 0;
  const timestamp = now();

  const answer = await db
    .prepare(
      `INSERT INTO quiz_answers (sessionId, wordId, userAnswer, correctAnswer, isCorrect, answerTime, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(sessionId, wordId, userAnswer, correctAnswer, isCorrect, answerTime, timestamp, timestamp)
    .first<QuizAnswer>();

  // Update quiz session stats
  const session = await db.prepare('SELECT * FROM quiz_sessions WHERE id = ?').bind(sessionId).first<QuizSession>();
  if (session) {
    const newCorrect = session.correctAnswers + isCorrect;
    const newScore = (newCorrect / session.totalQuestions) * 100;
    await db
      .prepare('UPDATE quiz_sessions SET correctAnswers = ?, score = ?, updatedAt = ? WHERE id = ?')
      .bind(newCorrect, newScore, timestamp, sessionId)
      .run();
  }

  return answer;
}

/**
 * Complete a quiz session
 */
export async function completeQuizSession(db: D1Database, sessionId: number, timeSpent: number) {
  const timestamp = now();

  const session = await db.prepare('SELECT * FROM quiz_sessions WHERE id = ?').bind(sessionId).first<QuizSession>();
  if (!session) {
    throw new Error('Quiz session not found');
  }

  // Update session
  await db
    .prepare('UPDATE quiz_sessions SET timeSpent = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
    .bind(timeSpent, timestamp, timestamp, sessionId)
    .run();

  // Get answers for this session
  const { results: answers } = await db
    .prepare('SELECT * FROM quiz_answers WHERE sessionId = ?')
    .bind(sessionId)
    .all<QuizAnswer>();

  // Record word progress for each answer
  for (const answer of answers) {
    await recordWordProgress(db, session.userId, answer.wordId, answer.isCorrect === 1);
  }

  // Update user stats
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first<User>();
  if (user) {
    const newQuizCount = user.totalQuizzesTaken + 1;

    // Recalculate average score
    const { results: allSessions } = await db
      .prepare('SELECT score FROM quiz_sessions WHERE userId = ?')
      .bind(session.userId)
      .all<{ score: number }>();

    const totalScore = allSessions.reduce((sum, s) => sum + s.score, 0);
    const avgScore = totalScore / allSessions.length;

    await db
      .prepare('UPDATE users SET totalQuizzesTaken = ?, averageQuizScore = ?, updatedAt = ? WHERE id = ?')
      .bind(newQuizCount, avgScore, timestamp, session.userId)
      .run();
  }

  // Update learning streak
  await updateLearningStreak(db, session.userId, {
    quizzesTaken: 1,
    timeSpent: Math.round(timeSpent / 60),
  });

  return db.prepare('SELECT * FROM quiz_sessions WHERE id = ?').bind(sessionId).first<QuizSession>();
}

/**
 * Update daily learning streak
 */
export async function updateLearningStreak(
  db: D1Database,
  userId: number,
  activity: { wordsLearned?: number; quizzesTaken?: number; timeSpent?: number }
) {
  const todayStr = today();
  const timestamp = now();

  // Find existing streak for today
  let streak = await db
    .prepare('SELECT * FROM learning_streaks WHERE userId = ? AND date = ?')
    .bind(userId, todayStr)
    .first<LearningStreak>();

  if (!streak) {
    await db
      .prepare(
        `INSERT INTO learning_streaks (userId, date, wordsLearned, quizzesTaken, timeSpent, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(
        userId,
        todayStr,
        activity.wordsLearned || 0,
        activity.quizzesTaken || 0,
        activity.timeSpent || 0,
        timestamp,
        timestamp
      )
      .run();
  } else {
    await db
      .prepare(
        `UPDATE learning_streaks
         SET wordsLearned = wordsLearned + ?, quizzesTaken = quizzesTaken + ?, timeSpent = timeSpent + ?, updatedAt = ?
         WHERE userId = ? AND date = ?`
      )
      .bind(activity.wordsLearned || 0, activity.quizzesTaken || 0, activity.timeSpent || 0, timestamp, userId, todayStr)
      .run();
  }

  // Update user's current streak
  await updateUserStreak(db, userId);
}

/**
 * Calculate and update user's current learning streak
 */
async function updateUserStreak(db: D1Database, userId: number) {
  const { results: streaks } = await db
    .prepare('SELECT date FROM learning_streaks WHERE userId = ? AND isActive = 1 ORDER BY date DESC')
    .bind(userId)
    .all<{ date: string }>();

  let currentStreak = 0;
  const todayDate = new Date();

  for (const streak of streaks) {
    const streakDate = new Date(streak.date);
    const daysDiff = Math.floor((todayDate.getTime() - streakDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === currentStreak) {
      currentStreak++;
    } else {
      break;
    }
  }

  await db
    .prepare('UPDATE users SET currentStreak = ?, updatedAt = ? WHERE id = ?')
    .bind(currentStreak, now(), userId)
    .run();
}

/**
 * Get user's learning statistics
 */
export async function getUserStats(db: D1Database, userId: number) {
  const user = await db
    .prepare('SELECT totalWordsLearned, currentStreak, totalQuizzesTaken, averageQuizScore FROM users WHERE id = ?')
    .bind(userId)
    .first<Pick<User, 'totalWordsLearned' | 'currentStreak' | 'totalQuizzesTaken' | 'averageQuizScore'>>();

  if (!user) {
    throw new Error('User not found');
  }

  // Mastery stats
  const { results: masteryStats } = await db
    .prepare(
      `SELECT masteryLevel, COUNT(id) as count
       FROM user_word_progress
       WHERE userId = ? AND masteryLevel IN ('practicing', 'mastered')
       GROUP BY masteryLevel`
    )
    .bind(userId)
    .all<{ masteryLevel: string; count: number }>();

  // Total words count (shown + practicing + mastered)
  const totalWordsRow = await db
    .prepare(
      `SELECT COUNT(id) as count FROM user_word_progress
       WHERE userId = ? AND masteryLevel IN ('shown', 'practicing', 'mastered')`
    )
    .bind(userId)
    .first<{ count: number }>();

  const totalWordsCount = totalWordsRow?.count || 0;
  const actualTotalWordsLearned = Math.max(user.totalWordsLearned || 0, totalWordsCount);

  // Recent quizzes (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { results: recentQuizzes } = await db
    .prepare('SELECT * FROM quiz_sessions WHERE userId = ? AND completedAt >= ? ORDER BY completedAt DESC LIMIT 10')
    .bind(userId, sevenDaysAgo)
    .all<QuizSession>();

  // Learning activity (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { results: learningActivity } = await db
    .prepare('SELECT * FROM learning_streaks WHERE userId = ? AND date >= ? ORDER BY date DESC')
    .bind(userId, thirtyDaysAgo)
    .all<LearningStreak>();

  return {
    totalWordsLearned: actualTotalWordsLearned,
    currentStreak: user.currentStreak || 0,
    totalQuizzesTaken: user.totalQuizzesTaken || 0,
    averageQuizScore: user.averageQuizScore || 0,
    masteryStats: masteryStats.reduce(
      (acc, { masteryLevel, count }) => {
        acc[masteryLevel.toLowerCase()] = count;
        return acc;
      },
      {} as Record<string, number>
    ),
    recentQuizzes,
    learningActivity,
  };
}

/**
 * Get words due for review (spaced repetition)
 */
export async function getWordsForReview(db: D1Database, userId: number, limit = 20) {
  const timestamp = now();
  const { results } = await db
    .prepare(
      `SELECT uwp.*, w.english, w.swedish, w.type, w.difficultyLevel
       FROM user_word_progress uwp
       JOIN words w ON uwp.wordId = w.id
       WHERE uwp.userId = ? AND uwp.nextReviewDate <= ?
       ORDER BY uwp.nextReviewDate ASC
       LIMIT ?`
    )
    .bind(userId, timestamp, limit)
    .all();

  return results;
}

/**
 * Update learned words from flashcard session
 */
export async function updateLearnedWords(db: D1Database, userId: number, learnedWords: string[]) {
  if (!learnedWords || learnedWords.length === 0) return;

  // Get word IDs for the learned words
  const { placeholders, bindings } = inClause(learnedWords);
  const { results: words } = await db
    .prepare(`SELECT id, swedish, english, type FROM words WHERE swedish IN ${placeholders}`)
    .bind(...bindings)
    .all<Word>();

  let newlyLearnedCount = 0;

  for (const word of words) {
    // Check existing progress
    const existing = await db
      .prepare('SELECT masteryLevel FROM user_word_progress WHERE userId = ? AND wordId = ?')
      .bind(userId, word.id)
      .first<{ masteryLevel: string }>();

    if (!existing || existing.masteryLevel === 'shown') {
      newlyLearnedCount++;
    }

    await recordWordProgress(db, userId, word.id, true);
  }

  if (newlyLearnedCount > 0) {
    await db
      .prepare('UPDATE users SET totalWordsLearned = totalWordsLearned + ?, updatedAt = ? WHERE id = ?')
      .bind(newlyLearnedCount, now(), userId)
      .run();
  }

  // Update learning streak
  await updateLearningStreak(db, userId, { wordsLearned: newlyLearnedCount, timeSpent: 0 });
}

/**
 * Mark words as shown to user
 */
export async function markWordsAsShown(db: D1Database, userId: number, shownWords: string[]) {
  if (!shownWords || shownWords.length === 0) return;

  const { placeholders, bindings } = inClause(shownWords);
  const { results: words } = await db
    .prepare(`SELECT id, swedish FROM words WHERE swedish IN ${placeholders}`)
    .bind(...bindings)
    .all<{ id: number; swedish: string }>();

  const timestamp = now();

  for (const word of words) {
    const existing = await db
      .prepare('SELECT id FROM user_word_progress WHERE userId = ? AND wordId = ?')
      .bind(userId, word.id)
      .first();

    if (!existing) {
      await db
        .prepare(
          `INSERT INTO user_word_progress (userId, wordId, masteryLevel, correctAttempts, totalAttempts, lastReviewDate, nextReviewDate, repetitionInterval, createdAt, updatedAt)
           VALUES (?, ?, 'shown', 0, 0, ?, NULL, 0, ?, ?)`
        )
        .bind(userId, word.id, timestamp, timestamp, timestamp)
        .run();
    }
  }
}
