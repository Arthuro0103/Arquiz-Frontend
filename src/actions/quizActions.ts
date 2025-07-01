'use server'

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Quiz, ActionResult } from '@/types/quiz';
import type { Session } from 'next-auth';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

if (!BASE_URL) {
  // Lança um erro durante o build se a variável não estiver definida,
  // prevenindo erros em runtime em produção.
  // Em Server Components/Actions, process.env é acessível no servidor.
  console.error("FATAL ERROR: NEXT_PUBLIC_BACKEND_API_URL is not defined.");
  // Dependendo da sua estratégia de erro, você pode querer lançar um erro aqui
  // ou ter um fallback, mas para comunicação com API, é geralmente crítico.
}

// Helper function to get authentication token
async function getAuthToken(): Promise<string | null> {
  const session = await getServerSession(authOptions) as Session | null;
  if (!session || !session.accessToken) {
    console.warn("[quizActions] getAuthToken: Sessão ou accessToken não encontrado.");
    return null;
  }
  return session.accessToken;
}

// --- Server Actions --- 

export async function saveQuiz(quizData: Omit<Quiz, 'id'>): Promise<ActionResult> {
  console.log("[Server Action] saveQuiz: Tentando salvar quiz:", quizData.title);
  if (!BASE_URL) return { success: false, message: "Configuração de API ausente." };

  try {
    const response = await fetch(`${BASE_URL}/quizzes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quizData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao salvar quiz.' }));
      console.error("[Server Action] saveQuiz: Erro da API", response.status, errorData);
      return { success: false, message: errorData.message || `Erro ${response.status} ao salvar quiz.` };
    }

    const result = await response.json(); // Assume que o backend retorna { success, message, quizId, ... } ou similar
    console.log("[Server Action] saveQuiz: Quiz salvo com sucesso:", result.quizId || result.id);

    revalidatePath('/dashboard');
    revalidatePath('/quizzes');
    revalidatePath('/rooms/create'); // Se a criação de salas depende da lista de quizzes

  return {
      success: true, // ou result.success se o backend enviar
      message: result.message || `Quiz "${quizData.title}" salvo com sucesso.`,
      quizId: result.quizId || result.id, // Ajustar conforme o campo retornado pelo backend
    };
  } catch (error: unknown) {
    console.error("[Server Action] saveQuiz: Erro de fetch", error);
    const message = error instanceof Error ? error.message : "Erro de rede ou interno ao tentar salvar quiz.";
    return { success: false, message };
  }
}

export async function updateQuiz(quizId: string, quizData: Partial<Omit<Quiz, 'id'>>): Promise<ActionResult> {
  console.log(`[Server Action] updateQuiz: Tentando atualizar quiz ID: ${quizId}`);
  if (!BASE_URL) return { success: false, message: "Configuração de API ausente." };

  try {
    const response = await fetch(`${BASE_URL}/quizzes/${quizId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quizData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao atualizar quiz.' }));
      console.error("[Server Action] updateQuiz: Erro da API", response.status, errorData);
      return { success: false, message: errorData.message || `Erro ${response.status} ao atualizar quiz.` };
    }

    const result = await response.json();
    console.log("[Server Action] updateQuiz: Quiz atualizado com sucesso:", quizId);

    revalidatePath(`/quizzes/${quizId}`);
  revalidatePath('/quizzes');
  revalidatePath('/dashboard');
    revalidatePath('/rooms/create');

  return {
      success: true, // ou result.success
      message: result.message || `Quiz atualizado com sucesso.`,
    quizId: quizId,
  };
  } catch (error: unknown) {
    console.error("[Server Action] updateQuiz: Erro de fetch", error);
    const message = error instanceof Error ? error.message : "Erro de rede ou interno ao tentar atualizar quiz.";
    return { success: false, message };
  }
}

export async function deleteQuiz(quizId: string): Promise<ActionResult> {
  console.log(`[Server Action] deleteQuiz: Tentando deletar quiz ID: ${quizId}`);
  if (!BASE_URL) return { success: false, message: "Configuração de API ausente." };

  try {
    const response = await fetch(`${BASE_URL}/quizzes/${quizId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      // Se o backend retorna um corpo no erro de delete
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao deletar quiz.' }));
      console.error("[Server Action] deleteQuiz: Erro da API", response.status, errorData);
      return { success: false, message: errorData.message || `Erro ${response.status} ao deletar quiz.` };
    }
    
    // Para DELETE, pode não haver corpo na resposta de sucesso ou ser um { success, message }
    // Se response.status === 204 (No Content), não haverá corpo.
    let successMessage = `Quiz ID ${quizId} deletado com sucesso.`;
    try {
        const result = await response.json(); // Tenta parsear, pode falhar se for 204
        if (result && result.message) successMessage = result.message;
    } catch (error) {
      console.error('Error during quiz validation:', error);
      throw new Error('Erro inesperado durante validação');
    }

    console.log("[Server Action] deleteQuiz: Quiz deletado com sucesso:", quizId);

  revalidatePath('/quizzes');
  revalidatePath('/dashboard');
    revalidatePath('/rooms/create');

  return {
    success: true,
      message: successMessage,
  };
  } catch (error: unknown) {
    console.error("[Server Action] deleteQuiz: Erro de fetch", error);
    const message = error instanceof Error ? error.message : "Erro de rede ou interno ao tentar deletar quiz.";
    return { success: false, message };
  }
}

export async function getQuizzes(): Promise<Quiz[]> {
  console.log("[Server Action] getQuizzes: Buscando todos os quizzes");
  
  if (!BASE_URL) {
    console.error("[Server Action] getQuizzes: Configuração de API ausente.");
    return []; // Return empty array when API is not configured
  }

  try {
    // Get authentication token
    const token = await getAuthToken();
    if (!token) {
      console.error("[Server Action] getQuizzes: Token de autenticação não encontrado.");
      return []; // Return empty array when not authenticated
    }

    const response = await fetch(`${BASE_URL}/quizzes`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        // cache: 'no-store' // Uncomment if you need fresh data always
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro ao buscar quizzes.' }));
      console.error("[Server Action] getQuizzes: Erro da API", response.status, errorData.message);
      return []; // Return empty array on API error
    }

    const quizzes: Quiz[] = await response.json();
    console.log(`[Server Action] getQuizzes: ${quizzes.length} quizzes encontrados.`);
    return quizzes;
  } catch (error: unknown) {
    console.error("[Server Action] getQuizzes: Erro de fetch", error);
    return []; // Return empty array on network error
  }
}

export async function getQuizById(quizId: string): Promise<Quiz | null> {
  console.log(`[Server Action] getQuizById: Buscando quiz ID: ${quizId}`);
  if (!BASE_URL) {
    console.error("[Server Action] getQuizById: Configuração de API ausente.");
    return null;
  }
  if (!quizId) {
    console.warn("[Server Action] getQuizById: ID do quiz não fornecido.");
    return null;
  }

  try {
    // Get authentication token
    const token = await getAuthToken();
    if (!token) {
      console.error("[Server Action] getQuizById: Token de autenticação não encontrado.");
      return null;
    }

    const response = await fetch(`${BASE_URL}/quizzes/${quizId}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        // cache: 'no-store'
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[Server Action] getQuizById: Quiz ID ${quizId} não encontrado (404).`);
        return null;
      }
      const errorData = await response.json().catch(() => ({ message: `Erro ao buscar quiz ${quizId}.` }));
      console.error("[Server Action] getQuizById: Erro da API", response.status, errorData.message);
      return null;
    }

    const quiz: Quiz | null = await response.json();
    if (quiz) {
        console.log(`[Server Action] getQuizById: Quiz ID ${quizId} encontrado.`);
    } else {
        console.warn(`[Server Action] getQuizById: Quiz ID ${quizId} retornou nulo apesar de status OK.`);
    }
    return quiz;
  } catch (error: unknown) {
    console.error(`[Server Action] getQuizById: Erro de fetch para ID ${quizId}`, error);
    return null;
  }
} 