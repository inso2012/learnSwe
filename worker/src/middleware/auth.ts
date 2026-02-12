/**
 * JWT Authentication middleware for Hono
 * Replaces backend/middleware/auth.js
 * Uses jose instead of jsonwebtoken
 */
import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import type { AppEnv } from '../types.js';

/**
 * Required authentication - returns 401/403 on failure
 */
export async function authenticateToken(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ success: false, error: 'Access token is required' }, 401);
  }

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    c.set('userId', payload.userId as number);
    c.set('userEmail', payload.email as string);
    c.set('username', payload.username as string);

    await next();
  } catch {
    return c.json({ success: false, error: 'Invalid or expired token' }, 403);
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      c.set('userId', payload.userId as number);
      c.set('userEmail', payload.email as string);
      c.set('username', payload.username as string);
    } catch {
      // Silently ignore invalid tokens
    }
  }

  await next();
}
