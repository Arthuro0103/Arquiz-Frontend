'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useEnhancedWebSocket } from '@/hooks/useEnhancedWebSocket';
import { ArQuizWebSocket } from '@/types/websocket.types';
import { toast } from 'sonner';

// Enhanced WebSocket Context Interface
interface EnhancedWebSocketContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: ArQuizWebSocket.ConnectionMetrics['connectionQuality'];
  lastError: ArQuizWebSocket.WebSocketError | null;
  
  // Room state
  currentRoom: string | null;
  currentRole: string | null;
  participants: ArQuizWebSocket.ParticipantInfo[];
  roomData: ArQuizWebSocket.RoomInfo | null;
  
  // Quiz state
  currentQuiz: ArQuizWebSocket.QuizInfo | null;
  currentQuestion: ArQuizWebSocket.QuestionInfo | null;
  quizState: ArQuizWebSocket.QuizState | null;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  
  // Room management
  joinRoom: (data: ArQuizWebSocket.JoinRoomPayload) => Promise<ArQuizWebSocket.JoinRoomResponse>;
  leaveRoom: (data: ArQuizWebSocket.LeaveRoomPayload) => Promise<ArQuizWebSocket.LeaveRoomResponse>;
  createRoom: (data: ArQuizWebSocket.CreateRoomPayload) => Promise<ArQuizWebSocket.CreateRoomResponse>;
  
  // Quiz control
  startQuiz: (data: ArQuizWebSocket.StartQuizPayload) => Promise<ArQuizWebSocket.StartQuizResponse>;
  pauseQuiz: (data: ArQuizWebSocket.PauseQuizPayload) => Promise<ArQuizWebSocket.PauseQuizResponse>;
  resumeQuiz: (data: ArQuizWebSocket.ResumeQuizPayload) => Promise<ArQuizWebSocket.ResumeQuizResponse>;
  endQuiz: (data: ArQuizWebSocket.EndQuizPayload) => Promise<ArQuizWebSocket.EndQuizResponse>;
  nextQuestion: (data: ArQuizWebSocket.NextQuestionPayload) => Promise<ArQuizWebSocket.NextQuestionResponse>;
  submitAnswer: (data: ArQuizWebSocket.SubmitAnswerPayload) => Promise<ArQuizWebSocket.SubmitAnswerResponse>;
  
  // Participant management
  kickParticipant: (data: ArQuizWebSocket.KickParticipantPayload) => Promise<ArQuizWebSocket.KickParticipantResponse>;
  promoteParticipant: (data: ArQuizWebSocket.PromoteParticipantPayload) => Promise<ArQuizWebSocket.PromoteParticipantResponse>;
  updateParticipantStatus: (data: ArQuizWebSocket.UpdateParticipantStatusPayload) => void;
  
  // Event management
  addEventListener: (event: string, handler: Function) => () => void;
  emit: (event: string, ...args: any[]) => Promise<any>;
  
  // Diagnostics
  getDiagnostics: () => ArQuizWebSocket.DiagnosticInfo;
  getMetrics: () => ArQuizWebSocket.ConnectionMetrics;
  
  // Legacy compatibility
  connectionAttempts: number;
  socket: any;
}

const EnhancedWebSocketContext = createContext<EnhancedWebSocketContextType | null>(null);

interface EnhancedWebSocketProviderProps {
  children: React.ReactNode;
  config?: Partial<ArQuizWebSocket.ConnectionConfig>;
  enableAutoReconnect?: boolean;
  enableNotifications?: boolean;
}

