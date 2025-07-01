// Estrutura do Quiz (idealmente, viria de um arquivo de tipos compartilhado com o backend)
interface QuizQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
}

export enum QuizDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  MIXED = 'mixed',
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  difficulty: QuizDifficulty;
  questions: QuizQuestion[];
  createdBy: string;
  // Adicionar outros campos conforme a necessidade do seu backend (userId, createdAt, etc.)
}

// Resultado da operação (pode ser ajustado conforme a resposta do backend)
export interface ActionResult {
  success: boolean;
  message: string;
  quizId?: string; // ou outros dados relevantes retornados pelo backend
  data?: unknown; // Campo genérico para dados adicionais, se houver. Alterado de any para unknown.
} 