'use server'

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';
import { getQuizById } from './quizActions';
import { QuizDifficulty } from '@/types/quiz';
import * as jwt from 'jsonwebtoken';

// Type definitions for action results
interface JoinRoomResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresAuth?: boolean;
}

interface GetRoomDetailsResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresAuth?: boolean;
}

interface GetParticipantsResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresAuth?: boolean;
}

// Enhanced interface for Competition Room with all new configuration options
interface CompetitionRoom {
  id: string;
  name: string;
  description?: string;
  quizId: string;
  quizTitle: string;
  quizDifficulty: QuizDifficulty;
  shuffleQuestions: boolean;
  timeMode: 'per_question' | 'per_quiz';
  timePerQuestion?: number;
  timePerQuiz?: number;
  showAnswersWhen: 'immediately' | 'after_quiz';
  roomType: 'public' | 'private';
  accessCode: string;
  shareableLink?: string;
  status: 'pending' | 'active' | 'finished';
  createdBy: string; // User ID who created the room
  hostName: string; // Display name of the host
  createdAt: string; // Changed from Date to string for serialization
  updatedAt: string; // Changed from Date to string for serialization
  // Additional fields for future backend integration
  maxParticipants?: number;
  participantCount: number;
  isActive: boolean;
}

// Enhanced interface for form data with validation
interface CreateRoomData {
  name: string;
  description?: string;
  quizId: string;
  shuffleQuestions: boolean;
  timeMode: 'per_question' | 'per_quiz';
  timePerQuestion?: number;
  timePerQuiz?: number;
  showAnswersWhen: 'immediately' | 'after_quiz';
  roomType: 'public' | 'private';
  maxParticipants: number;
}

// Enhanced result interface with better error handling
interface RoomActionResult {
  success: boolean;
  message: string;
  room?: CompetitionRoom;
  error?: string;
  code?: string; // Error code for frontend handling
}

// Helper function to get authentication token with better error handling
async function getAuthToken(): Promise<string | null> {
  try {
    console.log('[Server Action] Getting auth token from session...');
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('[Server Action] No session found');
      return null;
    }

    console.log('[Server Action] Session found:', {
      hasUser: !!session.user,
      userEmail: session.user?.email,
      hasAccessToken: !!session.accessToken
    });
    
    if (!session?.accessToken) {
      console.log('[Server Action] No access token in session');
      return null;
    }

    // Enhanced JWT validation with better error handling
    try {
      const token = jwt.decode(session.accessToken) as jwt.JwtPayload | null;
      
      console.log('[Server Action] Decoded token:', {
        hasToken: !!token,
        hasExp: !!token?.exp,
        iat: token?.iat,
        exp: token?.exp,
        sub: token?.sub
      });
      
      if (!token || !token.exp) {
        console.log('[Server Action] Invalid token structure');
        return null;
      }

      // Check if token is expired with buffer time
      const expirationTime = token.exp * 1000;
      const currentTime = Date.now();
      const bufferTime = 60000; // 1 minute buffer

      console.log('[Server Action] Token timing:', {
        currentTime: new Date(currentTime).toISOString(),
        expirationTime: new Date(expirationTime).toISOString(),
        isExpired: expirationTime < currentTime + bufferTime,
        timeLeft: Math.round((expirationTime - currentTime) / 1000) + 's'
      });

      if (expirationTime < currentTime + bufferTime) {
        console.log('[Server Action] Token expired or expiring soon');
        return null;
      }

      console.log('[Server Action] Token is valid');
      return session.accessToken;
    } catch (jwtError) {
      console.error('[Server Action] JWT decode error:', jwtError);
      return null;
    }
  } catch (error: unknown) {
    console.error('[Server Action] Error getting auth token:', error);
    return null;
  }
}

