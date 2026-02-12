/**
 * Word service - replaces backend/models/Word.js
 * Simple CRUD operations for words
 */
import { now } from '../db/queries.js';
import type { Word } from '../types.js';

export async function createWord(db: D1Database, data: {
  swedish: string; english: string; type: string; difficultyLevel?: number;
  phonetic?: string; audioUrl?: string; inflections?: string; examples?: string; definitions?: string;
  createdBy?: number;
}) {
  const {
    swedish, english, type, difficultyLevel = 1,
    phonetic = null, audioUrl = null, inflections = null, examples = null, definitions = null,
    createdBy = null,
  } = data;

  const result = await db
    .prepare(
      `INSERT INTO words (swedish, english, type, difficultyLevel, phonetic, audioUrl, inflections, examples, definitions, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(swedish, english, type, difficultyLevel, phonetic, audioUrl, inflections, examples, definitions, createdBy, now(), now())
    .first<Word>();

  return result;
}

export async function getWords(db: D1Database) {
  const { results } = await db.prepare('SELECT * FROM words').all<Word>();
  return results;
}

export async function getWordById(db: D1Database, id: number) {
  return db.prepare('SELECT * FROM words WHERE id = ?').bind(id).first<Word>();
}

export async function updateWord(db: D1Database, id: number, updates: Record<string, unknown>) {
  const word = await db.prepare('SELECT id FROM words WHERE id = ?').bind(id).first();
  if (!word) return null;

  const fields = Object.keys(updates);
  if (fields.length === 0) return getWordById(db, id);

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  await db
    .prepare(`UPDATE words SET ${setClauses}, updatedAt = ? WHERE id = ?`)
    .bind(...values, now(), id)
    .run();

  return getWordById(db, id);
}

export async function deleteWord(db: D1Database, id: number) {
  const word = await db.prepare('SELECT id FROM words WHERE id = ?').bind(id).first();
  if (!word) return;
  await db.prepare('DELETE FROM words WHERE id = ?').bind(id).run();
}
