// Enhanced WebSocket Types for ArQuiz Platform
// Provides strict typing for all Socket.IO events and data structures

export namespace ArQuizWebSocket {
  // ======================
  // Core Event Types
  // ======================

  export type CoreEvents = {
    // Connection Events
    connect: () => void;
    disconnect: (reason: string, details?: any) => void;
    connect_error: (error: Error) => void;
    reconnect: (attempt: number) => void;
    reconnect_attempt: (attempt: number) => void;
    reconnect_error: (error: Error) => void;
    reconnect_failed: () => void;

    // Authentication Events
    authenticated: (data: AuthenticatedEvent) => void;
    auth_error: (error: AuthErrorEvent) => void;
    token_expired: (data: TokenExpiredEvent) => void;

    // Heartbeat Events
    ping: (data: PingEvent) => void;
    pong: (data: PongEvent) => void;
    heartbeat: (data: HeartbeatEvent) => void;
    heartbeat_response: (data: HeartbeatResponseEvent) => void;

    // Room Events
    room_joined: (data: RoomJoinedEvent) => void;
    room_left: (data: RoomLeftEvent) => void;
    room_created: (data: RoomCreatedEvent) => void;
    room_updated: (data: RoomUpdatedEvent) => void;
    room_started: (data: RoomStartedEvent) => void;
    room_paused: (data: RoomPausedEvent) => void;
    room_resumed: (data: RoomResumedEvent) => void;
    room_ended: (data: RoomEndedEvent) => void;
    room_deleted: (data: RoomDeletedEvent) => void;

    // Participant Events
    participant_joined: (data: ParticipantJoinedEvent) => void;
    participant_left: (data: ParticipantLeftEvent) => void;
    participant_updated: (data: ParticipantUpdatedEvent) => void;
    participant_kicked: (data: ParticipantKickedEvent) => void;
    participant_promoted: (data: ParticipantPromotedEvent) => void;

    // Quiz Events
    quiz_started: (data: QuizStartedEvent) => void;
    quiz_paused: (data: QuizPausedEvent) => void;
    quiz_resumed: (data: QuizResumedEvent) => void;
    quiz_ended: (data: QuizEndedEvent) => void;
    question_changed: (data: QuestionChangedEvent) => void;
    answer_submitted: (data: AnswerSubmittedEvent) => void;
    results_updated: (data: ResultsUpdatedEvent) => void;

    // Competition Events
    competition_started: (data: CompetitionStartedEvent) => void;
    competition_ended: (data: CompetitionEndedEvent) => void;
    ranking_updated: (data: RankingUpdatedEvent) => void;
    leaderboard_updated: (data: LeaderboardUpdatedEvent) => void;

    // System Events
    server_maintenance: (data: MaintenanceEvent) => void;
    rate_limit_exceeded: (data: RateLimitEvent) => void;
    error: (error: SystemErrorEvent) => void;
    
    // Sync Events
    sync_request: (data: SyncRequestEvent) => void;
    sync_response: (data: SyncResponseEvent) => void;
    force_sync: (data: ForceSyncEvent) => void;
  };

  // ======================
  // Client to Server Events
  // ======================

  export type ClientToServerEvents = {
    // Authentication
    authenticate: (data: AuthenticatePayload, callback?: (response: AuthResponse) => void) => void;
    refresh_token: (data: RefreshTokenPayload, callback?: (response: AuthResponse) => void) => void;

    // Room Management
    join_room: (data: JoinRoomPayload, callback?: (response: JoinRoomResponse) => void) => void;
    leave_room: (data: LeaveRoomPayload, callback?: (response: LeaveRoomResponse) => void) => void;
    create_room: (data: CreateRoomPayload, callback?: (response: CreateRoomResponse) => void) => void;
    update_room: (data: UpdateRoomPayload, callback?: (response: UpdateRoomResponse) => void) => void;
    delete_room: (data: DeleteRoomPayload, callback?: (response: DeleteRoomResponse) => void) => void;

    // Participant Management
    kick_participant: (data: KickParticipantPayload, callback?: (response: KickParticipantResponse) => void) => void;
    promote_participant: (data: PromoteParticipantPayload, callback?: (response: PromoteParticipantResponse) => void) => void;
    update_participant_status: (data: UpdateParticipantStatusPayload) => void;

    // Quiz Control
    start_quiz: (data: StartQuizPayload, callback?: (response: StartQuizResponse) => void) => void;
    pause_quiz: (data: PauseQuizPayload, callback?: (response: PauseQuizResponse) => void) => void;
    resume_quiz: (data: ResumeQuizPayload, callback?: (response: ResumeQuizResponse) => void) => void;
    end_quiz: (data: EndQuizPayload, callback?: (response: EndQuizResponse) => void) => void;
    next_question: (data: NextQuestionPayload, callback?: (response: NextQuestionResponse) => void) => void;
    submit_answer: (data: SubmitAnswerPayload, callback?: (response: SubmitAnswerResponse) => void) => void;

    // Sync Operations
    request_sync: (data: RequestSyncPayload, callback?: (response: SyncResponse) => void) => void;
    sync_participants: (data: SyncParticipantsPayload) => void;

    // System
    ping: (data?: PingPayload) => void;
    get_room_status: (data: GetRoomStatusPayload, callback?: (response: RoomStatusResponse) => void) => void;
    get_server_info: (callback?: (response: ServerInfoResponse) => void) => void;
  };

