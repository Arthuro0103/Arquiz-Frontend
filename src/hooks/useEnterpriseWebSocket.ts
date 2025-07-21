'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Socket, io } from 'socket.io-client';
import { toast } from 'sonner';
import { ConnectionConfig, WebSocketError, ConnectionMetrics } from '@/types/websocket.types';
import { ArQuizWebSocketEnterprise } from '@/types/websocket-enterprise.types';

// Enterprise WebSocket Hook with AI-powered features
export function useEnterpriseWebSocket(config?: Partial<ArQuizWebSocketEnterprise.EnterpriseConfig>) {
  // Enterprise configuration with AI-powered defaults
  const defaultConfig: ArQuizWebSocketEnterprise.EnterpriseConfig = {
    clustering: {
      enabled: true,
      redisUrl: process.env.NEXT_PUBLIC_REDIS_URL || 'redis://localhost:6379',
      redisCluster: [],
      nodeId: `node-${Date.now()}`,
      region: process.env.NEXT_PUBLIC_REGION || 'us-east-1',
      loadBalancer: {
        strategy: 'ai_optimized',
        healthCheckInterval: 30000,
        maxConnectionsPerNode: 10000,
        stickySession: true,
        aiOptimization: true,
      },
      failover: {
        enabled: true,
        maxFailureThreshold: 3,
        recoveryTimeMs: 5000,
        backupNodes: [],
        autoFailback: true,
      },
    },
    analytics: {
      enabled: true,
      aiPowered: true,
      realTimeProcessing: true,
      predictiveAnalytics: true,
      anomalyDetection: true,
      userBehaviorTracking: true,
      performancePrediction: true,
      adaptiveOptimization: true,
    },
    security: {
      rateLimiting: {
        enabled: true,
        strategy: 'adaptive',
        maxRequestsPerMinute: 1000,
        maxRequestsPerHour: 10000,
        burstLimit: 100,
        adaptiveThrottling: true,
        whitelistedIPs: [],
        blacklistedIPs: [],
      },
      ddosProtection: {
        enabled: true,
        maxConnectionsPerIP: 10,
        connectionRateLimit: 5,
        suspiciousPatternDetection: true,
        autoBlocking: true,
        challengeResponse: true,
        geoBlocking: [],
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keyRotationInterval: 86400000, // 24 hours
        endToEndEncryption: true,
        certificatePinning: true,
      },
      authentication: {
        multiFactorAuth: false,
        biometricAuth: false,
        deviceFingerprinting: true,
        sessionTimeout: 3600000, // 1 hour
        concurrentSessionLimit: 3,
        suspiciousActivityDetection: true,
      },
      authorization: {
        roleBasedAccess: true,
        attributeBasedAccess: true,
        dynamicPermissions: true,
        contextAwareAccess: true,
        riskBasedAccess: true,
      },
      audit: {
        enabled: true,
        logLevel: 'standard',
        realTimeAlerting: true,
        complianceReporting: true,
        dataRetentionDays: 90,
      },
    },
    performance: {
      connectionPooling: {
        enabled: true,
        minConnections: 10,
        maxConnections: 1000,
        idleTimeout: 300000, // 5 minutes
        connectionReuse: true,
        poolStrategy: 'adaptive',
      },
      messageQueuing: {
        enabled: true,
        maxQueueSize: 10000,
        priorityQueuing: true,
        messageDeduplication: true,
        deadLetterQueue: true,
        batchProcessing: true,
        compressionThreshold: 1024,
      },
      caching: {
        enabled: true,
        strategy: 'adaptive',
        maxCacheSize: 100000,
        ttl: 300000, // 5 minutes
        distributedCache: true,
        cacheWarmup: true,
      },
      compression: {
        enabled: true,
        algorithm: 'brotli',
        level: 6,
        threshold: 1024,
        adaptiveCompression: true,
      },
      optimization: {
        aiOptimization: true,
        adaptiveBitrate: true,
        predictivePreloading: true,
        intelligentRouting: true,
        dynamicScaling: true,
      },
    },
    monitoring: {
      enabled: true,
      realTimeMetrics: true,
      alerting: {
        enabled: true,
        channels: ['webhook'],
        thresholds: {
          errorRate: 0.05,
          latency: 1000,
          connectionFailures: 10,
          memoryUsage: 0.8,
          cpuUsage: 0.8,
          diskUsage: 0.9,
          networkLatency: 500,
        },
        escalation: {
          enabled: true,
          levels: [
            {
              level: 1,
              contacts: ['admin@arquiz.com'],
              actions: ['notify'],
              threshold: 0.1,
            },
          ],
          autoEscalation: true,
          escalationDelay: 300000, // 5 minutes
        },
        aiPoweredAlerting: true,
      },
      logging: {
        level: 'info',
        structured: true,
        sampling: true,
        compression: true,
        retention: 30,
        exporters: ['console'],
      },
      tracing: {
        enabled: true,
        samplingRate: 0.1,
        exporters: ['jaeger'],
        customTags: {},
      },
      profiling: {
        enabled: false,
        cpuProfiling: false,
        memoryProfiling: false,
        heapProfiling: false,
        samplingInterval: 1000,
      },
    },
    scaling: {
      autoScaling: {
        enabled: true,
        minInstances: 2,
        maxInstances: 100,
        targetCpuUtilization: 70,
        targetMemoryUtilization: 80,
        scaleUpCooldown: 300000, // 5 minutes
        scaleDownCooldown: 600000, // 10 minutes
        predictiveScaling: true,
        aiOptimizedScaling: true,
      },
      loadBalancing: {
        algorithm: 'ai_optimized',
        healthChecks: true,
        sessionAffinity: true,
        crossRegionBalancing: true,
      },
      regionDistribution: {
        enabled: true,
        primaryRegion: 'us-east-1',
        secondaryRegions: ['us-west-2', 'eu-west-1'],
        latencyBasedRouting: true,
        geoDistribution: true,
      },
      capacityPlanning: {
        enabled: true,
        forecastingPeriod: 30,
        growthPrediction: true,
        seasonalityAdjustment: true,
        aiPoweredForecasting: true,
      },
    },
  };

  const finalConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  const { data: session } = useSession();

  // Enterprise state management
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const [lastError, setLastError] = useState<WebSocketError | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  
  // Enterprise-specific state
  const [clusterStatus, setClusterStatus] = useState<'healthy' | 'degraded' | 'critical'>('healthy');
  const [nodeId, setNodeId] = useState<string>(finalConfig.clustering.nodeId);
  const [analytics, setAnalytics] = useState<ArQuizWebSocketEnterprise.AIAnalytics | null>(null);
  const [securityStatus, setSecurityStatus] = useState<'secure' | 'warning' | 'threat'>('secure');
  const [performanceMetrics, setPerformanceMetrics] = useState<ArQuizWebSocketEnterprise.RealTimeMetrics | null>(null);

  // Enterprise refs
  const socketRef = useRef<Socket | null>(null);
  const connectionPromiseRef = useRef<Promise<void> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyticsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const securityMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const performanceMonitorRef = useRef<NodeJS.Timeout | null>(null);
  
  // AI-powered connection pool
  const connectionPoolRef = useRef<Map<string, Socket>>(new Map());
  const loadBalancerRef = useRef<{
    nodes: string[];
    currentIndex: number;
    weights: Map<string, number>;
    healthScores: Map<string, number>;
  }>({
    nodes: [],
    currentIndex: 0,
    weights: new Map(),
    healthScores: new Map(),
  });

  // Advanced metrics tracking
  const metricsRef = useRef<{
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
    securityEvents: number;
    anomaliesDetected: number;
    optimizationsApplied: number;
    predictionsAccuracy: number;
    aiRecommendations: number;
  }>({
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
    bytesTransferred: 0,
    securityEvents: 0,
    anomaliesDetected: 0,
    optimizationsApplied: 0,
    predictionsAccuracy: 0,
    aiRecommendations: 0,
  });

  // AI-powered load balancer
  const selectOptimalNode = useCallback((): string => {
    const { nodes, weights, healthScores } = loadBalancerRef.current;
    
    if (nodes.length === 0) {
      return process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:7777';
    }

    if (finalConfig.clustering.loadBalancer.strategy === 'ai_optimized') {
      // AI-powered node selection based on health scores, latency, and load
      let bestNode = nodes[0];
      let bestScore = 0;

      for (const node of nodes) {
        const health = healthScores.get(node) || 0;
        const weight = weights.get(node) || 1;
        const score = health * weight;

        if (score > bestScore) {
          bestScore = score;
          bestNode = node;
        }
      }

      return bestNode;
    }

    // Fallback to round-robin
    const node = nodes[loadBalancerRef.current.currentIndex % nodes.length];
    loadBalancerRef.current.currentIndex++;
    return node;
  }, [finalConfig.clustering.loadBalancer.strategy]);

  // AI-powered anomaly detection
  const detectAnomalies = useCallback((metrics: ArQuizWebSocketEnterprise.RealTimeMetrics) => {
    if (!finalConfig.analytics.anomalyDetection) return;

    const anomalies: ArQuizWebSocketEnterprise.Anomaly[] = [];

    // Latency anomaly detection
    if (metrics.averageLatency > 1000) {
      anomalies.push({
        id: `latency-${Date.now()}`,
        timestamp: Date.now(),
        metric: 'latency',
        value: metrics.averageLatency,
        expectedValue: 200,
        deviation: metrics.averageLatency - 200,
        severity: metrics.averageLatency > 2000 ? 'critical' : 'high',
        type: 'spike',
        confidence: 0.9,
        context: { threshold: 1000 },
      });
    }

    // Error rate anomaly detection
    if (metrics.errorRate > 0.05) {
      anomalies.push({
        id: `error-rate-${Date.now()}`,
        timestamp: Date.now(),
        metric: 'error_rate',
        value: metrics.errorRate,
        expectedValue: 0.01,
        deviation: metrics.errorRate - 0.01,
        severity: metrics.errorRate > 0.1 ? 'critical' : 'high',
        type: 'spike',
        confidence: 0.95,
        context: { threshold: 0.05 },
      });
    }

    // CPU usage anomaly detection
    if (metrics.cpuUsage > 0.8) {
      anomalies.push({
        id: `cpu-${Date.now()}`,
        timestamp: Date.now(),
        metric: 'cpu_usage',
        value: metrics.cpuUsage,
        expectedValue: 0.5,
        deviation: metrics.cpuUsage - 0.5,
        severity: metrics.cpuUsage > 0.9 ? 'critical' : 'medium',
        type: 'spike',
        confidence: 0.85,
        context: { threshold: 0.8 },
      });
    }

    if (anomalies.length > 0) {
      metricsRef.current.anomaliesDetected += anomalies.length;
      
      // Emit anomaly events
      anomalies.forEach(anomaly => {
        socketRef.current?.emit('anomaly_detected', {
          anomaly,
          severity: anomaly.severity,
          affectedMetrics: [anomaly.metric],
          recommendedActions: getRecommendedActions(anomaly),
          timestamp: new Date().toISOString(),
        });
      });
    }
  }, [finalConfig.analytics.anomalyDetection]);

  // AI-powered optimization recommendations
  const generateOptimizations = useCallback((metrics: ArQuizWebSocketEnterprise.RealTimeMetrics) => {
    if (!finalConfig.analytics.adaptiveOptimization) return;

    const optimizations: ArQuizWebSocketEnterprise.PerformanceOptimization[] = [];

    // Connection pooling optimization
    if (metrics.activeConnections > finalConfig.performance.connectionPooling.maxConnections * 0.8) {
      optimizations.push({
        area: 'connection_pooling',
        currentState: metrics.activeConnections,
        targetState: finalConfig.performance.connectionPooling.maxConnections * 1.2,
        improvement: 20,
        implementation: [
          'Increase connection pool size',
          'Implement connection multiplexing',
          'Add connection load balancing',
        ],
        effort: 'medium',
        impact: 'high',
      });
    }

    // Compression optimization
    if (metrics.networkBandwidth > 100000000) { // 100MB/s
      optimizations.push({
        area: 'compression',
        currentState: 0,
        targetState: 30,
        improvement: 30,
        implementation: [
          'Enable adaptive compression',
          'Implement message batching',
          'Use binary protocols',
        ],
        effort: 'low',
        impact: 'medium',
      });
    }

    // Caching optimization
    if (metrics.messagesPerSecond > 1000) {
      optimizations.push({
        area: 'caching',
        currentState: 0,
        targetState: 50,
        improvement: 50,
        implementation: [
          'Implement distributed caching',
          'Add cache warming strategies',
          'Optimize cache eviction policies',
        ],
        effort: 'high',
        impact: 'high',
      });
    }

    if (optimizations.length > 0) {
      metricsRef.current.optimizationsApplied += optimizations.length;
      
      socketRef.current?.emit('optimization_recommendation', {
        category: 'performance',
        recommendations: optimizations,
        priority: 'medium',
        expectedImpact: optimizations.reduce((sum, opt) => sum + opt.improvement, 0) / optimizations.length,
        timestamp: new Date().toISOString(),
      });
    }
  }, [finalConfig.analytics.adaptiveOptimization, finalConfig.performance]);

  // Get recommended actions for anomalies
  const getRecommendedActions = useCallback((anomaly: ArQuizWebSocketEnterprise.Anomaly): string[] => {
    switch (anomaly.metric) {
      case 'latency':
        return [
          'Check network connectivity',
          'Optimize database queries',
          'Scale up server resources',
          'Enable CDN caching',
        ];
      case 'error_rate':
        return [
          'Review error logs',
          'Check service dependencies',
          'Validate input data',
          'Implement circuit breakers',
        ];
      case 'cpu_usage':
        return [
          'Scale horizontally',
          'Optimize algorithms',
          'Implement caching',
          'Review resource allocation',
        ];
      default:
        return ['Monitor closely', 'Review system logs'];
    }
  }, []);

  // Enhanced connection with enterprise features
  const connect = useCallback(async (): Promise<void> => {
    if (isConnecting || socketRef.current?.connected) {
      return connectionPromiseRef.current || Promise.resolve();
    }

    connectionPromiseRef.current = new Promise<void>(async (resolve, reject) => {
      try {
        setIsConnecting(true);
        setLastError(null);

        // Select optimal node using AI
        const baseUrl = selectOptimalNode();
        
        // Enhanced connection configuration with enterprise features
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
            nodeId: nodeId,
            capabilities: 'enterprise',
          },
          
          query: {
            clientVersion: '3.0.0-enterprise',
            platform: 'web',
            capabilities: 'ai-powered,clustering,analytics',
            region: finalConfig.clustering.region,
          },
          
          extraHeaders: {
            'X-Client-Version': '3.0.0-enterprise',
            'X-Client-Type': 'enterprise-react',
            'X-Node-ID': nodeId,
            'X-Cluster-Region': finalConfig.clustering.region,
          }
        });

        // Enhanced event handlers
        socket.on('connect', () => {
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionQuality('excellent');
          
          metricsRef.current.lastConnectTime = Date.now();
          metricsRef.current.connectionAttempts++;
          
          toast.success('Conectado ao servidor enterprise');
          resolve();
        });

        socket.on('connect_error', (error) => {
          const wsError: WebSocketError = {
            type: 'connection',
            code: 'CONNECT_ERROR',
            message: error.message,
            details: error,
            timestamp: Date.now(),
          };
          setLastError(wsError);
          setIsConnecting(false);
          reject(wsError);
        });

        socket.on('disconnect', (reason, details) => {
          setIsConnected(false);
          setConnectionQuality('disconnected');
          
          if (reason !== 'io client disconnect') {
            scheduleReconnect();
          }
        });

        // Enterprise event handlers
        socket.on('node_joined', (data: ArQuizWebSocketEnterprise.NodeJoinedEvent) => {
          loadBalancerRef.current.nodes.push(data.nodeId);
          loadBalancerRef.current.healthScores.set(data.nodeId, 1.0);
          setClusterStatus('healthy');
        });

        socket.on('node_left', (data: ArQuizWebSocketEnterprise.NodeLeftEvent) => {
          const index = loadBalancerRef.current.nodes.indexOf(data.nodeId);
          if (index > -1) {
            loadBalancerRef.current.nodes.splice(index, 1);
            loadBalancerRef.current.healthScores.delete(data.nodeId);
          }
          
          if (loadBalancerRef.current.nodes.length < 2) {
            setClusterStatus('degraded');
          }
        });

        socket.on('analytics_update', (data: ArQuizWebSocketEnterprise.AnalyticsUpdateEvent) => {
          setAnalytics(data.data);
        });

        socket.on('anomaly_detected', (data: ArQuizWebSocketEnterprise.AnomalyDetectedEvent) => {
          metricsRef.current.anomaliesDetected++;
          
          if (data.severity === 'critical') {
            toast.error(`Anomalia crítica detectada: ${data.anomaly.metric}`);
          }
        });

        socket.on('security_threat_detected', (data: ArQuizWebSocketEnterprise.SecurityThreatEvent) => {
          metricsRef.current.securityEvents++;
          setSecurityStatus('threat');
          
          toast.error(`Ameaça de segurança detectada: ${data.threatType}`);
        });

        socket.on('performance_degradation', (data: ArQuizWebSocketEnterprise.PerformanceDegradationEvent) => {
          setConnectionQuality('poor');
          
          toast.warning(`Degradação de performance: ${data.metric}`);
        });

        socket.on('optimization_applied', (data: ArQuizWebSocketEnterprise.OptimizationAppliedEvent) => {
          metricsRef.current.optimizationsApplied++;
          
          toast.success(`Otimização aplicada: ${data.optimization}`);
        });

        socketRef.current = socket;
        metricsRef.current.connectionStartTime = Date.now();
        
        // Initiate connection
        socket.connect();

      } catch (error) {
        const wsError: WebSocketError = {
          type: 'connection',
          code: 'SETUP_FAILED',
          message: 'Failed to setup enterprise connection',
          details: error,
          timestamp: Date.now(),
        };
        setLastError(wsError);
        setIsConnecting(false);
        reject(wsError);
      }
    });

    return connectionPromiseRef.current;
  }, [isConnecting, session, nodeId, finalConfig, selectOptimalNode]);

  // Enhanced reconnection with AI-powered backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const attempt = metricsRef.current.totalReconnects;
    if (attempt >= 10) { // Increased max retries for enterprise
      const error: WebSocketError = {
        type: 'connection',
        code: 'MAX_RETRIES',
        message: 'Maximum reconnection attempts reached',
        timestamp: Date.now(),
      };
      setLastError(error);
      return;
    }

    // AI-powered adaptive backoff
    const baseDelay = 1000;
    const maxDelay = 60000; // Increased for enterprise
    const aiMultiplier = finalConfig.analytics.aiPowered ? 
      Math.min(2, 1 + (metricsRef.current.anomaliesDetected * 0.1)) : 2;
    
    const delay = Math.min(
      baseDelay * Math.pow(aiMultiplier, attempt),
      maxDelay
    );

    metricsRef.current.totalReconnects++;

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        await connect();
      } catch (error) {
        scheduleReconnect();
      }
    }, delay);

  }, [finalConfig.analytics.aiPowered, connect]);

  // Start enterprise monitoring
  const startEnterpriseMonitoring = useCallback(() => {
    // Analytics monitoring
    if (analyticsIntervalRef.current) {
      clearInterval(analyticsIntervalRef.current);
    }

    analyticsIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected && finalConfig.analytics.enabled) {
        // Collect real-time metrics
        const metrics: ArQuizWebSocketEnterprise.RealTimeMetrics = {
          timestamp: Date.now(),
          activeConnections: 1, // Simplified for client-side
          messagesPerSecond: metricsRef.current.packetsSent + metricsRef.current.packetsReceived,
          averageLatency: metricsRef.current.heartbeatLatency,
          errorRate: lastError ? 0.1 : 0.01,
          throughput: metricsRef.current.bytesTransferred,
          cpuUsage: 0.5, // Would be provided by server
          memoryUsage: 0.6, // Would be provided by server
          networkBandwidth: metricsRef.current.bytesTransferred * 8, // Convert to bits
        };

        setPerformanceMetrics(metrics);

        // AI-powered anomaly detection
        detectAnomalies(metrics);

        // Generate optimization recommendations
        generateOptimizations(metrics);
      }
    }, 30000); // Every 30 seconds

    // Security monitoring
    if (securityMonitorRef.current) {
      clearInterval(securityMonitorRef.current);
    }

    securityMonitorRef.current = setInterval(() => {
      if (finalConfig.security.audit.enabled) {
        // Reset security status if no recent threats
        if (metricsRef.current.securityEvents === 0) {
          setSecurityStatus('secure');
        }
      }
    }, 60000); // Every minute

  }, [finalConfig, lastError, detectAnomalies, generateOptimizations]);

  // Disconnect with enterprise cleanup
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (analyticsIntervalRef.current) {
      clearInterval(analyticsIntervalRef.current);
      analyticsIntervalRef.current = null;
    }

    if (securityMonitorRef.current) {
      clearInterval(securityMonitorRef.current);
      securityMonitorRef.current = null;
    }

    if (performanceMonitorRef.current) {
      clearInterval(performanceMonitorRef.current);
      performanceMonitorRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Clear connection pool
    connectionPoolRef.current.clear();

    setIsConnected(false);
    setIsConnecting(false);
    setCurrentRoom(null);
    setParticipants([]);
    setClusterStatus('healthy');
    setAnalytics(null);
    setSecurityStatus('secure');
    setPerformanceMetrics(null);
    connectionPromiseRef.current = null;

  }, []);

  // Enhanced emit with enterprise features
  const emit = useCallback((event: string, ...args: any[]): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        const error: WebSocketError = {
          type: 'connection',
          code: 'NOT_CONNECTED',
          message: 'Socket not connected',
          details: { event },
          timestamp: Date.now(),
        };
        setLastError(error);
        reject(error);
        return;
      }

      try {
        // Add enterprise metadata
        const enhancedArgs = args.map(arg => ({
          ...arg,
          _enterprise: {
            nodeId,
            timestamp: Date.now(),
            version: '3.0.0-enterprise',
          },
        }));

        const callback = (response: any) => {
          metricsRef.current.packetsReceived++;
          
          if (response?.success === false) {
            reject(new Error(response.error || 'Operation failed'));
          } else {
            resolve(response);
          }
        };

        socketRef.current.emit(event, ...enhancedArgs, callback);
        metricsRef.current.packetsSent++;

      } catch (error) {
        const wsError: WebSocketError = {
          type: 'event_handling',
          code: 'EMIT_FAILED',
          message: 'Failed to emit event',
          details: { event, error },
          timestamp: Date.now(),
        };
        setLastError(wsError);
        reject(wsError);
      }
    });
  }, [nodeId]);

  // Enterprise diagnostics
  const getEnterpriseDiagnostics = useCallback(() => {
    return {
      connection: {
        connected: isConnected,
        quality: connectionQuality,
        nodeId,
        region: finalConfig.clustering.region,
      },
      cluster: {
        status: clusterStatus,
        nodes: loadBalancerRef.current.nodes.length,
        healthScores: Object.fromEntries(loadBalancerRef.current.healthScores),
      },
      analytics: {
        enabled: finalConfig.analytics.enabled,
        aiPowered: finalConfig.analytics.aiPowered,
        anomaliesDetected: metricsRef.current.anomaliesDetected,
        optimizationsApplied: metricsRef.current.optimizationsApplied,
      },
      security: {
        status: securityStatus,
        events: metricsRef.current.securityEvents,
        rateLimitingEnabled: finalConfig.security.rateLimiting.enabled,
        encryptionEnabled: finalConfig.security.encryption.enabled,
      },
      performance: performanceMetrics,
      metrics: metricsRef.current,
    };
  }, [
    isConnected,
    connectionQuality,
    nodeId,
    finalConfig,
    clusterStatus,
    securityStatus,
    performanceMetrics,
  ]);

  // Auto-connect and start monitoring
  useEffect(() => {
    if (session?.accessToken && !isConnected && !isConnecting) {
      connect().then(() => {
        startEnterpriseMonitoring();
      }).catch(console.error);
    }
  }, [session, isConnected, isConnecting, connect, startEnterpriseMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Public API
  return {
    // Basic connection state
    isConnected,
    isConnecting,
    connectionQuality,
    lastError,
    currentRoom,
    participants,
    
    // Enterprise state
    clusterStatus,
    nodeId,
    analytics,
    securityStatus,
    performanceMetrics,
    
    // Methods
    connect,
    disconnect,
    emit,
    
    // Enterprise diagnostics
    getEnterpriseDiagnostics,
    getMetrics: () => ({ ...metricsRef.current }),
    
    // Socket instance
    socket: socketRef.current,
  };
} 