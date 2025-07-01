'use client'

import React, { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Socket, io } from 'socket.io-client';

// Enhanced Type Definitions
type WebSocketEventType = 
  | 'room_created' | 'room_updated' | 'room_deleted'
  | 'participant_joined' | 'participant_left' | 'participant_kicked'
  | 'participant_answered' | 'quiz_started' | 'quiz_paused' 
  | 'quiz_resumed' | 'quiz_finished' | 'question_changed'
  | 'results_updated' | 'connection_' | 'error'
  | 'heartbeat' | 'room_joined' | 'kicked_from_room'
  | 'room_started' | 'force_participant_redirect'
  | 'force_participant_disconnect' | 'participant_removed'
  | 'participant_kicked_success' | 'room__changed'
  | 'sync_request' | 'sync_response' | 'participant_updated'
  | 'participants_updated';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting' | 'initializing';
type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  data: T;
  timestamp: number;
  roomId?: string;
  userId?: string;
}

interface ParticipantData {
  id: string;
  userId?: string;
  name: string;
  email: string;
  status: 'connected' | 'disconnected' | 'answering' | 'finished';
  score: number;
  currentQuestionIndex: number;
  lastActivity: string;
  role?: 'teacher' | 'student';
  isHost?: boolean;
}

interface ExtendedParticipantData extends ParticipantData {
  displayName?: string;
  username?: string;
  user?: {
    name?: string;
    email?: string;
  };
}

interface RoomStatusData {
  roomId: string;
  status: 'waiting' | 'in-progress' | 'paused' | 'finished';
  currentQuestionIndex: number;
  totalQuestions: number;
  participantCount: number;
  timeElapsed: number;
  timeRemaining?: number;
}

interface SessionUser {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface SessionData {
  user?: SessionUser;
  accessToken?: string;
}

interface JoinRoomData {
  roomId: string;
  accessCode: string;
  name: string;
  role?: 'student' | 'teacher';
}

interface MessageData {
  id: string;
  userId: string;
  message: string;
  timestamp: string;
}

interface ConnectionConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  heartbeatInterval: number;
  debugMode: boolean;
}

interface WebSocketError {
  type: 'connection' | 'authentication' | 'room_join' | 'room_action' | 'event_handling' | 'network' | 'validation';
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
  userAction?: string;
  context?: Record<string, unknown>;
}

interface ConnectionMetrics {
  connectionStartTime: number;
  lastConnectTime: number | null;
  heartbeatLatency: number;
  connectionAttempts: number;
  totalReconnects: number;
  lastHeartbeat: number;
  uptime: number;
  avgLatency: number;
  packetsSent: number;
  packetsReceived: number;
}

interface CurrentUserData {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
}

// Enhanced context interface
interface WebSocketContextType {
  // Connection state
  isConnected: boolean;
  isConnectionReady: boolean;
  connectionState: ConnectionState;
  connectionQuality: ConnectionQuality;
  currentRoom: string | null;
  currentRole: string | null;
  socket: Socket | null;
  
  // Data state
  participants: ParticipantData[];
  messages: MessageData[];
  currentUser: CurrentUserData | null;
  
  // Connection metrics  
  connectionAttempts: number;
  lastError: string | null;
  networkOnline: boolean;
  pageVisible: boolean;
  consecutiveFailures: number;
  
  // Methods
  joinRoom: (data: JoinRoomData) => Promise<boolean>;
  leaveRoom: (roomId?: string) => void;
  sendMessage: (roomId: string, message: string) => void;
  syncParticipants: (roomId: string) => void;
  forceReconnect: () => void;
  testConnection: () => Promise<boolean>;
  addEventListener: (event: string, handler: (data: unknown) => void) => (() => void);
  removeEventListener: (type: string, handler: (data: unknown) => void) => void;
  getConnectionMetrics: () => {
    lastConnectTime?: number | null;
    heartbeatLatency?: number;
    totalReconnects?: number;
    packetsReceived?: number;
    packetsSent?: number;
    lastHeartbeat?: number;
    uptime?: number;
    avgLatency?: number;
  };
  getConnectionInfo: () => {
    socketInfo?: {
      id?: string;
      transport?: string;
    } | null;
    hasSession?: boolean;
    hasAccessToken?: boolean;
    lastError?: string | null;
  };
  
  // Diagnostic functions
  diagnoseProblem: () => Record<string, unknown>;
  
  // Legacy methods for compatibility
  refreshParticipantNames: () => void;
  updateParticipantStatus: (roomId: string, status: 'connected' | 'disconnected') => void;
  addParticipant: (participant: ParticipantData) => void;
  removeParticipant: (participantId: string) => void;
  startQuiz: (roomId: string) => void;
  pauseQuiz: (roomId: string) => void;
  resumeQuiz: (roomId: string) => void;
  endQuiz: (roomId: string) => void;
  nextQuestion: (roomId: string) => void;
  startRoom: (roomId: string) => void;
  kickParticipant: (roomId: string, participantId: string, reason?: string) => Promise<void>;
  submitAnswer: (roomId: string, questionIndex: number, selectedOption: string, responseTime: number) => void;
  sendEvent: (event: WebSocketEvent) => void;
  roomData: RoomStatusData | null;
  roomStatus: string;
  clearState: () => void;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
  wsUrl?: string;
  connectionConfig?: Partial<ConnectionConfig>;
}

// Enhanced Helper Functions
const getCurrentUserData = (session: SessionData | null) => {
  return session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role
  } : null;
};

const extractParticipantName = (data: ExtendedParticipantData): string => {
  return data.displayName || data.username || data.name || data.user?.name || data.email || 'Unknown';
};

const normalizeParticipantId = (participant: ParticipantData): string => {
  return participant.userId || participant.id;
};

const isParticipantMatch = (p1: ParticipantData, p2: ParticipantData): boolean => {
  return normalizeParticipantId(p1) === normalizeParticipantId(p2);
};

const filterTeachers = (participants: ExtendedParticipantData[], currentUserId?: string, isTeacher = false): ParticipantData[] => {
  console.log('[WebSocket] 🔍 FILTER_TEACHERS DEBUG START:', {
    timestamp: new Date().toISOString(),
    inputParticipants: participants.length,
    currentUserId,
    isTeacher,
    participants: participants.map(p => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      email: p.email,
      role: p.role,
      isHost: p.isHost,
      status: p.status
    }))
  });

  const result = participants
    .filter(p => {
      console.log('[WebSocket] 🎯 FILTERING PARTICIPANT:', {
        participant: {
          id: p.id,
          userId: p.userId,
          name: p.name,
          email: p.email,
          role: p.role,
          isHost: p.isHost,
          status: p.status
        },
        filterLogic: {
          isTeacher,
          currentUserId,
          participantRole: p.role,
          participantIsHost: p.isHost,
          isTeacherOrHost: p.role === 'teacher' || p.isHost,
          shouldShowToTeacher: isTeacher,
          decision: isTeacher ? 'SHOW_ALL_TO_TEACHER' : (p.role === 'teacher' || p.isHost ? 'HIDE_TEACHER_FROM_STUDENT' : 'SHOW_STUDENT')
        }
      });

      // If the current user is a teacher, show ALL participants (including other teachers)
      if (isTeacher) {
        console.log('[WebSocket] ✅ TEACHER SEES ALL - INCLUDE:', p.name || p.email);
        return true; // Teachers see everyone
      }
      
      // If not a teacher, filter out teachers/hosts (students don't see teachers in participant list)
      if (p.role === 'teacher' || p.isHost) {
        console.log('[WebSocket] ❌ STUDENT HIDE TEACHER - EXCLUDE:', p.name || p.email);
        return false;
      }
      
      console.log('[WebSocket] ✅ STUDENT SEES STUDENT - INCLUDE:', p.name || p.email);
      return true;
    })
    .map(p => {
      // Map backend status to frontend status
      let mappedStatus: 'connected' | 'disconnected' | 'answering' | 'finished' = 'disconnected';
      
      // Use more flexible status mapping
      switch (p.status?.toLowerCase()) {
        case 'connected':
        case 'online':
        case 'active':
        case 'joined':
          mappedStatus = 'connected';
          break;
        case 'answering':
        case 'responding':
          mappedStatus = 'answering';
          break;
        case 'finished':
        case 'completed':
          mappedStatus = 'finished';
          break;
        default:
          mappedStatus = 'disconnected';
      }

      const mappedParticipant = {
        id: normalizeParticipantId(p),
        userId: p.userId,
        name: extractParticipantName(p),
        email: p.email || '',
        status: mappedStatus,
        score: p.score || 0,
        currentQuestionIndex: p.currentQuestionIndex || 0,
        lastActivity: p.lastActivity || new Date().toISOString(),
        role: p.role,
        isHost: p.isHost
      };

      console.log('[WebSocket] 🔄 MAPPED PARTICIPANT:', {
        original: {
          id: p.id,
          userId: p.userId,
          name: p.name,
          email: p.email,
          status: p.status,
          role: p.role,
          isHost: p.isHost
        },
        mapped: mappedParticipant
      });

      return mappedParticipant;
    });

  console.log('[WebSocket] 🔍 FILTER_TEACHERS DEBUG END:', {
    inputCount: participants.length,
    outputCount: result.length,
    isTeacher,
    currentUserId,
    result: result.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      status: p.status,
      role: p.role,
      isHost: p.isHost
    }))
  });

  return result;
};

