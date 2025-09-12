/**
 * Integration tests for Progress API endpoints
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../backend/app');
const { Word } = require('../backend/db');
const { setupTestDatabase, cleanupTestDatabase, clearTestData, createTestUser, getTestWords } = require('./helpers/database');

describe('Progress API', () => {
  let testUser;
  let authToken;
  let testWords;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  afterEach(async () => {
    await clearTestData();
  });

  beforeEach(async () => {
    // Create test user and auth token
    testUser = await createTestUser({
      email: `test.${Date.now()}@example.com`,
      username: `testuser${Date.now()}`
    });
    
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Create test words for progress tests
    const testWordData = [
      { swedish: 'hej', english: 'hello', type: 'interjection', difficultyLevel: 1 },
      { swedish: 'hus', english: 'house', type: 'noun', difficultyLevel: 1 },
      { swedish: 'vatten', english: 'water', type: 'noun', difficultyLevel: 1 },
      { swedish: 'springa', english: 'run', type: 'verb', difficultyLevel: 2 },
      { swedish: 'stor', english: 'big', type: 'adjective', difficultyLevel: 2 }
    ];
    
    testWords = [];
    for (const wordData of testWordData) {
      const word = await Word.create(wordData);
      testWords.push(word);
    }
  });

  describe('POST /api/progress/flashcards', () => {
    test('should update progress correctly for new words', async () => {
      const learnedWords = testWords.slice(0, 3).map(w => w.swedish);
      
      const response = await request(app)
        .post('/api/progress/flashcards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learnedWords,
          shownWords: learnedWords,
          timeSpent: 300
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.wordsProcessed).toBe(3);
    });

    test('should handle mixed new and existing words', async () => {
      // First session: learn 2 words
      const firstWords = testWords.slice(0, 2).map(w => w.swedish);
      
      await request(app)
        .post('/api/progress/flashcards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learnedWords: firstWords,
          shownWords: firstWords,
          timeSpent: 200
        });

      // Second session: 1 new word + 1 repeated word
      const secondWords = [testWords[2].swedish, testWords[0].swedish];
      
      const response = await request(app)
        .post('/api/progress/flashcards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learnedWords: secondWords,
          shownWords: secondWords,
          timeSpent: 150
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.wordsProcessed).toBe(2);
      
      // Check stats to ensure correct counting
      const statsResponse = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(statsResponse.body.data.totalWordsLearned).toBe(3);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/progress/flashcards')
        .send({
          learnedWords: ['test'],
          shownWords: ['test'],
          timeSpent: 100
        });

      expect(response.status).toBe(401);
    });

    test('should validate request body', async () => {
      const response = await request(app)
        .post('/api/progress/flashcards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/progress/stats', () => {
    test('should return user statistics', async () => {
      // Learn some words first
      const learnedWords = testWords.slice(0, 2).map(w => w.swedish);
      
      await request(app)
        .post('/api/progress/flashcards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learnedWords,
          shownWords: learnedWords,
          timeSpent: 200
        });

      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalWordsLearned).toBe(2);
      expect(response.body.data.currentStreak).toBeGreaterThanOrEqual(0);
      expect(response.body.data).toHaveProperty('masteryStats');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/progress/stats');

      expect(response.status).toBe(401);
    });
  });
});