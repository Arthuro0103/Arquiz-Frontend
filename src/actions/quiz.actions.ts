'use server';

import { Quiz, QuestionDifficulty } from '@/types/quiz.types';
import { revalidatePath } from 'next/cache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper genérico para lidar com respostas da API (reutilizado de transcription.actions)
async function handleApiResponse(response: Response, operationName: string) {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: response.statusText, status: response.status };
    }
    console.error(`API Error during ${operationName}:`, { 
      status: response.status,
      statusText: response.statusText,
      errorResponse: errorData
    });
    const errorMessage = errorData?.errors?.[0]?.message || errorData?.message || `Ocorreu um erro na API durante ${operationName}. Status: ${response.status}`;
    throw new Error(errorMessage);
  }
  try {
    // Handle cases where response.ok is true but body is not valid JSON (e.g. 204 No Content)
    if (response.status === 204) return null; 
    return await response.json();
  } catch (e) {
    console.error(`JSON Parsing Error during ${operationName} after OK response:`, e);
    throw new Error(`Erro ao processar a resposta da API durante ${operationName}.`);
  }
}

export async function createQuiz(quizData: Omit<Quiz, 'id'>): Promise<Quiz> {
  const operation = 'createQuiz';
  console.log(`[${operation}] Iniciando. Título do quiz: ${quizData.title}`);
  try {
    const userId = 'mockUserId'; // TODO: Obter userId da sessão/autenticação
    if (!quizData.title || quizData.title.trim() === '') {
      console.warn(`[${operation}] Tentativa de criar quiz sem título.`);
      throw new Error('O título do quiz é obrigatório.');
    }
    const quizPayload = { ...quizData, userId };
    console.log(`[${operation}] Payload:`, quizPayload);

    const response = await fetch(`${API_BASE_URL}/quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' /* TODO: Auth Token */ },
      body: JSON.stringify(quizPayload),
    });
    const newQuiz = await handleApiResponse(response, operation) as Quiz;
    console.log(`[${operation}] Quiz criado com sucesso. ID: ${newQuiz.id}`);
    revalidatePath('/(app)/quizzes'); 
    if (newQuiz.id) revalidatePath(`/(app)/quizzes/${newQuiz.id}/editar`);
    return newQuiz;
  } catch (error) {
    console.error(`[${operation}] Falha:`, error);
    throw error; 
  }
}

export async function updateQuiz(quizId: string, quizData: Partial<Quiz>): Promise<Quiz> {
  const operation = 'updateQuiz';
  console.log(`[${operation}] Iniciando para quizId: ${quizId}`);
  if (!quizId) {
    console.error(`[${operation}] Tentativa de atualizar quiz sem quizId.`);
    throw new Error('ID do Quiz é obrigatório para atualização.');
  }
  console.log(`[${operation}] Dados para atualização:`, quizData);
  try {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' /* TODO: Auth Token */ },
      body: JSON.stringify(quizData),
    });
    const updatedQuiz = await handleApiResponse(response, operation) as Quiz;
    console.log(`[${operation}] Quiz atualizado com sucesso. ID: ${updatedQuiz.id}`);
    revalidatePath('/(app)/quizzes'); 
    revalidatePath(`/(app)/quizzes/${quizId}/editar`);
    if (updatedQuiz.transcriptionId) revalidatePath(`/transcriptions/${updatedQuiz.transcriptionId}`); 
    return updatedQuiz;
  } catch (error) {
    console.error(`[${operation}] Falha ao atualizar quiz ${quizId}:`, error);
    throw error;
  }
}

export async function deleteQuiz(quizId: string): Promise<{ message: string }> {
  const operation = 'deleteQuiz';
  console.log(`[${operation}] Iniciando para quizId: ${quizId}`);
  if (!quizId) {
    console.error(`[${operation}] Tentativa de deletar quiz sem quizId.`);
    throw new Error('ID do Quiz é obrigatório para deleção.');
  }
  try {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'DELETE',
      headers: { /* TODO: Auth Token */ },
    });
    await handleApiResponse(response, operation); // handleApiResponse retorna null para 204
    console.log(`[${operation}] Quiz deletado com sucesso. ID: ${quizId}`);
    revalidatePath('/(app)/quizzes');
    return { message: 'Quiz excluído com sucesso' };
  } catch (error) {
    console.error(`[${operation}] Falha ao excluir quiz ${quizId}:`, error);
    throw error;
  }
}

export async function getQuizById(quizId: string): Promise<Quiz | null> {
  const operation = 'getQuizById';
  console.log(`[${operation}] Buscando quizId: ${quizId}`);
  if (!quizId) {
    console.warn(`[${operation}] Tentativa de buscar quiz sem quizId.`);
    return null;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' /* TODO: Auth Token */ },
    });
    if (response.status === 404) {
      console.log(`[${operation}] Quiz com ID ${quizId} não encontrado (404).`);
      return null;
    }
    const quiz = await handleApiResponse(response, operation) as Quiz | null;
    console.log(`[${operation}] Quiz ${quizId} encontrado:`, !!quiz);
    return quiz;
  } catch (error) {
    console.error(`[${operation}] Falha ao buscar quiz ${quizId}:`, error);
    return null; // Retorna null em caso de outros erros para o componente tratar
  }
}

export async function getQuizzesByTranscriptionId(transcriptionId: string): Promise<Quiz[]> {
  try {
    // Esta rota pode precisar ser /quizzes?transcriptionId=xxx ou /transcriptions/xxx/quizzes
    // Ajustar conforme a API real
    const response = await fetch(`${API_BASE_URL}/quizzes?transcriptionId=${transcriptionId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Adicionar token de autenticação
      },
    }
  );
    return await handleApiResponse(response, 'getQuizzesByTranscriptionId') as Quiz[];
  } catch (error) {
    console.error(`Falha ao buscar quizzes para transcrição ${transcriptionId}:`, error);
    return [];
  }
}

