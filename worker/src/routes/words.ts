/**
 * Word routes - replaces backend/routes/wordApi.js (inline controllers)
 */
import { Hono } from 'hono';
import { createWord, getWords, updateWord, deleteWord } from '../services/word.js';
import type { AppEnv } from '../types.js';

export const wordRoutes = new Hono<AppEnv>();

// POST /api/words
wordRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const word = await createWord(c.env.DB, body);
    return c.json({ success: true, data: word }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// GET /api/words
wordRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const sort = c.req.query('sort') || 'swedish-asc';
    const offset = (page - 1) * limit;

    const validSortColumns: Record<string, string> = {
      swedish: 'swedish',
      english: 'english',
      type: 'type',
    };
    const [field, direction] = sort.split('-');
    const sortColumn = validSortColumns[field] || 'swedish';
    const sortDir = direction === 'desc' ? 'DESC' : 'ASC';

    const countResult = await c.env.DB
      .prepare('SELECT COUNT(*) as total FROM words')
      .first<{ total: number }>();
    const totalCount = countResult?.total || 0;

    const { results } = await c.env.DB
      .prepare(`SELECT * FROM words ORDER BY ${sortColumn} COLLATE NOCASE ${sortDir} LIMIT ? OFFSET ?`)
      .bind(limit, offset)
      .all();

    return c.json({ success: true, data: results, totalCount });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /api/words/:id
wordRoutes.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const word = await updateWord(c.env.DB, id, body);
    if (!word) return c.json({ success: false, error: 'Word not found' }, 404);
    return c.json({ success: true, data: word });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// DELETE /api/words/:id
wordRoutes.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    await deleteWord(c.env.DB, id);
    return c.body(null, 204);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});
