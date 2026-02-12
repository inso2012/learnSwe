/**
 * Progress routes - replaces backend/routes/progressApi.js + backend/controllers/progressController.js
 */
import { Hono } from 'hono';
import { authenticateToken } from '../middleware/auth.js';
import {
  recordWordProgress,
  createQuizSession,
  recordQuizAnswer,
  completeQuizSession,
  getUserStats,
  getWordsForReview,
  updateLearnedWords,
  markWordsAsShown,
} from '../services/progress.js';
import type { AppEnv } from '../types.js';

export const progressRoutes = new Hono<AppEnv>();

// All progress routes require authentication
progressRoutes.use('*', authenticateToken);

// GET /api/progress/stats
progressRoutes.get('/stats', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const stats = await getUserStats(db, userId);

    // Get word type statistics
    const { results: wordTypeStats } = await db
      .prepare(
        `SELECT w.type, COUNT(uwp.id) as count
         FROM user_word_progress uwp
         JOIN words w ON uwp.wordId = w.id
         WHERE uwp.userId = ? AND uwp.masteryLevel IN ('practicing', 'mastered')
         GROUP BY w.type`
      )
      .bind(userId)
      .all<{ type: string; count: number }>();

    const formattedStats = {
      ...stats,
      wordTypeStats: wordTypeStats.reduce(
        (acc, curr) => {
          acc[curr.type.toLowerCase()] = curr.count;
          return acc;
        },
        { nouns: 0, verbs: 0, adjectives: 0, other: 0 } as Record<string, number>
      ),
    };

    return c.json({ success: true, data: formattedStats });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/progress/activity
progressRoutes.get('/activity', async (c) => {
  try {
    const userId = c.get('userId');
    const days = parseInt(c.req.query('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { results: activity } = await c.env.DB
      .prepare(
        `SELECT date, wordsLearned, quizzesTaken, timeSpent, isActive
         FROM learning_streaks
         WHERE userId = ? AND date >= ?
         ORDER BY date ASC`
      )
      .bind(userId, startDate.toISOString().split('T')[0])
      .all();

    return c.json({ success: true, data: activity });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/progress/review-words
progressRoutes.get('/review-words', async (c) => {
  try {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '20');
    const words = await getWordsForReview(c.env.DB, userId, limit);

    return c.json({ success: true, data: words, count: words.length });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/progress/quiz/start
progressRoutes.post('/quiz/start', async (c) => {
  try {
    const userId = c.get('userId');
    const { quizType, totalQuestions } = await c.req.json();

    if (!quizType || !totalQuestions) {
      return c.json({ success: false, error: 'Quiz type and total questions are required' }, 400);
    }

    const validQuizTypes = ['vocabulary', 'translation', 'multiple_choice', 'flashcard', 'mixed'];
    if (!validQuizTypes.includes(quizType)) {
      return c.json({ success: false, error: `Invalid quiz type. Must be one of: ${validQuizTypes.join(', ')}` }, 400);
    }

    const session = await createQuizSession(c.env.DB, userId, quizType, totalQuestions);
    return c.json({ success: true, data: session, message: 'Quiz session started' }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// POST /api/progress/quiz/:sessionId/answer
progressRoutes.post('/quiz/:sessionId/answer', async (c) => {
  try {
    const sessionId = parseInt(c.req.param('sessionId'));
    const userId = c.get('userId');
    const { wordId, userAnswer, correctAnswer, answerTime } = await c.req.json();

    if (!wordId || !userAnswer || !correctAnswer) {
      return c.json({ success: false, error: 'Word ID, user answer, and correct answer are required' }, 400);
    }

    const answer = await recordQuizAnswer(c.env.DB, sessionId, wordId, userAnswer, correctAnswer, answerTime || 0);

    // Also record word progress
    const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    await recordWordProgress(c.env.DB, userId, wordId, isCorrect);

    return c.json({ success: true, data: answer, isCorrect }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// POST /api/progress/quiz/:sessionId/finish
progressRoutes.post('/quiz/:sessionId/finish', async (c) => {
  try {
    const sessionId = parseInt(c.req.param('sessionId'));
    const { timeSpent } = await c.req.json();

    if (!timeSpent) {
      return c.json({ success: false, error: 'Time spent is required' }, 400);
    }

    const session = await completeQuizSession(c.env.DB, sessionId, timeSpent);
    return c.json({ success: true, data: session, message: 'Quiz completed successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// POST /api/progress/practice-word
progressRoutes.post('/practice-word', async (c) => {
  try {
    const userId = c.get('userId');
    const { wordId, isCorrect } = await c.req.json();

    if (!wordId || typeof isCorrect !== 'boolean') {
      return c.json({ success: false, error: 'Word ID and isCorrect (boolean) are required' }, 400);
    }

    const progress = await recordWordProgress(c.env.DB, userId, wordId, isCorrect);
    return c.json({ success: true, data: progress, message: 'Word practice recorded' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// GET /api/progress/word/:wordId
progressRoutes.get('/word/:wordId', async (c) => {
  try {
    const userId = c.get('userId');
    const wordId = parseInt(c.req.param('wordId'));

    const progress = await c.env.DB
      .prepare(
        `SELECT uwp.*, w.english, w.swedish, w.type, w.difficultyLevel
         FROM user_word_progress uwp
         JOIN words w ON uwp.wordId = w.id
         WHERE uwp.userId = ? AND uwp.wordId = ?`
      )
      .bind(userId, wordId)
      .first();

    if (!progress) {
      return c.json({ success: false, error: 'No progress found for this word' }, 404);
    }

    return c.json({ success: true, data: progress });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/progress/flashcards
progressRoutes.post('/flashcards', async (c) => {
  try {
    const userId = c.get('userId');
    const { learnedWords, shownWords } = await c.req.json();

    if (!Array.isArray(learnedWords)) {
      return c.json({ success: false, error: 'learnedWords array is required' }, 400);
    }

    // Mark shown words
    if (shownWords && Array.isArray(shownWords) && shownWords.length > 0) {
      await markWordsAsShown(c.env.DB, userId, shownWords);
    }

    // Update learned words
    if (learnedWords.length > 0) {
      await updateLearnedWords(c.env.DB, userId, learnedWords);
    }

    return c.json({
      success: true,
      message: 'Flashcard progress updated successfully',
      wordsProcessed: learnedWords.length,
      shownWordsTracked: shownWords ? shownWords.length : 0,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
