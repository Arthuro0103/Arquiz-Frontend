import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerStoreResetter } from './utils/reset'

// Types for User Preferences Store
export interface NotificationSettings {
  enableBrowserNotifications: boolean
  enableSoundNotifications: boolean
  enableEmailNotifications: boolean
  notifyOnQuizStart: boolean
  notifyOnParticipantJoin: boolean
  notifyOnAnswerSubmission: boolean
  notifyOnQuizComplete: boolean
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'pt' | 'es' | 'fr'
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  showAnimations: boolean
  autoSave: boolean
  confirmBeforeLeaving: boolean
}

export interface AccessibilitySettings {
  highContrast: boolean
  reduceMotion: boolean
  screenReaderOptimized: boolean
  keyboardNavigation: boolean
  focusIndicators: boolean
}

export interface QuizPreferences {
  defaultTimePerQuestion: number
  autoAdvanceQuestions: boolean
  showProgressBar: boolean
  allowQuestionReview: boolean
  shuffleQuestions: boolean
  showExplanations: boolean
  pauseOnWindowBlur: boolean
}

export interface UserPreferencesState {
  // Core preferences
  notifications: NotificationSettings
  ui: UIPreferences
  accessibility: AccessibilitySettings
  quiz: QuizPreferences
  
  // User profile preferences
  defaultRole: 'teacher' | 'student'
  preferredRoomType: 'public' | 'private'
  autoJoinRooms: boolean
  
  // Performance preferences
  enableDebugMode: boolean
  enablePerformanceMonitoring: boolean
  maxCachedRooms: number
  
  // Actions
  updateNotifications: (settings: Partial<NotificationSettings>) => void
  updateUI: (settings: Partial<UIPreferences>) => void
  updateAccessibility: (settings: Partial<AccessibilitySettings>) => void
  updateQuiz: (settings: Partial<QuizPreferences>) => void
  
  // Theme management
  setTheme: (theme: UIPreferences['theme']) => void
  setLanguage: (language: UIPreferences['language']) => void
  setFontSize: (size: UIPreferences['fontSize']) => void
  
  // Quick toggles
  toggleCompactMode: () => void
  toggleAnimations: () => void
  toggleHighContrast: () => void
  toggleDebugMode: () => void
  
  // Utility actions
  reset: () => void
  exportPreferences: () => string
  importPreferences: (data: string) => boolean
}

// Default preferences
const defaultNotifications: NotificationSettings = {
  enableBrowserNotifications: true,
  enableSoundNotifications: true,
  enableEmailNotifications: false,
  notifyOnQuizStart: true,
  notifyOnParticipantJoin: true,
  notifyOnAnswerSubmission: false,
  notifyOnQuizComplete: true,
}

const defaultUI: UIPreferences = {
  theme: 'system',
  language: 'en',
  fontSize: 'medium',
  compactMode: false,
  showAnimations: true,
  autoSave: true,
  confirmBeforeLeaving: true,
}

const defaultAccessibility: AccessibilitySettings = {
  highContrast: false,
  reduceMotion: false,
  screenReaderOptimized: false,
  keyboardNavigation: true,
  focusIndicators: true,
}

const defaultQuiz: QuizPreferences = {
  defaultTimePerQuestion: 30,
  autoAdvanceQuestions: false,
  showProgressBar: true,
  allowQuestionReview: true,
  shuffleQuestions: false,
  showExplanations: true,
  pauseOnWindowBlur: true,
}

// Initial state
const initialState = {
  notifications: defaultNotifications,
  ui: defaultUI,
  accessibility: defaultAccessibility,
  quiz: defaultQuiz,
  defaultRole: 'student' as const,
  preferredRoomType: 'public' as const,
  autoJoinRooms: false,
  enableDebugMode: false,
  enablePerformanceMonitoring: false,
  maxCachedRooms: 10,
}

