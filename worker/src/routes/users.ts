/**
 * User routes - replaces backend/routes/userApi.js + backend/controllers/userController.js
 */
import { Hono } from 'hono';
import { authenticateToken } from '../middleware/auth.js';
import { createUser, loginUser, getUserById, updateUser, deleteUser } from '../services/user.js';
import type { AppEnv } from '../types.js';

export const userRoutes = new Hono<AppEnv>();

// POST /api/users/register
userRoutes.post('/register', async (c) => {
  try {
    const { firstName, lastName, username, email, password } = await c.req.json();

    if (!firstName || !lastName || !username || !email || !password) {
      return c.json({ success: false, error: 'First name, last name, username, email, and password are required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ success: false, error: 'Password must be at least 6 characters long' }, 400);
    }

    const user = await createUser(c.env.DB, { firstName, lastName, username, email, password });

    return c.json({ success: true, message: 'User registered successfully', data: user }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// POST /api/users/login
userRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password are required' }, 400);
    }

    const result = await loginUser(c.env.DB, c.env.JWT_SECRET, email, password);

    return c.json({ success: true, message: 'Login successful', data: result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 401);
  }
});

// GET /api/users/profile (protected)
userRoutes.get('/profile', authenticateToken, async (c) => {
  try {
    const userId = c.get('userId');
    const user = await getUserById(c.env.DB, userId);

    return c.json({ success: true, data: user });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 404);
  }
});

// PUT /api/users/profile (protected)
userRoutes.put('/profile', authenticateToken, async (c) => {
  try {
    const updates = await c.req.json();
    delete updates.email; // Don't allow email update

    const userId = c.get('userId');
    const user = await updateUser(c.env.DB, userId, updates);

    return c.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// DELETE /api/users/account (protected)
userRoutes.delete('/account', authenticateToken, async (c) => {
  try {
    const userId = c.get('userId');
    await deleteUser(c.env.DB, userId);

    return c.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});
