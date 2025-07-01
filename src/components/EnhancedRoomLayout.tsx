'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Enhanced UI components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  Users,
  Activity,
  Signal,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Home,
  Clock,
  Wifi,
  WifiOff,
  Settings
} from 'lucide-react';

// Context and types
import { useWebSocket } from '@/contexts/WebSocketContext';
import { WebSocketStatus } from './WebSocketStatus';

interface EnhancedRoomLayoutProps {
  children: React.ReactNode;
  roomId: string;
  roomName?: string;
  roomType?: 'lobby' | 'manage' | 'play';
  showBackButton?: boolean;
  showHomeButton?: boolean;
  showStats?: boolean;
  className?: string;
}

interface RoomStats {
  participants: number;
  maxParticipants: number;
  uptime: number;
  messagesCount: number;
  connectionQuality: string;
}

export const EnhancedRoomLayout: React.FC<EnhancedRoomLayoutProps> = ({
  children,
  roomId,
  roomName,
  roomType = 'lobby',
  showBackButton = true,
  showHomeButton = true,
  showStats = true,
  className
}) => {
  const router = useRouter();
  const { data: session } = useSession(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const websocket = useWebSocket();
  const [mounted, setMounted] = useState(false);
  const [pageStartTime] = useState(Date.now());

  // Enhanced state management
  const [roomStats, setRoomStats] = useState<RoomStats>({
    participants: 0,
    maxParticipants: 50,
    uptime: 0,
    messagesCount: 0,
    connectionQuality: 'unknown'
  });
  
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date()); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [isRefreshing, setIsRefreshing] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate uptime from page start
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(Math.floor((Date.now() - pageStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [pageStartTime]);

  // Enhanced WebSocket monitoring
  useEffect(() => {
    if (!websocket) return;

    const updateRoomStats = () => {
      setRoomStats({
        participants: websocket.participants?.length || 0,
        maxParticipants: 50, // This could come from room config
        uptime: uptime, // Use the existing uptime calculation from pageStartTime
        messagesCount: websocket.messages?.length || 0,
        connectionQuality: websocket.connectionQuality || 'unknown'
      });
      setLastUpdate(new Date());
    };

    // Initial update
    updateRoomStats();
    
    // Update every 10 seconds
    const interval = setInterval(updateRoomStats, 10000);
    
    return () => clearInterval(interval);
  }, [websocket, websocket.participants, websocket.messages, uptime]);

  // Enhanced navigation handlers
  const handleBack = useCallback(() => {
    if (roomType === 'manage') {
      router.push(`/rooms/${roomId}/lobby`);
    } else {
      router.push('/dashboard');
    }
  }, [router, roomId, roomType]);

  const handleHome = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleRefresh = useCallback(async () => { // eslint-disable-line @typescript-eslint/no-unused-vars
    setIsRefreshing(true);
    try {
      // Trigger room data refresh
      if (websocket.isConnected) {
        websocket.refreshParticipantNames();
        toast.success('Dados atualizados');
      } else {
        toast.error('Conexão perdida - reconectando...');
      }
    } catch (error) {
      console.error('[Layout] Failed to refresh:', error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [websocket]);

  // Enhanced connection status indicator
  const getConnectionStatusColor = () => { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!websocket?.isConnected) return 'text-red-500';
    
    switch (roomStats.connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'poor': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionStatusIcon = () => { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!websocket?.isConnected) return <AlertTriangle className="h-4 w-4" />;
    
    switch (roomStats.connectionQuality) {
      case 'excellent': return <CheckCircle2 className="h-4 w-4" />;
      case 'good': return <Signal className="h-4 w-4" />;
      case 'poor': return <Activity className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getPageTitle = () => {
    switch (roomType) {
      case 'lobby': return 'Sala de Espera';
      case 'manage': return 'Gerenciar Sala';
      case 'play': return 'Jogo Ativo';
      default: return 'Sala';
    }
  };

  const getPageIcon = () => {
    switch (roomType) {
      case 'lobby': return <Users className="h-5 w-5" />;
      case 'manage': return <Settings className="h-5 w-5" />;
      case 'play': return <Activity className="h-5 w-5" />;
      default: return <Users className="h-5 w-5" />;
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800",
      className
    )}>
      {/* Enhanced Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Side - Navigation */}
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}
              
              <Separator orientation="vertical" className="h-6" />
              
              <div className="flex items-center gap-2">
                {getPageIcon()}
                <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
                {roomName && (
                  <Badge variant="outline" className="ml-2">
                    {roomName}
                  </Badge>
                )}
              </div>
            </div>

            {/* Center - Room Stats (Desktop) */}
            {showStats && (
              <div className="hidden md:flex items-center gap-6">
                {/* Participants Count */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{websocket.participants.length}</span>
                  <span className="text-muted-foreground">participantes</span>
                </div>

                {/* Session Uptime */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{formatUptime(uptime)}</span>
                  <span className="text-muted-foreground">ativo</span>
                </div>

                {/* Connection Status */}
                <div className="flex items-center gap-2 text-sm">
                  {websocket.isConnected ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-600">Conectado</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-600">Desconectado</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Right Side - Actions */}
            <div className="flex items-center gap-2">
              {!websocket.isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={websocket.forceReconnect}
                  className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reconectar
                </Button>
              )}
              
              {showHomeButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Stats Card */}
          {showStats && (
            <div className="md:hidden mt-3">
              <Card>
                <CardContent className="p-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{websocket.participants.length}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Participantes</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{formatUptime(uptime)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Tempo Ativo</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-center gap-1 text-sm">
                        {websocket.isConnected ? (
                          <>
                            <Wifi className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-600">Online</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-4 w-4 text-red-600" />
                            <span className="font-medium text-red-600">Offline</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Conexão</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </header>

      {/* Connection Status Bar (when disconnected) */}
      {!websocket.isConnected && (
        <div className="bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Conexão perdida. Tentando reconectar...
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={websocket.forceReconnect}
                className="text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconectar Agora
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Enhanced Footer */}
      <footer className="border-t bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Sala: {roomId}</span>
              {websocket.currentRole && (
                <Badge variant="outline" className="text-xs">
                  {websocket.currentRole}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <span>Versão 2.0.0</span>
              <WebSocketStatus variant="compact" showReconnectButton={false} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EnhancedRoomLayout; 