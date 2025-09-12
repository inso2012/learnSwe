# Test Suite for Swedish Learning Application

This directory contains comprehensive tests for the Swedish Learning backend API and functionality.

## Test Structure

```
tests/
├── setup.js                 # Jest setup and configuration
├── helpers/
│   └── database.js          # Database test utilities
├── progress.test.js         # Progress model word counting tests
├── api.progress.test.js     # Progress API endpoint tests
├── api.users.test.js        # User authentication tests
└── api.learning.test.js     # Learning API endpoint tests
```

## Test Categories

### 1. Progress Model Tests (`progress.test.js`)
- **Word counting logic**: Ensures words are counted correctly without double-counting
- **Learning sessions**: Tests mixed new/existing word scenarios
- **Data consistency**: Verifies database and API consistency

### 2. Progress API Tests (`api.progress.test.js`)
- **Flashcard progress tracking**: Tests `/api/progress/flashcard` endpoint
- **Statistics retrieval**: Tests `/api/progress/stats` endpoint
- **Authentication**: Ensures proper auth validation

### 3. User Authentication Tests (`api.users.test.js`)
- **Registration validation**: Tests firstName/lastName validation (fixed regex issues)
- **International names**: Tests support for special characters (José-María, Björn, etc.)
- **Login/logout**: Tests authentication flow
- **Input validation**: Tests password length, duplicate emails, etc.

### 4. Learning API Tests (`api.learning.test.js`)
- **Word retrieval**: Tests word fetching for learning sessions
- **Sentence examples**: Tests the new sentence generation feature
- **Parameter validation**: Tests query parameter validation

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Test Database
1. Copy `.env.test.example` to `.env.test`
2. Update database credentials for your test environment
3. Ensure you have a separate test database (DO NOT use production database)

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npx jest progress.test.js
```

## Critical Test Coverage

### ✅ Fixed Issues Covered:
1. **Word Double-Counting Bug**: Tests ensure words are only counted once
2. **firstName Validation**: Tests ensure international characters work
3. **Mistake Data Isolation**: Tests ensure user-specific mistake storage
4. **Session Progress Accuracy**: Tests ensure accurate learning statistics

### 🔒 Protected Functionality:
- User registration with proper validation
- Word counting accuracy in learning sessions
- Progress tracking consistency
- API authentication and authorization
- Sentence examples generation

## Test Database

Tests use a separate test database that is:
- **Isolated**: Completely separate from development/production data
- **Clean**: Reset before each test suite
- **Seeded**: Pre-populated with test data for consistent testing

## Continuous Integration

These tests are designed to:
- Run quickly (< 30 seconds for full suite)
- Be deterministic (no flaky tests)
- Provide clear failure messages
- Cover critical business logic paths

## Adding New Tests

When adding new features:
1. Create model tests in `tests/`
2. Create API integration tests in `tests/api.*.test.js`
3. Add test data to `helpers/database.js` if needed
4. Update this README

## Test Philosophy

These tests focus on:
- **Critical business logic**: Word counting, user progress, authentication
- **Recently fixed bugs**: Prevent regressions of the double-counting and validation issues
- **API contracts**: Ensure endpoints behave consistently
- **Data integrity**: Ensure database consistency