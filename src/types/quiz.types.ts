// Fully typed quiz interfaces following TypeScript refactoring standards
// These interfaces ensure type safety across the frontend application

export enum QuizStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum QuizDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_IN_BLANK = 'fill_in_blank',
  ESSAY = 'essay'
}

export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export interface QuestionOption {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
  readonly explanation?: string;
}

// Type alias for backward compatibility
export type QuizOption = QuestionOption;

// Type alias for backward compatibility  
export type QuizQuestion = Question;

export interface Question {
  readonly id: string;
  readonly text: string;
  readonly type: QuestionType;
  readonly difficulty: QuestionDifficulty;
  readonly options: QuestionOption[];
  readonly correctAnswer?: string;
  readonly points: number;
  readonly timeLimit?: number;
  readonly explanation?: string;
  readonly order: number;
}

export interface QuizSettings {
  readonly timePerQuiz?: number;
  readonly timePerQuestion?: number;
  readonly allowSkipping: boolean;
  readonly shuffleQuestions: boolean;
  readonly shuffleOptions: boolean;
  readonly showCorrectAnswers: boolean;
  readonly allowRetake: boolean;
  readonly maxAttempts?: number;
}

export interface Quiz {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly difficulty: QuizDifficulty;
  readonly status: QuizStatus;
  readonly questions: Question[];
  readonly settings: QuizSettings;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly tags: string[];
  readonly category?: string;
  readonly isPublic: boolean;
  readonly timeLimit?: number;
  readonly scoringType?: 'standard' | 'custom' | 'weighted';
}

export interface CreateQuizDto {
  readonly title: string;
  readonly description?: string;
  readonly difficulty: QuizDifficulty;
  readonly timeLimit?: number;
  readonly tags: string[];
  readonly category?: string;
  readonly isPublic: boolean;
  readonly settings: QuizSettings;
}

export interface UpdateQuizDto {
  readonly title?: string;
  readonly description?: string;
  readonly difficulty?: QuizDifficulty;
  readonly status?: QuizStatus;
  readonly timeLimit?: number;
  readonly tags?: string[];
  readonly category?: string;
  readonly isPublic?: boolean;
  readonly settings?: Partial<QuizSettings>;
}

export interface CreateQuestionDto {
  readonly text: string;
  readonly type: QuestionType;
  readonly difficulty: QuestionDifficulty;
  readonly options: Omit<QuestionOption, 'id'>[];
  readonly points: number;
  readonly timeLimit?: number;
  readonly explanation?: string;
}

export interface UpdateQuestionDto {
  readonly text?: string;
  readonly type?: QuestionType;
  readonly difficulty?: QuestionDifficulty;
  readonly options?: QuestionOption[];
  readonly points?: number;
  readonly timeLimit?: number;
  readonly explanation?: string;
}

export interface Answer {
  readonly questionId: string;
  readonly selectedOptions: string[];
  readonly textAnswer?: string;
  readonly isCorrect: boolean;
  readonly points: number;
  readonly timeSpent: number;
}

export interface QuizResult {
  readonly id: string;
  readonly quizId: string;
  readonly participantId: string;
  readonly answers: Answer[];
  readonly totalScore: number;
  readonly maxScore: number;
  readonly percentage: number;
  readonly timeSpent: number;
  readonly completedAt: Date;
  readonly passed: boolean;
}

export interface QuizSearchFilters {
  readonly title?: string;
  readonly difficulty?: QuizDifficulty;
  readonly status?: QuizStatus;
  readonly createdBy?: string;
  readonly category?: string;
  readonly tags?: string[];
  readonly isPublic?: boolean;
}

export interface QuizError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, any>;
}

export interface QuizResponse {
  readonly success: boolean;
  readonly data?: Quiz;
  readonly error?: QuizError;
}

export interface QuizzesResponse {
  readonly success: boolean;
  readonly data?: Quiz[];
  readonly total?: number;
  readonly error?: QuizError;
}

// Analytics interfaces
export interface QuizAnalytics {
  readonly quizId: string;
  readonly totalAttempts: number;
  readonly avgScore: number;
  readonly avgTimeSpent: number;
  readonly passRate: number;
  readonly difficultyDistribution: Record<QuestionDifficulty, number>;
  readonly questionAnalytics: QuestionAnalytics[];
}

export interface QuestionAnalytics {
  readonly questionId: string;
  readonly totalAnswers: number;
  readonly correctAnswers: number;
  readonly incorrectAnswers: number;
  readonly avgTimeSpent: number;
  readonly mostSelectedOption?: string;
}

// Legacy interface for backward compatibility
export interface LegacyQuiz {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly timePerQuestion?: number;
  readonly totalQuestions: number;
  readonly status: 'draft' | 'published' | 'archived';
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
  readonly tags?: string[];
  readonly category?: string;
  readonly isPublic: boolean;
} 