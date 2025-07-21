'use client'

import React from 'react';
import { useUnifiedWebSocket } from '@/contexts/UnifiedWebSocketContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity 
} from 'lucide-react';

interface WebSocketStatusProps {
  variant?: 'default' | 'compact' | 'minimal';
  showReconnectButton?: boolean;
  className?: string;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ 
  variant = 'default', 
  showReconnectButton = true,
  className = ''
}) => {
  const websocket = useUnifiedWebSocket();
  
  const getStatusColor = () => {
    if (websocket.connectionState.isConnected) {
      return 'bg-green-500';
    } else if (websocket.connectionState.isConnecting) {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500';
    }
  };

  const getStatusIcon = () => {
    if (websocket.connectionState.isConnected) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (websocket.connectionState.isConnecting) {
      return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusText = () => {
    if (websocket.connectionState.isConnected) {
      return 'Connected';
    } else if (websocket.connectionState.isConnecting) {
      return 'Connecting...';
    } else {
      return 'Disconnected';
    }
  };

  const getConnectionQuality = () => {
    if (websocket.connectionState.isConnected) {
      return 'good';
    }
    return 'poor';
  };

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-gray-600">{getStatusText()}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Badge 
        variant={websocket.connectionState.isConnected ? 'default' : 'destructive'}
        className={`flex items-center gap-1 ${className}`}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </Badge>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h3 className="font-medium">WebSocket Status</h3>
          </div>
          {showReconnectButton && !websocket.connectionState.isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => websocket.connect()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reconnect
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Connection:</span>
            <Badge variant={websocket.connectionState.isConnected ? 'default' : 'destructive'}>
              {getStatusText()}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Quality:</span>
            <span className={`text-sm font-medium ${
              getConnectionQuality() === 'good' ? 'text-green-600' :
              getConnectionQuality() === 'poor' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {getConnectionQuality()}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Participants:</span>
            <span className="text-sm font-medium">
              {websocket.participants.length}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Current Room:</span>
            <span className="text-sm font-medium">
              {websocket.currentRoom?.name || 'None'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 