export function EnhancedWebSocketProvider({ 
  children, 
  config,
  enableAutoReconnect = true,
  enableNotifications = true
}: EnhancedWebSocketProviderProps) {
  const websocket = useEnhancedWebSocket(config);
  
  // Enhanced state management
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<ArQuizWebSocket.RoomInfo | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<ArQuizWebSocket.QuizInfo | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ArQuizWebSocket.QuestionInfo | null>(null);
  const [quizState, setQuizState] = useState<ArQuizWebSocket.QuizState | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Enhanced room management with type safety
  const joinRoom = useCallback(async (data: ArQuizWebSocket.JoinRoomPayload): Promise<ArQuizWebSocket.JoinRoomResponse> => {
    try {
      const response = await websocket.joinRoom(data);
      if (response.success && response.room) {
        setRoomData(response.room);
        setCurrentRole(data.role || 'student');
        
        if (enableNotifications) {
          toast.success(`Entrou na sala: ${response.room.name}`);
        }
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao entrar na sala');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  const leaveRoom = useCallback(async (data: ArQuizWebSocket.LeaveRoomPayload): Promise<ArQuizWebSocket.LeaveRoomResponse> => {
    try {
      const response = await websocket.leaveRoom(data);
      if (response.success) {
        setRoomData(null);
        setCurrentRole(null);
        setCurrentQuiz(null);
        setCurrentQuestion(null);
        setQuizState(null);
        
        if (enableNotifications) {
          toast.info('Saiu da sala');
        }
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao sair da sala');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  const createRoom = useCallback(async (data: ArQuizWebSocket.CreateRoomPayload): Promise<ArQuizWebSocket.CreateRoomResponse> => {
    try {
      const response = await websocket.emit('create_room', data);
      if (response.success && response.room) {
        setRoomData(response.room);
        setCurrentRole('teacher');
        
        if (enableNotifications) {
          toast.success(`Sala criada: ${response.room.name}`);
        }
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao criar sala');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  // Enhanced quiz control
  const startQuiz = useCallback(async (data: ArQuizWebSocket.StartQuizPayload): Promise<ArQuizWebSocket.StartQuizResponse> => {
    try {
      const response = await websocket.startQuiz(data);
      if (response.success && response.quiz) {
        setCurrentQuiz(response.quiz);
        setCurrentQuestion(response.firstQuestion || null);
        setQuizState({
          status: 'active',
          currentQuestionIndex: 0,
          isPaused: false,
          startedAt: new Date().toISOString()
        });
        
        if (enableNotifications) {
          toast.success('Quiz iniciado!');
        }
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao iniciar quiz');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  const pauseQuiz = useCallback(async (data: ArQuizWebSocket.PauseQuizPayload): Promise<ArQuizWebSocket.PauseQuizResponse> => {
    try {
      const response = await websocket.emit('pause_quiz', data);
      if (response.success) {
        setQuizState(prev => prev ? { ...prev, isPaused: true, pausedAt: new Date().toISOString() } : null);
        
        if (enableNotifications) {
          toast.info('Quiz pausado');
        }
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao pausar quiz');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  const resumeQuiz = useCallback(async (data: ArQuizWebSocket.ResumeQuizPayload): Promise<ArQuizWebSocket.ResumeQuizResponse> => {
    try {
      const response = await websocket.emit('resume_quiz', data);
      if (response.success) {
        setQuizState(prev => prev ? { ...prev, isPaused: false, pausedAt: undefined } : null);
        setCurrentQuestion(response.currentQuestion || null);
        
        if (enableNotifications) {
          toast.success('Quiz retomado');
        }
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao retomar quiz');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  const endQuiz = useCallback(async (data: ArQuizWebSocket.EndQuizPayload): Promise<ArQuizWebSocket.EndQuizResponse> => {
    try {
      const response = await websocket.emit('end_quiz', data);
      if (response.success) {
        setQuizState(prev => prev ? { ...prev, status: 'completed' } : null);
        
        if (enableNotifications) {
          toast.success('Quiz finalizado!');
        }
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao finalizar quiz');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  const nextQuestion = useCallback(async (data: ArQuizWebSocket.NextQuestionPayload): Promise<ArQuizWebSocket.NextQuestionResponse> => {
    try {
      const response = await websocket.emit('next_question', data);
      if (response.success && response.question) {
        setCurrentQuestion(response.question);
        setQuizState(prev => prev ? { ...prev, currentQuestionIndex: response.questionIndex || 0 } : null);
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao avançar questão');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  const submitAnswer = useCallback(async (data: ArQuizWebSocket.SubmitAnswerPayload): Promise<ArQuizWebSocket.SubmitAnswerResponse> => {
    try {
      const response = await websocket.submitAnswer(data);
      if (response.success && enableNotifications) {
        if (response.isCorrect) {
          toast.success(`Resposta correta! +${response.score} pontos`);
        } else {
          toast.error('Resposta incorreta');
        }
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao enviar resposta');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  // Participant management
  const kickParticipant = useCallback(async (data: ArQuizWebSocket.KickParticipantPayload): Promise<ArQuizWebSocket.KickParticipantResponse> => {
    try {
      const response = await websocket.emit('kick_participant', data);
      if (response.success && enableNotifications) {
        toast.success('Participante removido');
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao remover participante');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  const promoteParticipant = useCallback(async (data: ArQuizWebSocket.PromoteParticipantPayload): Promise<ArQuizWebSocket.PromoteParticipantResponse> => {
    try {
      const response = await websocket.emit('promote_participant', data);
      if (response.success && enableNotifications) {
        toast.success('Participante promovido');
      }
      return response;
    } catch (error) {
      if (enableNotifications) {
        toast.error('Erro ao promover participante');
      }
      throw error;
    }
  }, [websocket, enableNotifications]);

  const updateParticipantStatus = useCallback((data: ArQuizWebSocket.UpdateParticipantStatusPayload) => {
    websocket.emit('update_participant_status', data).catch(error => {
      console.error('Failed to update participant status:', error);
    });
  }, [websocket]);

  // Enhanced event handling with automatic cleanup
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // Room events
    cleanupFunctions.push(
      websocket.addEventListener('room_joined', (data: any) => {
        setRoomData(data.room);
        setCurrentRole(data.isTeacher ? 'teacher' : 'student');
      })
    );

    cleanupFunctions.push(
      websocket.addEventListener('room_left', () => {
        setRoomData(null);
        setCurrentRole(null);
        setCurrentQuiz(null);
        setCurrentQuestion(null);
        setQuizState(null);
      })
    );

    cleanupFunctions.push(
      websocket.addEventListener('room_updated', (data: any) => {
        setRoomData(prev => prev ? { ...prev, ...data.changes } : null);
      })
    );

    // Quiz events
    cleanupFunctions.push(
      websocket.addEventListener('quiz_started', (data: any) => {
        setCurrentQuiz(data.quiz);
        setQuizState({
          status: 'active',
          currentQuestionIndex: 0,
          isPaused: false,
          startedAt: data.timestamp
        });
      })
    );

    cleanupFunctions.push(
      websocket.addEventListener('quiz_paused', (data: any) => {
        setQuizState(prev => prev ? { ...prev, isPaused: true, pausedAt: data.timestamp } : null);
      })
    );

    cleanupFunctions.push(
      websocket.addEventListener('quiz_resumed', (data: any) => {
        setQuizState(prev => prev ? { ...prev, isPaused: false, pausedAt: undefined } : null);
      })
    );

    cleanupFunctions.push(
      websocket.addEventListener('quiz_ended', (data: any) => {
        setQuizState(prev => prev ? { ...prev, status: 'completed' } : null);
      })
    );

    cleanupFunctions.push(
      websocket.addEventListener('question_changed', (data: any) => {
        setCurrentQuestion(data.question);
        setQuizState(prev => prev ? { ...prev, currentQuestionIndex: data.questionIndex } : null);
      })
    );

    // System events
    cleanupFunctions.push(
      websocket.addEventListener('connect', () => {
        setConnectionAttempts(prev => prev + 1);
      })
    );

    cleanupFunctions.push(
      websocket.addEventListener('disconnect', () => {
        if (enableNotifications) {
          toast.warning('Conexão perdida');
        }
      })
    );

    cleanupFunctions.push(
      websocket.addEventListener('reconnect', () => {
        if (enableNotifications) {
          toast.success('Reconectado!');
        }
      })
    );

    // Cleanup on unmount
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [websocket, enableNotifications]);

  // Auto-reconnect logic
  useEffect(() => {
    if (enableAutoReconnect && !websocket.isConnected && !websocket.isConnecting && websocket.lastError) {
      const retryable = websocket.lastError.retryable;
      if (retryable && connectionAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
        setTimeout(() => {
          websocket.connect().catch(console.error);
        }, delay);
      }
    }
  }, [websocket.isConnected, websocket.isConnecting, websocket.lastError, enableAutoReconnect, connectionAttempts, websocket]);

  // Reconnect method
  const reconnect = useCallback(async () => {
    websocket.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    return websocket.connect();
  }, [websocket]);

  const contextValue: EnhancedWebSocketContextType = {
    // Connection state
    isConnected: websocket.isConnected,
    isConnecting: websocket.isConnecting,
    connectionQuality: websocket.connectionQuality,
    lastError: websocket.lastError,
    
    // Room state
    currentRoom: websocket.currentRoom,
    currentRole,
    participants: websocket.participants,
    roomData,
    
    // Quiz state
    currentQuiz,
    currentQuestion,
    quizState,
    
    // Connection management
    connect: websocket.connect,
    disconnect: websocket.disconnect,
    reconnect,
    
    // Room management
    joinRoom,
    leaveRoom,
    createRoom,
    
    // Quiz control
    startQuiz,
    pauseQuiz,
    resumeQuiz,
    endQuiz,
    nextQuestion,
    submitAnswer,
    
    // Participant management
    kickParticipant,
    promoteParticipant,
    updateParticipantStatus,
    
    // Event management
    addEventListener: websocket.addEventListener,
    emit: websocket.emit,
    
    // Diagnostics
    getDiagnostics: websocket.getDiagnostics,
    getMetrics: websocket.getMetrics,
    
    // Legacy compatibility
    connectionAttempts,
    socket: websocket.socket,
  };

  return (
    <EnhancedWebSocketContext.Provider value={contextValue}>
      {children}
    </EnhancedWebSocketContext.Provider>
  );
}

// Enhanced hook with error handling
export function useEnhancedWebSocketContext(): EnhancedWebSocketContextType {
  const context = useContext(EnhancedWebSocketContext);
  
  if (!context) {
    throw new Error(
      'useEnhancedWebSocketContext must be used within an EnhancedWebSocketProvider. ' +
      'Please wrap your component with <EnhancedWebSocketProvider>.'
    );
  }
  
  return context;
}

// Legacy compatibility hook
export function useWebSocket() {
  return useEnhancedWebSocketContext();
} 