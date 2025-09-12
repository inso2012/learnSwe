# API Reference Documentation

Complete REST API reference for the Swedish Learning Application.

## 📋 Table of Contents

- [Authentication](#authentication)
- [User Management API](#user-management-api)
- [Words API](#words-api)
- [Learning API](#learning-api)
- [Progress API](#progress-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## 🔐 Authentication

### Overview
The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header for protected endpoints.

```http
Authorization: Bearer <your-jwt-token>
```

### Token Lifecycle
- **Expiration**: Tokens expire after 24 hours
- **Refresh**: Re-login to get a new token
- **Security**: Tokens are signed with a secret key

---

## 👤 User Management API

### Register New User

**Endpoint**: `POST /api/users/register`

**Description**: Register a new user account.

**Request Body**:
```json
{
  "firstName": "Erik",
  "lastName": "Andersson", 
  "username": "erik_a",
  "email": "erik@example.com",
  "password": "securePassword123"
}
```

**Response** (201 Created):
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "firstName": "Erik",
      "lastName": "Andersson",
      "username": "erik_a", 
      "email": "erik@example.com",
      "registrationDate": "2025-09-12T15:30:00.000Z",
      "totalWordsLearned": 0,
      "currentStreak": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validation Rules**:
- `firstName`: 1-50 characters, required
- `lastName`: 1-50 characters, required
- `username`: 3-30 characters, alphanumeric + underscore/hyphen, unique
- `email`: Valid email format, unique
- `password`: Minimum 6 characters

**Error Responses**:
- `400 Bad Request`: Validation errors
- `409 Conflict`: Email or username already exists

---

### User Login

**Endpoint**: `POST /api/users/login`

**Description**: Authenticate user and receive JWT token.

**Request Body**:
```json
{
  "email": "erik@example.com",
  "password": "securePassword123"
}
```

**Response** (200 OK):
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "firstName": "Erik",
      "lastName": "Andersson",
      "email": "erik@example.com",
      "totalWordsLearned": 15,
      "currentStreak": 3
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Missing email or password

---

## 📚 Words API

### Create New Word

**Endpoint**: `POST /api/words`

**Description**: Add a new Swedish vocabulary word.

**Authentication**: Required

**Request Body**:
```json
{
  "swedish": "hus",
  "english": "house",
  "type": "noun",
  "difficultyLevel": 1
}
```

**Response** (201 Created):
```json
{
  "message": "Word created successfully",
  "data": {
    "id": 1,
    "swedish": "hus",
    "english": "house", 
    "type": "noun",
    "difficultyLevel": 1,
    "createdAt": "2025-09-12T15:30:00.000Z"
  }
}
```

**Validation Rules**:
- `swedish`: 1-100 characters, required
- `english`: 1-100 characters, required
- `type`: Must be one of: `noun`, `verb`, `adjective`, `adverb`, `pronoun`, `preposition`, `conjunction`, `interjection`
- `difficultyLevel`: Integer 1-5, defaults to 1

---

### Get All Words

**Endpoint**: `GET /api/words`

**Description**: Retrieve all vocabulary words.

**Authentication**: Required

**Query Parameters**:
- `limit` (optional): Number of words to return (default: 20)
- `offset` (optional): Number of words to skip (default: 0)
- `type` (optional): Filter by word type
- `difficulty` (optional): Filter by difficulty level

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "swedish": "hus",
      "english": "house",
      "type": "noun",
      "difficultyLevel": 1
    },
    {
      "id": 2,
      "swedish": "springa", 
      "english": "run",
      "type": "verb",
      "difficultyLevel": 2
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Update Word

**Endpoint**: `PUT /api/words/:id`

**Description**: Update an existing vocabulary word.

**Authentication**: Required

**URL Parameters**:
- `id`: Word ID to update

**Request Body**:
```json
{
  "swedish": "huset",
  "english": "the house",
  "difficultyLevel": 2
}
```

**Response** (200 OK):
```json
{
  "message": "Word updated successfully",
  "data": {
    "id": 1,
    "swedish": "huset",
    "english": "the house",
    "type": "noun", 
    "difficultyLevel": 2,
    "updatedAt": "2025-09-12T16:00:00.000Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Word with specified ID doesn't exist
- `400 Bad Request`: Validation errors

---

### Delete Word

**Endpoint**: `DELETE /api/words/:id`

**Description**: Delete a vocabulary word.

**Authentication**: Required

**URL Parameters**:
- `id`: Word ID to delete

**Response** (200 OK):
```json
{
  "message": "Word deleted successfully"
}
```

**Error Responses**:
- `404 Not Found`: Word with specified ID doesn't exist

---

## 🎓 Learning API

### Get Flashcards

**Endpoint**: `GET /api/learning/flashcards`

**Description**: Get words for flashcard practice session.

**Authentication**: Required

**Query Parameters**:
- `limit` (optional): Number of flashcards (default: 10, max: 50)

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "swedish": "hus",
      "english": "house",
      "type": "noun",
      "difficultyLevel": 1,
      "progress": {
        "masteryLevel": "learning",
        "correctAttempts": 2,
        "totalAttempts": 5
      }
    },
    {
      "id": 2,
      "swedish": "springa",
      "english": "run", 
      "type": "verb",
      "difficultyLevel": 2,
      "progress": null
    }
  ],
  "sessionInfo": {
    "totalWords": 10,
    "newWords": 3,
    "reviewWords": 7
  }
}
```

**Algorithm**: Returns a mix of new words and words due for review based on spaced repetition.

---

### Get Sentence Examples

**Endpoint**: `GET /api/learning/sentences`

**Description**: Get Swedish sentence examples for a specific word.

**Authentication**: Required

**Query Parameters**:
- `word`: Swedish word to get examples for (required)
- `limit` (optional): Number of sentences (default: 5)

**Response** (200 OK):
```json
{
  "data": {
    "word": "hus",
    "sentences": [
      {
        "swedish": "Jag bor i ett stort hus.",
        "english": "I live in a big house."
      },
      {
        "swedish": "Huset är rött och vitt.",
        "english": "The house is red and white."
      }
    ]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing word parameter
- `404 Not Found`: Word not found in database

---

## 📊 Progress API

### Update Flashcard Progress

**Endpoint**: `POST /api/progress/flashcards`

**Description**: Update user progress after a flashcard session.

**Authentication**: Required

**Request Body**:
```json
{
  "learnedWords": ["hus", "springa", "vatten"],
  "shownWords": ["hus", "springa", "vatten", "bil", "katt"],
  "sessionStats": {
    "duration": 300,
    "accuracy": 85
  }
}
```

**Response** (200 OK):
```json
{
  "message": "Progress updated successfully",
  "data": {
    "wordsLearned": 3,
    "totalSessionWords": 5,
    "newTotalLearned": 18,
    "streakUpdated": true,
    "nextReviewDate": "2025-09-13T15:30:00.000Z"
  }
}
```

**Business Logic**:
- Updates mastery levels based on performance
- Calculates next review dates using spaced repetition
- Updates user's total words learned count
- Maintains learning streak tracking

---

### Get User Statistics

**Endpoint**: `GET /api/progress/stats`

**Description**: Get comprehensive learning statistics for the user.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "data": {
    "totalWordsLearned": 45,
    "currentStreak": 7,
    "longestStreak": 12,
    "averageAccuracy": 87,
    "wordsThisWeek": 15,
    "totalSessions": 23,
    "masteryBreakdown": {
      "learning": 12,
      "practicing": 18,
      "mastered": 15
    },
    "recentActivity": [
      {
        "date": "2025-09-12",
        "wordsLearned": 5,
        "sessionsCompleted": 2,
        "accuracy": 90
      }
    ],
    "upcomingReviews": {
      "today": 8,
      "tomorrow": 12,
      "thisWeek": 35
    }
  }
}
```

---

## ⚠️ Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password", 
        "message": "Password must be at least 6 characters"
      }
    ]
  }
}
```

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| `200` | OK | Successful GET, PUT, DELETE |
| `201` | Created | Successful POST |
| `400` | Bad Request | Validation errors, malformed request |
| `401` | Unauthorized | Missing or invalid token |
| `403` | Forbidden | Valid token but insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource already exists (duplicate) |
| `422` | Unprocessable Entity | Valid request format but logical errors |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side errors |

### Common Error Codes

- `VALIDATION_ERROR`: Request data validation failed
- `AUTHENTICATION_REQUIRED`: Missing authentication token
- `INVALID_TOKEN`: Token is invalid or expired
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `DUPLICATE_RESOURCE`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## 🚦 Rate Limiting

### Default Limits
- **General API**: 1000 requests per hour per IP
- **Authentication**: 10 login attempts per hour per IP
- **Registration**: 5 registrations per hour per IP

### Headers
Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1694534400
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "resetTime": "2025-09-12T16:00:00.000Z",
      "limit": 1000,
      "window": "1 hour"
    }
  }
}
```

---

## 📝 Notes

### Data Formats
- **Dates**: ISO 8601 format (`2025-09-12T15:30:00.000Z`)
- **Text Encoding**: UTF-8
- **Content Type**: `application/json`

### Pagination
For endpoints returning lists, use standard pagination:
- `limit`: Items per page (default: 20, max: 100)
- `offset`: Items to skip
- Response includes pagination metadata

### Internationalization
- Swedish text: Supports all Swedish characters (å, ä, ö)
- Unicode: Full UTF-8 support for international characters
- Case sensitivity: Swedish words are case-insensitive for matching