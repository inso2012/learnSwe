/**
 * Database test helpers and utilities
 */

const { sequelize, User, Word, UserWordProgress } = require('../../backend/db');

/**
 * Setup test database - create tables and seed basic data
 */
async function setupTestDatabase() {
  try {
    // Force sync database (drops and recreates tables)
    await sequelize.sync({ force: true });
    
    // Create test words
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
    
    console.log('Test database setup completed');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Clean up test database
 */
async function cleanupTestDatabase() {
  try {
    await sequelize.close();
    console.log('Test database cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  }
}

/**
 * Clear test data between tests
 */
async function clearTestData() {
  try {
    // Clear all progress data
    await UserWordProgress.destroy({ where: {}, truncate: true });
    // Clear all users
    await User.destroy({ where: {}, truncate: true });
    // Clear all words
    await Word.destroy({ where: {}, truncate: true });
    console.log('Test data cleared');
  } catch (error) {
    console.error('Failed to clear test data:', error);
    throw error;
  }
}

/**
 * Create a test user
 */
async function createTestUser(userData = {}) {
  const defaultUser = {
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword123',
    totalWordsLearned: 0,
    currentStreak: 0,
    totalQuizzesTaken: 0,
    averageQuizScore: 0
  };
  
  return await User.create({ ...defaultUser, ...userData });
}

/**
 * Clear all user progress data
 */
async function clearUserProgress(userId) {
  await UserWordProgress.destroy({ where: { userId } });
}

/**
 * Get test words by type
 */
async function getTestWords(type = null, limit = 5) {
  const where = type ? { type } : {};
  return await Word.findAll({ where, limit });
}

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  clearTestData,
  createTestUser,
  clearUserProgress,
  getTestWords
};