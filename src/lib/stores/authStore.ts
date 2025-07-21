import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, AuthUser, LoginCredentials, JwtPayload } from '../../../../shared/types'
import { UserRole, UserStatus } from '../../../../shared/types'
import { registerStoreResetter } from './utils/reset'

// Re-export shared types for convenience
export type { UserProfile, UserRole, AuthUser, LoginCredentials, JwtPayload } from '../../../../shared/types'

// Legacy type for backward compatibility
// @deprecated Use UserProfile from shared types instead
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  preferences?: Record<string, any>
  lastLoginAt?: string
  createdAt: string
}

export interface AuthState {
  // Authentication state
  isAuthenticated: boolean
  user: UserProfile | null
  sessionToken: string | null
  refreshToken: string | null
  
  // Session management
  lastLoginTime: number | null
  sessionExpiresAt: number | null
  isSessionValid: boolean
  
  // Loading states
  isLoading: boolean
  isLoggingIn: boolean
  isLoggingOut: boolean
  isRefreshing: boolean
  
  // Error handling
  lastError: string | null
  loginAttempts: number
  isLocked: boolean
  lockUntil: number | null
  
  // Actions
  setUser: (user: UserProfile | null) => void
  setTokens: (sessionToken: string | null, refreshToken?: string | null) => void
  setAuthenticated: (authenticated: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Auth operations
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  refreshSession: () => Promise<boolean>
  checkSession: () => boolean
  
  // Account management
  updateProfile: (updates: Partial<UserProfile>) => void
  incrementLoginAttempts: () => void
  resetLoginAttempts: () => void
  
  // Utility actions
  reset: () => void
}

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  sessionToken: null,
  refreshToken: null,
  lastLoginTime: null,
  sessionExpiresAt: null,
  isSessionValid: false,
  isLoading: false,
  isLoggingIn: false,
  isLoggingOut: false,
  isRefreshing: false,
  lastError: null,
  loginAttempts: 0,
  isLocked: false,
  lockUntil: null,
}

