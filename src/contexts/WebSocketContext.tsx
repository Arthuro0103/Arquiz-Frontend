'use client'

// Focused WebSocket Context using dedicated services
// Refactored from 2,365-line monolithic file to maintain Single Responsibility Principle

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface BaseRoomData {
  id: string;
  name: string;
  code: string;
  status: string;
  participantCount: number;
  maxParticipants: number;
}

interface BaseParticipantData {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  score: number;
  isHost: boolean;
}

interface JoinRoomPayload {
  roomId?: string;
  accessCode: string;
  displayName?: string;
  role?: string;
}

interface JoinRoomResponse {
  success: boolean;
  room?: BaseRoomData;
  participant?: BaseParticipantData;
  participants?: BaseParticipantData[];
  error?: string;
}

interface MessageData {
  id: string;
  participantId: string;
  participantName: string;
  content: string;
  timestamp: string;
  type: 'text' | 'system';
}

interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
}

interface WebSocketContextType {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  
  // Room state
  currentRoom: BaseRoomData | null;
  participants: BaseParticipantData[];
  messages: MessageData[];
  
  // Actions
  joinRoom: (payload: JoinRoomPayload) => Promise<JoinRoomResponse>;
  leaveRoom: () => void;
  sendMessage: (message: string) => void;
  
  // Utility
  disconnect: () => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:7777',
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    error: null,
  });
  
  // Room state
  const [currentRoom, setCurrentRoom] = useState<BaseRoomData | null>(null);
  const [participants, setParticipants] = useState<BaseParticipantData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);

  // Initialize socket connection
  useEffect(() => {
    console.log('[WebSocket] Initializing connection to:', url);
    
    const newSocket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[WebSocket] Connected with ID:', newSocket.id);
      setConnectionStatus({
        connected: true,
        reconnecting: false,
        error: null,
      });
      toast.success('Conectado ao servidor');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        reconnecting: reason === 'io server disconnect' ? false : true,
      }));
      toast.error('Conexão perdida');
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
      setConnectionStatus({
        connected: true,
        reconnecting: false,
        error: null,
      });
      toast.success('Reconectado ao servidor');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('[WebSocket] Reconnection failed:', error);
      setConnectionStatus(prev => ({
        ...prev,
        error: 'Falha na reconexão',
      }));
    });

    newSocket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        error: error.message,
      }));
      toast.error('Erro de conexão');
    });

    // Room event handlers
    newSocket.on('room_joined', (data: { room: BaseRoomData; participant: BaseParticipantData; participants: BaseParticipantData[] }) => {
      console.log('[WebSocket] Room joined:', data);
      setCurrentRoom(data.room);
      setParticipants(data.participants || []);
    });

    newSocket.on('participant_joined', (participant: BaseParticipantData) => {
      console.log('[WebSocket] Participant joined:', participant);
      setParticipants(prev => {
        const exists = prev.some(p => p.id === participant.id);
        if (exists) return prev;
        return [...prev, participant];
      });
      toast.info(`${participant.name} entrou na sala`);
    });

    newSocket.on('participant_left', (data: { participantId: string; participantName: string }) => {
      console.log('[WebSocket] Participant left:', data);
      setParticipants(prev => prev.filter(p => p.id !== data.participantId));
      toast.info(`${data.participantName} saiu da sala`);
    });

    newSocket.on('message_received', (message: MessageData) => {
      console.log('[WebSocket] Message received:', message);
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('error', (error: { message: string; code?: string }) => {
      console.error('[WebSocket] Server error:', error);
      toast.error(error.message || 'Erro no servidor');
    });

    setSocket(newSocket);

    return () => {
      console.log('[WebSocket] Cleaning up connection');
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

      console.log('[WebSocket] Joining room with payload:', payload);
      
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Request timeout' });
      }, 10000);

      socket.emit('join_room', payload, (response: JoinRoomResponse) => {
        clearTimeout(timeout);
        console.log('[WebSocket] Join room response:', response);
        resolve(response);
      });
    });
  }, [socket]);

  // Leave room function
  const leaveRoom = useCallback(() => {
    if (!socket || !currentRoom) return;
    
    console.log('[WebSocket] Leaving room:', currentRoom.id);
    socket.emit('leave_room', { roomId: currentRoom.id });
    setCurrentRoom(null);
    setParticipants([]);
    setMessages([]);
  }, [socket, currentRoom]);

  // Send message function
  const sendMessage = useCallback((message: string) => {
    if (!socket || !currentRoom) return;
    
    console.log('[WebSocket] Sending message:', message);
    socket.emit('send_message', {
      roomId: currentRoom.id,
      message,
    });
  }, [socket, currentRoom]);

  // Utility functions
  const disconnect = useCallback(() => {
    if (socket) {
      console.log('[WebSocket] Manual disconnect');
      socket.disconnect();
    }
  }, [socket]);

  const reconnect = useCallback(() => {
    if (socket) {
      console.log('[WebSocket] Manual reconnect');
      socket.connect();
    }
  }, [socket]);

  const contextValue: WebSocketContextType = {
    socket,
    isConnected: connectionStatus.connected,
    connectionStatus,
    currentRoom,
    participants,
    messages,
    joinRoom,
    leaveRoom,
    sendMessage,
    disconnect,
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
 