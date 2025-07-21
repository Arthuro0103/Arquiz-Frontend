// Re-export from shared types for type consistency across the application
export type {
  Quiz,
  QuizDifficulty,
  QuizStatus,
  Question,
  QuestionType,
  QuestionDifficulty,
  QuizSettings,
  QuizResult,
  QuizResponse,
  CreateQuizDto,
  UpdateQuizDto,
  QuizSearchFilters,
  QuizAnalytics,
  DistractorAnalysis,
  PerformanceMetrics
  } from '../../../shared/types';

// Re-export utility functions
export type {
  calculateQuizScore,
  calculatePercentage,
  isQuizPassed,
  getCorrectAnswerCount,
  calculateTotalTime,
  getDifficultyColor,
  validateQuizSettings,
  isQuestionAnswered,
  getQuestionTypeLabel
} from '../../../shared/types';

// Legacy interface for backward compatibility
// @deprecated Use Quiz from shared types instead
export interface QuizQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
}

// Legacy interface for backward compatibility  
// @deprecated Use QuizResponse from shared types instead
export interface ActionResult {
  success: boolean;
  message: string;
  quizId?: string;
  data?: unknown;
} 