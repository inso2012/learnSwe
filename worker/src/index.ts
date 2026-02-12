/**
 * LearnSwe Cloudflare Worker - Hono entry point
 * Replaces backend/app.js (Express)
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { userRoutes } from './routes/users.js';
import { wordRoutes } from './routes/words.js';
import { progressRoutes } from './routes/progress.js';
import { learningRoutes } from './routes/learning.js';
import { dashboardRoutes } from './routes/dashboard.js';
import type { AppEnv } from './types.js';

const app = new Hono<AppEnv>();

// Global middleware
app.use('*', cors());

// Mount routes (same paths as the Express app)
app.route('/api/users', userRoutes);
app.route('/api/words', wordRoutes);
app.route('/api/progress', progressRoutes);
app.route('/api/learning', learningRoutes);
app.route('/api', dashboardRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      words: '/api/words',
      users: '/api/users',
      progress: '/api/progress',
    },
  });
});

export default app;