// Create the User Preferences Store
export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Settings updates
      updateNotifications: (settings) => {
        set({
          notifications: { ...get().notifications, ...settings }
        })
      },

      updateUI: (settings) => {
        set({
          ui: { ...get().ui, ...settings }
        })
        
        // Apply theme changes immediately
        if (settings.theme) {
          applyTheme(settings.theme)
        }
      },

      updateAccessibility: (settings) => {
        set({
          accessibility: { ...get().accessibility, ...settings }
        })
        
        // Apply accessibility changes immediately
        applyAccessibilitySettings({ ...get().accessibility, ...settings })
      },

      updateQuiz: (settings) => {
        set({
          quiz: { ...get().quiz, ...settings }
        })
      },

      // Theme management
      setTheme: (theme) => {
        get().updateUI({ theme })
      },

      setLanguage: (language) => {
        get().updateUI({ language })
      },

      setFontSize: (fontSize) => {
        get().updateUI({ fontSize })
      },

      // Quick toggles
      toggleCompactMode: () => {
        get().updateUI({ compactMode: !get().ui.compactMode })
      },

      toggleAnimations: () => {
        get().updateUI({ showAnimations: !get().ui.showAnimations })
      },

      toggleHighContrast: () => {
        get().updateAccessibility({ highContrast: !get().accessibility.highContrast })
      },

      toggleDebugMode: () => {
        set({ enableDebugMode: !get().enableDebugMode })
      },

      // Utility actions
      reset: () => {
        set(initialState)
        applyTheme(defaultUI.theme)
        applyAccessibilitySettings(defaultAccessibility)
      },

      exportPreferences: () => {
        const state = get()
        const exportData = {
          notifications: state.notifications,
          ui: state.ui,
          accessibility: state.accessibility,
          quiz: state.quiz,
          defaultRole: state.defaultRole,
          preferredRoomType: state.preferredRoomType,
          autoJoinRooms: state.autoJoinRooms,
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
        }
        return JSON.stringify(exportData, null, 2)
      },

      importPreferences: (data) => {
        try {
          const imported = JSON.parse(data)
          
          // Validate imported data structure
          if (!imported || typeof imported !== 'object') {
            return false
          }

          // Merge with current state, keeping defaults for missing fields
          const state = get()
          set({
            notifications: { ...state.notifications, ...imported.notifications },
            ui: { ...state.ui, ...imported.ui },
            accessibility: { ...state.accessibility, ...imported.accessibility },
            quiz: { ...state.quiz, ...imported.quiz },
            defaultRole: imported.defaultRole || state.defaultRole,
            preferredRoomType: imported.preferredRoomType || state.preferredRoomType,
            autoJoinRooms: imported.autoJoinRooms ?? state.autoJoinRooms,
          })

          // Apply imported settings
          const newState = get()
          applyTheme(newState.ui.theme)
          applyAccessibilitySettings(newState.accessibility)

          return true
        } catch (error) {
          console.error('Failed to import preferences:', error)
          return false
        }
      },
    }),
    {
      name: 'arquiz-user-preferences',
      version: 1,
    }
  )
)

// Helper functions for applying settings
function applyTheme(theme: UIPreferences['theme']) {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

function applyAccessibilitySettings(settings: AccessibilitySettings) {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  
  root.classList.toggle('high-contrast', settings.highContrast)
  root.classList.toggle('reduce-motion', settings.reduceMotion)
  root.classList.toggle('screen-reader-optimized', settings.screenReaderOptimized)
  root.classList.toggle('keyboard-navigation', settings.keyboardNavigation)
  root.classList.toggle('focus-indicators', settings.focusIndicators)
}

// Initialize theme on store creation
if (typeof window !== 'undefined') {
  // Apply initial theme
  const store = useUserPreferencesStore.getState()
  applyTheme(store.ui.theme)
  applyAccessibilitySettings(store.accessibility)

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    const currentTheme = useUserPreferencesStore.getState().ui.theme
    if (currentTheme === 'system') {
      applyTheme('system')
    }
  })
}

// Register reset function
registerStoreResetter(() => {
  useUserPreferencesStore.getState().reset()
})

// Computed selectors
export const userPreferencesSelectors = {
  // Get effective theme (resolves 'system' to actual theme)
  getEffectiveTheme: (state: UserPreferencesState): 'light' | 'dark' => {
    if (state.ui.theme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return 'light'
    }
    return state.ui.theme
  },

  // Check if notifications are enabled
  areNotificationsEnabled: (state: UserPreferencesState) => 
    state.notifications.enableBrowserNotifications,

  // Get accessibility status
  isAccessibilityMode: (state: UserPreferencesState) => 
    state.accessibility.highContrast || 
    state.accessibility.reduceMotion || 
    state.accessibility.screenReaderOptimized,

  // Get debug status
  isDebugEnabled: (state: UserPreferencesState) => 
    state.enableDebugMode || process.env.NODE_ENV === 'development',
} 