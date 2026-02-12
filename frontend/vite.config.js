import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        flashcards: resolve(__dirname, 'flashcards.html'),
        quiz: resolve(__dirname, 'quiz.html'),
        words: resolve(__dirname, 'words.html'),
        grammar: resolve(__dirname, 'grammar.html'),
        reviewLearned: resolve(__dirname, 'review-learned.html'),
        reviewMistakes: resolve(__dirname, 'review-mistakes.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787', // Proxy to wrangler dev
    },
  },
});
