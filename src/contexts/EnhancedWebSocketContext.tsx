'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

// Enhanced interfaces for missing payload/response types
interface JoinRoomPayload {
  roomId: string;
  accessCode?: string;
  displayName?: string;
  role?: string;
}

interface JoinRoomResponse {
  success: boolean;
  room?: RoomWebSocketData;
  participant?: ParticipantWebSocketData;
  error?: string;
}

interface RoomWebSocketData {
  id: string;
  name: string;
  code: string;
  status: string;
  participantCount: number;
  maxParticipants: number;
  createdAt: string;
  settings: {
    allowLateJoin: boolean;
    showLeaderboard: boolean;
    allowReconnection: boolean;
    maxReconnectionAttempts: number;
    autoStartDelay: number;
    questionTimeLimit: number;
    showCorrectAnswers: boolean;
    allowAnswerChange: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
}

interface ParticipantWebSocketData {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  score: number;
  currentQuestionIndex: number;
  lastActivity: string;
  connectionId: string;
  isHost: boolean;
  permissions: string[];
  joinedAt: string;
}

interface QuestionData {
  id: string;
  text: string;
  type: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  timeLimit: number;
  points: number;
}

interface AnswerData {
  questionId: string;
  selectedOption: string;
  timeSpent: number;
}

interface LeaderboardEntry {
  participantId: string;
  name: string;
  score: number;
  rank: number;
  correctAnswers: number;
  totalAnswers: number;
  averageTime: number;
}

interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  latency: number;
}

interface EnhancedWebSocketContextType {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  
  // Room state
  currentRoom: RoomWebSocketData | null;
  participants: ParticipantWebSocketData[];
  currentQuestion: QuestionData | null;
  leaderboard: LeaderboardEntry[];
  
  // Actions
  joinRoom: (payload: JoinRoomPayload) => Promise<JoinRoomResponse>;
  leaveRoom: () => void;
  submitAnswer: (answer: AnswerData) => void;
  sendMessage: (message: string) => void;
  
  // Event handlers
  onParticipantJoined: (callback: (participant: ParticipantWebSocketData) => void) => void;
  onParticipantLeft: (callback: (participantId: string) => void) => void;
  onQuestionStarted: (callback: (question: QuestionData) => void) => void;
  onAnswerReceived: (callback: (answer: AnswerData) => void) => void;
  onLeaderboardUpdated: (callback: (leaderboard: LeaderboardEntry[]) => void) => void;
}

const EnhancedWebSocketContext = createContext<EnhancedWebSocketContextType | null>(null);

interface EnhancedWebSocketProviderProps {
  children: ReactNode;
  url?: string;
}