  // ======================
  // Server to Client Events  
  // ======================

  export type ServerToClientEvents = CoreEvents;

  // ======================
  // Event Data Interfaces
  // ======================

  // Authentication Events
  export interface AuthenticatedEvent {
    userId: string;
    sessionId: string;
    timestamp: string;
    permissions: string[];
    expiresAt: string;
  }

  export interface AuthErrorEvent {
    code: 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'ACCOUNT_LOCKED';
    message: string;
    timestamp: string;
    retryAfter?: number;
  }

  export interface TokenExpiredEvent {
    expiredAt: string;
    canRefresh: boolean;
    redirectTo?: string;
  }

  // Connection Events
  export interface PingEvent {
    timestamp: number;
    sequence?: number;
  }

  export interface PongEvent {
    timestamp: number;
    latency: number;
    sequence?: number;
  }

  export interface HeartbeatEvent {
    timestamp: number;
    serverTime: number;
    connectionId: string;
  }

  export interface HeartbeatResponseEvent {
    timestamp: number;
    clientTime: number;
    latency: number;
  }

  // Room Events
  export interface RoomJoinedEvent {
    room: RoomInfo;
    participant: ParticipantInfo;
    participants: ParticipantInfo[];
    isTeacher: boolean;
    permissions: RoomPermission[];
  }

  export interface RoomLeftEvent {
    roomId: string;
    participantId: string;
    reason: 'voluntary' | 'kicked' | 'error' | 'timeout';
    timestamp: string;
  }

  export interface RoomCreatedEvent {
    room: RoomInfo;
    creator: ParticipantInfo;
    timestamp: string;
  }

  export interface RoomUpdatedEvent {
    roomId: string;
    changes: Partial<RoomInfo>;
    updatedBy: string;
    timestamp: string;
  }

  export interface RoomStartedEvent {
    roomId: string;
    quiz: QuizInfo;
    participants: ParticipantInfo[];
    startedBy: string;
    timestamp: string;
  }

  export interface RoomPausedEvent {
    roomId: string;
    pausedBy: string;
    timestamp: string;
    reason?: string;
  }

  export interface RoomResumedEvent {
    roomId: string;
    resumedBy: string;
    timestamp: string;
  }

  export interface RoomEndedEvent {
    roomId: string;
    endedBy: string;
    timestamp: string;
    results: QuizResults;
  }

  export interface RoomDeletedEvent {
    roomId: string;
    deletedBy: string;
    timestamp: string;
    reason?: string;
  }

  // Participant Events
  export interface ParticipantJoinedEvent {
    participant: ParticipantInfo;
    roomId: string;
    timestamp: string;
    isReconnection: boolean;
  }

  export interface ParticipantLeftEvent {
    participantId: string;
    roomId: string;
    reason: 'voluntary' | 'kicked' | 'disconnected' | 'error';
    timestamp: string;
  }

  export interface ParticipantUpdatedEvent {
    participantId: string;
    roomId: string;
    changes: Partial<ParticipantInfo>;
    timestamp: string;
  }

  export interface ParticipantKickedEvent {
    participantId: string;
    roomId: string;
    kickedBy: string;
    reason: string;
    timestamp: string;
    canRejoin: boolean;
    rejoinAfter?: string;
  }

