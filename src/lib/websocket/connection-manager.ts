// Connection Management Service for WebSocket
// Extracted from oversized WebSocketContext.tsx for better maintainability

import { Socket, io } from 'socket.io-client';
import type {
  ConnectionState,
  ConnectionQuality,
  ConnectionConfig,
  ConnectionMetrics,
  WebSocketError,
  SessionData
} from '../../types/websocket.types';

import {
  createWebSocketLogger,
  createWebSocketError,
  logWebSocketError,
  assessConnectionQuality,
  calculateBackoffDelay,
  buildWebSocketUrl,
  DEFAULT_WEBSOCKET_CONFIG,
  isOnline,
  isPageVisible
} from './websocket-utils';

export interface ConnectionManagerEvents {
  onConnect: () => void;
  onDisconnect: (reason: string, details?: unknown) => void;
  onConnectError: (error: Error) => void;
  onReconnect: (attempt: number) => void;
  onReconnectAttempt: (attempt: number) => void;
  onReconnectError: (error: Error) => void;
  onReconnectFailed: () => void;
  onError: (error: WebSocketError) => void;
  onConnectionQualityChange: (quality: ConnectionQuality) => void;
}

export class ConnectionManager {
  private socket: Socket | null = null;
  private readonly config: ConnectionConfig;
  private readonly logger: ReturnType<typeof createWebSocketLogger>;
  
  // Connection state
  private connectionState: ConnectionState = 'initializing';
  private connectionAttempts = 0;
  private lastError: string | null = null;
  private connectionQuality: ConnectionQuality = 'disconnected';
  private consecutiveFailures = 0;
  
  // Metrics
  private connectionStartTime = 0;
  private lastConnectTime: number | null = null;
  private heartbeatLatency = 0;
  private totalReconnects = 0;
  private lastHeartbeat = 0;
  private packetsSent = 0;
  private packetsReceived = 0;
  
