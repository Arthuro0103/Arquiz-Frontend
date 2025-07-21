'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
  useMemo,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Types following SRP and ISP principles
interface BaseParticipant {
  id: string;
  name: string;
  email: string;
  role?: 'student' | 'teacher' | 'admin';
  isHost?: boolean;
  joinedAt: Date;
  lastActivity: Date;
  status: 'connected' | 'disconnected' | 'ready' | 'answering';
  score?: number;
  currentQuestionIndex?: number;
}

interface RoomData {
  id: string;
  name: string;
  accessCode: string;
  status: 'waiting' | 'active' | 'paused' | 'finished';
  participantCount: number;
  maxParticipants: number;
  createdAt: Date;
  quiz?: {
    id: string;
    title: string;
    currentQuestionIndex: number;
    totalQuestions: number;
  };
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  lastError: string | null;
  reconnectAttempts: number;
  heartbeatLatency: number;
}

interface JoinRoomPayload {
  roomId: string;
  accessCode: string;
  displayName: string;
  role?: string;
}

interface JoinRoomResponse {
  success: boolean;
  error?: string;
  room?: RoomData;
  participant?: BaseParticipant;
}

// Context interface following ISP
interface UnifiedWebSocketContextType {
  // Connection state
  connectionState: ConnectionState;
  socket: Socket | null;
  
  // Room state
  currentRoom: RoomData | null;
  participants: BaseParticipant[];
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  
  // Room methods
  joinRoom: (payload: JoinRoomPayload) => Promise<JoinRoomResponse>;
  leaveRoom: () => void;
  
  // Event methods
  emit: (event: string, data?: any) => void;
  addEventListener: (event: string, handler: (data: any) => void) => () => void;
  
  // Utility methods
  getConnectionMetrics: () => ConnectionState;
  isReady: boolean;
}

// Context creation
const UnifiedWebSocketContext = createContext<UnifiedWebSocketContextType | null>(null);

// Provider props
interface UnifiedWebSocketProviderProps {
  children: ReactNode;
  url?: string;
  config?: {
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    heartbeatInterval?: number;
    timeout?: number;
  };
}