// Helper function to make authenticated requests to backend
async function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:7777';
  const url = `${API_BASE_URL}${endpoint}`;
  
  const token = await getAuthToken();
  const hasAuth = !!token;

  console.log(`[Server Action] Making request to: ${url}`);
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(options.headers || {})
  };

  const requestConfig: RequestInit = {
    ...options,
    headers
  };

  // Log detailed request information
  console.log('[Server Action] Making request:', {
    method: requestConfig.method || 'GET',
    url,
    hasAuth,
    headers: Object.keys(headers),
    bodyPresent: !!requestConfig.body
  });

  if (requestConfig.body) {
    console.log('[Server Action] Request body:', requestConfig.body);
  }

  try {
    const response = await fetch(url, requestConfig);

    // Log detailed response information
    console.log('[Server Action] Request completed:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
      contentType: response.headers.get('content-type')
    });

    console.log('[Server Action] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorBody: string = '';
      let errorData: unknown = null;
      
      try {
        errorBody = await response.text();
        console.log('[Server Action] Error response body:', errorBody);
        
        if (errorBody) {
          try {
            errorData = JSON.parse(errorBody);
            console.log('[Server Action] Parsed error data:', errorData);
          } catch (parseError) {
            console.log('[Server Action] Could not parse error response as JSON:', parseError);
          }
        }
      } catch (readError) {
        console.error('[Server Action] Error reading response body:', readError);
      }

      // Enhanced error classification
      const errorDetails = (errorData as Record<string, unknown>)?.message || 
                           (errorData as Record<string, unknown>)?.statusCode || 
                           response.statusText;
      
      // Special handling for authentication errors
      if (response.status === 401 || response.status === 403) {
        console.error('[Server Action] Authentication error:', {
          status: response.status,
          hasAuth,
          errorDetails,
          token: token ? 'present' : 'missing'
        });
      }
      
      // Enhanced JWT expiration detection
      if (response.status === 500 && typeof errorDetails === 'string' && errorDetails.includes('jwt expired')) {
        console.error('[Server Action] JWT expiration detected');
        throw new Error('JWT_EXPIRED');
      }
      
      // Enhanced general error logging
      console.error('[Server Action] Request failed:', {
        status: response.status,
        url: response.url,
        hasAuth,
        errorDetails,
        errorBody: errorBody.substring(0, 500) // First 500 chars
      });
      
      throw new Error(`HTTP ${response.status}: ${errorDetails || response.statusText}`);
    }

    return response;
  } catch (error: unknown) {
    // Enhanced network error handling
    const errorObj = error as Error;
    if (errorObj.message === 'JWT_EXPIRED') {
      console.error('[Server Action] JWT expired, re-throwing');
      throw error; // Re-throw JWT expiration errors
    }
    
    console.error('[Server Action] Network error details:', {
      message: errorObj.message,
      name: errorObj.name,
      stack: errorObj.stack?.substring(0, 500), // First 500 chars of stack
      url,
      hasAuth
    });
    throw new Error(`Network error: ${errorObj.message}`);
  }
}

// Utility function to validate time configurations
function validateTimeConfiguration(data: CreateRoomData): { isValid: boolean; error?: string } {
  if (data.timeMode === 'per_question') {
    if (!data.timePerQuestion || data.timePerQuestion < 5) {
      return { isValid: false, error: 'Tempo por pergunta deve ser pelo menos 5 segundos.' };
    }
    if (data.timePerQuestion > 300) {
      return { isValid: false, error: 'Tempo por pergunta não pode exceder 5 minutos.' };
    }
  } else if (data.timeMode === 'per_quiz') {
    if (!data.timePerQuiz || data.timePerQuiz < 30) {
      return { isValid: false, error: 'Tempo total do quiz deve ser pelo menos 30 segundos.' };
    }
    if (data.timePerQuiz > 7200) {
      return { isValid: false, error: 'Tempo total do quiz não pode exceder 2 horas.' };
    }
  }
  return { isValid: true };
}

