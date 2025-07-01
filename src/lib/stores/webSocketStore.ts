import { create } from 'zustand'
import { registerStoreResetter } from './utils/reset'

// Types for WebSocket Store
export interface ConnectionMetrics {
  connectionStartTime: number
  lastConnectTime: number | null
  heartbeatLatency: number
  connectionAttempts: number
  totalReconnects: number
  uptime: number
  packetsSent: number
  packetsReceived: number
}

export interface WebSocketState {
  // Connection state
  isConnected: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected'
  lastError: string | null
  
  // Connection metrics
  metrics: ConnectionMetrics
  
  // Settings
  autoReconnect: boolean
  maxRetries: number
  connectionTimeout: number
  debugMode: boolean
  
  // Actions
  setConnectionStatus: (status: WebSocketState['connectionStatus']) => void
  setConnected: (connected: boolean) => void
  setConnectionQuality: (quality: WebSocketState['connectionQuality']) => void
  setError: (error: string | null) => void
  updateMetrics: (updates: Partial<ConnectionMetrics>) => void
  
  // Settings actions
  setAutoReconnect: (enabled: boolean) => void
  setMaxRetries: (retries: number) => void
  setDebugMode: (enabled: boolean) => void
  
  // Utility actions
  reset: () => void
  resetMetrics: () => void
}

// Initial state
const initialMetrics: ConnectionMetrics = {
  connectionStartTime: Date.now(),
  lastConnectTime: null,
  heartbeatLatency: 0,
  connectionAttempts: 0,
  totalReconnects: 0,
  uptime: 0,
  packetsSent: 0,
  packetsReceived: 0,
}

const initialState = {
  isConnected: false,
  connectionStatus: 'disconnected' as const,
  connectionQuality: 'disconnected' as const,
  lastError: null,
  metrics: initialMetrics,
  autoReconnect: true,
  maxRetries: 5,
  connectionTimeout: 10000,
  debugMode: false,
}

// Create the WebSocket Store
export const useWebSocketStore = create<WebSocketState>()((set, get) => ({
  ...initialState,

  // Connection state management
  setConnectionStatus: (status) => {
    set({ connectionStatus: status })
    
    if (status === 'connected') {
      set({ 
        isConnected: true, 
        lastError: null,
        connectionQuality: 'excellent'
      })
      
      const now = Date.now()
      get().updateMetrics({
        lastConnectTime: now,
        uptime: now - get().metrics.connectionStartTime
      })
    } else if (status === 'disconnected' || status === 'error') {
      set({ 
        isConnected: false,
        connectionQuality: 'disconnected'
      })
    }
  },

  setConnected: (connected) => {
    set({ isConnected: connected })
    if (!connected) {
      set({ connectionQuality: 'disconnected' })
    }
  },

  setConnectionQuality: (quality) => {
    set({ connectionQuality: quality })
  },

  setError: (error) => {
    set({ lastError: error })
    if (error) {
      set({ connectionStatus: 'error' })
    }
  },

  updateMetrics: (updates) => {
    set({
      metrics: { ...get().metrics, ...updates }
    })
  },

  // Settings actions
  setAutoReconnect: (enabled) => {
    set({ autoReconnect: enabled })
  },

  setMaxRetries: (retries) => {
    set({ maxRetries: retries })
  },

  setDebugMode: (enabled) => {
    set({ debugMode: enabled })
  },

  // Utility actions
  reset: () => {
    set({
      ...initialState,
      metrics: { ...initialMetrics, connectionStartTime: Date.now() }
    })
  },

  resetMetrics: () => {
    set({
      metrics: { ...initialMetrics, connectionStartTime: Date.now() }
    })
  },
}))

// Register reset function
registerStoreResetter(() => {
  useWebSocketStore.getState().reset()
})

// Computed selectors
export const webSocketSelectors = {
  // Get connection info
  getConnectionInfo: (state: WebSocketState) => ({
    isConnected: state.isConnected,
    status: state.connectionStatus,
    quality: state.connectionQuality,
    uptime: state.metrics.uptime,
    attempts: state.metrics.connectionAttempts,
  }),

  // Check if connection is healthy
  isConnectionHealthy: (state: WebSocketState) => 
    state.isConnected && 
    state.connectionQuality !== 'poor' && 
    state.lastError === null,

  // Get formatted uptime
  getFormattedUptime: (state: WebSocketState) => {
    const uptime = state.metrics.uptime
    const seconds = Math.floor(uptime / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  },
} 