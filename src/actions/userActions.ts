'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Session } from 'next-auth';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:3000"; // Fallback para desenvolvimento

export interface UserActionResponse {
  success: boolean;
  message: string;
  error?: unknown; // Para debug, opcional
}

export async function deleteCurrentUserAccount(password: string): Promise<UserActionResponse> {
  console.log("[Server Action] deleteCurrentUserAccount: Tentando deletar conta.");

  const session = await getServerSession(authOptions) as Session | null;

  if (!session || !session.accessToken) {
    console.warn("[Server Action] deleteCurrentUserAccount: Usuário não autenticado ou token de acesso ausente.");
    return { success: false, message: "Usuário não autenticado ou token de acesso ausente." };
  }

  if (!password) {
    console.warn("[Server Action] deleteCurrentUserAccount: Senha não fornecida.");
    return { success: false, message: "Senha não fornecida para exclusão da conta." };
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}/auth/account`, { // Alterado de /users/me para /auth/account
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ password: password }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: await response.text() || 'Falha ao deletar conta. Resposta não JSON.' };
      }
      console.error("[Server Action] deleteCurrentUserAccount: Erro da API", response.status, errorData);
      return { 
        success: false, 
        message: errorData.message || `Erro ${response.status} ao deletar conta.`,
        error: errorData
      };
    }

    // Se a resposta for 204 No Content, não haverá corpo para parsear
    if (response.status === 204) {
        console.log("[Server Action] deleteCurrentUserAccount: Conta deletada com sucesso (204 No Content).");
        return { success: true, message: "Conta deletada com sucesso." };
    }

    // Tenta parsear se houver corpo (ex: 200 OK com mensagem)
    const result = await response.json(); 
    console.log("[Server Action] deleteCurrentUserAccount: Conta deletada com sucesso.", result);
    return {
      success: true,
      message: result.message || "Conta deletada com sucesso.",
    };

  } catch (error: unknown) {
    console.error("[Server Action] deleteCurrentUserAccount: Erro de fetch ou outra exceção", error);
    const message = error instanceof Error ? error.message : "Erro de rede ou interno ao tentar deletar a conta.";
    return { success: false, message, error };
  }
} 