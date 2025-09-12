/**
 * Jest environment setup - sets test environment variables
 */

// Set test environment variables before any modules are loaded
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing';
process.env.DB_LOGGING = 'false';

// For backwards compatibility if any code still checks these
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test';
process.env.DB_PASS = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';