export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export type Variables = {
  userId: number;
  userEmail: string;
  username: string;
};

export type AppEnv = { Bindings: Env; Variables: Variables };

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  registrationDate: string;
  lastLogin: string | null;
  totalWordsLearned: number;
  currentStreak: number;
  totalQuizzesTaken: number;
  averageQuizScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Word {
  id: number;
  swedish: string;
  english: string;
  type: string;
  difficultyLevel: number;
  phonetic: string | null;
  audioUrl: string | null;
  inflections: string | null;   // JSON array of strings
  examples: string | null;      // JSON array of {swedish, english}
  definitions: string | null;   // JSON array of strings
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserWordProgress {
  id: number;
  userId: number;
  wordId: number;
  masteryLevel: string;
  correctAttempts: number;
  totalAttempts: number;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  repetitionInterval: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizSession {
  id: number;
  userId: number;
  quizType: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timeSpent: number | null;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAnswer {
  id: number;
  sessionId: number;
  wordId: number;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: number; // SQLite boolean (0/1)
  answerTime: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearningStreak {
  id: number;
  userId: number;
  date: string;
  wordsLearned: number;
  quizzesTaken: number;
  timeSpent: number;
  isActive: number; // SQLite boolean (0/1)
  createdAt: string;
  updatedAt: string;
}
