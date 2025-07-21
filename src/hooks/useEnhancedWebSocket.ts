'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Socket, io } from 'socket.io-client';
import { toast } from 'sonner';
import { ConnectionConfig, WebSocketError, ConnectionMetrics } from '@/types/websocket.types';
import { ArQuizWebSocketEnterprise } from '@/types/websocket-enterprise.types';

// Enhanced WebSocket Hook with enterprise features
export function useEnhancedWebSocket(config?: Partial<ConnectionConfig>) {
  // Configuration with sensible defaults
  const defaultConfig: ConnectionConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    heartbeatInterval: 30000,
    debugMode: process.env.NODE_ENV === 'development',
  };

  const finalConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  
  const { data: session } = useSession();
  
  // Core refs - use any for Socket.IO compatibility
  const socketRef = useRef<Socket | null>(null);
  const connectionPromiseRef = useRef<Promise<void> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<Function>>>(new Map());
  const metricsRef = useRef<ConnectionMetrics>({
    connectionStartTime: 0,
    lastConnectTime: null,
    heartbeatLatency: 0,
    connectionAttempts: 0,
    totalReconnects: 0,
    lastHeartbeat: 0,
    uptime: 0,
    avgLatency: 0,
    packetsSent: 0,
    packetsReceived: 0,
  });

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const [lastError, setLastError] = useState<WebSocketError | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any | null>(null);

  // Enhanced error handling
  const createError = useCallback((
    type: WebSocketError['type'],
    code: string,
    message: string,
    details?: any,
    userAction?: string
  ): WebSocketError => {
    return {
      type,
      code,
      message,
      details,
      timestamp: Date.now(),
      userAction,
      context: {
        room: currentRoom,
        connected: isConnected,
        participants: participants.length
      }
    };
  }, [currentRoom, isConnected, participants.length]);

  // Connection quality assessment
  const assessConnectionQuality = useCallback((latency: number, consecutiveFailures: number): 'excellent' | 'good' | 'poor' | 'disconnected' => {
    if (!isConnected) return 'disconnected';
    if (consecutiveFailures > 3) return 'poor';
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    return 'poor';
  }, [isConnected]);

  // Enhanced metrics tracking
  const updateMetrics = useCallback((updates: Partial<ConnectionMetrics>) => {
    metricsRef.current = { ...metricsRef.current, ...updates };
    
    if (updates.heartbeatLatency !== undefined) {
      const quality = assessConnectionQuality(updates.heartbeatLatency, 0);
      setConnectionQuality(quality);
    }
  }, [assessConnectionQuality]);

  // Heartbeat system
  const sendHeartbeat = useCallback(() => {
    if (socketRef.current?.connected) {
      const timestamp = Date.now();
      socketRef.current.emit('ping', { timestamp });
      updateMetrics({ lastHeartbeat: timestamp });
    }
  }, [updateMetrics]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, finalConfig.heartbeatInterval);
  }, [sendHeartbeat, finalConfig.heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Event handler management - simplified for compatibility
  const addEventListener = useCallback((
    event: string,
    handler: Function
  ) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)?.add(handler);

    // Add to socket if connected
    if (socketRef.current) {
      socketRef.current.on(event, handler as any);
    }

    // Return cleanup function
    return () => {
      eventHandlersRef.current.get(event)?.delete(handler);
      if (socketRef.current) {
        socketRef.current.off(event, handler as any);
      }
    };
  }, []);

  // Enhanced emit with callbacks and type safety
  const emit = useCallback((
    event: string,
    ...args: any[]
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        const error = createError('connection', 'NOT_CONNECTED', 'Socket not connected', { event });
        setLastError(error);
        reject(error);
        return;
      }

      try {
        // Check if last argument is a callback
        const lastArg = args[args.length - 1];
        const hasCallback = typeof lastArg === 'function';

        if (hasCallback) {
          // Use existing callback
          socketRef.current.emit(event, ...args);
          updateMetrics({ packetsSent: metricsRef.current.packetsSent + 1 });
          resolve(true);
        } else {
          // Add our own callback for promise resolution
          const callback = (response: any) => {
            updateMetrics({ packetsReceived: metricsRef.current.packetsReceived + 1 });
            if (response?.success === false) {
              reject(new Error(response.error || 'Operation failed'));
            } else {
              resolve(response);
            }
          };

          socketRef.current.emit(event, ...args, callback);
          updateMetrics({ packetsSent: metricsRef.current.packetsSent + 1 });
        }
      } catch (error) {
        const wsError = createError('event_handling', 'EMIT_FAILED', 'Failed to emit event', { event, error });
        setLastError(wsError);
        reject(wsError);
      }
    });
  }, [createError, updateMetrics]);

  // Enhanced connection with retry logic
  const connect = useCallback(async (): Promise<void> => {
    if (isConnecting || (socketRef.current?.connected)) {
      return connectionPromiseRef.current || Promise.resolve();
    }

    connectionPromiseRef.current = new Promise<void>(async (resolve, reject) => {
      try {
        setIsConnecting(true);
        setLastError(null);

        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:7777';
        
        // Enhanced connection configuration
        const socket = io(`${baseUrl}/rooms`, {
          transports: ['websocket', 'polling'],
          upgrade: true,
          rememberUpgrade: true,
          autoConnect: false,
          reconnection: false, // Handle manually
          timeout: 20000,
          forceNew: true,
          
          auth: {
            token: session?.accessToken,
            userId: session?.user?.id,
          },
          
          query: {
            clientVersion: '2.0.0',
            platform: 'web',
            capabilities: 'enhanced-websocket',
          },
          
          extraHeaders: {
            'X-Client-Version': '2.0.0',
            'X-Client-Type': 'enhanced-react',
          }
        });

        // Connection timeout
        const timeoutId = setTimeout(() => {
          const error = createError('connection', 'TIMEOUT', 'Connection timeout');
          setLastError(error);
          socket.disconnect();
          reject(error);
        }, 20000);

        // Enhanced event handlers
        socket.on('connect', () => {
          clearTimeout(timeoutId);
          setIsConnected(true);
          setIsConnecting(false);
          updateMetrics({ 
            lastConnectTime: Date.now(),
            connectionAttempts: metricsRef.current.connectionAttempts + 1
          });
          startHeartbeat();
          
          if (finalConfig.debugMode) {
            console.log('🟢 Enhanced WebSocket Connected:', socket.id);
          }
          
          toast.success('Conectado ao servidor');
          resolve();
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeoutId);
          const wsError = createError('connection', 'CONNECT_ERROR', error.message, error);
          setLastError(wsError);
          setIsConnecting(false);
          
          if (finalConfig.debugMode) {
            console.error('🔴 Enhanced WebSocket Connection Error:', error);
          }
          
          reject(wsError);
        });

        socket.on('disconnect', (reason, details) => {
          setIsConnected(false);
          stopHeartbeat();
          
          if (finalConfig.debugMode) {
            console.log('🟡 Enhanced WebSocket Disconnected:', reason, details);
          }
          
          // Auto-reconnect unless manual disconnect
          if (reason !== 'io client disconnect') {
            scheduleReconnect();
          }
        });

        // Enhanced pong handler for latency measurement
        socket.on('pong', (data: any) => {
          const latency = Date.now() - data.timestamp;
          updateMetrics({ 
            heartbeatLatency: latency,
            avgLatency: (metricsRef.current.avgLatency + latency) / 2
          });
        });

        // Room event handlers
        socket.on('room_joined', (data: any) => {
          console.log('🔍 Frontend Debug - room_joined event received:', data);
          console.log('🔍 Frontend Debug - Participants in room_joined:', data.participants);
          
          setCurrentRoom(data.room?.id);
          setParticipants(data.participants || []);
          
          if (finalConfig.debugMode) {
            console.log('🏠 Room Joined:', data);
          }
        });

        socket.on('participant_joined', (data: any) => {
          console.log('🔍 Frontend Debug - participant_joined event received:', data);
          console.log('🔍 Frontend Debug - Current participants before update:', participants);
          
          setParticipants(prev => {
            const exists = prev.find(p => p.id === data.participant?.id);
            console.log('🔍 Frontend Debug - Participant exists check:', {
              participantId: data.participant?.id,
              exists: !!exists,
              currentParticipants: prev.length
            });
            
            if (exists) {
              console.log('🔍 Frontend Debug - Participant already exists, not adding');
              return prev;
            }
            
            const newParticipants = [...prev, data.participant];
            console.log('🔍 Frontend Debug - Adding new participant, total now:', newParticipants.length);
            return newParticipants;
          });
        });

        socket.on('participant_left', (data: any) => {
          setParticipants(prev => prev.filter(p => p.id !== data.participantId));
        });

        socket.on('participants_updated', (data: any) => {
          console.log('🔍 Frontend Debug - participants_updated event received:', data);
          setParticipants(data.participants || []);
          
          if (finalConfig.debugMode) {
            console.log('🔄 Participants Updated:', data);
          }
        });

        // ✅ ENHANCED: Handle being kicked from room with automatic navigation
        socket.on('kicked_from_room', (data: any) => {
          console.log('👢 [useEnhancedWebSocket] KICK EVENT RECEIVED:', data);
          console.log('👢 [useEnhancedWebSocket] Current window location:', typeof window !== 'undefined' ? window.location.pathname : 'SSR');
          
          // ✅ IMPROVED: Show clear kick notification alert
          toast.error(`You have been removed from the room`, {
            description: data.reason || 'Contact the room administrator for more information',
            duration: 8000, // Longer duration so user can read it
            position: 'top-center',
          });
          
          // Clean up room state
          setCurrentRoom(null);
          setParticipants([]);
          setIsConnected(false);
          
          // ✅ SIMPLIFIED: Always redirect from room pages - remove complex logic
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            console.log('👢 [useEnhancedWebSocket] Current path for redirection:', currentPath);
            
            // ✅ FIXED: Simplified check - if we're in any room-related page, redirect
            const isInRoomPages = currentPath.includes('/rooms/') || currentPath.startsWith('/rooms/');
            
            console.log('👢 [useEnhancedWebSocket] Redirection check:', {
              currentPath,
              isInRoomPages,
              willRedirect: isInRoomPages
            });
            
            if (isInRoomPages) {
              console.log('👢 [useEnhancedWebSocket] EXECUTING IMMEDIATE REDIRECTION to /rooms');
              
              // ✅ IMMEDIATE: Use location.href for reliable redirection
              try {
                console.log('👢 [useEnhancedWebSocket] Using window.location.href for immediate redirection');
                window.location.href = '/rooms';
              } catch (redirectError) {
                console.error('👢 [useEnhancedWebSocket] Redirection failed, trying alternative:', redirectError);
                // Alternative: Force page reload to rooms
                window.location.replace('/rooms');
              }
            } else {
              console.log('👢 [useEnhancedWebSocket] Not in room pages, skipping redirection');
            }
          } else {
            console.log('👢 [useEnhancedWebSocket] Window not available (SSR), skipping redirection');
          }
          
          // Disconnect the socket to prevent reconnection
          if (socket?.connected) {
            console.log('👢 [useEnhancedWebSocket] Disconnecting socket after kick');
            socket.disconnect();
          }
          
          if (finalConfig.debugMode) {
            console.log('👢 Kick Event Details:', {
              reason: data.reason,
              roomId: data.roomId,
              timestamp: data.timestamp,
              redirectedTo: '/rooms',
              currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
            });
          }
        });

        // ✅ ALSO: Handle participant_kicked events (when someone else is kicked)
        socket.on('participant_kicked', (data: any) => {
          if (finalConfig.debugMode) {
            console.log('📢 [useEnhancedWebSocket] Participant kicked notification:', data);
          }
          
          // Update participant list by removing the kicked participant
          setParticipants(prev => prev.filter(p => p.id !== data.participantId));
          
          // Show notification if not initiated by current user
          if (!data.initiatedByYou) {
            toast.info(`${data.participantName} was removed from the room`, {
              duration: 3000,
            });
          }
        });

        // Re-attach existing event handlers
        for (const [event, handlers] of eventHandlersRef.current.entries()) {
          for (const handler of handlers) {
            socket.on(event, handler as any);
          }
        }

        socketRef.current = socket;
        updateMetrics({ connectionStartTime: Date.now() });
        
        // Initiate connection
        socket.connect();

      } catch (error) {
        const wsError = createError('connection', 'SETUP_FAILED', 'Failed to setup connection', error);
        setLastError(wsError);
        setIsConnecting(false);
        reject(wsError);
      }
    });

    return connectionPromiseRef.current;
  }, [
    isConnecting, 
    session, 
    finalConfig, 
    createError, 
    updateMetrics, 
    startHeartbeat, 
    stopHeartbeat
  ]);

  // Enhanced reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const attempt = metricsRef.current.totalReconnects;
    if (attempt >= finalConfig.maxRetries) {
      const error = createError('connection', 'MAX_RETRIES', 'Maximum reconnection attempts reached');
      setLastError(error);
      toast.error('Não foi possível reconectar. Recarregue a página.');
      return;
    }

    const delay = Math.min(
      finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
      finalConfig.maxDelay
    );

    updateMetrics({ totalReconnects: attempt + 1 });

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        await connect();
      } catch (error) {
        if (finalConfig.debugMode) {
          console.error('🔄 Reconnection failed:', error);
        }
        scheduleReconnect();
      }
    }, delay);

    if (finalConfig.debugMode) {
      console.log(`🔄 Scheduling reconnection in ${delay}ms (attempt ${attempt + 1})`);
    }
  }, [finalConfig, connect, createError, updateMetrics]);

  // Disconnect with cleanup
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setCurrentRoom(null);
    setParticipants([]);
    connectionPromiseRef.current = null;

    if (finalConfig.debugMode) {
      console.log('🔴 Enhanced WebSocket Disconnected');
    }
  }, [stopHeartbeat, finalConfig.debugMode]);

  // Room management methods
  const joinRoom = useCallback(async (data: { accessCode: string; displayName?: string }): Promise<any> => {
    return emit('join_room', data);
  }, [emit]);

  const leaveRoom = useCallback(async (data: { roomId: string }): Promise<any> => {
    const result = await emit('leave_room', data);
    setCurrentRoom(null);
    setParticipants([]);
    return result;
  }, [emit]);

  const refreshParticipants = useCallback(async (roomId: string): Promise<any> => {
    console.log('🔄 Frontend Debug - Refreshing participants for room:', roomId);
    return emit('refresh_participants', { roomId });
  }, [emit]);

  // Quiz control methods
  const startQuiz = useCallback(async (data: { roomId: string; questionIndex?: number }): Promise<any> => {
    return emit('start_quiz', data);
  }, [emit]);

  const submitAnswer = useCallback(async (data: { roomId: string; questionId: string; answer: any; participantId: string }): Promise<any> => {
    return emit('submit_answer', data);
  }, [emit]);

  // ✅ ADDED: Kick participant method for consistency
  const kickParticipant = useCallback(async (data: { roomId: string; participantId: string; reason?: string }): Promise<any> => {
    console.log('👢 [useEnhancedWebSocket] Kicking participant:', data);
    return emit('kick_participant', data);
  }, [emit]);

  // ✅ DEBUG: Test function to simulate kick events for debugging
  const simulateKickEvent = useCallback((reason: string = 'Test kick') => {
    console.log('👢 [useEnhancedWebSocket] SIMULATING KICK EVENT for testing');
    
    // Simulate the kicked_from_room event data
    const mockKickData = {
      reason,
      roomId: currentRoom,
      timestamp: new Date().toISOString(),
      source: 'debug-simulation'
    };
    
    // Manually trigger the kick handler as if the event was received
    if (socketRef.current) {
      socketRef.current.emit('debug_simulate_kick', mockKickData);
      
      // Also manually call the kick handler for immediate testing
      setTimeout(() => {
        console.log('👢 [useEnhancedWebSocket] TRIGGERING MANUAL KICK HANDLER');
        // Find the kick handler and call it directly
        const kickHandler = socketRef.current?.listeners('kicked_from_room')?.[0];
        if (kickHandler && typeof kickHandler === 'function') {
          kickHandler(mockKickData);
        } else {
          console.log('👢 [useEnhancedWebSocket] No kick handler found, creating manual redirection');
          // Manual redirection for testing
          if (typeof window !== 'undefined') {
            window.location.href = '/rooms';
          }
        }
      }, 100);
    }
  }, [currentRoom]);

  // Diagnostic methods
  const getDiagnostics = useCallback((): any => {
    const socket = socketRef.current;
    const metrics = metricsRef.current;

    return {
      socket: {
        connected: socket?.connected || false,
        id: socket?.id || 'none',
        transport: (socket as any)?.io?.engine?.transport?.name || 'none',
        namespace: '/rooms',
      },
      session: {
        authenticated: !!session?.accessToken,
        userId: session?.user?.id || undefined,
        sessionId: socket?.id,
        expiresAt: session?.expires,
      },
      network: {
        online: navigator.onLine,
        connectionType: (navigator as any).connection?.type,
        effectiveType: (navigator as any).connection?.effectiveType,
      },
      performance: {
        latency: metrics.heartbeatLatency,
        throughput: metrics.packetsReceived / Math.max(1, metrics.uptime / 1000),
        errorRate: lastError ? 1 : 0,
      },
      errors: lastError ? [lastError] : [],
    };
  }, [session, lastError]);

  // Auto-connect on session change
  useEffect(() => {
    if (session?.accessToken && !isConnected && !isConnecting) {
      connect().catch(error => {
        // ✅ FIXED: Better error handling with proper error object handling
        const errorDetails = {
          message: error?.message || error?.toString() || 'Connection failed',
          code: error?.code || error?.type || 'CONNECTION_ERROR',
          name: error?.name || 'Unknown Error',
          timestamp: new Date().toISOString(),
          userInfo: {
            hasSession: !!session?.accessToken,
            userId: session?.user?.id,
            email: session?.user?.email,
            role: session?.user?.role,
          },
          network: {
            backendUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:7777',
            userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent?.slice(0, 100) : 'unknown',
            online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
          },
          stack: error?.stack?.slice(0, 500) || 'No stack trace',
          originalError: error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'No error object',
        };

        if (finalConfig.debugMode) {
          console.error('🔌 Auto-connect failed with details:', errorDetails);
        } else {
          // ✅ IMPROVED: More user-friendly console message in production
          console.warn('🔌 WebSocket auto-connect failed - this is normal if the backend is not running');
        }

        // ✅ IMPROVED: Only show user-facing error for repeated failures
        const now = Date.now();
        const lastErrorKey = 'ws-auto-connect-last-error';
        const lastErrorTime = parseInt(localStorage.getItem(lastErrorKey) || '0');
        
        // Show error toast only if last error was more than 30 seconds ago (prevents spam)
        if (now - lastErrorTime > 30000) {
          toast.error('Connection issue - please check your internet connection', {
            duration: 4000,
            position: 'bottom-right',
          });
          localStorage.setItem(lastErrorKey, now.toString());
        }
      });
    }
  }, [session?.accessToken, isConnected, isConnecting, connect, finalConfig.debugMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Public API
  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionQuality,
    lastError,
    
    // Room state
    currentRoom,
    participants,
    
    // Methods
    connect,
    disconnect,
    addEventListener,
    emit,
    
    // Room methods
    joinRoom,
    leaveRoom,
    refreshParticipants,
    
    // Quiz methods
    startQuiz,
    submitAnswer,
    kickParticipant,
    
    // Diagnostics
    getDiagnostics,
    getMetrics: () => ({ ...metricsRef.current }),
    
    // ✅ DEBUG: Add test function to public API
    simulateKickEvent,
    
    // Socket instance (for advanced usage)
    socket: socketRef.current,
  };
} 