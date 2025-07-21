// WebSocket Types for ArQuiz Application
// Extracted from oversized WebSocketContext.tsx for better maintainability

export type WebSocketEventType = 
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

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting' | 'initializing';
export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';
export type ParticipantStatus = 'connected' | 'disconnected' | 'answering' | 'finished';
export type RoomStatus = 'waiting' | 'in-progress' | 'paused' | 'finished';
export type UserRole = 'teacher' | 'student' | 'admin';

export interface WebSocketEvent<T = unknown> {
  readonly type: WebSocketEventType;
  readonly data: T;
  readonly timestamp: number;
  readonly roomId?: string;
  readonly userId?: string;
}

export interface ParticipantData {
  readonly id: string;
  readonly userId?: string;
  readonly name: string;
  readonly email: string;
  readonly status: ParticipantStatus;
  readonly score: number;
  readonly currentQuestionIndex: number;
  readonly lastActivity: string;
  readonly role?: UserRole;
  readonly isHost?: boolean;
}

export interface ExtendedParticipantData extends ParticipantData {
  readonly displayName?: string;
  readonly username?: string;
  readonly user?: {
    readonly name?: string;
    readonly email?: string;
  };
}

export interface RoomStatusData {
  readonly roomId: string;
  readonly status: RoomStatus;
  readonly currentQuestionIndex: number;
  readonly totalQuestions: number;
  readonly participantCount: number;
  readonly timeElapsed: number;
  readonly timeRemaining?: number;
}

export interface SessionUser {
  readonly id?: string | null;
  readonly name?: string | null;
  readonly email?: string | null;
  readonly role?: string | null;
}

export interface SessionData {
  readonly user?: SessionUser;
  readonly accessToken?: string;
}

export interface JoinRoomData {
  readonly roomId: string;
  readonly accessCode: string;
  readonly name: string;
  readonly role?: UserRole;
}

export interface MessageData {
  readonly id: string;
  readonly userId: string;
  readonly message: string;
  readonly timestamp: string;
}

export interface ConnectionConfig {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
  readonly heartbeatInterval: number;
  readonly debugMode: boolean;
}

export interface WebSocketError {
  readonly type: 'connection' | 'authentication' | 'room_join' | 'room_action' | 'event_handling' | 'network' | 'validation';
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly timestamp: number;
  readonly userAction?: string;
  readonly context?: Record<string, unknown>;
}

export interface ConnectionMetrics {
  readonly connectionStartTime: number;
  readonly lastConnectTime: number | null;
  readonly heartbeatLatency: number;
  readonly connectionAttempts: number;
  readonly totalReconnects: number;
  readonly lastHeartbeat: number;
  readonly uptime: number;
  readonly avgLatency: number;
  readonly packetsSent: number;
  readonly packetsReceived: number;
}

export interface CurrentUserData {
  readonly id?: string | null;
  readonly email?: string | null;
  readonly name?: string | null;
  readonly role?: string | null;
}

export interface WebSocketContextType {
  // Connection state
  readonly isConnected: boolean;
  readonly isConnectionReady: boolean;
  readonly connectionState: ConnectionState;
  readonly connectionQuality: ConnectionQuality;
  readonly currentRoom: string | null;
  readonly currentRole: string | null;
  readonly socket: any | null; // Socket type from socket.io-client
  
  // Data state
  readonly participants: ParticipantData[];
  readonly messages: MessageData[];
  readonly currentUser: CurrentUserData | null;
  
  // Connection metrics  
  readonly connectionAttempts: number;
  readonly lastError: string | null;
  readonly networkOnline: boolean;
  readonly pageVisible: boolean;
  readonly consecutiveFailures: number;
  readonly roomData: RoomStatusData | null;
  readonly roomStatus: string;
  
  // Methods
  joinRoom: (data: JoinRoomData) => Promise<boolean>;
  leaveRoom: (roomId?: string) => void;
  sendMessage: (roomId: string, message: string) => void;
  syncParticipants: (roomId: string) => void;
  forceReconnect: () => void;
  testConnection: () => Promise<boolean>;
  addEventListener: (event: string, handler: (data: unknown) => void) => (() => void);
  removeEventListener: (type: string, handler: (data: unknown) => void) => void;
  getConnectionMetrics: () => Partial<ConnectionMetrics>;
  getConnectionInfo: () => {
    readonly socketInfo?: {
      readonly id?: string;
      readonly transport?: string;
    } | null;
    readonly hasSession?: boolean;
    readonly hasAccessToken?: boolean;
    readonly lastError?: string | null;
  };
  
  // Diagnostic functions
  diagnoseProblem: () => Record<string, unknown>;
  
  // Legacy methods for compatibility
  refreshParticipantNames: () => void;
  updateParticipantStatus: (roomId: string, status: ParticipantStatus) => void;
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
  clearState: () => void;
}

export interface WebSocketProviderProps {
  readonly children: React.ReactNode;
  readonly wsUrl?: string;
  readonly connectionConfig?: Partial<ConnectionConfig>;
}

// Event payload types
export interface ParticipantJoinedPayload {
  readonly participant: ExtendedParticipantData;
  readonly roomId: string;
  readonly timestamp: string;
}

export interface ParticipantLeftPayload {
  readonly id?: string;
  readonly participantId?: string;
  readonly userId?: string;
  readonly name?: string;
  readonly roomId: string;
  readonly timestamp: string;
}

export interface RoomJoinedPayload {
  readonly room?: { readonly roomId?: string; readonly [key: string]: unknown };
  readonly participant?: { readonly id?: string; readonly [key: string]: unknown };
  readonly isTeacher?: boolean;
  readonly participants?: ReadonlyArray<{ readonly [key: string]: unknown }>;
  readonly roomData?: { readonly [key: string]: unknown };
}

export interface SyncResponsePayload {
  readonly participants?: ReadonlyArray<{ readonly [key: string]: unknown }>;
  readonly roomData?: { readonly [key: string]: unknown };
}

export interface ParticipantsUpdatedPayload {
  readonly participants?: ReadonlyArray<{ readonly [key: string]: unknown }>;
  readonly roomId?: string;
  readonly timestamp?: string;
}

export interface ParticipantKickedPayload {
  readonly participantId?: string;
  readonly participantName?: string;
  readonly roomId?: string;
  readonly reason?: string;
  readonly kickedBy?: string;
  readonly timestamp?: string;
}

export interface KickedFromRoomPayload {
  readonly roomId?: string;
  readonly reason?: string;
  readonly timestamp?: string;
}

export interface RoomStartedPayload {
  readonly roomId: string;
  readonly status: string;
  readonly timestamp: string;
} 