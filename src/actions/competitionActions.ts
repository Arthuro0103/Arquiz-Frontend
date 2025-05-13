'use server'

import { revalidatePath } from 'next/cache';
import { getQuizById } from './quizActions'; // Para buscar detalhes do quiz selecionado

// Simulação da estrutura de uma Sala de Competição
interface CompetitionRoom {
  id: string;
  name: string;
  quizId: string;
  quizTitle: string; // Guardar título para exibição fácil
  startTime?: Date;
  accessCode: string; // Código único para estudantes entrarem
  shareableLink: string; // Link direto para a sala
  status: 'pending' | 'active' | 'finished';
  // Adicionar outros campos: ownerId, duration, accessSettings, etc.
}

// Simulação de armazenamento em memória para salas
const roomsStore: Record<string, CompetitionRoom> = {};

// Simulação de resultado da operação
interface RoomActionResult {
  success: boolean;
  message: string;
  room?: CompetitionRoom;
}

// --- Server Actions --- 

// TODO: Implementar lógica real com banco de dados
// TODO: Gerar códigos e links realmente únicos e seguros

export async function createCompetitionRoom(
  data: { name: string; quizId: string; startTime?: Date }
): Promise<RoomActionResult> {
  console.log("[Server Action] createCompetitionRoom chamada com:", data);
  await new Promise(resolve => setTimeout(resolve, 400)); // Simula latência DB

  // Validar se o quiz existe (usando a action simulada)
  const quiz = await getQuizById(data.quizId);
  if (!quiz) {
    return { success: false, message: `Quiz com ID ${data.quizId} não encontrado.` };
  }

  const newRoomId = `room_${Date.now()}`;
  const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Código simples simulado
  const shareableLink = `/join/${newRoomId}`; // Link simulado

  const newRoom: CompetitionRoom = {
    id: newRoomId,
    name: data.name,
    quizId: data.quizId,
    quizTitle: quiz.title,
    startTime: data.startTime,
    accessCode: accessCode,
    shareableLink: shareableLink,
    status: 'pending',
    // ownerId: ... (pegar do usuário logado)
  };
  
  roomsStore[newRoomId] = newRoom;

  console.log("[Server Action] Sala criada (simulada):", newRoomId, "Código:", accessCode);
  // Revalidar páginas que listam salas
  revalidatePath('/dashboard'); 
  revalidatePath('/rooms'); // Página de gerenciamento de salas (a ser criada em 6.3)

  return {
    success: true,
    message: `Sala "${data.name}" criada com sucesso! Código de acesso: ${accessCode}`,
    room: newRoom, // Retorna a sala criada com código e link
  };
}

// Função auxiliar para obter salas (simulado)
export async function getCompetitionRooms(): Promise<CompetitionRoom[]> {
    console.log("[Server Action] getCompetitionRooms chamada");
    await new Promise(resolve => setTimeout(resolve, 200)); 
    return Object.values(roomsStore);
}

export async function getRoomDetails(roomId: string): Promise<CompetitionRoom | null> {
    console.log("[Server Action] getRoomDetails chamada para ID:", roomId);
    await new Promise(resolve => setTimeout(resolve, 100));
    return roomsStore[roomId] || null;
}

// TODO: Adicionar actions para updateRoom, deleteRoom, startRoom, finishRoom, etc. 