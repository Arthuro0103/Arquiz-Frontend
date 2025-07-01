import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerStoreResetter } from './utils/reset'

// Types for Room Store
export interface Participant {
  id: string
  name: string
  role: 'teacher' | 'student'
  status: 'connected' | 'disconnected' | 'kicked'
  joinedAt: string
  lastSeen?: string
  score?: number
  answersSubmitted?: number
}

export interface Room {
  id: string
  name: string
  code?: string
  accessCode: string
  status: 'waiting' | 'active' | 'paused' | 'completed' | 'cancelled'
  createdAt: string
  maxParticipants: number
  currentParticipants: number
  quizId?: string
  quizTitle?: string
  description?: string
  timeMode?: 'per_question' | 'per_quiz'
  timePerQuestion?: number
  timePerQuiz?: number
  roomType?: 'public' | 'private'
  quiz?: {
    id: string
    title: string
    description?: string
    totalQuestions: number
    currentQuestionIndex: number
    status: string
  }
}

export interface RoomState {
  // Current room data
  currentRoom: Room | null
  participants: Participant[]
  isHost: boolean
  userRole: 'teacher' | 'student' | null
  
  // Connection state
  isConnectedToRoom: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  lastError: string | null
  
  // Room management
  roomHistory: Room[]
  favoriteRooms: string[] // Room IDs
  
  // UI state
  isLoading: boolean
  showParticipants: boolean
  showChat: boolean
  
  // Actions
  setCurrentRoom: (room: Room | null) => void
  updateRoom: (updates: Partial<Room>) => void
  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void
  
  // Connection management
  setConnectionStatus: (status: RoomState['connectionStatus']) => void
  setConnectedToRoom: (connected: boolean) => void
  setError: (error: string | null) => void
  
  // Room operations
  joinRoom: (roomId: string, accessCode: string, userName: string, role: 'teacher' | 'student') => Promise<boolean>
  leaveRoom: () => void
  addToHistory: (room: Room) => void
  toggleFavorite: (roomId: string) => void
  
  // UI actions
  setLoading: (loading: boolean) => void
  toggleParticipants: () => void
  toggleChat: () => void
  
  // Utility actions
  reset: () => void
  clearHistory: () => void
}

// Initial state
const initialState = {
  currentRoom: null,
  participants: [],
  isHost: false,
  userRole: null,
  isConnectedToRoom: false,
  connectionStatus: 'disconnected' as const,
  lastError: null,
  roomHistory: [],
  favoriteRooms: [],
  isLoading: false,
  showParticipants: true,
  showChat: false,
}