// Enhanced Error Handling
const createWebSocketError = (
  type: WebSocketError['type'],
  code: string,
  message: string,
  details?: unknown,
  userAction?: string,
  context?: Record<string, unknown>
): WebSocketError => ({
  type,
  code,
  message,
  details,
  timestamp: Date.now(),
  userAction,
  context
});

const logWebSocketError = (error: WebSocketError) => {
  console.error('[WebSocket] 🚨 Error:', {
    type: error.type,
    code: error.code,
    message: error.message,
    timestamp: new Date(error.timestamp).toISOString(),
    userAction: error.userAction,
    context: error.context,
    details: error.details
  });
};

// Enhanced Logging Utility
const createLogger = (debugMode: boolean) => {
  const logLevels = {
    debug: (message: string, data?: unknown) => {
      if (debugMode) console.log(`[WebSocket] 🔍 ${message}`, data || '');
    },
    info: (message: string, data?: unknown) => {
      console.log(`[WebSocket] ℹ️ ${message}`, data || '');
    },
    warn: (message: string, data?: unknown) => {
      console.warn(`[WebSocket] ⚠️ ${message}`, data || '');
    },
    error: (message: string, data?: unknown) => {
      console.error(`[WebSocket] ❌ ${message}`, data || '');
    },
    success: (message: string, data?: unknown) => {
      console.log(`[WebSocket] ✅ ${message}`, data || '');
    }
  };
  
  return logLevels;
};

// Enhanced Connection Quality Assessment
const assessConnectionQuality = (latency: number, connectionAttempts: number): 'excellent' | 'good' | 'poor' | 'disconnected' => {
  if (connectionAttempts > 3) return 'poor';
  if (latency === 0) return 'disconnected';
  if (latency < 100) return 'excellent';
  if (latency < 300) return 'good';
  return 'poor';
};

// Create Context
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Enhanced Default Configuration
const DEFAULT_CONFIG: ConnectionConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 1.5,
  heartbeatInterval: 30000,
  debugMode: false // Temporarily disabled to reduce verbose logging
};

