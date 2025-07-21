import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import type { 
  Room, 
  Participant, 
  ParticipantRole,
  CreateRoomDto,
  UpdateRoomDto,
  JoinRoomDto,
  RoomError,
  ConnectionQuality
} from '../../../../shared/types'
import { RoomStatus } from '../../../../shared/types'

// Re-export shared types for convenience
export type { 
  Room, 
  Participant, 
  RoomStatus, 
  ParticipantRole,
  CreateRoomDto,
  UpdateRoomDto,
  JoinRoomDto,
  RoomError,
  ConnectionQuality
} from '../../../../shared/types'

// Store state interface using shared types
export interface RoomState {
  // Current room state
  currentRoom: Room | null
  participants: Participant[]
  connectionQuality: ConnectionQuality | null
  
  // UI state
  isLoading: boolean
  error: RoomError | null
  isConnecting: boolean
  reconnectAttempts: number
  
  // Room list state
  roomList: Room[]
  roomListLoading: boolean
  roomListError: string | null
  
  // Actions
  setCurrentRoom: (room: Room | null) => void
  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void
  setConnectionQuality: (quality: ConnectionQuality) => void
  
  // Error handling
  setError: (error: RoomError | null) => void
  clearError: () => void
  
  // Loading states
  setLoading: (loading: boolean) => void
  setConnecting: (connecting: boolean) => void
  
  // Room list actions
  setRoomList: (rooms: Room[]) => void
  addRoom: (room: Room) => void
  updateRoom: (roomId: string, updates: Partial<Room>) => void
  removeRoom: (roomId: string) => void
  
  // Async actions
  joinRoom: (accessCode: string) => Promise<void>
  leaveRoom: () => Promise<void>
  createRoom: (roomData: CreateRoomDto) => Promise<Room>
  updateRoomSettings: (roomId: string, updates: UpdateRoomDto) => Promise<void>
  
  // Reset
  reset: () => void
}

// Initial state
const initialState = {
  currentRoom: null,
  participants: [],
  connectionQuality: null,
  isLoading: false,
  error: null,
  isConnecting: false,
  reconnectAttempts: 0,
  roomList: [],
  roomListLoading: false,
  roomListError: null,
}

// Create store with shared types
export const useRoomStore = create<RoomState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // Synchronous actions
      setCurrentRoom: (room) => set({ currentRoom: room }),
      
      setParticipants: (participants) => set({ participants }),
      
      addParticipant: (participant) => set((state) => ({
        participants: [...state.participants, participant]
      })),
      
      removeParticipant: (participantId) => set((state) => ({
        participants: state.participants.filter(p => p.id !== participantId)
      })),
      
      updateParticipant: (participantId, updates) => set((state) => ({
        participants: state.participants.map(p => 
          p.id === participantId ? { ...p, ...updates } : p
        )
      })),
      
      setConnectionQuality: (quality) => set({ connectionQuality: quality }),
      
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setConnecting: (connecting) => set({ isConnecting: connecting }),
      
      setRoomList: (roomList) => set({ roomList }),
      
      addRoom: (room) => set((state) => ({
        roomList: [...state.roomList, room]
      })),
      
      updateRoom: (roomId, updates) => set((state) => ({
        roomList: state.roomList.map(room => 
          room.id === roomId ? { ...room, ...updates } : room
        ),
        currentRoom: state.currentRoom?.id === roomId 
          ? { ...state.currentRoom, ...updates }
          : state.currentRoom
      })),
      
      removeRoom: (roomId) => set((state) => ({
        roomList: state.roomList.filter(room => room.id !== roomId),
        currentRoom: state.currentRoom?.id === roomId ? null : state.currentRoom
      })),

      // Async actions
      joinRoom: async (accessCode: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/rooms/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessCode }),
          })
          
          if (!response.ok) {
            throw new Error(`Failed to join room: ${response.statusText}`)
          }
          
          const data = await response.json()
          
          set({ 
            currentRoom: data.room,
            participants: data.participants || [],
            isLoading: false 
          })
        } catch (error) {
          set({ 
            error: {
              code: 'JOIN_ROOM_FAILED',
              message: error instanceof Error ? error.message : 'Failed to join room'
            },
            isLoading: false 
          })
        }
      },

      leaveRoom: async () => {
        const { currentRoom } = get()
        if (!currentRoom) return

        set({ isLoading: true })
        
        try {
          await fetch(`/api/rooms/${currentRoom.id}/leave`, {
            method: 'POST',
          })
          
          set({ 
            currentRoom: null,
            participants: [],
            isLoading: false 
          })
        } catch (error) {
          set({ 
            error: {
              code: 'LEAVE_ROOM_FAILED',
              message: error instanceof Error ? error.message : 'Failed to leave room'
            },
            isLoading: false 
          })
        }
      },

      createRoom: async (roomData: CreateRoomDto): Promise<Room> => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roomData),
          })
          
          if (!response.ok) {
            throw new Error(`Failed to create room: ${response.statusText}`)
          }
          
          const room: Room = await response.json()
          
          set((state) => ({
            roomList: [...state.roomList, room],
            isLoading: false
          }))
          
          return room
        } catch (error) {
          const roomError: RoomError = {
            code: 'CREATE_ROOM_FAILED',
            message: error instanceof Error ? error.message : 'Failed to create room'
          }
          
          set({ error: roomError, isLoading: false })
          throw roomError
        }
      },

      updateRoomSettings: async (roomId: string, updates: UpdateRoomDto) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`/api/rooms/${roomId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })
          
          if (!response.ok) {
            throw new Error(`Failed to update room: ${response.statusText}`)
          }
          
          const updatedRoom: Room = await response.json()
          
          get().updateRoom(roomId, updatedRoom)
          set({ isLoading: false })
        } catch (error) {
          set({ 
            error: {
              code: 'UPDATE_ROOM_FAILED',
              message: error instanceof Error ? error.message : 'Failed to update room'
            },
            isLoading: false 
          })
        }
      },

      reset: () => set(initialState),
    })),
    { name: 'room-store' }
  )
)

// Selectors for computed values
export const roomSelectors = {
  getCurrentRoom: (state: RoomState): Room | null => state.currentRoom,
  getParticipants: (state: RoomState): Participant[] => state.participants,
  getParticipantCount: (state: RoomState): number => state.participants.length,
  getConnectionQuality: (state: RoomState): ConnectionQuality | null => state.connectionQuality,
     isRoomActive: (state: RoomState): boolean => state.currentRoom?.status === RoomStatus.ACTIVE,
  hasError: (state: RoomState): boolean => state.error !== null,
  isConnected: (state: RoomState): boolean => 
    state.currentRoom !== null && !state.isConnecting && state.error === null,
} 