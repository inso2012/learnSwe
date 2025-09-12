/**
 * Tests for User authentication and registration
 */

const request = require('supertest');
const app = require('../backend/app');
const { User } = require('../backend/db');
const { setupTestDatabase, cleanupTestDatabase, createTestUser } = require('./helpers/database');

describe('User Authentication', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/users/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john.doe@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.firstName).toBe(userData.firstName);
      expect(response.body.data.lastName).toBe(userData.lastName);
      expect(response.body.data).not.toHaveProperty('password'); // Password should not be returned
      
      // Verify user was created in database
      const userInDB = await User.findOne({ where: { email: userData.email } });
      expect(userInDB).toBeTruthy();
      expect(userInDB.firstName).toBe(userData.firstName);
    });

    test('should validate firstName length', async () => {
      const userData = {
        firstName: '', // Empty firstName
        lastName: 'Doe',
        username: 'johndoe2',
        email: 'john.doe2@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should accept firstName with special characters', async () => {
      const userData = {
        firstName: 'José-María',
        lastName: "O'Connor",
        username: 'josemaria',
        email: 'jose.maria@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should accept firstName with international characters', async () => {
      const userData = {
        firstName: 'Björn',
        lastName: 'Åström',
        username: 'bjornastrom',
        email: 'bjorn.astrom@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Björn');
    });

    test('should reject firstName longer than 50 characters', async () => {
      const userData = {
        firstName: 'A'.repeat(51), // 51 characters
        lastName: 'Doe',
        username: 'longname',
        email: 'longname@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should prevent duplicate email registration', async () => {
      const userData = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane.smith@example.com',
        password: 'password123'
      };

      // Register first time
      await request(app)
        .post('/api/users/register')
        .send(userData);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/users/register')
        .send({
          ...userData,
          username: 'janesmith2'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate password length', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        email: 'test.user@example.com',
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should initialize user with default values', async () => {
      const userData = {
        firstName: 'New',
        lastName: 'User',
        username: 'newuser',
        email: 'new.user@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      expect(response.status).toBe(201);
      
      const userInDB = await User.findOne({ where: { email: userData.email } });
      expect(userInDB.totalWordsLearned).toBe(0);
      expect(userInDB.currentStreak).toBe(0);
      expect(userInDB.totalQuizzesTaken).toBe(0);
      expect(userInDB.averageQuizScore).toBe(0);
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Login',
          lastName: 'Test',
          username: 'logintest',
          email: 'login.test@example.com',
          password: 'password123'
        });
    });

    test('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'login.test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('login.test@example.com');
    });

    test('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'login.test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject non-existent email', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});