  export interface ParticipantPromotedEvent {
    participantId: string;
    roomId: string;
    promotedBy: string;
    newRole: ParticipantRole;
    newPermissions: RoomPermission[];
    timestamp: string;
  }

  // Quiz Events
  export interface QuizStartedEvent {
    roomId: string;
    quiz: QuizInfo;
    startedBy: string;
    timestamp: string;
    timeLimit?: number;
  }

  export interface QuizPausedEvent {
    roomId: string;
    pausedBy: string;
    timestamp: string;
    timeRemaining?: number;
  }

  export interface QuizResumedEvent {
    roomId: string;
    resumedBy: string;
    timestamp: string;
    timeRemaining?: number;
  }

  export interface QuizEndedEvent {
    roomId: string;
    endedBy: string;
    timestamp: string;
    results: QuizResults;
    isTimeUp: boolean;
  }

  export interface QuestionChangedEvent {
    roomId: string;
    questionIndex: number;
    question: QuestionInfo;
    timeLimit?: number;
    timestamp: string;
  }

  export interface AnswerSubmittedEvent {
    participantId: string;
    roomId: string;
    questionIndex: number;
    answer: AnswerInfo;
    isCorrect: boolean;
    score: number;
    responseTime: number;
    timestamp: string;
  }

  export interface ResultsUpdatedEvent {
    roomId: string;
    results: QuizResults;
    leaderboard: LeaderboardEntry[];
    timestamp: string;
  }

  // Competition Events
  export interface CompetitionStartedEvent {
    competitionId: string;
    rooms: string[];
    startedBy: string;
    timestamp: string;
  }

  export interface CompetitionEndedEvent {
    competitionId: string;
    results: CompetitionResults;
    timestamp: string;
  }

  export interface RankingUpdatedEvent {
    roomId: string;
    rankings: RankingInfo[];
    timestamp: string;
  }

  export interface LeaderboardUpdatedEvent {
    roomId: string;
    leaderboard: LeaderboardEntry[];
    timestamp: string;
  }

  // System Events
  export interface MaintenanceEvent {
    type: 'scheduled' | 'emergency';
    message: string;
    startTime: string;
    estimatedDuration: number;
    affectedServices: string[];
  }

  export interface RateLimitEvent {
    limit: number;
    remaining: number;
    resetTime: string;
    action: string;
  }

  export interface SystemErrorEvent {
    code: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    retryable: boolean;
  }

  // Sync Events
  export interface SyncRequestEvent {
    roomId: string;
    requestedBy: string;
    dataTypes: SyncDataType[];
    timestamp: string;
  }

  export interface SyncResponseEvent {
    roomId: string;
    participants: ParticipantInfo[];
    roomData: RoomInfo;
    quizState: QuizState;
    timestamp: string;
  }

  export interface ForceSyncEvent {
    roomId: string;
    reason: string;
    timestamp: string;
  }

  // ======================
  // Core Data Interfaces
  // ======================

  export interface RoomInfo {
    id: string;
    name: string;
    code: string;
    status: RoomStatus;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    maxParticipants: number;
    currentParticipants: number;
    quiz?: QuizInfo;
    settings: RoomSettings;
  }

  export interface ParticipantInfo {
    id: string;
    userId: string;
    name: string;
    email: string;
    role: ParticipantRole;
    status: ParticipantStatus;
    score: number;
    currentQuestionIndex: number;
    lastActivity: string;
    connectionId: string;
    isHost: boolean;
    permissions: RoomPermission[];
    joinedAt: string;
  }

  export interface QuizInfo {
    id: string;
    title: string;
    description?: string;
    totalQuestions: number;
    currentQuestionIndex: number;
    timeLimit?: number;
    status: QuizStatus;
    questions: QuestionInfo[];
    settings: QuizSettings;
  }

  export interface QuestionInfo {
    id: string;
    index: number;
    title: string;
    content: string;
    type: QuestionType;
    options: OptionInfo[];
    correctAnswer: string | string[];
    timeLimit?: number;
    points: number;
  }

  export interface OptionInfo {
    id: string;
    text: string;
    isCorrect: boolean;
  }

  export interface AnswerInfo {
    questionId: string;
    selectedOptions: string[];
    responseTime: number;
    isCorrect: boolean;
    score: number;
  }

  export interface QuizResults {
    totalQuestions: number;
    correctAnswers: number;
    totalScore: number;
    participantResults: ParticipantResult[];
    averageScore: number;
    completionRate: number;
  }