  // Network monitoring
  private networkOnline = true;
  private pageVisible = true;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly events: ConnectionManagerEvents,
    connectionConfig?: Partial<ConnectionConfig>
  ) {
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...connectionConfig };
    this.logger = createWebSocketLogger(this.config.debugMode);
    
    this.setupNetworkMonitoring();
    this.setupPageVisibilityMonitoring();
  }

  /**
   * Initializes WebSocket connection
   */
  public async connect(wsUrl?: string, session?: SessionData | null): Promise<boolean> {
    this.logger.info('CONNECT ATTEMPT START:', { wsUrl, hasSession: !!session });
    
    if (this.socket?.connected) {
      this.logger.warn('Already connected, skipping connection attempt');
      return true;
    }

    try {
      this.connectionStartTime = Date.now();
      this.setConnectionState('connecting');
      
      // Build WebSocket URL
      const socketUrl = buildWebSocketUrl(wsUrl);
      
      // Configure socket options
      const socketOptions = this.buildSocketOptions(session);
      
      // Create socket connection
      this.socket = io(socketUrl, socketOptions);
      
      // Setup event handlers
      this.setupSocketEventHandlers();
      
      // Start heartbeat monitoring
      this.startHeartbeatMonitoring();
      
      return true;
    } catch (error) {
      this.handleConnectionError(error as Error);
      return false;
    }
  }

  /**
   * Disconnects WebSocket connection
   */
  public disconnect(reason = 'manual_disconnect'): void {
    this.logger.info('DISCONNECT START:', { reason });
    
    this.cleanup();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.setConnectionState('disconnected');
    this.events.onDisconnect(reason);
  }

  /**
   * Forces reconnection
   */
  public forceReconnect(): void {
    this.logger.info('FORCE RECONNECT START');
    
    this.cleanup();
    this.resetConnectionMetrics();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Attempt reconnection after short delay
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  /**
   * Tests connection quality
   */
  public async testConnection(): Promise<boolean> {
    if (!this.socket?.connected) {
      return false;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeout = setTimeout(() => resolve(false), 5000);
      
      this.socket!.emit('ping', { timestamp: startTime }, (response: any) => {
        clearTimeout(timeout);
        const latency = Date.now() - startTime;
        this.updateConnectionQuality(latency);
        resolve(true);
      });
    });
  }

  /**
   * Emits event to server
   */
  public emit(event: string, data?: any, callback?: Function): void {
    if (!this.socket?.connected) {
      this.logger.warn('Cannot emit - socket not connected:', { event });
      return;
    }

    this.packetsSent++;
    this.socket.emit(event, data, callback);
    this.logger.debug('EVENT EMITTED:', { event, data });
  }

  /**
   * Adds event listener
   */
  public on(event: string, handler: (...args: any[]) => void): () => void {
    if (!this.socket) {
      this.logger.warn('Cannot add listener - no socket:', { event });
      return () => {};
    }

    this.socket.on(event, handler);
    
    return () => {
      this.socket?.off(event, handler);
    };
  }

  /**
   * Removes event listener
   */
  public off(event: string, handler?: (...args: any[]) => void): void {
    if (!this.socket) return;
    
    if (handler) {
      this.socket.off(event, handler);
    } else {
      this.socket.removeAllListeners(event);
    }
  }

  // Getters for connection state
  public get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public get currentConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public get currentConnectionQuality(): ConnectionQuality {
    return this.connectionQuality;
  }

  public get currentSocket(): Socket | null {
    return this.socket;
  }

  public getConnectionMetrics(): Partial<ConnectionMetrics> {
    return {
      lastConnectTime: this.lastConnectTime,
      heartbeatLatency: this.heartbeatLatency,
      totalReconnects: this.totalReconnects,
      packetsReceived: this.packetsReceived,
      packetsSent: this.packetsSent,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.lastConnectTime ? Date.now() - this.lastConnectTime : 0,
      avgLatency: this.heartbeatLatency
    };
  }

  public getConnectionInfo(): {
    socketInfo?: { id?: string; transport?: string } | null;
    hasSession?: boolean;
    hasAccessToken?: boolean;
    lastError?: string | null;
  } {
    return {
      socketInfo: this.socket ? {
        id: this.socket.id,
        transport: this.socket.io.engine?.transport?.name
      } : null,
      lastError: this.lastError
    };
  }

  // Private methods

  private buildSocketOptions(session?: SessionData | null) {
    return {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.config.maxRetries,
      reconnectionDelay: this.config.baseDelay,
      reconnectionDelayMax: this.config.maxDelay,
      maxHttpBufferSize: 1e6,
      auth: session?.accessToken ? {
        token: session.accessToken
      } : undefined,
      query: session?.user ? {
        userId: session.user.id,
        userRole: session.user.role
      } : undefined
    };
  }

  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('connect_error', this.handleConnectError.bind(this));
    this.socket.on('reconnect', this.handleReconnect.bind(this));
    this.socket.on('reconnect_attempt', this.handleReconnectAttempt.bind(this));
    this.socket.on('reconnect_error', this.handleReconnectError.bind(this));
    this.socket.on('reconnect_failed', this.handleReconnectFailed.bind(this));
    this.socket.on('pong', this.handlePong.bind(this));
  }

  private handleConnect(): void {
    this.logger.success('CONNECTION ESTABLISHED');
    
    this.lastConnectTime = Date.now();
    this.connectionAttempts = 0;
    this.consecutiveFailures = 0;
    this.lastError = null;
    
    this.setConnectionState('connected');
    this.updateConnectionQuality(0);
    
    this.events.onConnect();
  }

  private handleDisconnect(reason: string, details?: unknown): void {
    this.logger.warn('CONNECTION LOST:', { reason, details });
    
    this.setConnectionState('disconnected');
    this.updateConnectionQuality(0);
    
    this.events.onDisconnect(reason, details);
  }

  private handleConnectError(error: Error): void {
    this.logger.error('CONNECTION ERROR:', error);
    
    this.connectionAttempts++;
    this.consecutiveFailures++;
    this.lastError = error.message;
    
    this.setConnectionState('error');
    
    const wsError = createWebSocketError(
      'connection',
      'CONNECTION_FAILED',
      error.message,
      error,
      'connect'
    );
    
    logWebSocketError(wsError);
    this.events.onConnectError(error);
  }

  private handleReconnect(attempt: number): void {
    this.logger.success('RECONNECTION SUCCESSFUL:', { attempt });
    
    this.totalReconnects++;
    this.consecutiveFailures = 0;
    
    this.events.onReconnect(attempt);
  }

  private handleReconnectAttempt(attempt: number): void {
    this.logger.info('RECONNECTION ATTEMPT:', { attempt });
    
    this.setConnectionState('reconnecting');
    this.events.onReconnectAttempt(attempt);
  }

  private handleReconnectError(error: Error): void {
    this.logger.error('RECONNECTION ERROR:', error);
    
    this.consecutiveFailures++;
    this.events.onReconnectError(error);
  }

  private handleReconnectFailed(): void {
    this.logger.error('RECONNECTION FAILED - MAX ATTEMPTS REACHED');
    
    this.setConnectionState('error');
    this.events.onReconnectFailed();
  }

  private handlePong(data: { timestamp: number }): void {
    const latency = Date.now() - data.timestamp;
    this.heartbeatLatency = latency;
    this.lastHeartbeat = Date.now();
    this.updateConnectionQuality(latency);
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.logger.debug('CONNECTION STATE CHANGE:', { from: this.connectionState, to: state });
      this.connectionState = state;
    }
  }

  private updateConnectionQuality(latency: number): void {
    const newQuality = assessConnectionQuality(latency, this.connectionAttempts);
    if (this.connectionQuality !== newQuality) {
      this.connectionQuality = newQuality;
      this.events.onConnectionQualityChange(newQuality);
    }
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatIntervalId = setInterval(() => {
      if (this.socket?.connected) {
        const timestamp = Date.now();
        this.socket.emit('ping', { timestamp });
      }
    }, this.config.heartbeatInterval);
  }

  private setupNetworkMonitoring(): void {
    const handleOnline = () => {
      this.networkOnline = true;
      this.logger.info('NETWORK ONLINE');
      if (!this.socket?.connected) {
        this.forceReconnect();
      }
    };

    const handleOffline = () => {
      this.networkOnline = false;
      this.logger.warn('NETWORK OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  private setupPageVisibilityMonitoring(): void {
    const handleVisibilityChange = () => {
      this.pageVisible = !document.hidden;
      this.logger.debug('PAGE VISIBILITY CHANGE:', { visible: this.pageVisible });
      
      if (this.pageVisible && !this.socket?.connected) {
        this.forceReconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  private resetConnectionMetrics(): void {
    this.connectionAttempts = 0;
    this.consecutiveFailures = 0;
    this.lastError = null;
    this.heartbeatLatency = 0;
    this.packetsSent = 0;
    this.packetsReceived = 0;
  }

  private cleanup(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private handleConnectionError(error: Error): void {
    const wsError = createWebSocketError(
      'connection',
      'CONNECTION_INIT_FAILED',
      error.message,
      error,
      'initialize_connection'
    );
    
    logWebSocketError(wsError);
    this.events.onError(wsError);
  }
} 