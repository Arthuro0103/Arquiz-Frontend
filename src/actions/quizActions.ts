'use server'

import { revalidatePath } from 'next/cache';

// Estrutura do Quiz (idealmente, viria de um arquivo de tipos compartilhado com o backend)
interface QuizQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
}
export interface Quiz { // Exportando para ser usado em outros lugares se necessário
  id: string;
  title: string;
  questions: QuizQuestion[];
  // Adicionar outros campos conforme a necessidade do seu backend (userId, createdAt, etc.)
}

// Resultado da operação (pode ser ajustado conforme a resposta do backend)
export interface ActionResult { // Exportando para ser usado em outros lugares se necessário
  success: boolean;
  message: string;
  quizId?: string; // ou outros dados relevantes retornados pelo backend
  data?: unknown; // Campo genérico para dados adicionais, se houver. Alterado de any para unknown.
}

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

if (!BASE_URL) {
  // Lança um erro durante o build se a variável não estiver definida,
  // prevenindo erros em runtime em produção.
  // Em Server Components/Actions, process.env é acessível no servidor.
  console.error("FATAL ERROR: NEXT_PUBLIC_BACKEND_API_URL is not defined.");
  // Dependendo da sua estratégia de erro, você pode querer lançar um erro aqui
  // ou ter um fallback, mas para comunicação com API, é geralmente crítico.
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
        // Ignora erro de parse se for 204 ou sem corpo.
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
    return []; // Retorna array vazio ou lança erro, dependendo da preferência
  }

  try {
    const response = await fetch(`${BASE_URL}/quizzes`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json', // Informa que esperamos JSON
        },
        // cache: 'no-store' // Descomente se precisar sempre dos dados mais recentes, ignorando cache HTTP
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro ao buscar quizzes.' }));
      console.error("[Server Action] getQuizzes: Erro da API", response.status, errorData.message);
      // Lançar um erro aqui pode ser apropriado se a UI não puder lidar com uma lista vazia em caso de falha
      // throw new Error(errorData.message || `Erro ${response.status} ao buscar quizzes.`);
      return []; // Ou retorna vazio para a UI tratar
    }

    const quizzes: Quiz[] = await response.json();
    console.log(`[Server Action] getQuizzes: ${quizzes.length} quizzes encontrados.`);
    return quizzes;
  } catch (error: unknown) {
    console.error("[Server Action] getQuizzes: Erro de fetch", error);
    // const message = error instanceof Error ? error.message : "Erro de rede ou interno ao buscar quizzes."; // Atribuição removida
    // throw new Error(message); // Ou retorna vazio
    return [];
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
    const response = await fetch(`${BASE_URL}/quizzes/${quizId}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
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
      // throw new Error(errorData.message || `Erro ${response.status} ao buscar quiz ${quizId}.`);
      return null; // Ou lança erro
    }

    const quiz: Quiz | null = await response.json();
    if (quiz) {
        console.log(`[Server Action] getQuizById: Quiz ID ${quizId} encontrado.`);
    } else {
        // Isso pode acontecer se o backend retornar 200 OK com corpo nulo/vazio
        console.warn(`[Server Action] getQuizById: Quiz ID ${quizId} retornou nulo apesar de status OK.`);
    }
    return quiz;
  } catch (error: unknown) {
    console.error(`[Server Action] getQuizById: Erro de fetch para ID ${quizId}`, error);
    // const message = error instanceof Error ? error.message : `Erro de rede ou interno ao buscar quiz ${quizId}.`; // Atribuição removida
    // throw new Error(message); // Ou retorna nulo
    return null;
  }
} 