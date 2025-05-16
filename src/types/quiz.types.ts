export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctOptionId: string;
  transcriptionId?: string; // Adicionado para vincular à transcrição
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  transcriptionId?: string; // Adicionado para vincular à transcrição
  userId?: string; // Para identificar o proprietário do quiz
  // Novas configurações do Quiz
  timeLimitMinutes?: number; 
  scoringType?: 'default' | 'custom'; // Futuramente podemos ter "points_per_question"
  shuffleQuestions?: boolean;
  showCorrectAnswers?: 'immediately' | 'after_quiz' | 'never';
}

// Adicionando o enum QuestionDifficulty, que estava sendo importado de forma inadequada
export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
} 