// Helper function to transform backend room data to frontend format
function transformBackendRoom(backendRoom: {
  id: string;
  name: string;
  description?: string;
  quiz?: { id: string; title: string; difficulty: QuizDifficulty };
  quizId?: string;
  accessCode: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  maxParticipants?: number;
  participantCount?: number;
  timeLimit?: number;
  timeMode?: string;
  timePerQuestion?: number;
  timePerQuiz?: number;
  showAnswersWhen?: string;
  roomType?: string;
  shuffleQuestions?: boolean;
  user?: { name: string };
}): CompetitionRoom {
  return {
    id: backendRoom.id,
    name: backendRoom.name,
    description: backendRoom.description,
    quizId: backendRoom.quiz?.id || backendRoom.quizId || '',
    quizTitle: backendRoom.quiz?.title || 'Quiz não encontrado',
    quizDifficulty: backendRoom.quiz?.difficulty || ('medium' as QuizDifficulty),
    shuffleQuestions: backendRoom.shuffleQuestions || false,
    timeMode: backendRoom.timeMode === 'PER_QUESTION' ? 'per_question' : 'per_quiz',
    timePerQuestion: backendRoom.timePerQuestion,
    timePerQuiz: backendRoom.timePerQuiz,
    showAnswersWhen: backendRoom.showAnswersWhen === 'IMMEDIATELY' ? 'immediately' : 'after_quiz',
    roomType: backendRoom.roomType === 'PUBLIC' ? 'public' : 'private',
    accessCode: backendRoom.accessCode,
    shareableLink: backendRoom.roomType === 'PUBLIC' ? `/join/${backendRoom.id}` : undefined,
    status: (backendRoom.status?.toLowerCase() === 'pending' ? 'pending' : 
             backendRoom.status?.toLowerCase() === 'active' ? 'active' : 
             backendRoom.status?.toLowerCase() === 'waiting' ? 'pending' : 'finished') as 'pending' | 'active' | 'finished',
    createdBy: backendRoom.createdBy,
    hostName: backendRoom.user?.name || 'Professor',
    createdAt: backendRoom.createdAt,
    updatedAt: backendRoom.updatedAt,
    maxParticipants: backendRoom.maxParticipants,
    participantCount: backendRoom.participantCount || 0,
    isActive: backendRoom.status?.toLowerCase() === 'active' || backendRoom.status?.toLowerCase() === 'waiting',
  };
}