// Create the Room Store
export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      ...initialState,

        // Room data management
        setCurrentRoom: (room) => {
          set({ currentRoom: room })
          if (room) {
            get().addToHistory(room)
          }
        },

        updateRoom: (updates) => {
          const currentRoom = get().currentRoom
          if (currentRoom) {
            set({ currentRoom: { ...currentRoom, ...updates } })
          }
        },

        // Participant management
        setParticipants: (participants) => {
          set({ participants })
        },

        addParticipant: (participant) => {
          const participants = get().participants
          const existingIndex = participants.findIndex(p => p.id === participant.id)
          
          if (existingIndex >= 0) {
            // Update existing participant
            const updatedParticipants = [...participants]
            updatedParticipants[existingIndex] = { ...updatedParticipants[existingIndex], ...participant }
            set({ participants: updatedParticipants })
          } else {
            // Add new participant
            set({ participants: [...participants, participant] })
          }
        },

        removeParticipant: (participantId) => {
          set({ 
            participants: get().participants.filter(p => p.id !== participantId) 
          })
        },

        updateParticipant: (participantId, updates) => {
          const participants = get().participants
          const updatedParticipants = participants.map(p => 
            p.id === participantId ? { ...p, ...updates } : p
          )
          set({ participants: updatedParticipants })
        },

        // Connection management
        setConnectionStatus: (status) => {
          set({ connectionStatus: status })
          if (status === 'connected') {
            set({ isConnectedToRoom: true, lastError: null })
          } else if (status === 'error') {
            set({ isConnectedToRoom: false })
          }
        },

        setConnectedToRoom: (connected) => {
          set({ isConnectedToRoom: connected })
        },

        setError: (error) => {
          set({ lastError: error })
        },

        // Room operations
        joinRoom: async (roomId, accessCode, userName, role) => {
          try {
            set({ isLoading: true, connectionStatus: 'connecting', lastError: null })
            
            // This would integrate with the WebSocket context
            // For now, simulate the operation
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            set({ 
              connectionStatus: 'connected',
              isConnectedToRoom: true,
              userRole: role,
              isHost: role === 'teacher',
              isLoading: false
            })
            
            return true
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to join room'
            set({ 
              connectionStatus: 'error',
              isConnectedToRoom: false,
              lastError: errorMessage,
              isLoading: false
            })
            return false
          }
        },

        leaveRoom: () => {
          set({
            currentRoom: null,
            participants: [],
            isConnectedToRoom: false,
            connectionStatus: 'disconnected',
            userRole: null,
            isHost: false,
            lastError: null
          })
        },

        addToHistory: (room) => {
          const history = get().roomHistory
          const existingIndex = history.findIndex(r => r.id === room.id)
          
          if (existingIndex >= 0) {
            // Update existing entry
            const updatedHistory = [...history]
            updatedHistory[existingIndex] = room
            set({ roomHistory: updatedHistory })
          } else {
            // Add new entry (keep last 10)
            const updatedHistory = [room, ...history].slice(0, 10)
            set({ roomHistory: updatedHistory })
          }
        },

        toggleFavorite: (roomId) => {
          const favorites = get().favoriteRooms
          const isFavorite = favorites.includes(roomId)
          
          if (isFavorite) {
            set({ favoriteRooms: favorites.filter(id => id !== roomId) })
          } else {
            set({ favoriteRooms: [...favorites, roomId] })
          }
        },

        // UI actions
        setLoading: (loading) => {
          set({ isLoading: loading })
        },

        toggleParticipants: () => {
          set({ showParticipants: !get().showParticipants })
        },

        toggleChat: () => {
          set({ showChat: !get().showChat })
        },

        // Utility actions
        reset: () => {
          set(initialState)
        },

        clearHistory: () => {
          set({ roomHistory: [], favoriteRooms: [] })
        },
      }),
      {
        name: 'arquiz-room-store',
        partialize: (state) => ({
          roomHistory: state.roomHistory,
          favoriteRooms: state.favoriteRooms,
          showParticipants: state.showParticipants,
          showChat: state.showChat,
        }),
      }
    )
  )

// Register reset function
registerStoreResetter(() => {
  useRoomStore.getState().reset()
})

// Computed selectors
export const roomSelectors = {
  // Get participants by role
  getTeachers: (state: RoomState) => state.participants.filter(p => p.role === 'teacher'),
  getStudents: (state: RoomState) => state.participants.filter(p => p.role === 'student'),
  
  // Get connected participants
  getConnectedParticipants: (state: RoomState) => 
    state.participants.filter(p => p.status === 'connected'),
  
  // Get participant count
  getParticipantCount: (state: RoomState) => state.participants.length,
  
  // Check if room is active
  isRoomActive: (state: RoomState) => 
    state.currentRoom?.status === 'active' && state.isConnectedToRoom,
  
  // Check if user can manage room
  canManageRoom: (state: RoomState) => 
    state.isHost && state.userRole === 'teacher',
  
  // Get room status info
  getRoomStatusInfo: (state: RoomState) => ({
    status: state.currentRoom?.status || 'unknown',
    participantCount: state.participants.length,
    maxParticipants: state.currentRoom?.maxParticipants || 0,
    isConnected: state.isConnectedToRoom,
    connectionStatus: state.connectionStatus,
  }),
} 