export function WebSocketProvider({ 
  children, 
  wsUrl: customWsUrl, 
  connectionConfig: customConfig 
}: WebSocketProviderProps) {
  const { data: session } = useSession();
  
  // Memoize config to prevent recreation on every render
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...customConfig }), [customConfig]);
  
  // Memoize logger to prevent recreation on every render
  const logger = useMemo(() => createLogger(config.debugMode), [config.debugMode]);
  
  // Enhanced State Management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('initializing');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const [isConnectionReady, setIsConnectionReady] = useState(false); // New state to track readiness
  
  // Room State
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<'teacher' | 'student' | null>(null);
  const [roomData, setRoomData] = useState<RoomStatusData | null>(null);
  const [participants, setParticipantsInternal] = useState<ParticipantData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);

  // Enhanced setParticipants wrapper with debugging
  const setParticipants = useCallback((newParticipants: ParticipantData[] | ((prev: ParticipantData[]) => ParticipantData[])) => {
    if (typeof newParticipants === 'function') {
      setParticipantsInternal((prev: ParticipantData[]) => {
        const result = newParticipants(prev);
        console.log('[WebSocket] 🔄 PARTICIPANTS STATE UPDATE (function):', {
          timestamp: new Date().toISOString(),
          previousCount: prev.length,
          newCount: result.length,
          previous: prev.map((p: ParticipantData) => ({ id: p.id, name: p.name, status: p.status, role: p.role })),
          new: result.map((p: ParticipantData) => ({ id: p.id, name: p.name, status: p.status, role: p.role })),
          stackTrace: new Error().stack?.split('\n').slice(1, 4)
        });
        return result;
      });
    } else {
      console.log('[WebSocket] 🔄 PARTICIPANTS STATE UPDATE (direct):', {
        timestamp: new Date().toISOString(),
        newCount: newParticipants.length,
        participants: newParticipants.map((p: ParticipantData) => ({ id: p.id, name: p.name, status: p.status, role: p.role })),
        stackTrace: new Error().stack?.split('\n').slice(1, 4)
      });
      setParticipantsInternal(newParticipants);
    }
  }, []);

  // Enhanced Metrics
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics>({
    connectionStartTime: Date.now(),
    lastConnectTime: null,
    heartbeatLatency: 0,
    connectionAttempts: 0,
    totalReconnects: 0,
    lastHeartbeat: 0,
    uptime: 0,
    avgLatency: 0,
    packetsSent: 0,
    packetsReceived: 0
  });

  // Enhanced Refs
  const wsRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);
  const hasJoinedRoomRef = useRef<string | null>(null); // Store room ID, not boolean
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const connectionGuardRef = useRef(false);
  const lastConnectionAttemptRef = useRef(0);
  const latencyHistoryRef = useRef<number[]>([]);
  
  // Enhanced connection management refs
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const networkStateRef = useRef<'online' | 'offline'>('online');
  const visibilityStateRef = useRef<'visible' | 'hidden'>('visible');
  const connectionStartTimeRef = useRef<number>(0);
  const consecutiveFailuresRef = useRef(0);
  const connectionAttemptsRef = useRef(0);

  const MAX_CONSECUTIVE_FAILURES = 5;
  const HEALTH_CHECK_INTERVAL = 30000;
  const SOCKET_IO_TIMEOUT = 20000; // Increased timeout

  // Enhanced Cleanup with better resource management
  const clearAllTimeouts = useCallback(() => {
    const timeouts = [
      retryTimeoutRef,
      heartbeatIntervalRef,
      reconnectTimeoutRef,
      healthCheckIntervalRef,
      connectionTimeoutRef
    ];
    
    timeouts.forEach(timeoutRef => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
  }, []);

  // Network State Monitoring
  useEffect(() => {
    const handleOnline = () => {
      networkStateRef.current = 'online';
      logger.info('🌐 Network came online, attempting reconnection...');
      if (!wsRef.current?.connected && mountedRef.current) {
        setIsConnectionReady(false); // Reset ready state
        setTimeout(() => connectWebSocket(), 1000);
      }
    };

    const handleOffline = () => {
      networkStateRef.current = 'offline';
      logger.warn('🌐 Network went offline');
      setConnectionState('disconnected');
      setIsConnected(false);
      setIsConnectionReady(false); // Mark as not ready when offline
    };

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      visibilityStateRef.current = isVisible ? 'visible' : 'hidden';
      
      if (isVisible && !wsRef.current?.connected && mountedRef.current) {
        logger.info('👁️ Page became visible, checking connection...');
        setIsConnectionReady(false); // Reset ready state
        setTimeout(() => {
          if (!wsRef.current?.connected) {
            connectWebSocket();
          }
        }, 500);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [logger]);

  // Main initialization useEffect - only depends on session changes
  useEffect(() => {
    if (!mountedRef.current) return;
    
    // Only connect if we have a session or if we're in a development environment
    if (session || process.env.NODE_ENV === 'development') {
      logger.info('🚀 Initializing WebSocket connection...', { 
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        sessionUserRole: session?.user?.role 
      });
      
      // Small delay to ensure all refs are properly set
      const timeoutId = setTimeout(() => {
        if (mountedRef.current && !wsRef.current?.connected) {
          // Call connectWebSocket directly without depending on the function reference
          connectWebSocket();
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else {
      logger.info('⏸️ Skipping WebSocket connection - no session available');
    }
  }, [session?.user?.id]); // Only depend on user ID, not access token which can change frequently

  // Enhanced connection health monitoring
  const startHealthCheck = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    healthCheckIntervalRef.current = setInterval(() => {
      if (!wsRef.current?.connected) {
        logger.warn('💔 Health check failed - not connected');
        // Don't automatically reconnect here to prevent infinite loops
        // Let the main connection logic handle reconnections
        return;
      }

      // Test connection with ping
      const pingStart = Date.now();
      wsRef.current.emit('ping', { timestamp: pingStart });
      
      const pingTimeout = setTimeout(() => {
        logger.warn('💔 Health check timeout - connection may be stale');
        consecutiveFailuresRef.current++;
        
        if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
          logger.error('💀 Too many consecutive failures, marking connection as poor');
          setConnectionQuality('poor');
          // Don't force reconnection here - let the disconnect handler manage it
        }
      }, 5000);

      const pongHandler = (data: { timestamp: number }) => {
        clearTimeout(pingTimeout);
        const latency = Date.now() - data.timestamp;
        consecutiveFailuresRef.current = 0; // Reset failure count
        
        setConnectionMetrics(prev => ({
          ...prev,
          heartbeatLatency: latency,
          lastHeartbeat: Date.now()
        }));
        
        logger.debug('💚 Health check passed', { latency });
      };

      wsRef.current.once('pong', pongHandler);
    }, HEALTH_CHECK_INTERVAL);
  }, []);

  // Exponential backoff with jitter for better reconnection strategy
  const calculateReconnectDelay = useCallback((attempt: number): number => {
    const baseDelay = config.baseDelay;
    const maxDelay = config.maxDelay;
    const backoffMultiplier = config.backoffMultiplier;
    
    // Exponential backoff: delay = baseDelay * (backoffMultiplier ^ attempt)
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, attempt),
      maxDelay
    );
    
    // Add jitter (±25% randomization) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    const finalDelay = Math.max(exponentialDelay + jitter, baseDelay);
    
    logger.debug('📊 Calculated reconnect delay', { 
      attempt, 
      exponentialDelay, 
      jitter, 
      finalDelay 
    });
    
    return finalDelay;
  }, [config.baseDelay, config.maxDelay, config.backoffMultiplier]);

  // Enhanced Heartbeat System
  const startHeartbeat = useCallback((socket: Socket) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        const timestamp = Date.now();
        socket.emit('heartbeat', { timestamp });
        logger.debug('💓 Heartbeat sent', { timestamp });
        
        setConnectionMetrics(prev => ({
          ...prev,
          lastHeartbeat: timestamp,
          packetsSent: prev.packetsSent + 1
        }));
      }
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval, logger]);

  // Smart reconnection scheduler with exponential backoff (moved before other functions)
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Use ref to get current attempt count to avoid dependency
    const currentAttempt = connectionAttemptsRef.current || 0;
    
    if (currentAttempt >= config.maxRetries) {
      logger.error('🛑 Max reconnection attempts reached, giving up');
      setConnectionState('error');
      setLastError('Maximum reconnection attempts exceeded');
      return;
    }

    const delay = calculateReconnectDelay(currentAttempt);
    
    logger.info(`🔄 Scheduling reconnection attempt ${currentAttempt + 1}/${config.maxRetries} in ${Math.round(delay)}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && networkStateRef.current === 'online') {
        setConnectionAttempts(prev => {
          const newAttempts = prev + 1;
          connectionAttemptsRef.current = newAttempts;
          return newAttempts;
        });
        setConnectionMetrics(prev => ({ 
          ...prev, 
          totalReconnects: prev.totalReconnects + 1,
          connectionAttempts: prev.connectionAttempts + 1
        }));
        // Call connectWebSocket directly to avoid circular dependency
        connectWebSocket();
      }
    }, delay);
  }, [config.maxRetries, calculateReconnectDelay, logger]);

  // Enhanced Event Listeners with superior error handling
  const setupEventListeners = useCallback((socket: Socket): void => {
    const onConnect = () => {
      if (!mountedRef.current) return;
      
      const connectionTime = Date.now() - connectionStartTimeRef.current;
      
      logger.success('✅ Connected successfully', {
        connectionTime: `${connectionTime}ms`,
        attempt: connectionAttempts + 1,
        socketId: socket.id
      });
      
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      // Reset connection state
      connectionGuardRef.current = false;
      isConnectingRef.current = false;
      consecutiveFailuresRef.current = 0;
      
      const now = Date.now();
      setIsConnected(true);
      setIsConnectionReady(true); // Mark as ready for use
      setConnectionState('connected');
      setConnectionAttempts(0); // Reset attempts on successful connection
      connectionAttemptsRef.current = 0;
      setLastError(null);
      setConnectionQuality('excellent'); // Start optimistic
      
      setConnectionMetrics(prev => ({
        ...prev,
        lastConnectTime: now,
        uptime: now - prev.connectionStartTime,
        connectionAttempts: 0 // Reset on successful connection
      }));
      
      // Start enhanced monitoring
      startHeartbeat(socket);
      startHealthCheck();
      
      // Emit connection success event for analytics
      socket.emit('connection_established', {
        clientVersion: '2.0.0',
        connectionTime,
        attempt: connectionAttempts + 1
      });
    };

    const onDisconnect = (reason: string, details?: unknown) => {
      if (!mountedRef.current) return;
      
      logger.warn('🔌 Disconnected', { reason, details });
      
      // Clear timeouts and intervals
      clearAllTimeouts();
      
      // Reset connection state
      connectionGuardRef.current = false;
      setIsConnected(false);
      setIsConnectionReady(false); // Mark as not ready
      
      // Determine if this was intentional or accidental
      const isIntentionalDisconnect = reason === 'io client disconnect' || 
                                     reason === 'transport close' ||
                                     reason === 'forced close';
      
      if (isIntentionalDisconnect) {
        setConnectionState('disconnected');
        logger.info('👋 Intentional disconnect, not reconnecting');
      } else {
        setConnectionState('reconnecting');
        consecutiveFailuresRef.current++;
        
        logger.info('🔄 Unexpected disconnect, scheduling reconnection...', {
          reason,
          consecutiveFailures: consecutiveFailuresRef.current
        });
        
        // Smart reconnection based on reason
        if (networkStateRef.current === 'online' && visibilityStateRef.current === 'visible') {
          scheduleReconnect();
        } else {
          logger.info('📱 Not reconnecting due to network/visibility state');
        }
      }
    };

    const onConnectError = (error: Error) => {
      if (!mountedRef.current) return;
      
      logger.error('❌ Connection error', { 
        message: error.message,
        attempt: connectionAttempts + 1,
        consecutiveFailures: consecutiveFailuresRef.current + 1
      });
      
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      connectionGuardRef.current = false;
      isConnectingRef.current = false;
      consecutiveFailuresRef.current++;
      
      setConnectionState('error');
      setLastError(`Connection failed: ${error.message}`);
      setConnectionQuality('poor');
      
      const wsError = createWebSocketError(
        'connection',
        'CONNECTION_ERROR',
        `Connection failed: ${error.message}`,
        error,
        'connect',
        { 
          attempts: connectionAttempts + 1,
          consecutiveFailures: consecutiveFailuresRef.current,
          networkState: networkStateRef.current
        }
      );
      logWebSocketError(wsError);
      
      // Schedule reconnection if we haven't exceeded limits
      if (connectionAttempts < config.maxRetries && networkStateRef.current === 'online') {
        scheduleReconnect();
      } else {
        logger.error('🛑 Not scheduling reconnect - max attempts reached or offline');
      }
    };

    const onHeartbeatResponse = (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      logger.debug('💓 Heartbeat response received', { latency });
      
      latencyHistoryRef.current.push(latency);
      if (latencyHistoryRef.current.length > 10) {
        latencyHistoryRef.current.shift();
      }
      
      const avgLatency = latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length;
      
      setConnectionMetrics(prev => ({
        ...prev,
        heartbeatLatency: latency,
        avgLatency,
        packetsReceived: prev.packetsReceived + 1
      }));
      
      setConnectionQuality(assessConnectionQuality(avgLatency, 0));
    };

    // Enhanced ping/pong handling for health checks
    const onPing = (data: { timestamp: number }) => {
      socket.emit('pong', data);
    };

    const onPong = (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      consecutiveFailuresRef.current = 0; // Reset failure count on successful pong
      
      setConnectionMetrics(prev => ({
        ...prev,
        heartbeatLatency: latency,
        lastHeartbeat: Date.now(),
        packetsReceived: prev.packetsReceived + 1
      }));
    };

    // Enhanced error handling for server errors
    const onError = (error: Record<string, unknown>) => {
      if (!mountedRef.current) return;
      
      logger.error('❌ Server error received', error);
      
      const errorMessage = typeof error.message === 'string' ? error.message : 'Unknown server error';
      const errorCode = typeof error.code === 'string' ? error.code : 'UNKNOWN_ERROR';
      
      setLastError(`Server error: ${errorMessage}`);
      
      const wsError = createWebSocketError(
        'event_handling',
        errorCode,
        errorMessage,
        error,
        'server_event',
        { 
          error,
          socketId: socket.id,
          connectionTime: Date.now() - connectionStartTimeRef.current
        }
      );
      logWebSocketError(wsError);
      
      // Handle critical errors that might require reconnection
      if (errorCode === 'AUTHENTICATION_ERROR' || errorCode === 'TOKEN_EXPIRED') {
        logger.warn('🔑 Authentication error, attempting to reconnect with fresh token');
        setTimeout(() => {
          if (mountedRef.current) {
            // Direct call to avoid circular dependency
            connectWebSocket();
          }
        }, 2000);
      }
    };

    // Keep existing participant and room event handlers...
    const onParticipantJoined = (data: ExtendedParticipantData) => {
      if (!data || !mountedRef.current) return;
      
      logger.info('👥 Participant joined', data);
      
      setParticipants(prev => {
        const normalized = {
          id: data.id,
          userId: data.userId,
          name: extractParticipantName(data),
          email: data.email,
          status: data.status,
          score: data.score || 0,
          currentQuestionIndex: data.currentQuestionIndex || 0,
          lastActivity: data.lastActivity,
          role: data.role,
          isHost: data.isHost
        };
        
        const exists = prev.find(p => isParticipantMatch(p, normalized));
        if (exists) {
          return prev.map(p => isParticipantMatch(p, normalized) ? { ...p, ...normalized } : p);
        }
        return [...prev, normalized];
      });
    };

    const onParticipantLeft = (data: { id?: string; participantId?: string; userId?: string; name?: string }) => {
      if (!data || !mountedRef.current) return;
      
      logger.info('👋 Participant left', data);
      const participantId = data.id || data.participantId || data.userId;
      
      if (participantId) {
        setParticipants(prev => prev.filter(p => 
          p.id !== participantId && 
          p.userId !== participantId && 
          p.name !== data.name
        ));
      }
    };

    const onRoomJoined = (data: { 
      room?: { roomId?: string; [key: string]: unknown }; 
      participant?: { id?: string; [key: string]: unknown }; 
      isTeacher?: boolean; 
      participants?: Array<{ [key: string]: unknown }>; 
      roomData?: { [key: string]: unknown } 
    }) => {
      console.log('[WebSocket] 📥 WS EVENT RESPONSE - room_joined:', {
        timestamp: new Date().toISOString(),
        event: 'room_joined',
        dataSize: JSON.stringify(data).length,
        hasRoom: !!data.room,
        hasParticipant: !!data.participant,
        hasParticipants: !!data.participants,
        participantCount: Array.isArray(data.participants) ? data.participants.length : 0,
        isTeacher: data.isTeacher,
        currentRoom,
        data: {
          room: data.room ? {
            id: (data.room as { [key: string]: unknown }).roomId || (data.room as { [key: string]: unknown }).id,
            name: (data.room as { [key: string]: unknown }).name,
            status: (data.room as { [key: string]: unknown }).status,
            participantCount: (data.room as { [key: string]: unknown }).participantCount
          } : null,
          participant: data.participant ? {
            id: (data.participant as { [key: string]: unknown }).id,
            name: (data.participant as { [key: string]: unknown }).name || (data.participant as { [key: string]: unknown }).displayName,
            role: (data.participant as { [key: string]: unknown }).role,
            status: (data.participant as { [key: string]: unknown }).status
          } : null,
          participantsPreview: Array.isArray(data.participants) ? 
            data.participants.slice(0, 3).map((p: { [key: string]: unknown }) => ({
              id: p.id,
              name: p.name || p.displayName,
              role: p.role,
              status: p.status
            })) : []
        }
      });

      logger.info('🎉 Room joined event received', { data, currentRoom });

      try {
        if (data.room) {
          const room = data.room as unknown as RoomStatusData;
          setRoomData(room);
          setCurrentRoom(room.roomId);
          logger.info('🏠 Room data updated', room);
        }

        if (data.participant) {
          const participant = data.participant as unknown as ExtendedParticipantData;
          const normalizedParticipant: ParticipantData = {
            id: participant.id,
            userId: participant.userId || participant.id,
            name: extractParticipantName(participant),
            email: participant.email,
            status: participant.status,
            score: participant.score,
            currentQuestionIndex: participant.currentQuestionIndex,
            lastActivity: participant.lastActivity,
            role: participant.role,
            isHost: participant.isHost
          };
          
          addParticipant(normalizedParticipant);
          logger.info('👤 Current user participant added', normalizedParticipant);
        }

        if (data.isTeacher !== undefined) {
          setCurrentRole(data.isTeacher ? 'teacher' : 'student');
          logger.info('👤 Role set', { role: data.isTeacher ? 'teacher' : 'student' });
        }

        if (data.participants && Array.isArray(data.participants)) {
          logger.info('👥 Processing participants list', { count: data.participants.length });
          
          const currentUserData = getCurrentUserData(session);
          
          // Enhanced teacher detection - use session role as primary source of truth
          const isTeacherBySession = session?.user?.role === 'teacher' || session?.user?.role === 'admin';
          const isTeacherByCurrentRole = currentRole === 'teacher';
          const isTeacher = isTeacherBySession || isTeacherByCurrentRole;
          
          console.log('[WebSocket] 🔍 SYNC RESPONSE DEBUG:', {
            timestamp: new Date().toISOString(),
            rawParticipantCount: data.participants.length,
            rawParticipants: data.participants.map((p: { [key: string]: unknown }) => ({
              id: p.id,
              userId: p.userId,
              name: p.name,
              displayName: p.displayName,
              email: p.email,
              status: p.status,
              role: p.role,
              isHost: p.isHost,
              lastActivity: p.lastActivity,
              score: p.score || 0,
              fullRawData: p
            })),
            currentUserData: {
              id: currentUserData?.id,
              name: currentUserData?.name,
              email: currentUserData?.email,
              role: currentUserData?.role
            },
            sessionInfo: {
              sessionUserId: session?.user?.id,
              sessionUserName: session?.user?.name,
              sessionUserEmail: session?.user?.email,
              sessionUserRole: session?.user?.role,
              hasAccessToken: !!session?.accessToken
            },
            wsInfo: {
              currentRole,
              currentRoom,
              isTeacherBySession,
              isTeacherByCurrentRole,
              isTeacher,
              sessionRoleIsTeacher: session?.user?.role === 'teacher' || session?.user?.role === 'admin'
            }
          });
          
          const filteredParticipants = filterTeachers(
            data.participants as unknown as ExtendedParticipantData[], 
            currentUserData?.id || undefined, 
            isTeacher
          );
          
          console.log('[WebSocket] 📊 FILTERING RESULTS:', {
            inputCount: data.participants.length,
            outputCount: filteredParticipants.length,
            isTeacherFilter: isTeacher,
            filteredParticipants: filteredParticipants.map(p => ({
              id: p.id,
              name: p.name,
              email: p.email,
              status: p.status,
              role: p.role,
              isHost: p.isHost,
              score: p.score
            }))
          });
          
          setParticipants(filteredParticipants);
          logger.info('👥 Participants list updated', { 
            total: data.participants.length,
            filtered: filteredParticipants.length,
            participants: filteredParticipants.map(p => ({ name: extractParticipantName(p as ExtendedParticipantData), status: p.status }))
          });
        } else {
          console.log('[WebSocket] ⚠️ SYNC RESPONSE - NO PARTICIPANTS:', {
            hasData: !!data,
            hasParticipants: !!data?.participants,
            isArray: Array.isArray(data?.participants),
            dataKeys: data ? Object.keys(data) : 'no data',
            fullDataDump: data
          });
        }

        if (data.roomData) {
          const room = data.roomData as unknown as RoomStatusData;
          setRoomData(room);
          logger.info('🏠 Room data synced', room);
        }

        console.log('[WebSocket] ✅ WS EVENT PROCESSED - sync_response:', {
          timestamp: new Date().toISOString(),
          event: 'sync_response',
          success: true,
          participantCount: participants.length
        });

      } catch (error) {
        console.error('[WebSocket] ❌ WS EVENT ERROR - sync_response:', {
          timestamp: new Date().toISOString(),
          event: 'sync_response',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          originalData: data
        });

        const wsError = createWebSocketError(
          'event_handling',
          'SYNC_RESPONSE_ERROR',
          'Failed to process sync response event',
          error,
          'Participant sync may be incomplete'
        );
        logWebSocketError(wsError);
      }
    };

    // ADD MISSING SYNC_RESPONSE HANDLER
    const onSyncResponse = (data: { 
      participants?: Array<{ [key: string]: unknown }>; 
      roomData?: { [key: string]: unknown } 
    }) => {
      console.log('[WebSocket] 📥 WS EVENT RESPONSE - sync_response:', {
        timestamp: new Date().toISOString(),
        event: 'sync_response',
        dataSize: JSON.stringify(data).length,
        hasParticipants: !!data.participants,
        hasRoomData: !!data.roomData,
        participantCount: Array.isArray(data.participants) ? data.participants.length : 0,
        dataStructure: {
          participantsType: typeof data.participants,
          participantsIsArray: Array.isArray(data.participants),
          roomDataType: typeof data.roomData,
          hasDataAtAll: !!data,
          dataKeys: data ? Object.keys(data) : 'no data'
        },
        currentContextState: {
          currentRoom,
          currentRole,
          currentParticipantCount: participants.length,
          sessionUserId: session?.user?.id,
          sessionRole: session?.user?.role
        },
        data: {
          participantsPreview: Array.isArray(data.participants) ? 
            data.participants.slice(0, 5).map((p: { [key: string]: unknown }) => ({
              id: p.id,
              userId: p.userId,
              name: p.name || p.displayName,
              email: p.email,
              role: p.role,
              status: p.status,
              isHost: p.isHost,
              rawData: p
            })) : [],
          roomData: data.roomData ? {
            roomId: (data.roomData as { [key: string]: unknown }).roomId,
            status: (data.roomData as { [key: string]: unknown }).status,
            participantCount: (data.roomData as { [key: string]: unknown }).participantCount
          } : null
        }
      });

      logger.info('🔄 Sync response received', { data });

      try {
        if (data.participants && Array.isArray(data.participants)) {
          logger.info('👥 Processing sync participants list', { count: data.participants.length });
          
          // Enhanced debugging for participant filtering
          const currentUserData = getCurrentUserData(session);
          
          // Enhanced teacher detection - use session role as primary source of truth
          const isTeacherBySession = session?.user?.role === 'teacher' || session?.user?.role === 'admin';
          const isTeacherByCurrentRole = currentRole === 'teacher';
          const isTeacher = isTeacherBySession || isTeacherByCurrentRole;
          
          console.log('[WebSocket] 🔍 SYNC RESPONSE DEBUG:', {
            timestamp: new Date().toISOString(),
            rawParticipantCount: data.participants.length,
            rawParticipants: data.participants.map((p: { [key: string]: unknown }) => ({
              id: p.id,
              userId: p.userId,
              name: p.name,
              displayName: p.displayName,
              email: p.email,
              status: p.status,
              role: p.role,
              isHost: p.isHost,
              lastActivity: p.lastActivity,
              score: p.score || 0,
              fullRawData: p
            })),
            currentUserData: {
              id: currentUserData?.id,
              name: currentUserData?.name,
              email: currentUserData?.email,
              role: currentUserData?.role
            },
            sessionInfo: {
              sessionUserId: session?.user?.id,
              sessionUserName: session?.user?.name,
              sessionUserEmail: session?.user?.email,
              sessionUserRole: session?.user?.role,
              hasAccessToken: !!session?.accessToken
            },
            wsInfo: {
              currentRole,
              currentRoom,
              isTeacherBySession,
              isTeacherByCurrentRole,
              isTeacher,
              sessionRoleIsTeacher: session?.user?.role === 'teacher' || session?.user?.role === 'admin'
            }
          });
          
          const filteredParticipants = filterTeachers(
            data.participants as unknown as ExtendedParticipantData[], 
            currentUserData?.id || undefined, 
            isTeacher
          );
          
          console.log('[WebSocket] 📊 FILTERING RESULTS:', {
            inputCount: data.participants.length,
            outputCount: filteredParticipants.length,
            isTeacherFilter: isTeacher,
            filteredParticipants: filteredParticipants.map(p => ({
              id: p.id,
              name: p.name,
              email: p.email,
              status: p.status,
              role: p.role,
              isHost: p.isHost,
              score: p.score
            }))
          });
          
          setParticipants(filteredParticipants);
          logger.info('👥 Participants list updated', { 
            total: data.participants.length,
            filtered: filteredParticipants.length,
            participants: filteredParticipants.map(p => ({ name: extractParticipantName(p as ExtendedParticipantData), status: p.status }))
          });
        } else {
          console.log('[WebSocket] ⚠️ SYNC RESPONSE - NO PARTICIPANTS:', {
            hasData: !!data,
            hasParticipants: !!data?.participants,
            isArray: Array.isArray(data?.participants),
            dataKeys: data ? Object.keys(data) : 'no data',
            fullDataDump: data
          });
        }

        console.log('[WebSocket] ✅ WS EVENT PROCESSED - sync_response:', {
          timestamp: new Date().toISOString(),
          event: 'sync_response',
          success: true,
          participantCount: participants.length
        });

      } catch (error) {
        console.error('[WebSocket] ❌ WS EVENT ERROR - sync_response:', {
          timestamp: new Date().toISOString(),
          event: 'sync_response',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          originalData: data
        });

        const wsError = createWebSocketError(
          'event_handling',
          'SYNC_RESPONSE_ERROR',
          'Failed to process sync response event',
          error,
          'Participant sync may be incomplete'
        );
        logWebSocketError(wsError);
      }
    };

    // ADD MISSING PARTICIPANTS_UPDATED HANDLER
    const onParticipantsUpdated = (data: { 
      participants?: Array<{ [key: string]: unknown }>; 
      roomId?: string;
      timestamp?: string;
    }) => {
      console.log('[WebSocket] 📥 WS EVENT RESPONSE - participants_updated:', {
        timestamp: new Date().toISOString(),
        event: 'participants_updated',
        dataSize: JSON.stringify(data).length,
        hasParticipants: !!data.participants,
        participantCount: Array.isArray(data.participants) ? data.participants.length : 0,
        roomId: data.roomId,
        currentRoom,
        currentRole,
        data: {
          participantsPreview: Array.isArray(data.participants) ? 
            data.participants.slice(0, 5).map((p: { [key: string]: unknown }) => ({
              id: p.id,
              userId: p.userId,
              name: p.name || p.displayName,
              email: p.email,
              role: p.role,
              status: p.status,
              isHost: p.isHost
            })) : []
        }
      });

      logger.info('👥 Participants updated event received', { data });

      try {
        if (data.participants && Array.isArray(data.participants)) {
          logger.info('👥 Processing participants_updated list', { count: data.participants.length });
          
          const currentUserData = getCurrentUserData(session);
          
          // Enhanced teacher detection - use session role as primary source of truth
          const isTeacherBySession = session?.user?.role === 'teacher' || session?.user?.role === 'admin';
          const isTeacherByCurrentRole = currentRole === 'teacher';
          const isTeacher = isTeacherBySession || isTeacherByCurrentRole;
          
          console.log('[WebSocket] 🔍 PARTICIPANTS_UPDATED DEBUG:', {
            timestamp: new Date().toISOString(),
            rawParticipantCount: data.participants.length,
            rawParticipants: data.participants.map((p: { [key: string]: unknown }) => ({
              id: p.id,
              userId: p.userId,
              name: p.name,
              displayName: p.displayName,
              email: p.email,
              status: p.status,
              role: p.role,
              isHost: p.isHost,
              lastActivity: p.lastActivity,
              score: p.score || 0
            })),
            currentUserData: {
              id: currentUserData?.id,
              name: currentUserData?.name,
              email: currentUserData?.email,
              role: currentUserData?.role
            },
            sessionInfo: {
              sessionUserId: session?.user?.id,
              sessionUserName: session?.user?.name,
              sessionUserEmail: session?.user?.email,
              sessionUserRole: session?.user?.role,
              hasAccessToken: !!session?.accessToken
            },
            wsInfo: {
              currentRole,
              currentRoom,
              isTeacherBySession,
              isTeacherByCurrentRole,
              isTeacher,
              sessionRoleIsTeacher: session?.user?.role === 'teacher' || session?.user?.role === 'admin'
            }
          });
          
          const filteredParticipants = filterTeachers(
            data.participants as unknown as ExtendedParticipantData[], 
            currentUserData?.id || undefined, 
            isTeacher
          );
          
          console.log('[WebSocket] 📊 PARTICIPANTS_UPDATED FILTERING RESULTS:', {
            inputCount: data.participants.length,
            outputCount: filteredParticipants.length,
            isTeacherFilter: isTeacher,
            filteredParticipants: filteredParticipants.map(p => ({
              id: p.id,
              name: p.name,
              email: p.email,
              status: p.status,
              role: p.role,
              isHost: p.isHost,
              score: p.score
            }))
          });
          
          setParticipants(filteredParticipants);
          logger.info('👥 Participants list updated', { 
            total: data.participants.length,
            filtered: filteredParticipants.length,
            participants: filteredParticipants.map(p => ({ name: extractParticipantName(p as ExtendedParticipantData), status: p.status }))
          });
        } else {
          console.log('[WebSocket] ⚠️ PARTICIPANTS_UPDATED - NO PARTICIPANTS:', {
            hasData: !!data,
            hasParticipants: !!data?.participants,
            isArray: Array.isArray(data?.participants),
            dataKeys: data ? Object.keys(data) : 'no data',
            fullDataDump: data
          });
        }

        console.log('[WebSocket] ✅ WS EVENT PROCESSED - participants_updated:', {
          timestamp: new Date().toISOString(),
          event: 'participants_updated',
          success: true,
          participantCount: participants.length
        });

      } catch (error) {
        console.error('[WebSocket] ❌ WS EVENT ERROR - participants_updated:', {
          timestamp: new Date().toISOString(),
          event: 'participants_updated',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          originalData: data
        });

        const wsError = createWebSocketError(
          'event_handling',
          'PARTICIPANTS_UPDATED_ERROR',
          'Failed to process participants_updated event',
          error,
          'Participant updates may be incomplete'
        );
        logWebSocketError(wsError);
      }
    };

    // Handle participant kicked events
    const onParticipantKicked = (data: { 
      participantId?: string;
      participantName?: string;
      roomId?: string;
      reason?: string;
      kickedBy?: string;
      timestamp?: string;
    }) => {
      if (!data || !mountedRef.current) return;
      
      logger.info('👢 Participant kicked', data);
      
      if (data.participantId) {
        // Remove from local state
        setParticipants(prev => prev.filter(p => p.id !== data.participantId));
        logger.info(`👢 Removed kicked participant ${data.participantName} from local state`);
      }
    };

    // Handle being kicked from room
    const onKickedFromRoom = (data: {
      roomId?: string;
      reason?: string;
      timestamp?: string;
    }) => {
      if (!data || !mountedRef.current) return;
      
      logger.warn('👢 You have been kicked from the room', data);
      
      // Clear room state
      setCurrentRoom(null);
      setCurrentRole(null);
      setParticipants([]);
      setRoomData(null);
      
      // IMPORTANT: Disconnect the socket to prevent any further interaction
      if (wsRef.current) {
        logger.info('🔌 Disconnecting socket due to kick');
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      
      // Update connection state
      setIsConnected(false);
      setIsConnectionReady(false);
      setConnectionState('disconnected');
      
      // Optionally redirect or show notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('participant-kicked', { 
          detail: { reason: data.reason || 'Removido pelo moderador' }
        }));
        
        // Show alert to user
        alert(`Você foi removido da sala: ${data.reason || 'Removido pelo moderador'}`);
        
        // Redirect to home page or login page
        window.location.href = '/';
      }
    };

    // Attach all enhanced event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('heartbeat_response', onHeartbeatResponse);
    socket.on('ping', onPing);
    socket.on('pong', onPong);
    socket.on('participant_joined', onParticipantJoined);
    socket.on('participant_left', onParticipantLeft);
    socket.on('participant_kicked', onParticipantKicked);
    socket.on('kicked_from_room', onKickedFromRoom);
    socket.on('room_joined', onRoomJoined);
    socket.on('sync_response', onSyncResponse);
    socket.on('participants_updated', onParticipantsUpdated);
    socket.on('error', onError);

    // Enhanced debugging and metrics
    if (config.debugMode) {
      socket.onAny((eventName, ...args) => {
        logger.debug(`📥 Event received: ${eventName}`, { eventName, args });
        // Throttle metrics updates to prevent re-render loops
        // setConnectionMetrics(prev => ({ ...prev, packetsReceived: prev.packetsReceived + 1 }));
      });

      socket.onAnyOutgoing((eventName, ...args) => {
        logger.debug(`📤 Event sent: ${eventName}`, { eventName, args });
        // Throttle metrics updates to prevent re-render loops  
        // setConnectionMetrics(prev => ({ ...prev, packetsSent: prev.packetsSent + 1 }));
      });
    }

  }, [session, config, clearAllTimeouts, logger, startHeartbeat, startHealthCheck, scheduleReconnect]);

  // Enhanced Connection Function with correct Socket.IO configuration
  const connectWebSocket = useCallback(async (): Promise<void> => {
    // Use HTTP URL for Socket.IO, not WebSocket URL
    const baseUrl = customWsUrl || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:7777';
    
    // Pre-connection diagnostics
    logger.info('🔍 Starting Socket.IO connection diagnostics...', {
      baseUrl,
      customWsUrl,
      envBackendUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL,
      envWsUrl: process.env.NEXT_PUBLIC_WS_URL,
      nodeEnv: process.env.NODE_ENV,
      windowLocation: typeof window !== 'undefined' ? window.location.href : 'SSR',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR'
    });

    if (wsRef.current?.connected) {
      logger.info('📡 Already connected to Socket.IO server');
      return;
    }

    if (isConnectingRef.current) {
      logger.info('⏳ Connection already in progress...');
        return;
      }

    try {
      isConnectingRef.current = true;
      setConnectionState('connecting');
      setConnectionAttempts(prev => {
        const newAttempts = prev + 1;
        connectionAttemptsRef.current = newAttempts;
        return newAttempts;
      });

      logger.info('🔌 Attempting Socket.IO connection...', {
        url: baseUrl,
        attempt: connectionAttempts + 1,
        config: config
      });

      // Disconnect existing connection if any
      if (wsRef.current) {
        logger.info('🔌 Cleaning up existing Socket.IO connection');
        wsRef.current.disconnect();
        wsRef.current = null;
      }

      // Create new Socket.IO connection with correct configuration and namespace
      const socketInstance = io(`${baseUrl}/rooms`, {
        // Socket.IO specific options
        transports: ['websocket', 'polling'], // Allow both WebSocket and polling fallback
        upgrade: true, // Allow protocol upgrades
        rememberUpgrade: true, // Remember successful upgrades
        
        // Enhanced connection options
        autoConnect: true, // Auto connect on creation
        reconnection: false, // Disable auto-reconnection (we handle it manually)
        
        // Enhanced timeout options
        timeout: SOCKET_IO_TIMEOUT, // Connection timeout
        
        // Additional options for better reliability
        forceNew: true, // Force a new connection
        multiplex: false, // Disable multiplexing for simpler debugging
        
        // Enhanced transport options
        rejectUnauthorized: false, // Allow self-signed certificates in development
        closeOnBeforeunload: true, // Clean disconnect on page unload
        
        // Polling options (fallback)
        forceBase64: false,
        
        // Enhanced error handling
        withCredentials: false, // CORS settings
        
        // Add query parameters for debugging and authentication
        query: {
          clientId: typeof window !== 'undefined' ? `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : 'ssr-client',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'SSR',
          timestamp: Date.now(),
          version: '2.0.0',
          // Add auth token if available
          ...(session?.accessToken && { token: session.accessToken })
        },
        
        // Enhanced connection headers
        extraHeaders: {
          'X-Client-Version': '2.0.0',
          'X-Client-Type': 'react-frontend',
          ...(session?.accessToken && { 'Authorization': `Bearer ${session.accessToken}` })
        }
      });

      wsRef.current = socketInstance;

      // Set up all event listeners
      setupEventListeners(socketInstance);

      // Log connection attempt
      logger.info('📡 Socket.IO connection initiated', {
        url: `${baseUrl}/rooms`,
        namespace: '/rooms',
        transports: ['websocket', 'polling'],
        timeout: SOCKET_IO_TIMEOUT
      });
      
    } catch (error) {
      const wsError = createWebSocketError(
        'connection',
        'CONNECTION_FAILED',
        `Failed to create Socket.IO connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
        'Try refreshing the page or check your internet connection'
      );
      
      logWebSocketError(wsError);
      setConnectionState('error');
      setLastError(wsError.message);
    } finally {
      isConnectingRef.current = false;
    }
  }, [customWsUrl, config]); // Remove setupEventListeners dependency to prevent infinite re-renders

  // Diagnostic function for troubleshooting
  const diagnoseProblem = useCallback((): Record<string, unknown> => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      socket: {
        exists: !!wsRef.current,
        connected: wsRef.current?.connected || false,
        id: wsRef.current?.id || 'No ID',
        transport: wsRef.current?.io?.engine?.transport?.name || 'No transport'
      },
      state: {
        isConnected,
        isConnectionReady,
        connectionState,
        connectionQuality,
        currentRoom,
        currentRole,
        participantCount: participants.length,
        hasJoinedRoom: hasJoinedRoomRef.current
      },
      session: session ? {
        hasUser: !!session.user,
        userId: session.user?.id,
        userEmail: session.user?.email,
        userRole: session.user?.role,
        hasAccessToken: !!session.accessToken
      } : null,
      participants: participants.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        email: p.email,
        status: p.status,
        role: p.role,
        isHost: p.isHost
      })),
      guards: {
        connectionGuard: connectionGuardRef.current,
        isConnecting: isConnectingRef.current,
        lastConnectionAttempt: lastConnectionAttemptRef.current
      },
      events: {
        lastError,
        consecutiveFailures: consecutiveFailuresRef.current,
        connectionAttempts,
        networkState: networkStateRef.current,
        visibilityState: visibilityStateRef.current
      }
    };

    console.log('[WebSocket] 🔍 COMPREHENSIVE DIAGNOSTICS:', diagnostics);
    return diagnostics;
  }, [
    isConnected,
    isConnectionReady,
    connectionState,
    connectionQuality,
    currentRoom,
    currentRole,
    participants,
    session,
    lastError,
    connectionAttempts
  ]);

  // Essential missing function implementations
  const addParticipant = useCallback((participant: ParticipantData) => {
    setParticipants(prev => {
      const exists = prev.find(p => isParticipantMatch(p, participant));
      if (exists) {
        return prev.map(p => isParticipantMatch(p, participant) ? { ...p, ...participant } : p);
      }
      return [...prev, participant];
    });
  }, [setParticipants]);

  const removeParticipant = useCallback((participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId && p.userId !== participantId));
  }, [setParticipants]);

  const leaveRoom = useCallback((roomId?: string) => {
    if (wsRef.current?.connected) {
      wsRef.current.emit('leave_room', { roomId: roomId || currentRoom });
    }
    setCurrentRoom(null);
    setCurrentRole(null);
    setParticipants([]);
    hasJoinedRoomRef.current = null;
  }, [currentRoom, setParticipants]);

  const sendMessage = useCallback((roomId: string, message: string) => {
    if (wsRef.current?.connected) {
      wsRef.current.emit('chat_message', { roomId, message });
    }
  }, []);

  const syncParticipants = useCallback((roomId: string) => {
    if (wsRef.current?.connected) {
      const eventData = { roomId };
      
      console.log('[WebSocket] 📤 WS EVENT REQUEST - sync_participants:', {
        timestamp: new Date().toISOString(),
        event: 'sync_participants',
        data: eventData,
        socketId: wsRef.current.id,
        connected: wsRef.current.connected,
        currentRoom,
        currentRole
      });

      wsRef.current.emit('sync_participants', eventData);
    }
  }, [currentRoom, currentRole]);

  const forceReconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnectionReady(false);
    setConnectionState('connecting');
    connectWebSocket();
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    return wsRef.current?.connected || false;
  }, []);

  const customAddEventListener = useCallback((event: string, handler: (data: unknown) => void) => {
    if (wsRef.current) {
      wsRef.current.on(event, handler);
      return () => {
        if (wsRef.current) {
          wsRef.current.off(event, handler);
        }
      };
    }
    return () => {};
  }, []);

  const customRemoveEventListener = useCallback((type: string, handler: (data: unknown) => void) => {
    if (wsRef.current) {
      wsRef.current.off(type, handler);
    }
  }, []);

  const sendEvent = useCallback((event: WebSocketEvent) => {
    if (wsRef.current?.connected) {
      wsRef.current.emit(event.type, event.data);
    }
  }, []);

  const getConnectionMetrics = useCallback(() => connectionMetrics, [connectionMetrics]);

  const getConnectionInfo = useCallback(() => ({
    socketInfo: wsRef.current ? {
      id: wsRef.current.id,
      transport: wsRef.current.io?.engine?.transport?.name
    } : null,
    hasSession: !!session,
    hasAccessToken: !!session?.accessToken,
    lastError
  }), [session, lastError]);

  const clearState = useCallback(() => {
    setParticipants([]);
    setMessages([]);
    setCurrentRoom(null);
    setCurrentRole(null);
    setRoomData(null);
  }, [setParticipants]);

  // Stub implementations for legacy methods
  const refreshParticipantNames = useCallback(() => {}, []);
  const updateParticipantStatus = useCallback(() => {}, []);
  const startQuiz = useCallback(() => {}, []);
  const pauseQuiz = useCallback(() => {}, []);
  const resumeQuiz = useCallback(() => {}, []);
  const endQuiz = useCallback(() => {}, []);
  const nextQuestion = useCallback(() => {}, []);
  const startRoom = useCallback(() => {}, []);
  
  // Implement kickParticipant functionality
  const kickParticipant = useCallback(async (roomId: string, participantId: string, reason?: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        logger.info('👢 Kicking participant', { roomId, participantId, reason });
        
        if (!wsRef.current?.connected) {
          throw new Error('WebSocket not connected');
        }
        
        if (!roomId || !participantId) {
          throw new Error('Missing required parameters');
        }
        
        // Check if we're actually joined to the room
        // For teachers accessing manage page directly, allow auto-joining to the room
        if (currentRoom !== roomId) {
          console.warn(`🔧 Teacher not joined to room ${roomId}. Current room: ${currentRoom || 'none'}. Attempting auto-join...`);
          
          // Get current user data
          const userData = getCurrentUserData(session);
          if (!userData || userData.role !== 'teacher') {
            throw new Error(`Not joined to room ${roomId}. Current room: ${currentRoom || 'none'}. Auto-join only available for teachers.`);
          }
          
          // Try to auto-join the room for the teacher
          console.log(`🔗 Auto-joining teacher to room ${roomId}...`);
          setCurrentRoom(roomId);
          setCurrentRole('teacher');
          
          // Emit a join event for the teacher
          wsRef.current.emit('join_room', {
            roomId,
            role: 'teacher',
            name: userData.name || 'Teacher',
            email: userData.email || 'teacher@example.com',
            userId: userData.id,
            autoJoin: true // Flag to indicate this is an automatic join for management
          });
          
          console.log(`✅ Teacher auto-joined to room ${roomId} for kick operation`);
        }
        
        // Set up timeout for the operation (FAIL on timeout, don't assume success)
        const timeout = setTimeout(() => {
          logger.error('⏰ Kick participant timeout - operation failed');
          reject(new Error('Kick operation timed out. The participant may still be connected.'));
        }, 10000); // 10 second timeout, but FAIL instead of assuming success
        
        // Set up one-time response handler
        const handleKickResponse = (response: any) => {
          clearTimeout(timeout);
          logger.info('📨 Kick participant response:', response);
          
          if (response && response.success === true) {
            // Remove from local state on confirmed success
            setParticipants(prev => prev.filter(p => p.id !== participantId && p.userId !== participantId));
            logger.success('✅ Participant kicked successfully', { participantId });
            resolve();
          } else {
            const errorMessage = response?.error || 'Kick operation failed - no success confirmation received';
            logger.error('❌ Kick participant failed:', errorMessage);
            reject(new Error(errorMessage));
          }
        };
        
        // Debug: Log the exact data being sent
        const kickData = {
          roomId,
          participantId,
          reason: reason || 'Removido pelo moderador'
        };
        
        console.log('[WebSocket] 🚀 About to emit kick_participant event:', kickData);
        console.log('[WebSocket] 🔌 WebSocket state:', {
          connected: wsRef.current.connected,
          id: wsRef.current.id,
          transport: wsRef.current.io?.engine?.transport?.name,
          currentRoom: currentRoom,
          hasJoinedRoom: hasJoinedRoomRef.current
        });
        
        // Find the participant to ensure they exist
        const participantToKick = participants.find(p => p.id === participantId || p.userId === participantId);
        if (!participantToKick) {
          clearTimeout(timeout);
          reject(new Error(`Participant with ID ${participantId} not found in current participants list`));
          return;
        }
        
        console.log('[WebSocket] 🎯 Target participant found:', {
          id: participantToKick.id,
          userId: participantToKick.userId,
          name: participantToKick.name,
          role: participantToKick.role
        });
        
        // Emit the kick participant event with acknowledgment callback
        wsRef.current.emit('kick_participant', kickData, handleKickResponse);
        
        console.log('[WebSocket] 📤 kick_participant event emitted');
        logger.info('📤 Kick participant request sent', { participantId });
        
      } catch (error) {
        logger.error('❌ Failed to kick participant', error);
        reject(error);
      }
    });
  }, [logger, currentRoom, participants, session, setCurrentRoom, setCurrentRole]);
  
  const submitAnswer = useCallback(() => {}, []);

  // Enhanced Room Functions with better error handling
  const joinRoom = useCallback(async (roomIdOrData: string | JoinRoomData, role?: 'teacher' | 'student'): Promise<boolean> => {
    try {
      logger.info('🚪 Join room request', { roomIdOrData, role });
      
      if (!wsRef.current?.connected) {
        logger.warn('WebSocket not connected, triggering connection...');
        await connectWebSocket();
        
        // Wait for connection
        let attempts = 0;
        while (!wsRef.current?.connected && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
        
        if (!wsRef.current?.connected) {
          throw new Error('Failed to establish WebSocket connection');
        }
      }
      
      let joinData: JoinRoomData;
      if (typeof roomIdOrData === 'string') {
        const userData = getCurrentUserData(session);
        if (!userData) {
          throw new Error('User data not available');
        }
        
        joinData = {
          roomId: roomIdOrData,
          accessCode: roomIdOrData,
          name: userData.name || 'Anonymous User',
          role: role || 'student'
        };
      } else {
        joinData = roomIdOrData;
      }
      
      // Validation: Ensure we have required data
      if (!joinData.accessCode) {
        throw new Error('Room access code is required');
      }
      
      if (!joinData.name) {
        throw new Error('User name is required');
      }
      
      // Debug logging - capture exact values being sent
      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/rooms/join/${joinData.accessCode}`;
      const requestBody = { name: joinData.name };
      
      console.log('[WebSocket] 🔍 DEBUG - Join room API call:', {
        timestamp: new Date().toISOString(),
        apiUrl,
        accessCode: joinData.accessCode,
        roomId: joinData.roomId,
        requestBody,
        hasAuthToken: !!session?.accessToken,
        authTokenLength: session?.accessToken?.length || 0,
        sessionUser: session?.user,
        backendUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL
      });
      
      logger.info('📤 Making HTTP API call to join room', { 
        url: apiUrl, 
        accessCode: joinData.accessCode,
        name: joinData.name,
        role: joinData.role 
      });
      
      // HTTP API call first - use correct backend endpoint format
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify(requestBody)
      });
      
      // Enhanced error handling with specific HTTP status codes
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        console.error('[WebSocket] ❌ HTTP API call failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          url: apiUrl,
          accessCode: joinData.accessCode
        });
        
        if (response.status === 404) {
          throw new Error(`Room not found: The room with code "${joinData.accessCode}" does not exist or has been deleted`);
        } else if (response.status === 401) {
          throw new Error('Authentication failed: Please log in again');
        } else if (response.status === 403) {
          throw new Error('Access denied: You do not have permission to join this room');
        } else if (response.status === 400) {
          throw new Error(`Invalid request: ${errorText}`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText || 'Failed to join room'}`);
        }
      }
      
      const roomData = await response.json();
      
      console.log('[WebSocket] ✅ HTTP API call successful:', {
        roomData,
        returnedRoomId: roomData.room?.id,
        participant: roomData.participant
      });
      
      // Set state
      setCurrentRoom(roomData.room?.id || joinData.roomId);
      setCurrentRole(joinData.role || 'student');
      
      // Emit WebSocket event with session data for proper participant matching
      const userData = getCurrentUserData(session);
      const wsEventData = {
        roomId: roomData.room?.id || joinData.roomId,
        accessCode: joinData.accessCode,
        name: joinData.name,
        role: joinData.role,
        // Add session data for backend participant matching
        sessionUserId: userData?.id,
        sessionUserEmail: userData?.email,
        sessionUserName: userData?.name,
        userId: userData?.id,
        email: userData?.email || joinData.name?.toLowerCase().replace(/\s+/g, '') + '@example.com'
      };
      
      console.log('[WebSocket] 📤 Emitting join_room WebSocket event:', wsEventData);
      
      wsRef.current.emit('join_room', wsEventData);
      
      logger.success('✅ Room join completed', { roomId: roomData.room?.id });
      return true;
      
    } catch (error) {
      console.error('[WebSocket] ❌ Join room failed with error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        roomIdOrData,
        role,
        timestamp: new Date().toISOString()
      });
      
      logger.error('❌ Join room failed', error);
      return false;
    }
  }, [session, logger]); // Remove connectWebSocket dependency to prevent re-renders

  // Room status getter
  const roomStatus = useMemo(() => {
    return roomData?.status || 'waiting';
  }, [roomData]);

  const contextValue: WebSocketContextType = {
    isConnected,
    isConnectionReady,
    connectionState,
    connectionQuality,
    currentRoom,
    currentRole,
    socket: wsRef.current,
    participants,
    messages,
    currentUser: getCurrentUserData(session),
    connectionAttempts,
    lastError,
    networkOnline: networkStateRef.current === 'online',
    pageVisible: visibilityStateRef.current === 'visible',
    consecutiveFailures: consecutiveFailuresRef.current,
    joinRoom,
    leaveRoom,
    sendMessage,
    syncParticipants,
    forceReconnect,
    testConnection,
    addEventListener: customAddEventListener,
    removeEventListener: customRemoveEventListener,
    sendEvent,
    startQuiz,
    pauseQuiz,
    resumeQuiz,
    endQuiz,
    nextQuestion,
    startRoom,
    kickParticipant,
    submitAnswer,
    updateParticipantStatus,
    addParticipant,
    removeParticipant,
    refreshParticipantNames,
    roomData,
    roomStatus,
    getConnectionMetrics,
    getConnectionInfo,
    clearState,
    diagnoseProblem
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

export const useRoomWebSocket = (roomId?: string, role?: 'teacher' | 'student') => {
  const context = useWebSocket();
  const { data: session } = useSession();
  
  useEffect(() => {
    if (roomId && context.isConnected && !context.currentRoom) {
      console.warn(`[useRoomWebSocket] Room ${roomId} needs to be joined manually with access code`);
    }
  }, [roomId, role, context.isConnected, context.currentRoom, session]);

  return context;
};

export type { JoinRoomData };
 