// Enhanced server action for creating competition rooms
export async function createCompetitionRoom(
  data: CreateRoomData
): Promise<RoomActionResult> {
  try {
    console.log('[Server Action] createCompetitionRoom iniciada com:', {
      name: data.name,
      quizId: data.quizId,
      timeMode: data.timeMode,
      roomType: data.roomType
    });

    // Get user session for authentication
    const session = await getServerSession(authOptions) as Session | null;
    if (!session || !session.user?.id) {
      return {
        success: false,
        message: 'Usuário não autenticado. Faça login para criar salas.',
        code: 'UNAUTHORIZED'
      };
    }

    // Check if user is a teacher
    if (session.user.role !== 'teacher') {
      return {
        success: false,
        message: 'Apenas professores podem criar salas de competição.',
        code: 'FORBIDDEN'
      };
    }

    // Validate required fields
    if (!data.name?.trim()) {
      return { success: false, message: 'Nome da sala é obrigatório.', code: 'VALIDATION_ERROR' };
    }

    if (!data.quizId?.trim()) {
      return { success: false, message: 'Quiz deve ser selecionado.', code: 'VALIDATION_ERROR' };
    }

    // Validate time configuration
    const timeValidation = validateTimeConfiguration(data);
    if (!timeValidation.isValid) {
      return { 
        success: false, 
        message: timeValidation.error!, 
        code: 'VALIDATION_ERROR' 
      };
    }

    // Validate quiz exists
  const quiz = await getQuizById(data.quizId);
  if (!quiz) {
      return { 
        success: false, 
        message: `Quiz com ID ${data.quizId} não encontrado.`,
        code: 'QUIZ_NOT_FOUND'
      };
  }

    // Check if teacher already has an active room
    try {
      const existingRoomsResponse = await makeAuthenticatedRequest('/rooms');
      if (existingRoomsResponse.ok) {
        const existingRooms: Array<{ id: string; name: string; status: string; createdBy: string }> = await existingRoomsResponse.json();
        const activeRoom = existingRooms.find((room) => 
          room.createdBy === session.user?.id && 
          (room.status === 'PENDING' || room.status === 'ACTIVE')
        );

        if (activeRoom) {
          return {
            success: false,
            message: `Você já possui uma sala ativa: "${activeRoom.name}". Finalize ou exclua a sala atual antes de criar uma nova.`,
            code: 'ACTIVE_ROOM_EXISTS'
          };
        }
      }
    } catch (error) {
      console.warn('[Server Action] Could not check for existing rooms:', error);
      // Continue with room creation
    }

    // Prepare backend room data
    const backendRoomData = {
      name: data.name.trim(),
      description: data.description?.trim(),
    quizId: data.quizId,
      maxParticipants: data.maxParticipants || 30,
      timeLimit: data.timeMode === 'per_quiz' ? (data.timePerQuiz || 0) : 0,
      showLeaderboard: false,
      showCorrectAnswers: data.showAnswersWhen === 'immediately',
      allowLateJoin: true,
      shuffleQuestions: data.shuffleQuestions,
      timeMode: data.timeMode === 'per_question' ? 'per_question' : 'per_quiz',
      timePerQuestion: data.timePerQuestion,
      timePerQuiz: data.timePerQuiz,
      showAnswersWhen: data.showAnswersWhen === 'immediately' ? 'immediately' : 'after_quiz',
      roomType: data.roomType === 'public' ? 'public' : 'private'
    };

    console.log('[Server Action] Creating room in backend database:', backendRoomData);

    // Create room in backend
    const response = await makeAuthenticatedRequest('/rooms', {
      method: 'POST',
      body: JSON.stringify(backendRoomData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Server Action] Failed to create room in backend:', errorData);
      return {
        success: false,
        message: errorData.message || 'Erro ao criar sala no servidor.',
        code: 'BACKEND_ERROR'
      };
    }

    const backendRoom = await response.json();
    console.log('[Server Action] Room created successfully in backend:', backendRoom.id);

    // If quiz information is missing, fetch it separately
    if (!backendRoom.quiz && backendRoom.quizId) {
      try {
        const quiz = await getQuizById(backendRoom.quizId);
        if (quiz) {
          backendRoom.quiz = {
            id: quiz.id,
            title: quiz.title,
            difficulty: quiz.difficulty
          };
        }
      } catch (error) {
        console.warn('[Server Action] Could not fetch quiz details:', error);
      }
    }

    // Transform backend room to frontend format
    const room = transformBackendRoom(backendRoom);

    console.log('[Server Action] Sala criada com sucesso:', {
      id: room.id,
      accessCode: room.accessCode,
      roomType: data.roomType,
      createdBy: session.user.id
    });

    // Revalidate relevant pages
    revalidatePath('/rooms');
  revalidatePath('/dashboard'); 

  return {
    success: true,
      message: `Sala "${data.name}" criada com sucesso! ${
        data.roomType === 'private' 
          ? `Código de acesso: ${room.accessCode}` 
          : 'Sala pública disponível para todos.'
      }`,
      room: room,
    };

  } catch (error) {
    console.error('[Server Action] Erro ao criar sala:', error);
    return {
      success: false,
      message: 'Erro interno do servidor. Tente novamente.',
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

// Enhanced function to get competition rooms from backend
export async function getCompetitionRooms(): Promise<CompetitionRoom[]> {
  console.log('[Server Action] getCompetitionRooms iniciada');
  
  try {
    const response = await makeAuthenticatedRequest('/rooms');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rooms: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Server Action] Raw backend data:', data);

    if (!Array.isArray(data)) {
      console.warn('[Server Action] Backend returned non-array data:', data);
      return [];
    }

    const transformedRooms = data.map(transformBackendRoom);
    console.log('[Server Action] Transformed rooms:', transformedRooms);

    return transformedRooms;
  } catch (error: unknown) {
    console.error('[Server Action] getCompetitionRooms error:', error);
    
    // Enhanced error handling for JWT expiration
    const errorObj = error as Error;
    if (errorObj.message === 'JWT_EXPIRED') {
      throw new Error('SESSION_EXPIRED');
    }
    
    // Enhanced error handling for other cases
    if (errorObj.message?.includes('HTTP 500')) {
      throw new Error('BACKEND_ERROR');
    }
    
    if (errorObj.message?.includes('Network error')) {
      throw new Error('NETWORK_ERROR');
    }
    
    throw error;
  }
}

// Enhanced function to get room details from backend
export async function getRoomDetails(roomId: string): Promise<CompetitionRoom | null> {
  try {
    console.log('[Server Action] getRoomDetails iniciada para ID:', roomId);
    
    // Get room from backend
    const response = await makeAuthenticatedRequest(`/rooms/${roomId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('[Server Action] Room not found in backend:', roomId);
        return null;
      }
      console.error('[Server Action] Failed to fetch room from backend:', response.status);
      return null;
    }

    const backendRoom = await response.json();
    console.log('[Server Action] Room fetched successfully from backend:', backendRoom.id);

    // Transform backend room to frontend format
    const room = transformBackendRoom(backendRoom);
    
    console.log('[Server Action] Room details retrieved successfully');
    return room;

  } catch (error) {
    console.error('[Server Action] Erro ao buscar detalhes da sala:', error);
    return null;
  }
}

// Function to get room by access code from backend
export async function getRoomByAccessCode(accessCode: string): Promise<CompetitionRoom | null> {
  try {
    console.log('[Server Action] getRoomByAccessCode iniciada para código:', accessCode);
    
    // Get room from backend by access code
    const response = await makeAuthenticatedRequest(`/rooms/access/${accessCode}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('[Server Action] Room not found with access code:', accessCode);
        return null;
      }
      console.error('[Server Action] Failed to fetch room by access code:', response.status);
      return null;
    }

    const backendRoom = await response.json();
    console.log('[Server Action] Room found by access code:', backendRoom.id);

    // Transform backend room to frontend format
    const room = transformBackendRoom(backendRoom);
    
    console.log('[Server Action] Room retrieved by access code successfully');
    return room;

  } catch (error) {
    console.error('[Server Action] Erro ao buscar sala por código de acesso:', error);
    return null;
  }
}

// Function to update room status in backend
export async function updateRoomStatus(
  roomId: string, 
  status: 'pending' | 'active' | 'finished'
): Promise<RoomActionResult> {
  try {
    console.log('[Server Action] updateRoomStatus iniciada:', { roomId, status });

    // Get user session for authentication
    const session = await getServerSession(authOptions) as Session | null;
    if (!session || !session.user?.id) {
      return {
        success: false,
        message: 'Usuário não autenticado.',
        code: 'UNAUTHORIZED'
      };
    }

    // Update room status in backend
    const response = await makeAuthenticatedRequest(`/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        status: status.toUpperCase() 
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Server Action] Failed to update room status:', errorData);
      return {
        success: false,
        message: errorData.message || 'Erro ao atualizar status da sala.',
        code: 'BACKEND_ERROR'
      };
    }

    const updatedBackendRoom = await response.json();
    console.log('[Server Action] Room status updated successfully:', updatedBackendRoom.id);

    // Transform backend room to frontend format
    const room = transformBackendRoom(updatedBackendRoom);

    // Revalidate relevant pages
    revalidatePath('/rooms');
    revalidatePath(`/rooms/${roomId}`);

    return {
      success: true,
      message: `Status da sala atualizado para ${status}.`,
      room: room
    };

  } catch (error) {
    console.error('[Server Action] Erro ao atualizar status da sala:', error);
    return {
      success: false,
      message: 'Erro interno do servidor.',
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

// Function to delete room from backend
export async function deleteRoom(roomId: string): Promise<RoomActionResult> {
  try {
    console.log('[Server Action] deleteRoom iniciada para ID:', roomId);

    // Get user session for authentication
    const session = await getServerSession(authOptions) as Session | null;
    if (!session || !session.user?.id) {
      return {
        success: false,
        message: 'Usuário não autenticado.',
        code: 'UNAUTHORIZED'
      };
    }

    // Delete room from backend
    const response = await makeAuthenticatedRequest(`/rooms/${roomId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Server Action] Failed to delete room:', errorData);
      return {
        success: false,
        message: errorData.message || 'Erro ao excluir sala.',
        code: 'BACKEND_ERROR'
      };
    }

    console.log('[Server Action] Room deleted successfully:', roomId);

    // Revalidate relevant pages
    revalidatePath('/rooms');

    return {
      success: true,
      message: 'Sala excluída com sucesso.'
    };

  } catch (error) {
    console.error('[Server Action] Erro ao excluir sala:', error);
    return {
      success: false,
      message: 'Erro interno do servidor.',
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

// Debug function to test backend connectivity
export async function testBackendConnectivity(): Promise<{
  success: boolean;
  message: string;
  details: Record<string, unknown>;
}> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:7777';
  
  console.log('[Server Action] Testing backend connectivity...');
  
  const results = {
    serverReachable: false,
    socketEndpoint: false,
    apiEndpoint: false,
    authStatus: 'unknown' as 'valid' | 'expired' | 'missing' | 'unknown',
    tokenInfo: null as Record<string, unknown> | null,
    errorDetails: {} as Record<string, unknown>
  };

  try {
    // Enhanced token validation first
    console.log('[Server Action] Checking authentication status...');
    const token = await getAuthToken();
    
    if (!token) {
      const session = await getServerSession(authOptions);
      if (session?.accessToken) {
        try {
          const decodedToken = jwt.decode(session.accessToken) as jwt.JwtPayload | null;
          if (decodedToken?.exp && decodedToken.exp * 1000 < Date.now()) {
            results.authStatus = 'expired';
            results.tokenInfo = {
              expiredAt: new Date(decodedToken.exp * 1000).toISOString(),
              currentTime: new Date().toISOString()
            };
            console.log('[Server Action] Token appears to be expired', results.tokenInfo);
          } else {
            results.authStatus = 'unknown';
          }
        } catch (jwtError) {
          results.authStatus = 'unknown';
          results.errorDetails.tokenParsing = jwtError instanceof Error ? jwtError.message : 'Unknown error';
        }
      } else {
        results.authStatus = 'missing';
      }
    } else {
      results.authStatus = 'valid';
    }

    // Test base server availability
    console.log('[Server Action] Testing base server availability...');
    try {
      const baseResponse = await fetch(API_BASE_URL, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });
      results.serverReachable = baseResponse.status < 500;
      results.errorDetails.baseServer = {
        status: baseResponse.status,
        statusText: baseResponse.statusText,
        reachable: results.serverReachable
      };
    } catch (baseError) {
      results.errorDetails.baseServer = baseError instanceof Error ? baseError.message : 'Unknown error';
    }

    // Test Socket.IO endpoint
    console.log('[Server Action] Testing Socket.IO endpoint...');
    try {
      const socketResponse = await fetch(`${API_BASE_URL}/socket.io/`, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });
      results.socketEndpoint = socketResponse.status < 500;
      results.errorDetails.socketEndpoint = {
        status: socketResponse.status,
        statusText: socketResponse.statusText,
        available: results.socketEndpoint
      };
    } catch (socketError) {
      results.errorDetails.socketEndpoint = socketError instanceof Error ? socketError.message : 'Unknown error';
    }

    // Test API endpoint with authentication
    console.log('[Server Action] Testing API endpoint...');
    try {
      const apiResponse = await fetch(`${API_BASE_URL}/api`, { 
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(10000)
      });
      results.apiEndpoint = apiResponse.status < 500;
      results.errorDetails.apiEndpoint = {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        hasAuth: !!token,
        available: results.apiEndpoint
      };
    } catch (apiError) {
      results.errorDetails.apiEndpoint = apiError instanceof Error ? apiError.message : 'Unknown error';
    }

    // Enhanced status determination
    const isServerUp = results.serverReachable || results.socketEndpoint || results.apiEndpoint;
    
    if (!isServerUp) {
      return {
        success: false,
        message: 'Servidor backend não está acessível. Verifique se o servidor está rodando.',
        details: results
      };
    }

    // Enhanced authentication status messages
    if (results.authStatus === 'expired') {
      return {
        success: false,
        message: 'Sua sessão expirou. É necessário fazer login novamente.',
        details: results
      };
    }

    if (results.authStatus === 'missing') {
      return {
        success: false,
        message: 'Não foi possível encontrar token de autenticação. Faça login novamente.',
        details: results
      };
    }

    if (results.authStatus === 'valid') {
      return {
        success: true,
        message: 'Conectividade com backend OK. Autenticação válida.',
        details: results
      };
    }

    return {
      success: true,
      message: 'Servidor backend está acessível, mas há problemas de autenticação.',
      details: results
    };

  } catch (error) {
    console.error('[Server Action] Connectivity test failed:', error);
    return {
      success: false,
      message: `Erro durante teste de conectividade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      details: { ...results, generalError: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

export async function joinRoomAction(accessCode: string, chosenName?: string): Promise<JoinRoomResult> {
  console.log('[Server Action] joinRoomAction called:', { accessCode, hasChosenName: !!chosenName });
  
  try {
    const endpoint = '/rooms/join';
    const requestBody = {
      accessCode,
      ...(chosenName && { chosenName })
    };

    console.log('[Server Action] joinRoomAction request body:', requestBody);

    const response = await makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    console.log('[Server Action] joinRoomAction response data:', responseData);

    return {
      success: true,
      data: responseData
    };
  } catch (error: unknown) {
    const errorObj = error as Error;
    console.error('[Server Action] joinRoomAction error:', {
      message: errorObj.message,
      name: errorObj.name,
      accessCode
    });

    if (errorObj.message === 'JWT_EXPIRED') {
      return {
        success: false,
        error: 'Sua sessão expirou. Por favor, faça login novamente.',
        requiresAuth: true
      };
    }

    return {
      success: false,
      error: errorObj.message || 'Erro ao entrar na sala'
    };
  }
}

export async function getRoomDetailsAction(roomId: string): Promise<GetRoomDetailsResult> {
  console.log('[Server Action] getRoomDetailsAction called:', { roomId });
  
  try {
    const endpoint = `/rooms/${roomId}`;
    console.log('[Server Action] getRoomDetailsAction endpoint:', endpoint);

    const response = await makeAuthenticatedRequest(endpoint);
    
    const responseData = await response.json();
    console.log('[Server Action] getRoomDetailsAction response data:', responseData);

    return {
      success: true,
      data: responseData
    };
  } catch (error: unknown) {
    const errorObj = error as Error;
    console.error('[Server Action] getRoomDetailsAction error:', {
      message: errorObj.message,
      name: errorObj.name,
      roomId
    });

    if (errorObj.message === 'JWT_EXPIRED') {
      return {
        success: false,
        error: 'Sua sessão expirou. Por favor, faça login novamente.',
        requiresAuth: true
      };
    }

    return {
      success: false,
      error: errorObj.message || 'Erro ao buscar detalhes da sala'
    };
  }
}

export async function getParticipantsAction(roomId: string): Promise<GetParticipantsResult> {
  console.log('[Server Action] getParticipantsAction called:', { roomId });
  
  try {
    const endpoint = `/rooms/${roomId}/participants`;
    console.log('[Server Action] getParticipantsAction endpoint:', endpoint);

    const response = await makeAuthenticatedRequest(endpoint);
    
    const responseData = await response.json();
    console.log('[Server Action] getParticipantsAction response data:', {
      participantCount: responseData?.length,
      participants: responseData
    });

    return {
      success: true,
      data: responseData
    };
  } catch (error: unknown) {
    const errorObj = error as Error;
    console.error('[Server Action] getParticipantsAction error:', {
      message: errorObj.message,
      name: errorObj.name,
      roomId
    });

    if (errorObj.message === 'JWT_EXPIRED') {
      return {
        success: false,
        error: 'Sua sessão expirou. Por favor, faça login novamente.',
        requiresAuth: true
      };
    }

    return {
      success: false,
      error: errorObj.message || 'Erro ao buscar participantes'
    };
  }
}