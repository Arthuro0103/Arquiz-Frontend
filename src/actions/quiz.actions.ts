'use server';

import { Quiz, QuestionDifficulty } from '@/types/quiz.types';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Confirme se este path está correto para sua estrutura
import type { Session } from 'next-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
console.log('[quiz.actions.ts] API_BASE_URL:', API_BASE_URL); // Log para depuração

// Helper genérico para lidar com respostas da API (reutilizado de transcription.actions)
async function handleApiResponse(response: Response, operationName: string) {
  if (!response.ok) {
    let errorData;
    let rawErrorBody = '[Não foi possível ler o corpo do erro]';
    try {
      rawErrorBody = await response.text(); // Tenta ler como texto primeiro
      errorData = JSON.parse(rawErrorBody); // Tenta parsear como JSON
    } catch (e: any) {
      // Se o parse falhar, errorData terá o texto e uma mensagem de erro de parse
      errorData = { message: response.statusText, status: response.status, rawBody: rawErrorBody, parseError: e.message };
    }
    console.error(`[quiz.actions.ts] handleApiResponse: API Error during ${operationName}:`, { 
      status: response.status,
      statusText: response.statusText,
      errorResponse: errorData,
      rawErrorBody: rawErrorBody // Logar o corpo bruto do erro
    });
    const errorMessage = errorData?.errors?.[0]?.message || errorData?.message || `Ocorreu um erro na API durante ${operationName}. Status: ${response.status}`;
    throw new Error(errorMessage);
  }
  try {
    const rawResponseBody = await response.text();
    console.log(`[quiz.actions.ts] handleApiResponse: Sucesso em ${operationName}. Status: ${response.status}. Corpo bruto da resposta: ${rawResponseBody}`);
    if (response.status === 204 || rawResponseBody.length === 0) { // 204 No Content ou corpo realmente vazio
        console.log(`[quiz.actions.ts] handleApiResponse: ${operationName} retornou 204 ou corpo vazio, retornando null.`);
        return null; 
    }
    const jsonData = JSON.parse(rawResponseBody);
    console.log(`[quiz.actions.ts] handleApiResponse: ${operationName} JSON parseado com sucesso:`, jsonData);
    return jsonData;
  } catch (e) {
    console.error(`[quiz.actions.ts] handleApiResponse: JSON Parsing Error during ${operationName} after OK response:`, e);
    throw new Error(`Erro ao processar a resposta da API (JSON inválido) durante ${operationName}.`);
  }
}

async function getAuthToken(): Promise<string> {
  const session = await getServerSession(authOptions) as Session | null;
  if (!session || !session.accessToken) {
    console.error("[quiz.actions] getAuthToken: Sessão ou accessToken não encontrado.");
    throw new Error('Usuário não autenticado ou token de acesso ausente.');
  }
  return session.accessToken;
}

export async function createQuiz(quizData: Omit<Quiz, 'id'>): Promise<Quiz> {
  const operation = 'createQuiz';
  console.log(`[${operation}] Iniciando. Título do quiz: ${quizData.title}`);
  try {
    const token = await getAuthToken();
    const userId = 'mockUserId'; // TODO: Obter userId da sessão/autenticação (do payload do token, se disponível)
    if (!quizData.title || quizData.title.trim() === '') {
      console.warn(`[${operation}] Tentativa de criar quiz sem título.`);
      throw new Error('O título do quiz é obrigatório.');
    }
    const quizPayload = { ...quizData, userId };
    console.log(`[${operation}] Payload:`, quizPayload);

    const response = await fetch(`${API_BASE_URL}/quizzes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
  console.log(`[${operation}] Dados recebidos para atualização:`, JSON.stringify(quizData, null, 2));

  const backendUpdateDto: any = {};

  if (quizData.title !== undefined) backendUpdateDto.title = quizData.title;
  if (quizData.description !== undefined) backendUpdateDto.description = quizData.description;
  if (quizData.difficulty !== undefined) backendUpdateDto.difficulty = quizData.difficulty;
  if (quizData.timeLimitMinutes !== undefined) backendUpdateDto.timeLimit = quizData.timeLimitMinutes;
  if (quizData.shuffleQuestions !== undefined) backendUpdateDto.shuffleQuestions = quizData.shuffleQuestions;
  
  if (quizData.showCorrectAnswers !== undefined) {
    backendUpdateDto.showFeedback = quizData.showCorrectAnswers !== 'never';
  }
  
  // Campos que o backend CreateQuizDto/UpdateQuizDto podem aceitar
  if (quizData.status !== undefined) backendUpdateDto.status = quizData.status; 
  if (quizData.transcriptionId !== undefined) backendUpdateDto.transcriptionId = quizData.transcriptionId;
  // maxAttempts não está no tipo Quiz do frontend, se for necessário, adicionar ao tipo e aqui.

  // Mapeamento de questões. O backend UpdateQuizDto (via CreateQuizDto) espera Array de AddQuestionDto
  // AddQuestionDto: { questionId: string; order: number; points: number; isOptional?: boolean; }
  if (quizData.questions && Array.isArray(quizData.questions)) {
    backendUpdateDto.questions = quizData.questions.map(q => {
      if (q.order === undefined || q.points === undefined) {
        console.warn(`[${operation}] Questão ID ${q.id} sem order ou points. Será omitida ou pode causar erro no backend se não forem opcionais.`);
        // Poderia lançar erro ou filtrar esta questão, dependendo da regra de negócio
      }
      return {
        questionId: q.id, 
        order: q.order,
        points: q.points,
        isOptional: q.isOptional, 
      };
    }).filter(q => q.order !== undefined && q.points !== undefined); // Filtra questões sem order/points para segurança
  }

  console.log(`[${operation}] Payload mapeado para o backend:`, JSON.stringify(backendUpdateDto, null, 2));

  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'PATCH', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(backendUpdateDto), 
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
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`
      },
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
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
    // Se o erro for de autenticação, pode ser melhor relançá-lo ou tratar de forma específica
    if (error instanceof Error && error.message.includes('Usuário não autenticado')) {
        throw error;
    }
    return null; // Retorna null em caso de outros erros para o componente tratar
  }
}

