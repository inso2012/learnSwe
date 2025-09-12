/**
 * Tests for Learning API endpoints
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { setupTestDatabase, cleanupTestDatabase, createTestUser, clearTestData } = require('./helpers/database');
const { Word } = require('../db');

describe('Learning API', () => {
  let testUser;
  let authToken;

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
    // Create test user
    testUser = await createTestUser({
      email: `test.${Date.now()}@example.com`,
      username: `testuser${Date.now()}`
    });
    
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Create test words for learning tests
    const testWords = [
      { swedish: 'hej', english: 'hello', type: 'interjection', difficultyLevel: 1 },
      { swedish: 'hus', english: 'house', type: 'noun', difficultyLevel: 1 },
      { swedish: 'vatten', english: 'water', type: 'noun', difficultyLevel: 1 },
      { swedish: 'springa', english: 'run', type: 'verb', difficultyLevel: 2 },
      { swedish: 'stor', english: 'big', type: 'adjective', difficultyLevel: 2 }
    ];
    
    for (const wordData of testWords) {
      await Word.create(wordData);
    }
  });

  describe('GET /api/learning/flashcards', () => {
    test('should return words for learning', async () => {
      const response = await request(app)
        .get('/api/learning/flashcards')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5, difficulty: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check flashcard structure  
      const flashcard = response.body.data[0];
      expect(flashcard).toHaveProperty('swedish');
      expect(flashcard).toHaveProperty('english');
      expect(flashcard).toHaveProperty('type');
      expect(flashcard).toHaveProperty('difficultyLevel');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/learning/flashcards')
        .query({ limit: 5, difficulty: 1 });

      expect(response.status).toBe(401);
    });

    test('should handle limit parameter bounds', async () => {
      // Test minimum limit (0 gets corrected to 1)
      const responseMin = await request(app)
        .get('/api/learning/flashcards')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 0 });

      expect(responseMin.status).toBe(200);
      expect(responseMin.body.success).toBe(true);
      
      // Test maximum limit (anything over 50 gets corrected to 50)
      const responseMax = await request(app)
        .get('/api/learning/flashcards')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 100 });

      expect(responseMax.status).toBe(200);
      expect(responseMax.body.success).toBe(true);
    });
  });

  describe('GET /api/learning/sentences', () => {
    test('should return sentence examples for a word', async () => {
      const response = await request(app)
        .get('/api/learning/sentences')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ word: 'hej', count: 3 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.sentences)).toBe(true);
      
      if (response.body.data.sentences.length > 0) {
        const sentence = response.body.data.sentences[0];
        expect(sentence).toHaveProperty('swedish');
        expect(sentence).toHaveProperty('english');
        expect(sentence).toHaveProperty('difficulty');
        expect(sentence.swedish).toContain('hej');
      }
    });

    test('should require word parameter', async () => {
      const response = await request(app)
        .get('/api/learning/sentences')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ count: 3 }); // Missing word parameter

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle non-existent words gracefully', async () => {
      const response = await request(app)
        .get('/api/learning/sentences')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ word: 'nonexistentword123', count: 3 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Word not found in database');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/learning/sentences')
        .query({ word: 'hej', count: 3 });

      expect(response.status).toBe(401);
    });

    test('should limit sentence count', async () => {
      const response = await request(app)
        .get('/api/learning/sentences')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ word: 'hej', count: 100 }); // Very high count

      expect(response.status).toBe(200);
      expect(response.body.data.sentences.length).toBeLessThanOrEqual(5); // Should be capped
    });
  });
});