'use server'

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Session } from 'next-auth';

// Simulação de uma interface para o resultado do processamento
interface ProcessingResult {
  success: boolean;
  message: string;
  quizId?: string; // ID do quiz gerado, se sucesso
}

// TODO: Implementar lógica real de processamento de transcrição (chamada à API de IA, etc.)
// TODO: Adicionar tratamento de erros mais detalhado
// TODO: Considerar indicadores de progresso mais granulares se o processo for longo

export async function processTranscription(
  data: { name: string; content?: string; file?: File }
): Promise<ProcessingResult> {
  console.log("[Server Action] processTranscription chamada com:", { name: data.name, contentProvided: !!data.content, fileProvided: !!data.file });

  let transcriptionText = data.content;

  if (data.file) {
    console.log("[Server Action] Processando arquivo:", data.file.name, data.file.size, data.file.type);
    // TODO: Lógica para ler o conteúdo do arquivo
    // Por enquanto, vamos simular que o arquivo é lido e seu conteúdo é colocado em transcriptionText
    // Em um caso real, você usaria algo como: transcriptionText = await data.file.text();
    if (data.file.type !== 'text/plain') {
      return { success: false, message: 'Formato de arquivo inválido. Apenas .txt é suportado por enquanto.' };
    }
    try {
        // Simulação de leitura de arquivo
        transcriptionText = `Conteúdo simulado do arquivo: ${data.file.name}`;
        await new Promise(resolve => setTimeout(resolve, 500)); // Simula tempo de leitura
    } catch (e) {
        console.error("[Server Action] Erro ao ler arquivo (simulado):", e);
        return { success: false, message: 'Erro ao ler o arquivo.' };
    }
  }

  if (!transcriptionText?.trim()) {
    return { success: false, message: 'Nenhum conteúdo de transcrição fornecido.' };
  }

  console.log("[Server Action] Texto da transcrição para processar:", transcriptionText.substring(0, 100) + "...");

  // Simula o processamento da IA
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simula um erro aleatório em 20% dos casos
  if (Math.random() < 0.2) {
    console.error("[Server Action] Erro simulado no processamento da IA.");
    return { success: false, message: 'Falha simulada ao processar a transcrição pela IA.' };
  }

  const generatedQuizId = `quiz_${Date.now()}`;
  console.log("[Server Action] Processamento concluído. Quiz ID simulado:", generatedQuizId);

  // TODO: Salvar a transcrição e o quiz gerado no banco de dados

  // Revalida o path do dashboard para atualizar a lista de transcrições (se existir uma)
  revalidatePath('/dashboard');

  return {
    success: true,
    message: `Transcrição "${data.name}" processada com sucesso! Quiz gerado.`, // Idealmente, link para o quiz
    quizId: generatedQuizId,
  };
}

// TODO: Substituir pela variável de ambiente
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:3000";

export interface Transcription {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string; 
  // content: string; // O conteúdo pode ser grande, buscar apenas quando necessário ou em uma rota específica
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  // Quaisquer outros campos de paginação como page, limit, etc.
}

export async function getTranscriptions(): Promise<ApiResponse<Transcription[]>> {
  console.log("[Server Action] getTranscriptions: Buscando transcrições.");
  const session = await getServerSession(authOptions) as Session | null;

  if (!session || !session.accessToken) {
    console.error("[Server Action] getTranscriptions: Sessão ou accessToken não encontrado.");
    return { success: false, message: 'Usuário não autenticado.' };
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}/transcriptions/my`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Server Action] getTranscriptions: Erro da API", response.status, errorData);
      return { success: false, message: `Falha ao buscar transcrições: ${response.statusText} - ${errorData}` };
    }

    // O backend retorna um objeto { items: [], total: 0 }
    const paginatedResult: PaginatedResponse<Transcription> = await response.json();
    
    if (!paginatedResult || !Array.isArray(paginatedResult.items)) {
        console.error("[Server Action] getTranscriptions: Resposta da API não continha um array de items.", paginatedResult);
        return { success: false, message: 'Formato de resposta inesperado do servidor.' };
    }

    console.log("[Server Action] getTranscriptions: Transcrições recebidas (items):", paginatedResult.items.length);
    return { success: true, data: paginatedResult.items }; // Retorna apenas o array de items

  } catch (error) {
    console.error("[Server Action] getTranscriptions: Exceção ao buscar transcrições:", error);
    return { success: false, message: 'Ocorreu um erro inesperado ao buscar as transcrições.', error };
  }
}

// Função para adicionar nova transcrição (a ser implementada)
export async function addTranscription(formData: { name: string; description?: string; content: string }): Promise<ApiResponse<Transcription>> {
  console.log("[Server Action] addTranscription: Iniciando. FormData:", JSON.stringify(formData));
  const session = await getServerSession(authOptions) as Session | null;

  console.log("[Server Action] addTranscription: Sessão obtida (getServerSession):", JSON.stringify(session));

  if (!session || !session.accessToken) {
    console.error("[Server Action] addTranscription: Sessão ou accessToken (do backend) não encontrado via getServerSession.");
    // Adicionar um log para o caso de session.user.role não ser teacher, embora o backend que barra.
    if (session && session.user?.role !== 'teacher') {
        console.warn(`[Server Action] addTranscription: Role na sessão (getServerSession) é '${session.user?.role}', não 'teacher'.`);
    }
    return { success: false, message: 'Usuário não autenticado ou token inválido.' };
  }

  const backendToken = session.accessToken;
  console.log("[Server Action] addTranscription: Token do backend que será usado:", backendToken);
  // Log de partes decodificadas do token do backend (apenas para depuração, NUNCA em produção sem cuidado)
  try {
    const tokenParts = backendToken.split('.');
    if (tokenParts.length === 3) {
        const decodedPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf-8'));
        console.log("[Server Action] addTranscription: Payload DECODIFICADO do token do backend (para depuração):", decodedPayload);
    } else {
        console.warn("[Server Action] addTranscription: Token do backend não parece ser um JWT válido (não tem 3 partes).");
    }
  } catch (e) {
    console.error("[Server Action] addTranscription: Erro ao tentar decodificar payload do token do backend:", e);
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Server Action] addTranscription: Erro da API", response.status, errorData);
      return { success: false, message: `Falha ao adicionar transcrição: ${response.statusText} - ${errorData}` };
    }

    const newTranscription: Transcription = await response.json();
    console.log("[Server Action] addTranscription: Transcrição adicionada com sucesso:", newTranscription.id);
    return { success: true, data: newTranscription };

  } catch (error) {
    console.error("[Server Action] addTranscription: Exceção ao adicionar transcrição:", error);
    return { success: false, message: 'Ocorreu um erro inesperado ao adicionar a transcrição.', error };
  }
} 