  export interface ParticipantResult {
    participantId: string;
    name: string;
    score: number;
    correctAnswers: number;
    averageResponseTime: number;
    answers: AnswerInfo[];
    rank: number;
  }

  export interface RankingInfo {
    participantId: string;
    name: string;
    score: number;
    rank: number;
    change: number; // Position change from last update
  }

  export interface LeaderboardEntry {
    participantId: string;
    name: string;
    score: number;
    correctAnswers: number;
    averageResponseTime: number;
    rank: number;
    badge?: string;
  }

  export interface CompetitionResults {
    competitionId: string;
    totalParticipants: number;
    totalRooms: number;
    topPerformers: LeaderboardEntry[];
    roomResults: RoomResultSummary[];
  }

  export interface RoomResultSummary {
    roomId: string;
    roomName: string;
    participantCount: number;
    averageScore: number;
    topScore: number;
    completionRate: number;
  }

  export interface QuizState {
    status: QuizStatus;
    currentQuestionIndex: number;
    timeRemaining?: number;
    isPaused: boolean;
    startedAt?: string;
    pausedAt?: string;
  }

  // ======================
  // Payload Interfaces
  // ======================

  // Authentication Payloads
  export interface AuthenticatePayload {
    token: string;
    userId?: string;
    clientInfo?: ClientInfo;
  }

  export interface RefreshTokenPayload {
    refreshToken: string;
  }

  export interface AuthResponse {
    success: boolean;
    sessionId?: string;
    expiresAt?: string;
    permissions?: string[];
    error?: string;
  }

  // Room Management Payloads
  export interface JoinRoomPayload {
    roomId?: string;
    accessCode: string;
    name: string;
    role?: ParticipantRole;
  }

  export interface JoinRoomResponse {
    success: boolean;
    room?: RoomInfo;
    participant?: ParticipantInfo;
    participants?: ParticipantInfo[];
    error?: string;
  }

  export interface LeaveRoomPayload {
    roomId: string;
    reason?: string;
  }

  export interface LeaveRoomResponse {
    success: boolean;
    error?: string;
  }

  export interface CreateRoomPayload {
    name: string;
    maxParticipants?: number;
    quizId?: string;
    settings?: Partial<RoomSettings>;
  }

  export interface CreateRoomResponse {
    success: boolean;
    room?: RoomInfo;
    error?: string;
  }

  export interface UpdateRoomPayload {
    roomId: string;
    changes: Partial<RoomInfo>;
  }

  export interface UpdateRoomResponse {
    success: boolean;
    room?: RoomInfo;
    error?: string;
  }

  export interface DeleteRoomPayload {
    roomId: string;
    reason?: string;
  }

  export interface DeleteRoomResponse {
    success: boolean;
    error?: string;
  }

  // Participant Management Payloads
  export interface KickParticipantPayload {
    roomId: string;
    participantId: string;
    reason: string;
    banDuration?: number; // minutes
  }

  export interface KickParticipantResponse {
    success: boolean;
    error?: string;
  }

  export interface PromoteParticipantPayload {
    roomId: string;
    participantId: string;
    newRole: ParticipantRole;
  }

  export interface PromoteParticipantResponse {
    success: boolean;
    participant?: ParticipantInfo;
    error?: string;
  }

  export interface UpdateParticipantStatusPayload {
    roomId: string;
    status: ParticipantStatus;
    userId?: string;
    userEmail?: string;
    userName?: string;
    timestamp?: string;
    lastActivity?: string;
  }

  // Quiz Control Payloads
  export interface StartQuizPayload {
    roomId: string;
    quizId?: string;
  }

  export interface StartQuizResponse {
    success: boolean;
    quiz?: QuizInfo;
    firstQuestion?: QuestionInfo;
    error?: string;
  }

  export interface PauseQuizPayload {
    roomId: string;
    reason?: string;
  }

  export interface PauseQuizResponse {
    success: boolean;
    timeRemaining?: number;
    error?: string;
  }

  export interface ResumeQuizPayload {
    roomId: string;
  }

  export interface ResumeQuizResponse {
    success: boolean;
    timeRemaining?: number;
    currentQuestion?: QuestionInfo;
    error?: string;
  }

  export interface EndQuizPayload {
    roomId: string;
    reason?: 'completed' | 'time_up' | 'manual' | 'error';
  }

