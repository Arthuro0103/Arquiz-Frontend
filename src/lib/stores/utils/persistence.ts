import { StateStorage } from 'zustand/middleware'

// Custom storage implementation with error handling
const createStorage = (): StateStorage => {
  return {
    getItem: (name: string): string | null => {
      try {
        if (typeof window === 'undefined') return null
        return localStorage.getItem(name)
      } catch (error) {
        console.warn(`Error reading from localStorage for key "${name}":`, error)
        return null
      }
    },
    setItem: (name: string, value: string): void => {
      try {
        if (typeof window === 'undefined') return
        localStorage.setItem(name, value)
      } catch (error) {
        console.warn(`Error writing to localStorage for key "${name}":`, error)
      }
    },
    removeItem: (name: string): void => {
      try {
        if (typeof window === 'undefined') return
        localStorage.removeItem(name)
      } catch (error) {
        console.warn(`Error removing from localStorage for key "${name}":`, error)
      }
    },
  }
}

// Persistence configuration factory
export const persistConfig = {
  // Storage instance
  storage: createStorage(),
  
  // Create persistence options for different store types
  createOptions: <T>(
    name: string,
    options?: {
      partialize?: (state: T) => Partial<T>
      merge?: (persistedState: unknown, currentState: T) => T
      skipHydration?: boolean
      version?: number
      migrate?: (persistedState: any, version: number) => T
    }
  ) => ({
    name: `arquiz-${name}`,
    storage: createStorage(),
    partialize: options?.partialize,
    merge: options?.merge,
    skipHydration: options?.skipHydration || false,
    version: options?.version || 1,
    migrate: options?.migrate,
  }),

  // Pre-configured options for common store types
  userPreferences: {
    name: 'arquiz-user-preferences',
    storage: createStorage(),
    version: 1,
  },

  authSession: {
    name: 'arquiz-auth-session',
    storage: createStorage(),
    version: 1,
    // Only persist essential auth data, not sensitive tokens
    partialize: (state: any) => ({
      lastLoginTime: state.lastLoginTime,
      userRole: state.userRole,
      userId: state.userId,
      preferences: state.preferences,
    }),
  },

  webSocketSettings: {
    name: 'arquiz-websocket-settings',
    storage: createStorage(),
    version: 1,
    partialize: (state: any) => ({
      autoReconnect: state.autoReconnect,
      connectionTimeout: state.connectionTimeout,
      maxRetries: state.maxRetries,
      debugMode: state.debugMode,
    }),
  },
}

// Utility functions for persistence management
export const persistenceUtils = {
  // Clear all ArQuiz localStorage data
  clearAll: () => {
    if (typeof window === 'undefined') return
    
    const keys = Object.keys(localStorage).filter(key => key.startsWith('arquiz-'))
    keys.forEach(key => localStorage.removeItem(key))
    console.log(`Cleared ${keys.length} ArQuiz localStorage entries`)
  },

  // Get all ArQuiz localStorage data for debugging
  getAll: () => {
    if (typeof window === 'undefined') return {}
    
    const data: Record<string, string> = {}
    const keys = Object.keys(localStorage).filter(key => key.startsWith('arquiz-'))
    keys.forEach(key => {
      data[key] = localStorage.getItem(key) || ''
    })
    return data
  },

  // Check if localStorage is available
  isAvailable: () => {
    try {
      if (typeof window === 'undefined') return false
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  },
} 