// Provider component following SRP
export const UnifiedWebSocketProvider: React.FC<UnifiedWebSocketProviderProps> = ({
  children,
  url,
  config = {},
}) => {
  const { data: session } = useSession();
  
  // Configuration with defaults
  const defaultConfig = {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    heartbeatInterval: 30000,
    timeout: 10000,
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // State management
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    connectionQuality: 'disconnected',
    lastError: null,
    reconnectAttempts: 0,
    heartbeatLatency: 0,
  });
  
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<BaseParticipant[]>([]);
  
  // Refs for managing connection lifecycle
  const socketRef = useRef<Socket | null>(null);
  const connectionPromiseRef = useRef<Promise<void> | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<Function>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
  // Memoized URL
  const socketUrl = useMemo(() => {
    return url || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:7777';
  }, [url]);
  
  // Connection state management following SRP
  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    if (!mountedRef.current) return;
    
    setConnectionState(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);
  
  // Error handling following SRP
  const handleError = useCallback((error: string, context?: string) => {
    if (!mountedRef.current) return;
    
    console.error(`[UnifiedWebSocket] ${context || 'Error'}:`, error);
    updateConnectionState({
      lastError: error,
      connectionQuality: 'disconnected',
    });
    
    // Show toast only for critical errors
    if (context === 'connection' || context === 'join') {
      toast.error(error);
    }
  }, [updateConnectionState]);
  
  // Heartbeat system following SRP
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        const startTime = Date.now();
        socketRef.current.emit('ping', { timestamp: startTime });
      }
    }, finalConfig.heartbeatInterval);
  }, [finalConfig.heartbeatInterval]);
  
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);
  
  // Connection cleanup following SRP
  const cleanup = useCallback(() => {
    stopHeartbeat();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    eventHandlersRef.current.clear();
    
    updateConnectionState({
      isConnected: false,
      isConnecting: false,
      connectionQuality: 'disconnected',
    });
  }, [stopHeartbeat, updateConnectionState]);
  
  // Event handler management following ISP
  const addEventListener = useCallback((event: string, handler: (data: any) => void) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    
    const handlers = eventHandlersRef.current.get(event)!;
    handlers.add(handler);
    
    // Return cleanup function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(event);
      }
    };
  }, []);
  
  // Event emission following SRP
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('[UnifiedWebSocket] Cannot emit event: socket not connected');
    }
  }, []);
  
  // Socket event setup following SRP
  const setupSocketEvents = useCallback((socket: Socket) => {
    // Connection events
    socket.on('connect', () => {
      if (!mountedRef.current) return;
      
      updateConnectionState({
        isConnected: true,
        isConnecting: false,
        connectionQuality: 'excellent',
        lastError: null,
        reconnectAttempts: 0,
      });
      
      startHeartbeat();
      toast.success('Connected to server');
    });
    
    socket.on('disconnect', (reason) => {
      if (!mountedRef.current) return;
      
      updateConnectionState({
        isConnected: false,
        connectionQuality: 'disconnected',
      });
      
      stopHeartbeat();
      
      console.log('[UnifiedWebSocket] Disconnected:', reason);
      
      // Auto-reconnect for unexpected disconnections
      if (reason !== 'io client disconnect' && mountedRef.current) {
        scheduleReconnect();
      }
    });
    
    socket.on('connect_error', (error) => {
      if (!mountedRef.current) return;
      
      handleError(error.message, 'connection');
      updateConnectionState({
        isConnecting: false,
        reconnectAttempts: connectionState.reconnectAttempts + 1,
      });
    });
    
    // Heartbeat response
    socket.on('pong', (data: { timestamp: number }) => {
      if (!mountedRef.current) return;
      
      const latency = Date.now() - data.timestamp;
      const quality = latency < 100 ? 'excellent' : latency < 300 ? 'good' : 'poor';
      
      updateConnectionState({
        heartbeatLatency: latency,
        connectionQuality: quality,
      });
    });
    
    // Room events
    socket.on('room_joined', (data: { room: RoomData; participants: BaseParticipant[] }) => {
      if (!mountedRef.current) return;
      
      console.log('[UnifiedWebSocket] Room joined:', data);
      setCurrentRoom(data.room);
      setParticipants(data.participants || []);
      
      // Emit to custom handlers
      const handlers = eventHandlersRef.current.get('room_joined');
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
    });
    
    socket.on('participant_joined', (data: { participant: BaseParticipant }) => {
      if (!mountedRef.current) return;
      
      console.log('[UnifiedWebSocket] Participant joined:', data);
      
      setParticipants(prev => {
        const exists = prev.find(p => p.id === data.participant.id);
        if (exists) return prev;
        
        return [...prev, {
          ...data.participant,
          joinedAt: new Date(data.participant.joinedAt),
          lastActivity: new Date(data.participant.lastActivity),
        }];
      });
      
      // Emit to custom handlers
      const handlers = eventHandlersRef.current.get('participant_joined');
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
    });
    
    socket.on('participant_left', (data: { participantId: string }) => {
      if (!mountedRef.current) return;
      
      console.log('[UnifiedWebSocket] Participant left:', data);
      
      setParticipants(prev => prev.filter(p => p.id !== data.participantId));
      
      // Emit to custom handlers
      const handlers = eventHandlersRef.current.get('participant_left');
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
    });
    
    socket.on('participants_updated', (data: { participants: BaseParticipant[] }) => {
      if (!mountedRef.current) return;
      
      console.log('[UnifiedWebSocket] Participants updated:', data);
      
      setParticipants(data.participants.map(p => ({
        ...p,
        joinedAt: new Date(p.joinedAt),
        lastActivity: new Date(p.lastActivity),
      })));
      
      // Emit to custom handlers
      const handlers = eventHandlersRef.current.get('participants_updated');
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
    });
    
    // Generic event forwarding
    const genericEvents = [
      'room_started',
      'room_ended',
      'room_status_changed',
      'participant_answered',
      'participant_kicked',
      'kicked_from_room',
      'quiz_started',
      'quiz_ended',
      'question_started',
      'leaderboard_updated',
      'message_received',
    ];
    
    genericEvents.forEach(eventName => {
      socket.on(eventName, (data: any) => {
        if (!mountedRef.current) return;
        
        console.log(`[UnifiedWebSocket] ${eventName}:`, data);
        
        // Emit to custom handlers
        const handlers = eventHandlersRef.current.get(eventName);
        if (handlers) {
          handlers.forEach(handler => handler(data));
        }
      });
    });
  }, [updateConnectionState, handleError, startHeartbeat, stopHeartbeat, connectionState.reconnectAttempts]);
  
  // Reconnection logic following SRP
  const scheduleReconnect = useCallback(() => {
    if (connectionState.reconnectAttempts >= finalConfig.reconnectionAttempts) {
      handleError('Maximum reconnection attempts reached', 'reconnect');
      return;
    }
    
    const delay = Math.min(
      finalConfig.reconnectionDelay * Math.pow(2, connectionState.reconnectAttempts),
      30000
    );
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, delay);
  }, [connectionState.reconnectAttempts, finalConfig.reconnectionAttempts, finalConfig.reconnectionDelay, handleError]);
  
  // Connection method following SRP
  const connect = useCallback(async (): Promise<void> => {
    if (connectionState.isConnecting || connectionState.isConnected) {
      return connectionPromiseRef.current || Promise.resolve();
    }
    
    connectionPromiseRef.current = new Promise<void>((resolve, reject) => {
      try {
        updateConnectionState({
          isConnecting: true,
          lastError: null,
        });
        
        const socket = io(socketUrl, {
          transports: ['websocket', 'polling'],
          upgrade: true,
          rememberUpgrade: true,
          autoConnect: false,
          reconnection: false, // Handle manually
          timeout: finalConfig.timeout,
          forceNew: true,
          auth: {
            token: session?.accessToken,
            userId: session?.user?.id,
          },
          query: {
            clientVersion: '1.0.0',
            platform: 'web',
          },
        });
        
        const timeoutId = setTimeout(() => {
          handleError('Connection timeout', 'connection');
          socket.disconnect();
          reject(new Error('Connection timeout'));
        }, finalConfig.timeout);
        
        socket.on('connect', () => {
          clearTimeout(timeoutId);
          socketRef.current = socket;
          setupSocketEvents(socket);
          resolve();
        });
        
        socket.on('connect_error', (error) => {
          clearTimeout(timeoutId);
          handleError(error.message, 'connection');
          reject(error);
        });
        
        socket.connect();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        handleError(errorMessage, 'connection');
        reject(error);
      }
    });
    
    try {
      await connectionPromiseRef.current;
    } catch (error) {
      connectionPromiseRef.current = null;
      throw error;
    }
  }, [
    connectionState.isConnecting,
    connectionState.isConnected,
    updateConnectionState,
    socketUrl,
    finalConfig.timeout,
    session?.accessToken,
    session?.user?.id,
    handleError,
    setupSocketEvents,
  ]);
  
  // Disconnect method following SRP
  const disconnect = useCallback(() => {
    cleanup();
    setCurrentRoom(null);
    setParticipants([]);
  }, [cleanup]);
  
  // Reconnect method following SRP
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 1000);
  }, [disconnect, connect]);
  
  // Join room method following SRP
  const joinRoom = useCallback(async (payload: JoinRoomPayload): Promise<JoinRoomResponse> => {
    if (!socketRef.current?.connected) {
      throw new Error('Socket not connected');
    }
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, finalConfig.timeout);
      
      socketRef.current!.emit('join_room', payload, (response: JoinRoomResponse) => {
        clearTimeout(timeoutId);
        
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  }, [finalConfig.timeout]);
  
  // Leave room method following SRP
  const leaveRoom = useCallback(() => {
    if (socketRef.current?.connected && currentRoom) {
      socketRef.current.emit('leave_room', { roomId: currentRoom.id });
    }
    
    setCurrentRoom(null);
    setParticipants([]);
  }, [currentRoom]);
  
  // Get metrics following SRP
  const getConnectionMetrics = useCallback(() => connectionState, [connectionState]);
  
  // Auto-connect on session change
  useEffect(() => {
    if (session?.accessToken && !connectionState.isConnected && !connectionState.isConnecting) {
      connect().catch(error => {
        console.error('[UnifiedWebSocket] Auto-connect failed:', error);
      });
    }
  }, [session?.accessToken, connectionState.isConnected, connectionState.isConnecting, connect]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);
  
  // Context value memoization
  const contextValue = useMemo<UnifiedWebSocketContextType>(() => ({
    connectionState,
    socket: socketRef.current,
    currentRoom,
    participants,
    connect,
    disconnect,
    reconnect,
    joinRoom,
    leaveRoom,
    emit,
    addEventListener,
    getConnectionMetrics,
    isReady: connectionState.isConnected && !connectionState.isConnecting,
  }), [
    connectionState,
    currentRoom,
    participants,
    connect,
    disconnect,
    reconnect,
    joinRoom,
    leaveRoom,
    emit,
    addEventListener,
    getConnectionMetrics,
  ]);
  
  return (
    <UnifiedWebSocketContext.Provider value={contextValue}>
      {children}
    </UnifiedWebSocketContext.Provider>
  );
};

// Hook following SRP
export const useUnifiedWebSocket = (): UnifiedWebSocketContextType => {
  const context = useContext(UnifiedWebSocketContext);
  if (!context) {
    throw new Error('useUnifiedWebSocket must be used within a UnifiedWebSocketProvider');
  }
  return context;
};

// Utility hook for room-specific operations
export const useRoomWebSocket = (roomId?: string) => {
  const websocket = useUnifiedWebSocket();
  
  const joinRoomById = useCallback(async (accessCode: string, displayName: string) => {
    if (!roomId) throw new Error('Room ID is required');
    
    return websocket.joinRoom({
      roomId,
      accessCode,
      displayName,
    });
  }, [websocket, roomId]);
  
  return {
    ...websocket,
    joinRoomById,
  };
}; 