/**
 * Tests for Progress model - Word counting and learning logic
 */

const { updateLearnedWords, getUserStats } = require('../backend/models/Progress');
const { User } = require('../backend/db');
const { setupTestDatabase, cleanupTestDatabase, createTestUser, clearUserProgress, getTestWords } = require('./helpers/database');

describe('Progress Model - Word Counting', () => {
  let testUser;
  let testWords;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Create fresh test user for each test
    testUser = await createTestUser({
      email: `test.${Date.now()}@example.com`,
      username: `testuser${Date.now()}`
    });
    
    testWords = await getTestWords();
  });

  afterEach(async () => {
    // Clean up after each test
    if (testUser) {
      await clearUserProgress(testUser.id);
    }
  });

  describe('updateLearnedWords', () => {
    test('should correctly count newly learned words', async () => {
      // Learn 3 words for the first time
      const wordsToLearn = testWords.slice(0, 3).map(w => w.swedish);
      
      await updateLearnedWords(testUser.id, wordsToLearn);
      
      // Check that totalWordsLearned was incremented by 3
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.totalWordsLearned).toBe(3);
    });

    test('should not double-count words already learned', async () => {
      // Learn 3 words first
      const wordsToLearn = testWords.slice(0, 3).map(w => w.swedish);
      await updateLearnedWords(testUser.id, wordsToLearn);
      
      // Learn 2 new words + 1 already learned word
      const mixedWords = [
        ...testWords.slice(3, 5).map(w => w.swedish), // 2 new words
        testWords[0].swedish // 1 already learned word
      ];
      
      await updateLearnedWords(testUser.id, mixedWords);
      
      // Should only increment by 2 (the new words)
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.totalWordsLearned).toBe(5); // 3 from first session + 2 from second
    });

    test('should not increment when practicing only known words', async () => {
      // Learn 2 words first
      const wordsToLearn = testWords.slice(0, 2).map(w => w.swedish);
      await updateLearnedWords(testUser.id, wordsToLearn);
      
      // Practice the same words again
      await updateLearnedWords(testUser.id, wordsToLearn);
      
      // Count should remain at 2
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.totalWordsLearned).toBe(2);
    });

    test('should handle empty word arrays', async () => {
      const initialCount = testUser.totalWordsLearned;
      
      await updateLearnedWords(testUser.id, []);
      
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.totalWordsLearned).toBe(initialCount);
    });

    test('should handle invalid words gracefully', async () => {
      const initialCount = testUser.totalWordsLearned;
      
      // Try to learn words that don't exist in the database
      await updateLearnedWords(testUser.id, ['nonexistent1', 'nonexistent2']);
      
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.totalWordsLearned).toBe(initialCount);
    });
  });

  describe('getUserStats', () => {
    test('should return correct word count after learning', async () => {
      // Learn some words
      const wordsToLearn = testWords.slice(0, 4).map(w => w.swedish);
      await updateLearnedWords(testUser.id, wordsToLearn);
      
      const stats = await getUserStats(testUser.id);
      
      expect(stats.totalWordsLearned).toBe(4);
      expect(stats.currentStreak).toBeGreaterThanOrEqual(0);
      expect(stats).toHaveProperty('masteryStats');
    });

    test('should reflect accurate count after mixed learning sessions', async () => {
      // Session 1: Learn 2 words
      await updateLearnedWords(testUser.id, [testWords[0].swedish, testWords[1].swedish]);
      
      // Session 2: Learn 1 new word + practice 1 old word
      await updateLearnedWords(testUser.id, [testWords[2].swedish, testWords[0].swedish]);
      
      const stats = await getUserStats(testUser.id);
      expect(stats.totalWordsLearned).toBe(3); // Should be 3, not 4
    });
  });

  describe('Progress consistency', () => {
    test('user table and progress calculations should match', async () => {
      // Learn words in multiple sessions
      await updateLearnedWords(testUser.id, [testWords[0].swedish]);
      await updateLearnedWords(testUser.id, [testWords[1].swedish, testWords[2].swedish]);
      await updateLearnedWords(testUser.id, [testWords[1].swedish]); // Repeat one
      
      const userFromDB = await User.findByPk(testUser.id);
      const stats = await getUserStats(testUser.id);
      
      // Both should show the same count
      expect(userFromDB.totalWordsLearned).toBe(stats.totalWordsLearned);
      expect(userFromDB.totalWordsLearned).toBe(3);
    });
  });
});