// Create the Auth Store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Basic setters
      setUser: (user) => {
        set({ user })
        if (user) {
          set({ 
            isAuthenticated: true,
            lastLoginTime: Date.now(),
            isSessionValid: true
          })
        }
      },

      setTokens: (sessionToken, refreshToken) => {
        set({ sessionToken, refreshToken })
        if (sessionToken) {
          // Calculate session expiration (24 hours from now)
          const expiresAt = Date.now() + (24 * 60 * 60 * 1000)
          set({ sessionExpiresAt: expiresAt, isSessionValid: true })
        } else {
          set({ sessionExpiresAt: null, isSessionValid: false })
        }
      },

      setAuthenticated: (authenticated) => {
        set({ isAuthenticated: authenticated })
        if (!authenticated) {
          set({ 
            user: null,
            sessionToken: null,
            refreshToken: null,
            isSessionValid: false
          })
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({ lastError: error })
      },

      // Auth operations
      login: async (credentials) => {
        const state = get()
        
        // Check if account is locked
        if (state.isLocked && state.lockUntil && Date.now() < state.lockUntil) {
          const remainingTime = Math.ceil((state.lockUntil - Date.now()) / 1000 / 60)
          set({ lastError: `Account locked. Try again in ${remainingTime} minutes.` })
          return false
        }

        try {
          set({ isLoggingIn: true, lastError: null })
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Mock successful login
          const mockUser: UserProfile = {
            id: 'user-123',
            name: 'Test User',
            email: credentials.email,
            role: credentials.email.includes('teacher') ? UserRole.TEACHER : UserRole.STUDENT,
            status: UserStatus.ACTIVE,
            isActive: true,
            emailVerified: true,
            preferences: {
              theme: 'system',
              notifications: {
                email: true,
                push: true,
                quizStarted: true,
                quizCompleted: true,
                roomInvitation: true,
                resultsAvailable: true
              },
              privacy: {
                showProfile: true,
                showStats: true,
                allowDirectMessages: true,
                shareAnalytics: true
              },
              accessibility: {
                highContrast: false,
                reducedMotion: false,
                screenReader: false,
                fontSize: 'medium'
              }
            },
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
          
          const mockToken = 'mock-session-token'
          const mockRefreshToken = 'mock-refresh-token'
          
          get().setUser(mockUser)
          get().setTokens(mockToken, mockRefreshToken)
          get().resetLoginAttempts()
          
          set({ isLoggingIn: false })
          return true
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed'
          set({ lastError: errorMessage, isLoggingIn: false })
          get().incrementLoginAttempts()
          return false
        }
      },

      logout: () => {
        set({ isLoggingOut: true })
        
        // Clear all auth data
        setTimeout(() => {
          set({
            ...initialState,
            loginAttempts: get().loginAttempts, // Preserve login attempts
            isLocked: get().isLocked,
            lockUntil: get().lockUntil,
          })
        }, 500)
      },

      refreshSession: async () => {
        const state = get()
        if (!state.refreshToken) return false

        try {
          set({ isRefreshing: true })
          
          // Simulate refresh API call
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Mock new tokens
          const newSessionToken = 'new-mock-session-token'
          get().setTokens(newSessionToken, state.refreshToken)
          
          set({ isRefreshing: false })
          return true
          
        } catch (error) {
          set({ isRefreshing: false })
          get().logout()
          return false
        }
      },

      checkSession: () => {
        const state = get()
        
        if (!state.sessionToken || !state.sessionExpiresAt) {
          set({ isSessionValid: false })
          return false
        }
        
        const isValid = Date.now() < state.sessionExpiresAt
        set({ isSessionValid: isValid })
        
        if (!isValid) {
          // Try to refresh if we have a refresh token
          if (state.refreshToken) {
            get().refreshSession()
          } else {
            get().logout()
          }
        }
        
        return isValid
      },

      // Account management
      updateProfile: (updates) => {
        const user = get().user
        if (user) {
          set({ user: { ...user, ...updates } })
        }
      },

      incrementLoginAttempts: () => {
        const attempts = get().loginAttempts + 1
        set({ loginAttempts: attempts })
        
        // Lock account after 5 failed attempts
        if (attempts >= 5) {
          const lockUntil = Date.now() + (15 * 60 * 1000) // 15 minutes
          set({ isLocked: true, lockUntil })
        }
      },

      resetLoginAttempts: () => {
        set({ loginAttempts: 0, isLocked: false, lockUntil: null })
      },

      // Utility actions
      reset: () => {
        set(initialState)
      },
    }),
    {
      name: 'arquiz-auth-store',
      partialize: (state) => ({
        user: state.user,
        sessionToken: state.sessionToken,
        refreshToken: state.refreshToken,
        lastLoginTime: state.lastLoginTime,
        sessionExpiresAt: state.sessionExpiresAt,
        loginAttempts: state.loginAttempts,
        isLocked: state.isLocked,
        lockUntil: state.lockUntil,
      }),
    }
  )
)

// Register reset function
registerStoreResetter(() => {
  useAuthStore.getState().reset()
})

// Computed selectors
export const authSelectors = {
  // Check if user has specific role
  hasRole: (state: AuthState, role: UserRole) => 
    state.user?.role === role,

  // Check if user is teacher or admin
  canManageRooms: (state: AuthState) => 
    state.user?.role === 'teacher' || state.user?.role === 'admin',

  // Get session time remaining
  getSessionTimeRemaining: (state: AuthState) => {
    if (!state.sessionExpiresAt) return 0
    return Math.max(0, state.sessionExpiresAt - Date.now())
  },

  // Check if session expires soon (within 5 minutes)
  isSessionExpiringSoon: (state: AuthState) => {
    const remaining = authSelectors.getSessionTimeRemaining(state)
    return remaining > 0 && remaining < (5 * 60 * 1000)
  },

  // Get user display name
  getUserDisplayName: (state: AuthState) => 
    state.user?.name || state.user?.email || 'User',

  // Check if account is temporarily locked
  isAccountLocked: (state: AuthState) => 
    state.isLocked && state.lockUntil && Date.now() < state.lockUntil,
} 