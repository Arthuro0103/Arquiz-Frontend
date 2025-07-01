'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
// import type { Transcription } from "@/types"; // Removida - tipo local abaixo é usado

// Supondo uma estrutura similar a quiz.types.ts para Transcription
export interface Transcription {
  id: string;
  title: string;
  content?: string; // Ou qualquer campo que represente o texto da transcrição
  userId?: string;
  createdAt?: string;
  // Outros campos relevantes da transcrição
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:7777";

interface ApiResponse {
  items: Transcription[];
  total: number;
  page: number;
  pageSize: number;
}

// Helper para lidar com respostas da API (pode ser movido para um utils comum)
async function handleApiResponse(response: Response, operationName: string) {
  const responseCloneForLogging = response.clone(); // Clonar para poder ler o corpo múltiplas vezes
  if (!response.ok) {
    let errorData;
    let responseBodyText = '';
    try {
      responseBodyText = await responseCloneForLogging.text();
      errorData = JSON.parse(responseBodyText);
    } catch {
      // Silently continue if file reading fails
    }
    console.error(`[handleApiResponse] API Error during ${operationName}:`, { 
      status: response.status,
      statusText: response.statusText,
      errorResponse: errorData,
      rawResponseBody: responseBodyText
    });
    const displayMessage = errorData.message || (typeof errorData.body === 'string' && errorData.body.substring(0,150)) || `Ocorreu um erro na API durante ${operationName}. Status: ${response.status}`;
    throw new Error(displayMessage);
  }
  // Se response.ok, tentar ler como JSON.
  try {
    // Se o status for 204 No Content, não há corpo para fazer parse.
    if (response.status === 204) {
      console.log(`[handleApiResponse] ${operationName} Succeeded with Status 204 No Content.`);
      return null;
    }
    const jsonData = await response.json();
    console.log(`[handleApiResponse] ${operationName} Succeeded. JSON Data:`, jsonData);
    return jsonData;
  } catch (e) {
    const bodyText = await responseCloneForLogging.text(); // Ler corpo como texto se JSON.parse falhar
    console.error(`[handleApiResponse] JSON Parsing Error during ${operationName} after OK response. Status: ${response.status}. Body:`, bodyText, e);
    throw new Error(`Erro ao processar a resposta JSON da API durante ${operationName}. Corpo: ${bodyText.substring(0,100)}`);
  }
}

// Ajustado para buscar as transcrições do usuário logado (via token JWT no backend)
export async function getTranscriptionsByUserId(): Promise<Transcription[]> {
  console.log("Attempting to fetch transcriptions...");
  try {
    console.log("Attempting to get server session...");
    const session = await getServerSession(authOptions);
    console.log("Session object:", JSON.stringify(session, null, 2));

    if (!session || !session.accessToken) {
      console.error("No session or access token found.");
      return [];
    }

    const token = session.accessToken;
    console.log("Access token found:", token ? "****** (exists)" : "null");

    const url = `${API_BASE_URL}/transcriptions/my`;
    console.log(`Fetching transcriptions from URL: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("API response status:", response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `API request failed with status ${response.status}: ${response.statusText}`,
      );
      console.error("Error body:", errorBody);
      return [];
    }

    const data: ApiResponse = await response.json();
    console.log("API response data:", JSON.stringify(data, null, 2));

    if (!data || !Array.isArray(data.items)) {
      console.error(
        "Invalid data structure received from API:",
        JSON.stringify(data),
      );
      return [];
    }
    console.log(`Successfully fetched ${data.items.length} transcriptions.`);
    return data.items;
  } catch (error) {
    console.error("Error fetching transcriptions by user ID:", error);
    return []; // Retornar array vazio em caso de erro, como estava antes.
  }
}

export async function getTranscriptionById(
  id: string,
): Promise<Transcription | null> {
  const operation = "getTranscriptionById";
  console.log(`[${operation}] Iniciando para o ID: ${id}`);

  if (!id) {
    console.warn(`[${operation}] ID da transcrição não fornecido.`);
    return null;
  }

  // Obter a sessão do servidor para acessar o token
  let token: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (session && session.accessToken) {
      token = session.accessToken as string;
    }
  } catch (error) {
    console.error(
      `[${operation}] Erro ao tentar obter a sessão do servidor:`,
      error,
    );
    // Continuar sem token pode ser aceitável se o endpoint for público
    // ou se a lógica de autorização for tratada de outra forma.
    // Por segurança, geralmente é melhor retornar null ou lançar um erro.
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn(
      `[${operation}] Token JWT não encontrado para a requisição da transcrição ${id}.`,
    );
  }

  try {
    console.log(
      `[${operation}] Enviando requisição para ${API_BASE_URL}/transcriptions/${id}`,
    );
    const response = await fetch(`${API_BASE_URL}/transcriptions/${id}`, {
      method: "GET",
      headers,
    });

    console.log(
      `[${operation}] Resposta recebida da API para ${id}. Status: ${response.status}`,
    );
    const data = await handleApiResponse(response, operation); // Usar a função handleApiResponse existente

    if (!data) {
      console.warn(
        `[${operation}] A API retornou uma resposta vazia (null/undefined) para ${id} após handleApiResponse.`,
      );
      return null;
    }
    // Assumindo que a API retorna diretamente o objeto Transcription, não um objeto com 'items'
    console.log(
      `[${operation}] Sucesso ao buscar transcrição ${id}. Título: ${data.title}`,
    );
    return data as Transcription; // Ajustar conforme a estrutura real da resposta
  } catch (error) {
    console.error(
      `[${operation}] ERRO CATASTRÓFICO ao buscar transcrição ${id}:`,
      error instanceof Error ? error.message : String(error),
      error,
    );
    return null;
  }
}
