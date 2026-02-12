/**
 * User service - replaces backend/models/User.js
 * Handles user CRUD, authentication, and JWT operations
 */
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { now } from '../db/queries.js';
import type { User } from '../types.js';

export async function createUser(
  db: D1Database,
  userData: { firstName: string; lastName: string; username: string; email: string; password: string }
) {
  const { firstName, lastName, username, email, password } = userData;

  // Check if user already exists
  const existing = await db
    .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
    .bind(email, username)
    .first();

  if (existing) {
    throw new Error('User with this email or username already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db
    .prepare(
      `INSERT INTO users (firstName, lastName, username, email, password, registrationDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, firstName, lastName, username, email, registrationDate, totalWordsLearned, currentStreak, totalQuizzesTaken, averageQuizScore, createdAt, updatedAt`
    )
    .bind(firstName, lastName, username, email, hashedPassword, now().split('T')[0], now(), now())
    .first();

  return result;
}

export async function loginUser(db: D1Database, jwtSecret: string, email: string, password: string) {
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Sign JWT with jose
  const secret = new TextEncoder().encode(jwtSecret);
  const token = await new SignJWT({ userId: user.id, email: user.email, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret);

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

export async function getUserById(db: D1Database, userId: number) {
  const user = await db
    .prepare(
      `SELECT id, firstName, lastName, username, email, registrationDate, lastLogin,
              totalWordsLearned, currentStreak, totalQuizzesTaken, averageQuizScore, createdAt, updatedAt
       FROM users WHERE id = ?`
    )
    .bind(userId)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

export async function updateUser(db: D1Database, userId: number, updates: Record<string, unknown>) {
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) {
    throw new Error('User not found');
  }

  // Hash password if being updated
  if (updates.password && typeof updates.password === 'string') {
    updates.password = await bcrypt.hash(updates.password, 10);
  }

  const fields = Object.keys(updates);
  if (fields.length === 0) return getUserById(db, userId);

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  await db
    .prepare(`UPDATE users SET ${setClauses}, updatedAt = ? WHERE id = ?`)
    .bind(...values, now(), userId)
    .run();

  return getUserById(db, userId);
}

export async function deleteUser(db: D1Database, userId: number) {
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) {
    throw new Error('User not found');
  }

  // Cascade delete associated records
  await db.batch([
    db.prepare('DELETE FROM quiz_answers WHERE sessionId IN (SELECT id FROM quiz_sessions WHERE userId = ?)').bind(userId),
    db.prepare('DELETE FROM quiz_sessions WHERE userId = ?').bind(userId),
    db.prepare('DELETE FROM user_word_progress WHERE userId = ?').bind(userId),
    db.prepare('DELETE FROM learning_streaks WHERE userId = ?').bind(userId),
    db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);
}
