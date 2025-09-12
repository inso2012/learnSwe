# Project Structure Documentation

This document explains the refactored project structure for clear separation of concerns.

## Directory Structure

```
learnSwe/
├── backend/                     # Server-side code
│   ├── api/                    # API routes and controllers
│   │   ├── controllers/        # Business logic controllers
│   │   ├── middleware/         # Authentication, validation middleware
│   │   ├── models/             # Database model functions
│   │   ├── routes/             # Express route definitions
│   │   └── services/           # External service integrations
│   ├── data/                   # Static data files
│   ├── migrations/             # Database migration scripts
│   ├── scripts/                # Utility scripts
│   ├── tests/                  # Backend-specific tests
│   │   ├── helpers/            # Test utilities and helpers
│   │   ├── *.test.js           # API and model test files
│   │   ├── setup.js            # Test environment setup
│   │   └── jest.env.js         # Jest environment configuration
│   ├── app.js                  # Express application setup
│   ├── db.js                   # Database configuration and models
│   └── todoApi.js              # Legacy todo functionality
├── frontend/                   # Client-side code
│   ├── css/                    # Stylesheets
│   ├── js/                     # Frontend JavaScript
│   │   ├── auth.js             # Authentication UI logic
│   │   ├── dashboard.js        # Dashboard functionality
│   │   ├── flashcards.js       # Flashcard game logic
│   │   ├── nav.js              # Navigation components
│   │   └── ...                 # Other page-specific scripts
│   ├── tests/                  # Frontend-specific tests
│   ├── assets/                 # Images, fonts, static assets
│   ├── *.html                  # HTML pages
│   └── modal-demo.html         # UI component demos
├── shared/                     # Shared utilities and constants
│   ├── constants/              # Application constants
│   │   └── app.js              # Word types, validation limits, etc.
│   ├── validators/             # Validation functions
│   │   └── index.js            # Shared validation logic
│   └── utils/                  # Utility functions
│       └── index.js            # Date formatting, calculations, etc.
├── coverage/                   # Test coverage reports
├── node_modules/               # Dependencies
├── jest.config.json            # Jest testing configuration
├── package.json               # Project dependencies and scripts
└── README.md                   # Project documentation
```

## Architecture Principles

### 1. Clear Separation of Concerns
- **Backend**: Pure server-side logic, API endpoints, database operations
- **Frontend**: Pure client-side logic, UI interactions, DOM manipulation
- **Shared**: Utilities and constants used by both frontend and backend

### 2. Test Organization
- **Backend Tests**: Located in `/backend/tests/` to keep them close to the code they test
- **Frontend Tests**: Located in `/frontend/tests/` for client-side testing
- **Shared Utilities**: Can be tested from either location as needed

### 3. Shared Code Benefits
- **Constants**: Single source of truth for word types, validation limits, etc.
- **Validators**: Same validation logic on both client and server
- **Utilities**: Consistent date formatting, calculations across the application

## Usage Examples

### Using Shared Constants
```javascript
// Backend usage
const { WORD_TYPES, DIFFICULTY_LEVELS } = require('../../../shared/constants/app');

// Frontend usage (if using module bundler)
import { WORD_TYPES, DIFFICULTY_LEVELS } from '../../shared/constants/app';
```

### Using Shared Validators
```javascript
// Backend validation
const { isValidEmail, isValidPassword } = require('../../../shared/validators');

// Frontend validation
import { isValidEmail, isValidPassword } from '../../shared/validators';
```

### Using Shared Utilities
```javascript
// Backend usage
const { formatDate, calculateAccuracy } = require('../../../shared/utils');

// Frontend usage
import { formatDate, calculateAccuracy } from '../../shared/utils';
```

## Testing

### Running Tests
```bash
# Run all tests (backend + frontend)
npm test

# Run only backend tests
npm run test:backend

# Run only frontend tests  
npm run test:frontend

# Run with coverage
npm run test:coverage
```

### Test Structure
- Backend tests focus on API endpoints, database operations, and business logic
- Frontend tests focus on UI interactions, DOM manipulation, and client-side logic
- Shared code can be tested from either context as appropriate

## Benefits of This Structure

1. **Maintainability**: Clear separation makes code easier to understand and modify
2. **Reusability**: Shared utilities reduce code duplication
3. **Testing**: Tests are organized by the code they test
4. **Scalability**: Easy to add new features in the appropriate directory
5. **Consistency**: Shared validators ensure consistent behavior across client/server
6. **Development**: Developers can focus on specific layers without confusion

## Migration Notes

This structure was refactored from a mixed organization where frontend and backend code was intermixed. The key changes:

1. Moved backend tests to `/backend/tests/`
2. Created `/shared/` directory for common utilities
3. Updated Jest configuration to handle multiple test locations
4. Extracted constants and validators to shared modules
5. Maintained backward compatibility where possible

## Future Enhancements

- Add TypeScript definitions in `/shared/types/`
- Create shared API response interfaces
- Add shared error handling utilities
- Implement shared logging configuration