export async function getQuizzesByUserId(userId: string): Promise<Quiz[]> {
  const operation = 'getQuizzesByUserId';
  console.log(`[${operation}] Buscando quizzes para userId: ${userId}`);
  if (!userId) {
    console.warn(`[${operation}] Tentativa de buscar quizzes sem userId.`);
    return [];
  }
  try {
    const response = await fetch(`${API_BASE_URL}/quizzes?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' /* TODO: Auth Token */ },
    });
    const quizzes = await handleApiResponse(response, operation) as Quiz[];
    console.log(`[${operation}] Encontrados ${quizzes?.length || 0} quizzes para userId ${userId}.`);
    return quizzes || [];
  } catch (error) {
    console.error(`[${operation}] Falha ao buscar quizzes para ${userId}:`, error);
    return [];
  }
}

// Nova Server Action para gerar quiz a partir de transcrição
export async function createQuizFromTranscription(
  transcriptionId: string, 
  numQuestions: number = 5,
  title?: string,
  difficulty?: QuestionDifficulty,
  timeLimitMinutes?: number,
  scoringType?: 'default' | 'custom',
  shuffleQuestions?: boolean,
  showCorrectAnswers?: 'immediately' | 'after_quiz' | 'never'
): Promise<Quiz> {
  const operation = 'createQuizFromTranscription';
  console.log(`[${operation}] Iniciando para transcriçãoId: ${transcriptionId}, Título: ${title}, Perguntas: ${numQuestions}, Dificuldade: ${difficulty}, Limite Tempo: ${timeLimitMinutes}, Embaralhar: ${shuffleQuestions}, Mostrar Respostas: ${showCorrectAnswers}`);
  if (!transcriptionId) {
    console.error(`[${operation}] ID da Transcrição é obrigatório.`);
    throw new Error('ID da Transcrição é obrigatório.');
  }

  try {
    const payload: any = {
      transcriptionId,
      numQuestions,
      title: title || 'Quiz Gerado por IA',
      difficulty: difficulty || QuestionDifficulty.MEDIUM,
    };

    if (timeLimitMinutes !== undefined) {
      payload.timeLimit = timeLimitMinutes * 60; // Backend espera em segundos
    }
    if (shuffleQuestions !== undefined) {
      payload.shuffleQuestions = shuffleQuestions;
    }
    if (showCorrectAnswers !== undefined) {
      // Mapear para showFeedback (boolean). Se não for 'never', então true.
      payload.showFeedback = showCorrectAnswers !== 'never';
    }
    // scoringType não é enviado ao backend por enquanto.

    console.log(`[${operation}] Payload:`, payload);
    const response = await fetch(`${API_BASE_URL}/quizzes/generate-from-transcription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' /* TODO: Auth Token */ },
      body: JSON.stringify(payload),
    });
    const generatedQuiz = await handleApiResponse(response, operation) as Quiz;
    console.log(`[${operation}] Quiz gerado por IA com sucesso. ID: ${generatedQuiz.id}`);
    revalidatePath('/(app)/quizzes');
    if (generatedQuiz.id) revalidatePath(`/(app)/quizzes/${generatedQuiz.id}/editar`);
    return generatedQuiz;
  } catch (error) {
    console.error(`[${operation}] Falha ao gerar quiz a partir da transcrição ${transcriptionId}:`, error);
    throw error;
  }
} 