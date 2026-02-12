/**
 * Learning routes - replaces backend/routes/learningApi.js + backend/controllers/learningController.js
 * + backend/routes/alternativesApi.js + backend/controllers/alternativesController.js
 */
import { Hono } from 'hono';
import { authenticateToken } from '../middleware/auth.js';
import { recordWordProgress, getUserStats } from '../services/progress.js';
import { inClause } from '../db/queries.js';
import type { AppEnv, Word } from '../types.js';

export const learningRoutes = new Hono<AppEnv>();

// All learning routes require authentication
learningRoutes.use('*', authenticateToken);

// GET /api/learning/flashcards
learningRoutes.get('/flashcards', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '10'), 1), 50);
    const difficulty = c.req.query('difficulty');

    const difficultyFilter = difficulty && difficulty !== 'all' ? parseInt(difficulty) : null;
    const timestamp = new Date().toISOString();

    // Get review words (due for review)
    let reviewQuery = `
      SELECT uwp.*, w.id as wId, w.english, w.swedish, w.type, w.difficultyLevel, w.createdAt as wCreatedAt
      FROM user_word_progress uwp
      JOIN words w ON uwp.wordId = w.id
      WHERE uwp.userId = ? AND uwp.nextReviewDate <= ? AND uwp.masteryLevel IN ('learning', 'practicing')
    `;
    const reviewBindings: (string | number)[] = [userId, timestamp];

    if (difficultyFilter) {
      reviewQuery += ' AND w.difficultyLevel = ?';
      reviewBindings.push(difficultyFilter);
    }

    reviewQuery += ' ORDER BY uwp.nextReviewDate ASC LIMIT ?';
    reviewBindings.push(Math.ceil(limit * 0.7));

    const { results: reviewWords } = await db
      .prepare(reviewQuery)
      .bind(...reviewBindings)
      .all();

    const reviewWordsCount = reviewWords.length;
    const remainingSlots = limit - reviewWordsCount;

    // Get seen word IDs
    const { results: seenRows } = await db
      .prepare('SELECT wordId FROM user_word_progress WHERE userId = ?')
      .bind(userId)
      .all<{ wordId: number }>();

    const seenWordIds = seenRows.map((r) => r.wordId);

    // Get new words
    let newWordQuery = 'SELECT * FROM words WHERE 1=1';
    const newBindings: (string | number)[] = [];

    if (seenWordIds.length > 0) {
      const { placeholders, bindings } = inClause(seenWordIds);
      newWordQuery += ` AND id NOT IN ${placeholders}`;
      newBindings.push(...bindings);
    }

    if (difficultyFilter) {
      newWordQuery += ' AND difficultyLevel = ?';
      newBindings.push(difficultyFilter);
    }

    newWordQuery += ' ORDER BY difficultyLevel ASC, createdAt ASC LIMIT ?';
    newBindings.push(remainingSlots > 0 ? remainingSlots : 3);

    const { results: newWords } = await db
      .prepare(newWordQuery)
      .bind(...newBindings)
      .all<Word>();

    // Combine and format
    const allWords = [
      ...reviewWords.map((rw: any) => ({
        id: rw.wId,
        english: rw.english,
        swedish: rw.swedish,
        type: rw.type,
        difficultyLevel: rw.difficultyLevel,
        createdAt: rw.wCreatedAt,
        progress: {
          masteryLevel: rw.masteryLevel,
          correctAttempts: rw.correctAttempts,
          totalAttempts: rw.totalAttempts,
          successRate: rw.totalAttempts > 0 ? ((rw.correctAttempts / rw.totalAttempts) * 100).toFixed(1) : 0,
        },
      })),
      ...newWords.map((word) => ({
        ...word,
        progress: { masteryLevel: 'new', correctAttempts: 0, totalAttempts: 0, successRate: 0 },
      })),
    ];

    // Shuffle
    const shuffled = allWords.sort(() => Math.random() - 0.5);

    return c.json({
      success: true,
      data: shuffled.slice(0, limit),
      meta: { reviewWords: reviewWordsCount, newWords: newWords.length, totalAvailable: allWords.length },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/learning/quiz/vocabulary
learningRoutes.get('/quiz/vocabulary', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const questionCount = parseInt(c.req.query('questions') || '10');
    const quizType = c.req.query('type') || 'mixed';
    const difficulty = c.req.query('difficulty');

    const difficultyFilter = difficulty && difficulty !== 'all' ? parseInt(difficulty) : null;

    // Get review words
    let reviewQuery = `
      SELECT w.* FROM user_word_progress uwp
      JOIN words w ON uwp.wordId = w.id
      WHERE uwp.userId = ?
    `;
    const reviewBindings: (string | number)[] = [userId];

    if (difficultyFilter) {
      reviewQuery += ' AND w.difficultyLevel = ?';
      reviewBindings.push(difficultyFilter);
    }

    reviewQuery += ' ORDER BY RANDOM() LIMIT ?';
    reviewBindings.push(Math.ceil(questionCount * 0.6));

    const { results: reviewWords } = await db.prepare(reviewQuery).bind(...reviewBindings).all<Word>();

    // Get additional random words
    const reviewWordIds = reviewWords.map((w) => w.id);
    let additionalQuery = 'SELECT * FROM words WHERE 1=1';
    const additionalBindings: (string | number)[] = [];

    if (reviewWordIds.length > 0) {
      const { placeholders, bindings } = inClause(reviewWordIds);
      additionalQuery += ` AND id NOT IN ${placeholders}`;
      additionalBindings.push(...bindings);
    }

    if (difficultyFilter) {
      additionalQuery += ' AND difficultyLevel = ?';
      additionalBindings.push(difficultyFilter);
    }

    additionalQuery += ' ORDER BY RANDOM() LIMIT ?';
    additionalBindings.push(questionCount - reviewWords.length);

    const { results: additionalWords } = await db.prepare(additionalQuery).bind(...additionalBindings).all<Word>();

    const allQuizWords = [...reviewWords, ...additionalWords];

    // Generate quiz questions
    const questions = await Promise.all(
      allQuizWords.map(async (word, index) => {
        const questionType =
          quizType === 'mixed'
            ? Math.random() > 0.5
              ? 'swedish-to-english'
              : 'english-to-swedish'
            : quizType;

        const isSwedishToEnglish = questionType === 'swedish-to-english';

        // Get wrong answers
        const { results: wrongAnswers } = await db
          .prepare('SELECT * FROM words WHERE id != ? AND type = ? ORDER BY RANDOM() LIMIT 3')
          .bind(word.id, word.type)
          .all<Word>();

        const options = [
          isSwedishToEnglish ? word.english : word.swedish,
          ...wrongAnswers.map((w) => (isSwedishToEnglish ? w.english : w.swedish)),
        ].sort(() => Math.random() - 0.5);

        return {
          id: index + 1,
          wordId: word.id,
          question: isSwedishToEnglish ? word.swedish : word.english,
          correctAnswer: isSwedishToEnglish ? word.english : word.swedish,
          options,
          type: questionType,
          wordType: word.type,
          difficulty: word.difficultyLevel,
        };
      })
    );

    return c.json({
      success: true,
      data: {
        questions: questions.slice(0, questionCount),
        quizMeta: {
          type: quizType,
          questionCount: Math.min(questionCount, questions.length),
          difficulty: difficulty || 'all',
          reviewWords: reviewWords.length,
          newWords: additionalWords.length,
        },
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/learning/exercise/translation
learningRoutes.get('/exercise/translation', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const count = parseInt(c.req.query('count') || '5');
    const direction = c.req.query('direction') || 'both';

    // Get words user is learning
    const { results: userProgress } = await db
      .prepare(
        `SELECT w.* FROM user_word_progress uwp
         JOIN words w ON uwp.wordId = w.id
         WHERE uwp.userId = ? AND uwp.masteryLevel IN ('learning', 'practicing')
         ORDER BY uwp.lastReviewDate ASC
         LIMIT ?`
      )
      .bind(userId, count * 2)
      .all<Word>();

    let wordsToUse = userProgress;
    if (wordsToUse.length === 0) {
      const { results: randomWords } = await db
        .prepare('SELECT * FROM words ORDER BY RANDOM() LIMIT ?')
        .bind(count)
        .all<Word>();
      wordsToUse = randomWords;
    }

    const exercises = wordsToUse.slice(0, count).map((word, index) => {
      const exerciseDirection =
        direction === 'both' ? (Math.random() > 0.5 ? 'to-swedish' : 'to-english') : direction;

      const isToSwedish = exerciseDirection === 'to-swedish';

      return {
        id: index + 1,
        wordId: word.id,
        prompt: isToSwedish ? word.english : word.swedish,
        correctAnswer: isToSwedish ? word.swedish : word.english,
        direction: exerciseDirection,
        type: word.type,
        hint: `This is a ${word.type}`,
        difficulty: word.difficultyLevel,
      };
    });

    return c.json({ success: true, data: exercises });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/learning/suggestions
learningRoutes.get('/suggestions', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const userStatsData = await getUserStats(db, userId);

    const suggestions: { reviewDue: any[]; newToLearn: any[]; practiceMore: any[] } = {
      reviewDue: [],
      newToLearn: [],
      practiceMore: [],
    };

    const timestamp = new Date().toISOString();

    // Words due for review
    const { results: dueWords } = await db
      .prepare(
        `SELECT uwp.*, w.english, w.swedish, w.type, w.difficultyLevel
         FROM user_word_progress uwp
         JOIN words w ON uwp.wordId = w.id
         WHERE uwp.userId = ? AND uwp.nextReviewDate <= ?
         ORDER BY uwp.nextReviewDate ASC LIMIT 5`
      )
      .bind(userId, timestamp)
      .all();

    suggestions.reviewDue = dueWords.map((uw: any) => ({
      id: uw.wordId,
      english: uw.english,
      swedish: uw.swedish,
      type: uw.type,
      difficultyLevel: uw.difficultyLevel,
      masteryLevel: uw.masteryLevel,
      daysSinceReview: Math.floor(
        (Date.now() - new Date(uw.lastReviewDate).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    // New words to learn
    const { results: seenRows } = await db
      .prepare('SELECT wordId FROM user_word_progress WHERE userId = ?')
      .bind(userId)
      .all<{ wordId: number }>();

    const learnedWordIds = seenRows.map((r) => r.wordId);
    const maxDifficulty = (userStatsData.totalWordsLearned || 0) > 20 ? 3 : 2;

    let newWordQuery = 'SELECT * FROM words WHERE difficultyLevel <= ?';
    const newBindings: (string | number)[] = [maxDifficulty];

    if (learnedWordIds.length > 0) {
      const { placeholders, bindings } = inClause(learnedWordIds);
      newWordQuery += ` AND id NOT IN ${placeholders}`;
      newBindings.push(...bindings);
    }

    newWordQuery += ' ORDER BY difficultyLevel ASC LIMIT 5';

    const { results: newWords } = await db.prepare(newWordQuery).bind(...newBindings).all<Word>();
    suggestions.newToLearn = newWords;

    // Words that need more practice
    const { results: practiceWords } = await db
      .prepare(
        `SELECT uwp.*, w.english, w.swedish, w.type, w.difficultyLevel
         FROM user_word_progress uwp
         JOIN words w ON uwp.wordId = w.id
         WHERE uwp.userId = ? AND uwp.masteryLevel = 'learning' AND uwp.totalAttempts >= 3
         ORDER BY CAST(uwp.correctAttempts AS REAL) / uwp.totalAttempts ASC
         LIMIT 5`
      )
      .bind(userId)
      .all();

    suggestions.practiceMore = practiceWords.map((uw: any) => ({
      id: uw.wordId,
      english: uw.english,
      swedish: uw.swedish,
      type: uw.type,
      difficultyLevel: uw.difficultyLevel,
      masteryLevel: uw.masteryLevel,
      successRate: ((uw.correctAttempts / uw.totalAttempts) * 100).toFixed(1),
    }));

    return c.json({ success: true, data: suggestions });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/learning/session/submit
learningRoutes.post('/session/submit', async (c) => {
  try {
    const userId = c.get('userId');
    const db = c.env.DB;
    const { sessionType, results, timeSpent } = await c.req.json();

    if (!results || !Array.isArray(results)) {
      return c.json({ success: false, error: 'Results array is required' }, 400);
    }

    const processedResults = [];
    for (const result of results) {
      const { wordId, isCorrect, userAnswer, correctAnswer } = result;
      if (!wordId || typeof isCorrect !== 'boolean') continue;

      const progress = await recordWordProgress(db, userId, wordId, isCorrect);
      processedResults.push({
        wordId,
        isCorrect,
        userAnswer,
        correctAnswer,
        newMasteryLevel: progress?.masteryLevel,
        successRate: progress && progress.totalAttempts > 0
          ? ((progress.correctAttempts / progress.totalAttempts) * 100).toFixed(1)
          : '0',
      });
    }

    const correctCount = processedResults.filter((r) => r.isCorrect).length;
    const sessionScore = processedResults.length > 0
      ? ((correctCount / processedResults.length) * 100).toFixed(1)
      : '0';

    return c.json({
      success: true,
      data: {
        sessionType,
        totalQuestions: processedResults.length,
        correctAnswers: correctCount,
        score: parseFloat(sessionScore),
        timeSpent,
        results: processedResults,
      },
      message: `Learning session completed! Score: ${sessionScore}%`,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/learning/alternatives (from learningController + alternativesController)
learningRoutes.get('/alternatives', async (c) => {
  try {
    const db = c.env.DB;
    const word = c.req.query('word');
    const wordId = c.req.query('wordId');
    const count = parseInt(c.req.query('count') || '3');

    if (word) {
      // From learningController.getWordAlternatives
      const originalWord = await db.prepare('SELECT * FROM words WHERE swedish = ?').bind(word).first<Word>();
      if (!originalWord) {
        return c.json({ success: false, error: 'Word not found' }, 404);
      }

      const { results: alternatives } = await db
        .prepare(
          `SELECT english FROM words
           WHERE id != ? AND type = ? AND english != ?
           ORDER BY RANDOM() LIMIT ?`
        )
        .bind(originalWord.id, originalWord.type, originalWord.english, count)
        .all<{ english: string }>();

      return c.json({ success: true, data: alternatives.map((w) => w.english) });
    }

    if (wordId) {
      // From alternativesController.getAlternatives
      const correctWord = await db.prepare('SELECT * FROM words WHERE id = ?').bind(parseInt(wordId)).first<Word>();
      if (!correctWord) {
        return c.json({ success: false, error: 'Word not found' }, 404);
      }

      const { results: alternatives } = await db
        .prepare(
          `SELECT english, type, difficultyLevel FROM words
           WHERE id != ? AND english != ? AND type = ?
             AND difficultyLevel BETWEEN ? AND ?
           ORDER BY RANDOM() LIMIT ?`
        )
        .bind(
          correctWord.id,
          correctWord.english,
          correctWord.type,
          Math.max(1, correctWord.difficultyLevel - 1),
          Math.min(5, correctWord.difficultyLevel + 1),
          count
        )
        .all<{ english: string }>();

      // If not enough, relax constraints
      if (alternatives.length < count) {
        const existingEnglish = alternatives.map((a) => a.english);
        const remaining = count - alternatives.length;

        let fallbackQuery = 'SELECT english FROM words WHERE id != ? AND english != ?';
        const fallbackBindings: (string | number)[] = [correctWord.id, correctWord.english];

        if (existingEnglish.length > 0) {
          const { placeholders, bindings } = inClause(existingEnglish);
          fallbackQuery += ` AND english NOT IN ${placeholders}`;
          fallbackBindings.push(...bindings);
        }

        fallbackQuery += ' ORDER BY RANDOM() LIMIT ?';
        fallbackBindings.push(remaining);

        const { results: moreAlts } = await db.prepare(fallbackQuery).bind(...fallbackBindings).all<{ english: string }>();
        alternatives.push(...moreAlts);
      }

      return c.json({ success: true, data: alternatives.slice(0, count).map((a) => a.english) });
    }

    return c.json({ success: false, error: 'Word or wordId parameter is required' }, 400);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/learning/sentences
learningRoutes.get('/sentences', async (c) => {
  try {
    const db = c.env.DB;
    const word = c.req.query('word');
    const count = parseInt(c.req.query('count') || '3');

    if (!word) {
      return c.json({ success: false, error: 'Word parameter is required' }, 400);
    }

    const wordEntry = await db.prepare('SELECT * FROM words WHERE swedish = ?').bind(word).first<Word>();
    if (!wordEntry) {
      return c.json({ success: false, error: 'Word not found in database' }, 404);
    }

    // Use real examples from Folkets Lexikon if available
    let sentences: { swedish: string; english: string }[] = [];
    if (wordEntry.examples) {
      const examples: { swedish: string; english: string }[] = JSON.parse(wordEntry.examples);
      sentences = examples.slice(0, count);
    }

    return c.json({
      success: true,
      data: {
        word: wordEntry.swedish,
        english: wordEntry.english,
        type: wordEntry.type,
        phonetic: wordEntry.phonetic,
        inflections: wordEntry.inflections ? JSON.parse(wordEntry.inflections) : [],
        sentences,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
