/**
 * Dashboard routes - replaces backend/routes/dashboardApi.js + backend/controllers/dashboardController.js
 */
import { Hono } from 'hono';
import { authenticateToken } from '../middleware/auth.js';
import type { AppEnv } from '../types.js';

export const dashboardRoutes = new Hono<AppEnv>();

// GET /api/users/:userId (dashboard profile)
dashboardRoutes.get('/users/:userId', authenticateToken, async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    const db = c.env.DB;

    const user = await db
      .prepare(
        `SELECT username, createdAt, totalWordsLearned, currentStreak, totalQuizzesTaken, averageQuizScore
         FROM users WHERE id = ?`
      )
      .bind(userId)
      .first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  } catch (error: any) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/users/:userId/word-stats
dashboardRoutes.get('/users/:userId/word-stats', authenticateToken, async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    const db = c.env.DB;

    // Total words by type
    const { results: totalWords } = await db
      .prepare("SELECT type, COUNT(id) as count FROM words GROUP BY type")
      .all<{ type: string; count: number }>();

    // Learned words by type
    const { results: learnedWords } = await db
      .prepare(
        `SELECT w.type, COUNT(uwp.id) as count
         FROM user_word_progress uwp
         JOIN words w ON uwp.wordId = w.id
         WHERE uwp.userId = ? AND uwp.masteryLevel IN ('practicing', 'mastered')
         GROUP BY w.type`
      )
      .bind(userId)
      .all<{ type: string; count: number }>();

    const stats: Record<string, { total: number; learned: number }> = {
      nouns: { total: 0, learned: 0 },
      verbs: { total: 0, learned: 0 },
      adjectives: { total: 0, learned: 0 },
      other: { total: 0, learned: 0 },
    };

    totalWords.forEach((row) => {
      const type = row.type in stats ? row.type : 'other';
      stats[type].total = row.count;
    });

    learnedWords.forEach((row) => {
      const type = row.type in stats ? row.type : 'other';
      stats[type].learned = row.count;
    });

    return c.json(stats);
  } catch (error: any) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/users/:userId/activity
dashboardRoutes.get('/users/:userId/activity', authenticateToken, async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    const db = c.env.DB;

    const { results: wordProgress } = await db
      .prepare(
        `SELECT uwp.updatedAt, uwp.masteryLevel, w.swedish
         FROM user_word_progress uwp
         JOIN words w ON uwp.wordId = w.id
         WHERE uwp.userId = ?
         ORDER BY uwp.updatedAt DESC
         LIMIT 10`
      )
      .bind(userId)
      .all();

    const activities = wordProgress.map((progress: any) => ({
      timestamp: progress.updatedAt,
      description: `Practiced "${progress.swedish}" - Mastery: ${progress.masteryLevel}`,
      type: 'word_progress',
    }));

    return c.json(activities);
  } catch (error: any) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});
