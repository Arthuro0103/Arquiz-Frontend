import { create } from 'zustand'
import { registerStoreResetter } from './utils/reset'

// Types for Notification Store
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  action?: {
    label: string
    onClick: () => void
  }
  createdAt: number
  expiresAt?: number
}

export interface NotificationState {
  // Notifications
  notifications: Notification[]
  maxNotifications: number
  
  // Settings
  enableNotifications: boolean
  defaultDuration: number
  enableSounds: boolean
  enableAnimations: boolean
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string
  removeNotification: (id: string) => void
  clearNotifications: () => void
  clearExpiredNotifications: () => void
  
  // Convenience methods
  showSuccess: (title: string, message?: string, duration?: number) => string
  showError: (title: string, message?: string, duration?: number) => string
  showWarning: (title: string, message?: string, duration?: number) => string
  showInfo: (title: string, message?: string, duration?: number) => string
  
  // Settings
  setEnableNotifications: (enabled: boolean) => void
  setDefaultDuration: (duration: number) => void
  setEnableSounds: (enabled: boolean) => void
  setEnableAnimations: (enabled: boolean) => void
  
  // Utility actions
  reset: () => void
}

// Initial state
const initialState = {
  notifications: [],
  maxNotifications: 5,
  enableNotifications: true,
  defaultDuration: 5000,
  enableSounds: true,
  enableAnimations: true,
}

// Create the Notification Store
export const useNotificationStore = create<NotificationState>()((set, get) => ({
  ...initialState,

  // Core notification management
  addNotification: (notificationData) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const createdAt = Date.now()
    const duration = notificationData.duration ?? get().defaultDuration
    const expiresAt = notificationData.persistent ? undefined : createdAt + duration

    const notification: Notification = {
      ...notificationData,
      id,
      createdAt,
      expiresAt,
    }

    const state = get()
    let updatedNotifications = [notification, ...state.notifications]

    // Limit the number of notifications
    if (updatedNotifications.length > state.maxNotifications) {
      updatedNotifications = updatedNotifications.slice(0, state.maxNotifications)
    }

    set({ notifications: updatedNotifications })

    // Auto-remove notification after duration
    if (!notification.persistent && expiresAt) {
      setTimeout(() => {
        get().removeNotification(id)
      }, duration)
    }

    // Play sound if enabled
    if (state.enableSounds && state.enableNotifications) {
      playNotificationSound(notification.type)
    }

    return id
  },

  removeNotification: (id) => {
    set({
      notifications: get().notifications.filter(n => n.id !== id)
    })
  },

  clearNotifications: () => {
    set({ notifications: [] })
  },

  clearExpiredNotifications: () => {
    const now = Date.now()
    set({
      notifications: get().notifications.filter(n => 
        n.persistent || !n.expiresAt || n.expiresAt > now
      )
    })
  },

  // Convenience methods
  showSuccess: (title, message, duration) => {
    return get().addNotification({
      type: 'success',
      title,
      message,
      duration,
    })
  },

  showError: (title, message, duration) => {
    return get().addNotification({
      type: 'error',
      title,
      message,
      duration: duration || 8000, // Errors stay longer by default
    })
  },

  showWarning: (title, message, duration) => {
    return get().addNotification({
      type: 'warning',
      title,
      message,
      duration,
    })
  },

  showInfo: (title, message, duration) => {
    return get().addNotification({
      type: 'info',
      title,
      message,
      duration,
    })
  },

  // Settings
  setEnableNotifications: (enabled) => {
    set({ enableNotifications: enabled })
  },

  setDefaultDuration: (duration) => {
    set({ defaultDuration: duration })
  },

  setEnableSounds: (enabled) => {
    set({ enableSounds: enabled })
  },

  setEnableAnimations: (enabled) => {
    set({ enableAnimations: enabled })
  },

  // Utility actions
  reset: () => {
    set(initialState)
  },
}))

// Helper function to play notification sounds
function playNotificationSound(type: Notification['type']) {
  if (typeof window === 'undefined') return

  try {
    // Create audio context for different notification types
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Different frequencies for different notification types
    const frequencies = {
      success: 800,
      error: 400,
      warning: 600,
      info: 500,
    }

    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  } catch (error) {
    // Fallback to system notification sound or silent fail
    console.debug('Could not play notification sound:', error)
  }
}

// Auto-cleanup expired notifications every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    useNotificationStore.getState().clearExpiredNotifications()
  }, 30000)
}

// Register reset function
registerStoreResetter(() => {
  useNotificationStore.getState().reset()
})

// Computed selectors
export const notificationSelectors = {
  // Get notifications by type
  getNotificationsByType: (state: NotificationState, type: Notification['type']) =>
    state.notifications.filter(n => n.type === type),

  // Get active (non-expired) notifications
  getActiveNotifications: (state: NotificationState) => {
    const now = Date.now()
    return state.notifications.filter(n => 
      n.persistent || !n.expiresAt || n.expiresAt > now
    )
  },

  // Get expired notifications
  getExpiredNotifications: (state: NotificationState) => {
    const now = Date.now()
    return state.notifications.filter(n => 
      !n.persistent && n.expiresAt && n.expiresAt <= now
    )
  },

  // Check if there are any error notifications
  hasErrors: (state: NotificationState) => 
    state.notifications.some(n => n.type === 'error'),

  // Get notification count by type
  getNotificationCounts: (state: NotificationState) => ({
    total: state.notifications.length,
    success: state.notifications.filter(n => n.type === 'success').length,
    error: state.notifications.filter(n => n.type === 'error').length,
    warning: state.notifications.filter(n => n.type === 'warning').length,
    info: state.notifications.filter(n => n.type === 'info').length,
  }),
} 