export async function getQuizzesByTranscriptionId(transcriptionId: string): Promise<Quiz[]> {
  const operation = 'getQuizzesByTranscriptionId';
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/quizzes?transcriptionId=${transcriptionId}`, { // Ajustar rota se necessário
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    return await handleApiResponse(response, operation) as Quiz[];
  } catch (error) {
    console.error(`[${operation}] Falha ao buscar quizzes para transcrição ${transcriptionId}:`, error);
    if (error instanceof Error && error.message.includes('Usuário não autenticado')) {
        throw error;
    }
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
    const token = await getAuthToken();
    // Normalmente, para buscar os quizzes do *usuário logado*, a API usaria o token para identificar o usuário.
    // Se a API realmente espera um userId no query param E requer autenticação, então a chamada abaixo está correta.
    // Se a API infere o userId do token, o query param userId pode não ser necessário.
    const response = await fetch(`${API_BASE_URL}/quizzes?userId=${userId}`, { // Se a API usa /quizzes/my, ajuste a URL
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    const quizzes = await handleApiResponse(response, operation) as Quiz[];
    console.log(`[${operation}] Encontrados ${quizzes?.length || 0} quizzes para userId ${userId}.`);
    return quizzes || [];
  } catch (error) {
    console.error(`[${operation}] Falha ao buscar quizzes para ${userId}:`, error);
    if (error instanceof Error && error.message.includes('Usuário não autenticado')) {
        throw error;
    }
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
    const token = await getAuthToken();
    
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
      payload.showFeedback = showCorrectAnswers !== 'never';
    }

    console.log(`[quiz.actions.ts] ${operation}: Payload enviado para API NestJS:`, payload);
    
    const httpResponse = await fetch(`${API_BASE_URL}/quizzes/generate-from-transcription`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(payload),
    });

    console.log(`[quiz.actions.ts] ${operation}: Resposta recebida da API NestJS. Status: ${httpResponse.status}, StatusText: ${httpResponse.statusText}`);
    // Não vamos ler o corpo aqui diretamente, handleApiResponse fará isso.

    const generatedQuiz = await handleApiResponse(httpResponse, operation) as Quiz;
    console.log(`[quiz.actions.ts] ${operation}: Quiz gerado e processado por handleApiResponse. ID: ${generatedQuiz?.id}`);

    revalidatePath('/(app)/quizzes');
    if (generatedQuiz.id) revalidatePath(`/(app)/quizzes/${generatedQuiz.id}/editar`);
    return generatedQuiz;
  } catch (error) {
    console.error(`[${operation}] Falha ao gerar quiz a partir da transcrição ${transcriptionId}:`, error);
    // Se o erro for de autenticação, pode ser melhor relançá-lo ou tratar de forma específica
    if (error instanceof Error && error.message.includes('Usuário não autenticado')) {
        throw error;
    }
    // Para outros erros, manter o comportamento anterior
    throw error; // Relança o erro original (que pode ser o da API ou o de autenticação)
  }
} 