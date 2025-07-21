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
import { useUnifiedWebSocket } from '@/contexts/UnifiedWebSocketContext';
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

export default function EnhancedRoomLayout({
  roomId,
  children,
}: {
  roomId: string;
  children: React.ReactNode;
}) {
  const websocket = useUnifiedWebSocket();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [currentActivity, setCurrentActivity] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Connection monitoring
  useEffect(() => {
    setIsConnected(websocket.connectionState.isConnected);
    setConnectionError(websocket.connectionState.isConnected ? null : 'Connection lost');
  }, [websocket.connectionState]);

  // Room data subscription
  useEffect(() => {
    if (!websocket.connectionState.isConnected || !roomId) return;

    const unsubscribeRoomUpdated = websocket.addEventListener('room_updated', (data: any) => {
      setRoomData(data.room);
      setLastUpdate(new Date());
    });

    const unsubscribeParticipantsUpdated = websocket.addEventListener('participants_updated', (data: any) => {
      setParticipants(data.participants || []);
      setLastUpdate(new Date());
    });

    const unsubscribeRoomActivity = websocket.addEventListener('room_activity', (data: any) => {
      setCurrentActivity(data.activity || '');
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribeRoomUpdated();
      unsubscribeParticipantsUpdated();
      unsubscribeRoomActivity();
    };
  }, [websocket, roomId]);

  // Auto-reconnect logic
  useEffect(() => {
    if (!isConnected && roomId) {
      const reconnectTimer = setTimeout(() => {
        websocket.connect();
      }, 3000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [isConnected, roomId, websocket]);

  return (
    <div className="enhanced-room-layout">
      <div className="room-header">
        <div className="room-info">
          <h1 className="room-title">{roomData?.name || 'Room'}</h1>
          <div className="room-meta">
            <span className="participant-count">{participants.length} participants</span>
            <span className="connection-status">
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
        </div>
        
        {currentActivity && (
          <div className="current-activity">
            <span className="activity-indicator">📊</span>
            <span className="activity-text">{currentActivity}</span>
          </div>
        )}
      </div>

      {connectionError && (
        <div className="connection-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{connectionError}</span>
        </div>
      )}

      <div className="room-content">
        {children}
      </div>

      <div className="room-footer">
        <div className="status-bar">
          <span className="last-update">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
          <span className="room-id">Room ID: {roomId}</span>
        </div>
      </div>
    </div>
  );
} 