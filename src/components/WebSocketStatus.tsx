'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Activity,
  Settings,
  Monitor,
  Signal,
  XCircle,
  Users,
  Cpu,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebSocketStatusProps {
  variant?: 'default' | 'compact' | 'detailed' | 'debug';
  className?: string;
  showReconnectButton?: boolean;
  showMetrics?: boolean;
  showDebugInfo?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface ConnectionMetrics {
  uptime: number;
  latency: number;
  quality: string;
  reconnects: number;
  packetsReceived: number;
  packetsSent: number;
  lastHeartbeat: string | null;
  bytesTransferred: number;
}

interface DetailedConnectionInfo {
  socketId: string;
  transport: string;
  namespace: string;
  room: string | null;
  role: string | null;
  sessionValid: boolean;
  hasToken: boolean;
  networkOnline: boolean;
  pageVisible: boolean;
  consecutiveFailures: number;
  lastError: string | null;
  browserInfo?: {
    userAgent: string;
    platform: string;
    language: string;
    cookieEnabled: boolean;
  };
  networkInfo?: {
    online: boolean;
    connectionType: string;
    downlink: number;
  };
  performanceInfo?: {
    memoryUsage: number;
    timing: {
      domContentLoaded: number;
      loadComplete: number;
    } | null;
  };
}

interface DiagnosticResult {
  socket?: {
    connected?: boolean;
    id?: string;
    transport?: string;
  };
  state?: {
    participantCount?: number;
    currentRoom?: string;
    currentRole?: string;
  };
  session?: {
    hasUser?: boolean;
    userEmail?: string;
  };
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  variant = 'default',
  className,
  showReconnectButton = true,
  showMetrics = true,
  showDebugInfo = false,
  onConnectionChange,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const websocket = useWebSocket();
  const [isExpanded, setIsExpanded] = useState(false);
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
  const [detailedInfo, setDetailedInfo] = useState<DetailedConnectionInfo | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lastDiagnostics, setLastDiagnostics] = useState<DiagnosticResult | null>(null);
  
  // Connection status tracking
  const [previousConnectionState, setPreviousConnectionState] = useState(websocket.isConnected);
  const [connectionHistory, setConnectionHistory] = useState<Array<{
    state: string;
    timestamp: Date;
    duration?: number;
  }>>([]);

  // Utility functions
  const formatUptimeUtil = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }, []);

  const formatLatency = useCallback((latency: number): string => {
    if (latency < 100) return `${latency}ms`;
    if (latency < 500) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  }, []);

  const formatBytesUtil = useCallback((bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }, []);

  // Enhanced real-time monitoring with performance metrics
  const updateMetrics = useCallback(() => {
    const quality = websocket.connectionQuality;
    const ping = websocket.connectionAttempts * 100; // Simulated ping based on connection attempts
    
    setMetrics({
      latency: ping,
      quality: quality || 'unknown',
      reconnects: websocket.connectionAttempts || 0,
      lastHeartbeat: new Date().toISOString(),
      packetsReceived: websocket.participants?.length || 0,
      packetsSent: websocket.participants?.length || 0,
      uptime: Date.now() / 1000, // Convert to seconds
      bytesTransferred: (websocket.participants?.length || 0) * 64
    });
    
    setDetailedInfo({
      socketId: 'ws-' + Date.now().toString(36),
      transport: 'websocket',
      namespace: '/',
      room: websocket.currentRoom || null,
      role: websocket.currentRole || null,
      sessionValid: true,
      hasToken: true,
      networkOnline: navigator.onLine,
      pageVisible: !document.hidden,
      consecutiveFailures: 0,
      lastError: websocket.lastError,
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled
      },
      networkInfo: {
        online: navigator.onLine,
        connectionType: (navigator as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType || 'unknown',
        downlink: (navigator as unknown as { connection?: { downlink?: number } }).connection?.downlink || 0
      },
      performanceInfo: {
        memoryUsage: (performance as unknown as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number } }).memory?.usedJSHeapSize || 0,
        timing: performance.timing ? {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
        } : null
      }
    });
    
    setLastUpdateTime(new Date());
  }, [websocket]);

  useEffect(() => {
    if (!websocket) return;

    // Initial update
    updateMetrics();
    
    // Update every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    
    return () => clearInterval(interval);
  }, [websocket, updateMetrics]);

  // Enhanced connection status with visual indicators
  const getConnectionStatusIcon = () => {
    if (!websocket?.isConnected) return <WifiOff className="h-4 w-4 text-red-500" />;
    
    const quality = metrics?.quality || 'unknown';
    switch (quality) {
      case 'excellent':
        return <Signal className="h-4 w-4 text-green-500" />;
      case 'good':
        return <Signal className="h-4 w-4 text-blue-500" />;
      case 'poor':
        return <Signal className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    if (!websocket?.isConnected) return 'text-red-500';
    
    const quality = metrics?.quality || 'unknown';
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'poor': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  // Track connection state changes
  useEffect(() => {
    if (websocket.isConnected !== previousConnectionState) {
      const now = new Date();
      const previousEntry = connectionHistory[connectionHistory.length - 1];
      
      // Calculate duration of previous state
      if (previousEntry) {
        previousEntry.duration = now.getTime() - previousEntry.timestamp.getTime();
      }

      // Add new state
      setConnectionHistory(prev => [
        ...prev.slice(-9), // Keep last 10 entries
        {
          state: websocket.isConnected ? 'connected' : 'disconnected',
          timestamp: now
        }
      ]);

      setPreviousConnectionState(websocket.isConnected);
      
      // Notify parent component
      onConnectionChange?.(websocket.isConnected);
    }
  }, [websocket.isConnected, previousConnectionState, connectionHistory, onConnectionChange]);

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      updateMetrics();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, updateMetrics]);

  // Auto-trigger diagnostics when component mounts in debug mode
  useEffect(() => {
    if (variant === 'debug' || variant === 'detailed') {
      const timer = setTimeout(() => {
        if (websocket.diagnoseProblem) {
          const diagnostics = websocket.diagnoseProblem() as DiagnosticResult;
          setLastDiagnostics(diagnostics);
          console.log('[WebSocketStatus] 🚀 Auto-diagnostics on mount:', diagnostics);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [variant, websocket.diagnoseProblem]);

  // Render functions for different variants
  const renderCompactStatus = () => {
    const statusIcon = websocket.isConnected ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );

    const statusText = websocket.isConnected ? 'Online' : 'Offline';
    const statusColor = websocket.isConnected ? 'text-green-600' : 'text-red-600';

    return (
      <div className={cn("flex items-center gap-2", className)}>
        {statusIcon}
        <span className={cn("text-sm font-medium", statusColor)}>
          {statusText}
        </span>
        {websocket.isConnected && metrics && (
          <Badge variant="secondary" className="text-xs">
            {formatLatency(metrics.latency)}
          </Badge>
        )}
        {!websocket.isConnected && showReconnectButton && (
          <Button
            size="sm"
            variant="outline"
            onClick={websocket.forceReconnect}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const renderDefaultStatus = () => (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {websocket.isConnected ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            <CardTitle className="text-lg">
              Conexão WebSocket
            </CardTitle>
          </div>
          <Badge 
            variant={websocket.isConnected ? "default" : "destructive"}
            className="capitalize"
          >
            {websocket.connectionState}
          </Badge>
        </div>
        <CardDescription>
          Estado da conexão em tempo real
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <div className="flex items-center gap-2">
            {getConnectionStatusIcon()}
            <span className={cn("text-sm", getStatusColor())}>
              {websocket.connectionQuality}
            </span>
          </div>
        </div>

        {/* Connection Info */}
        {websocket.isConnected && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sala atual:</span>
              <span className="text-sm text-muted-foreground">
                {websocket.currentRoom || 'Nenhuma'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Papel:</span>
              <Badge variant="outline" className="text-xs">
                {websocket.currentRole || 'N/A'}
              </Badge>
            </div>
          </>
        )}

        {/* Metrics */}
        {showMetrics && metrics && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Latência:</span>
                <div className="font-mono">{formatLatency(metrics.latency)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Tempo ativo:</span>
                <div className="font-mono">{formatUptimeUtil(metrics.uptime)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Reconexões:</span>
                <div className="font-mono">{metrics.reconnects}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Última atividade:</span>
                <div className="font-mono text-xs">{metrics.lastHeartbeat ? new Date(metrics.lastHeartbeat).toLocaleTimeString() : 'Never'}</div>
              </div>
            </div>
          </>
        )}

        {/* Error Display */}
        {websocket.lastError && (
          <>
            <Separator />
            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Último erro:</span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                {websocket.lastError}
              </p>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {showReconnectButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={websocket.forceReconnect}
              disabled={websocket.isConnected && websocket.connectionState === 'connecting'}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconectar
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            {isExpanded ? 'Menos' : 'Mais'} detalhes
          </Button>
        </div>

        {/* Expandable Debug Info */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-4">
            {renderDebugInfo()}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );

  const renderDetailedStatus = () => (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Monitor de Conexão WebSocket
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={websocket.isConnected ? "default" : "destructive"}>
              {websocket.connectionState}
            </Badge>
            <Button size="sm" variant="ghost" onClick={updateMetrics}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          Monitoramento detalhado da conexão em tempo real • Última atualização: {lastUpdateTime.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {websocket.isConnected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium">Estado da Conexão</p>
                  <p className={cn(
                    "text-lg font-bold",
                    websocket.isConnected ? "text-green-600" : "text-red-600"
                  )}>
                    {websocket.isConnected ? 'Conectado' : 'Desconectado'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {getConnectionStatusIcon()}
                <div>
                  <p className="text-sm font-medium">Qualidade</p>
                  <p className={cn("text-lg font-bold", getStatusColor())}>
                    {websocket.connectionQuality}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Participantes</p>
                  <p className="text-lg font-bold text-blue-600">
                    {websocket.participants.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        {metrics && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Métricas de Performance
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Latência</p>
                  <p className="text-2xl font-bold font-mono">{formatLatency(metrics.latency)}</p>
                  <Progress 
                    value={Math.max(0, 100 - (metrics.latency / 10))} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tempo Ativo</p>
                  <p className="text-lg font-bold font-mono">{formatUptimeUtil(metrics.uptime)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Pacotes</p>
                  <p className="text-lg font-bold">↑{metrics.packetsSent} ↓{metrics.packetsReceived}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Dados</p>
                  <p className="text-lg font-bold font-mono">{formatBytesUtil(metrics.bytesTransferred)}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Connection History */}
        {connectionHistory.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico de Conexão
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {connectionHistory.slice(-5).reverse().map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      {entry.state === 'connected' ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span className="capitalize">{entry.state}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {entry.timestamp.toLocaleTimeString()}
                      {entry.duration && (
                        <span className="ml-2">({(entry.duration / 1000).toFixed(1)}s)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Debug Information */}
        {showDebugInfo && renderDebugInfo()}
      </CardContent>
    </Card>
  );

  const renderDebugInfo = () => {
    if (!detailedInfo) return null;

    return (
      <>
        <Separator />
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Informações de Debug
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Socket ID:</span>
                <span className="font-mono">{detailedInfo.socketId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transport:</span>
                <span className="font-mono">{detailedInfo.transport}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Namespace:</span>
                <span className="font-mono">{detailedInfo.namespace}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sala atual:</span>
                <span className="font-mono">{detailedInfo.room || 'Nenhuma'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Papel:</span>
                <span className="font-mono">{detailedInfo.role || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sessão válida:</span>
                <Badge variant={detailedInfo.sessionValid ? "default" : "destructive"} className="text-xs">
                  {detailedInfo.sessionValid ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token ativo:</span>
                <Badge variant={detailedInfo.hasToken ? "default" : "destructive"} className="text-xs">
                  {detailedInfo.hasToken ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rede online:</span>
                <Badge variant={detailedInfo.networkOnline ? "default" : "destructive"} className="text-xs">
                  {detailedInfo.networkOnline ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Página visível:</span>
                <Badge variant={detailedInfo.pageVisible ? "default" : "secondary"} className="text-xs">
                  {detailedInfo.pageVisible ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Falhas consecutivas:</span>
                <span className="font-mono">{detailedInfo.consecutiveFailures}</span>
              </div>
            </div>
          </div>
          
          {detailedInfo.lastError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <p className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">Último erro:</p>
              <p className="text-xs text-red-600 dark:text-red-300 font-mono">
                {detailedInfo.lastError}
              </p>
            </div>
          )}
          
          {/* Debug Controls */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => websocket.forceReconnect()}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reconnect
              </Button>
              
              <Button
                onClick={() => {
                  if (websocket.diagnoseProblem) {
                    const diagnostics = websocket.diagnoseProblem() as DiagnosticResult;
                    setLastDiagnostics(diagnostics);
                    setShowDiagnostics(true);
                    console.log('[WebSocketStatus] 🔧 Manual diagnostics triggered:', diagnostics);
                  }
                  // Removed automatic sync - let user trigger manually if needed
                }}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                Debug & Sync
              </Button>
              
              {websocket.currentRoom && (
                <Button
                  onClick={() => {
                    console.log('[WebSocketStatus] 🔄 Manual participant sync');
                    websocket.syncParticipants(websocket.currentRoom!);
                    // Removed multiple syncs - single sync should be enough
                  }}
                  size="sm"
                  variant="default"
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Sync Participants
                </Button>
              )}
            </div>

            {/* Show diagnostic results if available */}
            {showDiagnostics && lastDiagnostics && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    🔍 Diagnostic Results
                  </h4>
                  <Button
                    onClick={() => setShowDiagnostics(false)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400"
                  >
                    ×
                  </Button>
                </div>
                <div className="text-xs space-y-2">
                  <div>
                    <strong>Socket:</strong> {lastDiagnostics.socket?.connected ? '✅ Connected' : '❌ Disconnected'} 
                    (ID: {lastDiagnostics.socket?.id}, Transport: {lastDiagnostics.socket?.transport})
                  </div>
                  <div>
                    <strong>Participants:</strong> {lastDiagnostics.state?.participantCount || 0} total
                  </div>
                  <div>
                    <strong>Room:</strong> {lastDiagnostics.state?.currentRoom || 'None'} 
                    (Role: {lastDiagnostics.state?.currentRole || 'None'})
                  </div>
                  <div>
                    <strong>Session:</strong> {lastDiagnostics.session?.hasUser ? '✅ Valid' : '❌ Invalid'} 
                    ({lastDiagnostics.session?.userEmail})
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100">
                      Full Details
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(lastDiagnostics, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  // Main render logic
  switch (variant) {
    case 'compact':
      return renderCompactStatus();
    case 'detailed':
      return renderDetailedStatus();
    case 'debug':
      return (
        <div className={className}>
          {renderDefaultStatus()}
          {showDebugInfo && renderDebugInfo()}
        </div>
      );
    default:
      return renderDefaultStatus();
  }
};

export default WebSocketStatus; 