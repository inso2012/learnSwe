# Swedish Learning Application (LearnSwe)

A comprehensive Swedish language learning platform with flashcard functionality, progress tracking, and interactive learning features.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Contributing](#contributing)

## 🎯 Overview

LearnSwe is a full-stack Swedish language learning application that helps users learn vocabulary through interactive flashcards, track their progress, and practice with real sentences. The application uses a modern tech stack with Node.js/Express backend, vanilla JavaScript frontend, and PostgreSQL/SQLite database support.

## ✨ Features

### Core Learning Features
- **Interactive Flashcards**: Learn Swedish vocabulary with spaced repetition
- **Progress Tracking**: Monitor learning progress with detailed statistics
- **Sentence Examples**: Practice words in context with real Swedish sentences
- **Grammar Lessons**: Learn Swedish grammar rules and patterns
- **Mistake Review**: Review and practice previously incorrect answers

### Spaced Repetition Logic
- New words → Review tomorrow
- Correct answers → Increase interval (1→2→3→7→14→30 days)
- Wrong answers → Decrease interval, back to frequent review
- Mastery levels based on success rate:
  - **Learning**: < 70% success rate
  - **Practicing**: 70-90% success rate  
  - **Mastered**: > 90% success rate with 10+ attempts

### Progress Tracking System
- Every answer updates word progress
- Quiz completion updates user stats
- Daily activity creates learning streaks
- Automatic calculation of next review dates

### Technical Features
- **User Authentication**: Secure JWT-based authentication system
- **RESTful APIs**: Comprehensive REST API for all functionality
- **Database Support**: PostgreSQL for production, SQLite for testing
- **Responsive Design**: Works on desktop and mobile devices
- **Comprehensive Testing**: 100% test coverage with Jest

## 🏗️ Architecture

```
learnSwe/
├── backend/                     # Server-side application
│   ├── controllers/            # Business logic controllers
│   ├── middleware/             # Authentication & validation
│   ├── models/                 # Database model functions
│   ├── routes/                 # Express route definitions
│   ├── tests/                  # Backend test suites
│   └── db.js                   # Database configuration
├── frontend/                   # Client-side application
│   ├── js/                     # Frontend JavaScript
│   ├── css/                    # Stylesheets
│   ├── tests/                  # Frontend test suites
│   └── *.html                  # HTML pages
├── shared/                     # Shared utilities
│   ├── constants/              # Application constants
│   ├── validators/             # Validation functions
│   └── utils/                  # Utility functions
└── docs/                       # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (for production) or SQLite (for testing)
- npm or yarn

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/inso2012/learnSwe.git
   cd learnSwe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.test.example .env
   # Edit .env with your database configuration
   ```

4. **Database setup**
   ```bash
   # For PostgreSQL production setup
   createdb swedish_learning
   
   # For testing (uses SQLite in-memory)
   npm test
   ```

5. **Start the application**
   ```bash
   # Development server
   npm start
   
   # Run tests
   npm test
   
   # Run with coverage
   npm run test:coverage
   ```

6. **Access the application**
   - Backend API: `http://localhost:3000`
   - Frontend: Open `frontend/index.html` in your browser

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### API Endpoints Overview
- **User Management**: `/api/users/*` - Registration, login, profile management
- **Word Management**: `/api/words/*` - CRUD operations for vocabulary
- **Learning System**: `/api/learning/*` - Flashcards and sentence generation
- **Progress Tracking**: `/api/progress/*` - Learning statistics and progress updates

**[📖 Complete API Reference](./docs/API_REFERENCE.md)**

## 🧪 Testing

The project maintains 100% test coverage across all components.

### Running Tests
```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only  
npm run test:frontend

# Generate coverage report
npm run test:coverage
```

### Test Structure
- **Backend Tests**: API endpoints, database models, business logic
- **Frontend Tests**: UI interactions, client-side validation
- **Integration Tests**: End-to-end user workflows

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Write tests for new functionality
- Update documentation for API changes
- Ensure all tests pass before submitting

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Project Structure Documentation](./docs/PROJECT_STRUCTURE.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [Frontend Guide](./docs/FRONTEND_GUIDE.md)