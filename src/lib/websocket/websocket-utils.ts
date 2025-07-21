// WebSocket Utilities for ArQuiz Application
// Extracted from oversized WebSocketContext.tsx for better maintainability

import type {
  WebSocketError,
  ConnectionQuality,
  ParticipantData,
  ExtendedParticipantData,
  SessionData,
  CurrentUserData,
  ConnectionConfig
} from '../../types/websocket.types';

// Default Configuration
export const DEFAULT_WEBSOCKET_CONFIG: ConnectionConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 1.5,
  heartbeatInterval: 30000,
  debugMode: false
};

// Enhanced Logger
export const createWebSocketLogger = (debugMode: boolean) => {
  const logLevels = {
    debug: (message: string, data?: unknown): void => {
      if (debugMode) console.log(`[WebSocket] 🔍 ${message}`, data || '');
    },
    info: (message: string, data?: unknown): void => {
      console.log(`[WebSocket] ℹ️ ${message}`, data || '');
    },
    warn: (message: string, data?: unknown): void => {
      console.warn(`[WebSocket] ⚠️ ${message}`, data || '');
    },
    error: (message: string, data?: unknown): void => {
      console.error(`[WebSocket] ❌ ${message}`, data || '');
    },
    success: (message: string, data?: unknown): void => {
      console.log(`[WebSocket] ✅ ${message}`, data || '');
    }
  };
  
  return logLevels;
};

// Error Handling Utilities
export const createWebSocketError = (
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

export const logWebSocketError = (error: WebSocketError): void => {
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

// Connection Quality Assessment
export const assessConnectionQuality = (
  latency: number, 
  connectionAttempts: number
): ConnectionQuality => {
  if (connectionAttempts > 3) return 'poor';
  if (latency === 0) return 'disconnected';
  if (latency < 100) return 'excellent';
  if (latency < 300) return 'good';
  return 'poor';
};

// User Data Extraction
export const getCurrentUserData = (session: SessionData | null): CurrentUserData | null => {
  return session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role
  } : null;
};

// Participant Utilities
export const extractParticipantName = (data: ExtendedParticipantData): string => {
  return data.displayName || data.username || data.name || data.user?.name || data.email || 'Unknown';
};

export const normalizeParticipantId = (participant: ParticipantData): string => {
  return participant.userId || participant.id;
};

export const isParticipantMatch = (p1: ParticipantData, p2: ParticipantData): boolean => {
  return normalizeParticipantId(p1) === normalizeParticipantId(p2);
};

// Connection State Management
export const calculateBackoffDelay = (
  attempt: number, 
  baseDelay: number, 
  maxDelay: number, 
  multiplier: number
): number => {
  const delay = baseDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
};

// WebSocket URL Building
export const buildWebSocketUrl = (customUrl?: string): string => {
  if (customUrl) return customUrl;
  
  // Use the backend URL from environment variables
  const baseUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 
                 process.env.NEXT_PUBLIC_BACKEND_API_URL || 
                 'http://localhost:7777';
  
  return baseUrl;
};

// Event ID Generation
export const generateEventId = (): string => {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Timestamp Utilities
export const getTimestamp = (): number => Date.now();
export const formatTimestamp = (timestamp: number): string => new Date(timestamp).toISOString();

// Validation Utilities
export const isValidEventType = (eventType: string): boolean => {
  const validEvents = [
    'room_created', 'room_updated', 'room_deleted',
    'participant_joined', 'participant_left', 'participant_kicked',
    'participant_answered', 'quiz_started', 'quiz_paused',
    'quiz_resumed', 'quiz_finished', 'question_changed',
    'results_updated', 'connection_', 'error',
    'heartbeat', 'room_joined', 'kicked_from_room',
    'room_started', 'force_participant_redirect',
    'force_participant_disconnect', 'participant_removed',
    'participant_kicked_success', 'room__changed',
    'sync_request', 'sync_response', 'participant_updated',
    'participants_updated'
  ];
  return validEvents.includes(eventType);
};

export const isValidRoomId = (roomId: string | null | undefined): boolean => {
  return typeof roomId === 'string' && roomId.length > 0;
};

export const isValidParticipantData = (data: any): data is ParticipantData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.email === 'string'
  );
};

// State Management Utilities
export const mergeParticipants = (
  existing: ParticipantData[],
  incoming: ParticipantData[]
): ParticipantData[] => {
  const merged = [...existing];
  
  incoming.forEach(incomingParticipant => {
    const existingIndex = merged.findIndex(p => 
      normalizeParticipantId(p) === normalizeParticipantId(incomingParticipant)
    );
    
    if (existingIndex >= 0) {
      merged[existingIndex] = { ...merged[existingIndex], ...incomingParticipant };
    } else {
      merged.push(incomingParticipant);
    }
  });
  
  return merged;
};

export const removeParticipantById = (
  participants: ParticipantData[],
  participantId: string
): ParticipantData[] => {
  return participants.filter(p => 
    normalizeParticipantId(p) !== participantId && 
    p.id !== participantId
  );
};

// Performance Utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Network Utilities
export const isOnline = (): boolean => navigator.onLine;
export const isPageVisible = (): boolean => !document.hidden;

// Safe JSON Utilities
export const safeJSONParse = <T = unknown>(json: string): T | null => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};

export const safeJSONStringify = (obj: unknown): string => {
  try {
    return JSON.stringify(obj);
  } catch {
    return '{}';
  }
}; 