  export interface EndQuizResponse {
    success: boolean;
    results?: QuizResults;
    error?: string;
  }

  export interface NextQuestionPayload {
    roomId: string;
  }

  export interface NextQuestionResponse {
    success: boolean;
    question?: QuestionInfo;
    questionIndex?: number;
    isLastQuestion?: boolean;
    error?: string;
  }

  export interface SubmitAnswerPayload {
    roomId: string;
    questionId: string;
    questionIndex: number;
    selectedOptions: string[];
    responseTime: number;
  }

  export interface SubmitAnswerResponse {
    success: boolean;
    isCorrect?: boolean;
    score?: number;
    correctAnswer?: string | string[];
    explanation?: string;
    error?: string;
  }

  // Sync Payloads
  export interface RequestSyncPayload {
    roomId: string;
    dataTypes: SyncDataType[];
  }

  export interface SyncParticipantsPayload {
    roomId: string;
  }

  export interface SyncResponse {
    success: boolean;
    data?: SyncResponseEvent;
    error?: string;
  }

  // System Payloads
  export interface PingPayload {
    timestamp?: number;
    sequence?: number;
  }

  export interface GetRoomStatusPayload {
    roomId: string;
  }

  export interface RoomStatusResponse {
    success: boolean;
    room?: RoomInfo;
    participantCount?: number;
    error?: string;
  }

  export interface ServerInfoResponse {
    version: string;
    uptime: number;
    activeConnections: number;
    activeRooms: number;
    performance: {
      memory: number;
      cpu: number;
    };
  }

  // ======================
  // Utility Types
  // ======================

  export type RoomStatus = 'waiting' | 'active' | 'paused' | 'completed' | 'cancelled';
  export type ParticipantRole = 'teacher' | 'student' | 'moderator' | 'observer';
  export type ParticipantStatus = 'connected' | 'disconnected' | 'answering' | 'finished' | 'kicked';
  export type QuizStatus = 'not_started' | 'active' | 'paused' | 'completed' | 'cancelled';
  export type QuestionType = 'multiple_choice' | 'single_choice' | 'true_false' | 'text' | 'numeric';
  export type RoomPermission = 'kick_participants' | 'promote_participants' | 'start_quiz' | 'pause_quiz' | 'end_quiz' | 'edit_room' | 'delete_room';
  export type SyncDataType = 'participants' | 'room_data' | 'quiz_state' | 'results' | 'all';

  export interface RoomSettings {
    allowLateJoin: boolean;
    showLeaderboard: boolean;
    allowReconnection: boolean;
    maxReconnectionAttempts: number;
    autoStartDelay: number; // seconds
    questionTimeLimit: number; // seconds
    showCorrectAnswers: boolean;
    allowAnswerChange: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  }

  export interface QuizSettings {
    timeLimit?: number; // total quiz time in seconds
    questionTimeLimit?: number; // per question time in seconds
    showResults: boolean;
    showCorrectAnswers: boolean;
    allowRetake: boolean;
    passingScore?: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
  }

  export interface ClientInfo {
    userAgent: string;
    platform: string;
    language: string;
    timezone: string;
    screenResolution: string;
    connectionType?: string;
  }

  // ======================
  // Connection Management
  // ======================

  export interface ConnectionConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    heartbeatInterval: number;
    connectionTimeout: number;
    authTimeout: number;
    debugMode: boolean;
    enableCompression: boolean;
    forcePolling: boolean;
  }

  export interface ConnectionMetrics {
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
    bytesTransferred: number;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  }

  export interface DiagnosticInfo {
    socket: {
      connected: boolean;
      id: string;
      transport: string;
      namespace: string;
    };
    session: {
      authenticated: boolean;
      userId?: string;
      sessionId?: string;
      expiresAt?: string;
    };
    network: {
      online: boolean;
      connectionType?: string;
      effectiveType?: string;
    };
    performance: {
      latency: number;
      throughput: number;
      errorRate: number;
    };
    errors: WebSocketError[];
  }

  export interface WebSocketError {
    type: 'connection' | 'authentication' | 'room_join' | 'room_action' | 'event_handling' | 'network' | 'validation' | 'server' | 'client';
    code: string;
    message: string;
    details?: any;
    timestamp: number;
    userAction?: string;
    context?: Record<string, any>;
    retryable: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }
} 