export const EnhancedWebSocketProvider: React.FC<EnhancedWebSocketProviderProps> = ({
  children,
  url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:7777',
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    error: null,
    latency: 0,
  });
  
  // Room state
  const [currentRoom, setCurrentRoom] = useState<RoomWebSocketData | null>(null);
  const [participants, setParticipants] = useState<ParticipantWebSocketData[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Event handlers refs
  const eventHandlers = useRef<{
    participantJoined: ((participant: ParticipantWebSocketData) => void)[];
    participantLeft: ((participantId: string) => void)[];
    questionStarted: ((question: QuestionData) => void)[];
    answerReceived: ((answer: AnswerData) => void)[];
    leaderboardUpdated: ((leaderboard: LeaderboardEntry[]) => void)[];
  }>({
    participantJoined: [],
    participantLeft: [],
    questionStarted: [],
    answerReceived: [],
    leaderboardUpdated: [],
  });

  // Initialize socket connection
  useEffect(() => {
    console.log('[EnhancedWebSocket] Initializing connection to:', url);
    
    const newSocket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[EnhancedWebSocket] Connected with ID:', newSocket.id);
      setConnectionStatus(prev => ({
        ...prev,
        connected: true,
        reconnecting: false,
        error: null,
      }));
      toast.success('Conectado ao servidor');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[EnhancedWebSocket] Disconnected:', reason);
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        reconnecting: reason === 'io server disconnect' ? false : true,
      }));
      toast.error('Conexão perdida');
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[EnhancedWebSocket] Reconnected after', attemptNumber, 'attempts');
      setConnectionStatus(prev => ({
        ...prev,
        connected: true,
        reconnecting: false,
        error: null,
      }));
      toast.success('Reconectado ao servidor');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('[EnhancedWebSocket] Reconnection failed:', error);
      setConnectionStatus(prev => ({
        ...prev,
        error: 'Falha na reconexão',
      }));
    });

    newSocket.on('connect_error', (error) => {
      console.error('[EnhancedWebSocket] Connection error:', error);
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        error: error.message,
      }));
      toast.error('Erro de conexão');
    });

    // Room event handlers
    newSocket.on('room_joined', (data: { room: RoomWebSocketData; participant: ParticipantWebSocketData; participants: ParticipantWebSocketData[] }) => {
      console.log('[EnhancedWebSocket] Room joined:', data);
      setCurrentRoom(data.room);
      setParticipants(data.participants || []);
    });

    newSocket.on('participant_joined', (participant: ParticipantWebSocketData) => {
      console.log('[EnhancedWebSocket] Participant joined:', participant);
      setParticipants(prev => [...prev, participant]);
      eventHandlers.current.participantJoined.forEach(handler => handler(participant));
    });

    newSocket.on('participant_left', (data: { participantId: string }) => {
      console.log('[EnhancedWebSocket] Participant left:', data.participantId);
      setParticipants(prev => prev.filter(p => p.id !== data.participantId));
      eventHandlers.current.participantLeft.forEach(handler => handler(data.participantId));
    });

    newSocket.on('question_started', (question: QuestionData) => {
      console.log('[EnhancedWebSocket] Question started:', question);
      setCurrentQuestion(question);
      eventHandlers.current.questionStarted.forEach(handler => handler(question));
    });

    newSocket.on('answer_received', (answer: AnswerData) => {
      console.log('[EnhancedWebSocket] Answer received:', answer);
      eventHandlers.current.answerReceived.forEach(handler => handler(answer));
    });

    newSocket.on('leaderboard_updated', (newLeaderboard: LeaderboardEntry[]) => {
      console.log('[EnhancedWebSocket] Leaderboard updated:', newLeaderboard);
      setLeaderboard(newLeaderboard);
      eventHandlers.current.leaderboardUpdated.forEach(handler => handler(newLeaderboard));
    });

    setSocket(newSocket);

    return () => {
      console.log('[EnhancedWebSocket] Cleaning up connection');
      newSocket.disconnect();
    };
  }, [url]);

  // Join room function
  const joinRoom = useCallback(async (payload: JoinRoomPayload): Promise<JoinRoomResponse> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      console.log('[EnhancedWebSocket] Joining room with payload:', payload);
      
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Request timeout' });
      }, 10000);

      socket.emit('join_room', payload, (response: JoinRoomResponse) => {
        clearTimeout(timeout);
        console.log('[EnhancedWebSocket] Join room response:', response);
        resolve(response);
      });
    });
  }, [socket]);

  // Leave room function
  const leaveRoom = useCallback(() => {
    if (!socket || !currentRoom) return;
    
    console.log('[EnhancedWebSocket] Leaving room:', currentRoom.id);
    socket.emit('leave_room', { roomId: currentRoom.id });
    setCurrentRoom(null);
    setParticipants([]);
    setCurrentQuestion(null);
    setLeaderboard([]);
  }, [socket, currentRoom]);

  // Submit answer function
  const submitAnswer = useCallback((answer: AnswerData) => {
    if (!socket || !currentRoom) return;
    
    console.log('[EnhancedWebSocket] Submitting answer:', answer);
    socket.emit('submit_answer', {
      roomId: currentRoom.id,
      ...answer,
    });
  }, [socket, currentRoom]);

  // Send message function
  const sendMessage = useCallback((message: string) => {
    if (!socket || !currentRoom) return;
    
    console.log('[EnhancedWebSocket] Sending message:', message);
    socket.emit('send_message', {
      roomId: currentRoom.id,
      message,
    });
  }, [socket, currentRoom]);

  // Event handler registration functions
  const onParticipantJoined = useCallback((callback: (participant: ParticipantWebSocketData) => void) => {
    eventHandlers.current.participantJoined.push(callback);
  }, []);

  const onParticipantLeft = useCallback((callback: (participantId: string) => void) => {
    eventHandlers.current.participantLeft.push(callback);
  }, []);

  const onQuestionStarted = useCallback((callback: (question: QuestionData) => void) => {
    eventHandlers.current.questionStarted.push(callback);
  }, []);

  const onAnswerReceived = useCallback((callback: (answer: AnswerData) => void) => {
    eventHandlers.current.answerReceived.push(callback);
  }, []);

  const onLeaderboardUpdated = useCallback((callback: (leaderboard: LeaderboardEntry[]) => void) => {
    eventHandlers.current.leaderboardUpdated.push(callback);
  }, []);

  const contextValue: EnhancedWebSocketContextType = {
    socket,
    isConnected: connectionStatus.connected,
    connectionStatus,
    currentRoom,
    participants,
    currentQuestion,
    leaderboard,
    joinRoom,
    leaveRoom,
    submitAnswer,
    sendMessage,
    onParticipantJoined,
    onParticipantLeft,
    onQuestionStarted,
    onAnswerReceived,
    onLeaderboardUpdated,
  };

  return (
    <EnhancedWebSocketContext.Provider value={contextValue}>
      {children}
    </EnhancedWebSocketContext.Provider>
  );
};

export const useEnhancedWebSocket = (): EnhancedWebSocketContextType => {
  const context = useContext(EnhancedWebSocketContext);
  if (!context) {
    throw new Error('useEnhancedWebSocket must be used within an EnhancedWebSocketProvider');
  }
  return context;
};

export default EnhancedWebSocketContext; 