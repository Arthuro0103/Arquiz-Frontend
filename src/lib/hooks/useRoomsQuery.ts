import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { 
  Room, 
  Participant, 
  ParticipantRole,
  CreateRoomDto,
  UpdateRoomDto,
  JoinRoomDto,
  RoomSearchFilters,
  RoomSearchResult,
  JoinRoomResponse,
  RoomError,
  ConnectionQuality
} from '../../../../shared/types'
import { RoomStatus } from '../../../../shared/types'

interface UseRoomsQueryOptions {
  filters?: RoomSearchFilters
  enabled?: boolean
}

interface UseRoomsQueryResult {
  rooms: Room[]
  isLoading: boolean
  error: RoomError | null
  refetch: () => void
}

// Hook for fetching rooms with optional filters
export const useRoomsQuery = (options: UseRoomsQueryOptions = {}): UseRoomsQueryResult => {
  const { filters, enabled = true } = options

  const {
    data: roomsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['rooms', filters],
    queryFn: async (): Promise<RoomSearchResult> => {
      const searchParams = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(key, v.toString()))
            } else {
              searchParams.append(key, value.toString())
            }
          }
        })
      }

      const response = await fetch(`/api/rooms?${searchParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rooms: ${response.statusText}`)
      }

      return response.json()
    },
    enabled,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  })

  return {
    rooms: roomsData?.rooms || [],
    isLoading,
    error: error as RoomError | null,
    refetch
  }
}

interface UseCreateRoomMutationResult {
  createRoom: (data: CreateRoomDto) => Promise<Room>
  isCreating: boolean
  createError: RoomError | null
}

// Hook for creating rooms
export const useCreateRoomMutation = (): UseCreateRoomMutationResult => {
  const queryClient = useQueryClient()

  const {
    mutateAsync: createRoom,
    isPending: isCreating,
    error: createError
  } = useMutation({
    mutationFn: async (data: CreateRoomDto): Promise<Room> => {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to create room: ${response.statusText}`)
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch rooms queries
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })

  return {
    createRoom,
    isCreating,
    createError: createError as RoomError | null
  }
}

interface UseJoinRoomMutationResult {
  joinRoom: (data: JoinRoomDto) => Promise<JoinRoomResponse>
  isJoining: boolean
  joinError: RoomError | null
}

// Hook for joining rooms
export const useJoinRoomMutation = (): UseJoinRoomMutationResult => {
  const queryClient = useQueryClient()

  const {
    mutateAsync: joinRoom,
    isPending: isJoining,
    error: joinError
  } = useMutation({
    mutationFn: async (data: JoinRoomDto): Promise<JoinRoomResponse> => {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to join room: ${response.statusText}`)
      }

      return response.json()
    },
    onSuccess: (response) => {
      // Update the specific room in cache if join was successful
      if (response.success && response.data) {
        queryClient.setQueryData(['room', response.data.room.id], response.data.room)
      }
      // Invalidate rooms list to reflect updated participant count
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })

  return {
    joinRoom,
    isJoining,
    joinError: joinError as RoomError | null
  }
}

interface UseRoomQueryResult {
  room: Room | null
  isLoading: boolean
  error: RoomError | null
  refetch: () => void
}

// Hook for fetching a specific room
export const useRoomQuery = (roomId: string | null): UseRoomQueryResult => {
  const {
    data: room,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async (): Promise<Room> => {
      if (!roomId) {
        throw new Error('Room ID is required')
      }

      const response = await fetch(`/api/rooms/${roomId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch room: ${response.statusText}`)
      }

      return response.json()
    },
    enabled: !!roomId,
    staleTime: 60000, // 1 minute
  })

  return {
    room: room || null,
    isLoading,
    error: error as RoomError | null,
    refetch
  }
}

interface UseDeleteRoomMutationResult {
  deleteRoom: (roomId: string) => Promise<void>
  isDeleting: boolean
  deleteError: RoomError | null
}

// Hook for deleting rooms
export const useDeleteRoomMutation = (): UseDeleteRoomMutationResult => {
  const queryClient = useQueryClient()

  const {
    mutateAsync: deleteRoom,
    isPending: isDeleting,
    error: deleteError
  } = useMutation({
    mutationFn: async (roomId: string): Promise<void> => {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to delete room: ${response.statusText}`)
      }
    },
    onSuccess: (_, roomId) => {
      // Remove the specific room from cache
      queryClient.removeQueries({ queryKey: ['room', roomId] })
      // Invalidate rooms list
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })

  return {
    deleteRoom,
    isDeleting,
    deleteError: deleteError as RoomError | null
  }
}

// Hook for leaving a room
interface UseLeaveRoomMutationResult {
  leaveRoom: (roomId: string) => Promise<void>
  isLeaving: boolean
  leaveError: RoomError | null
}

export const useLeaveRoomMutation = (): UseLeaveRoomMutationResult => {
  const queryClient = useQueryClient()

  const {
    mutateAsync: leaveRoom,
    isPending: isLeaving,
    error: leaveError
  } = useMutation({
    mutationFn: async (roomId: string): Promise<void> => {
      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to leave room: ${response.statusText}`)
      }
    },
    onSuccess: () => {
      // Invalidate rooms queries to reflect updated participant counts
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })

  return {
    leaveRoom,
    isLeaving,
    leaveError: leaveError as RoomError | null
  }
}

// Hook for updating rooms
interface UseUpdateRoomMutationResult {
  updateRoom: (roomId: string, data: UpdateRoomDto) => Promise<Room>
  isUpdating: boolean
  updateError: RoomError | null
}

export const useUpdateRoomMutation = (): UseUpdateRoomMutationResult => {
  const queryClient = useQueryClient()

  const {
    mutateAsync: updateRoom,
    isPending: isUpdating,
    error: updateError
  } = useMutation({
    mutationFn: async ({ roomId, data }: { roomId: string; data: UpdateRoomDto }): Promise<Room> => {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to update room: ${response.statusText}`)
      }

      return response.json()
    },
    onSuccess: (updatedRoom) => {
      // Update the specific room in cache
      queryClient.setQueryData(['room', updatedRoom.id], updatedRoom)
      // Invalidate rooms list
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })

  return {
    updateRoom: (roomId: string, data: UpdateRoomDto) => updateRoom({ roomId, data }),
    isUpdating,
    updateError: updateError as RoomError | null
  }
}

// Room participants query
export const useRoomParticipantsQuery = (roomId: string, enabled = true) => {
  return useQuery({
    queryKey: ['room', 'participants', roomId],
    queryFn: async (): Promise<Participant[]> => {
      const response = await fetch(`/api/rooms/${roomId}/participants`)
      if (!response.ok) {
        throw new Error(`Failed to fetch participants: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: enabled && !!roomId,
    staleTime: 30 * 1000, // 30 seconds (participants change frequently)
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  })
}

// Kick participant mutation
export const useKickParticipantMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomId, participantId, reason }: { 
      roomId: string; 
      participantId: string; 
      reason?: string 
    }) => {
      const response = await fetch(`/api/rooms/${roomId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to remove participant: ${response.statusText}`)
      }
    },
    onSuccess: (_, { roomId }) => {
      // Invalidate participants list to reflect the change
      queryClient.invalidateQueries({ queryKey: ['room', 'participants', roomId] })
    },
  })
}

// Prefetch room data
export const usePrefetchRoom = () => {
  const queryClient = useQueryClient()

  return (roomId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['room', roomId],
      queryFn: async (): Promise<Room> => {
        const response = await fetch(`/api/rooms/${roomId}`)
        if (!response.ok) {
          throw new Error(`Failed to prefetch room: ${response.statusText}`)
        }
        return response.json()
      },
      staleTime: 1 * 60 * 1000,
    })
  }
}

// Custom hook for room management
export const useRoomManagement = (roomId: string) => {
  const roomQuery = useRoomQuery(roomId)
  const participantsQuery = useRoomParticipantsQuery(roomId)
  const updateMutation = useUpdateRoomMutation()
  const deleteMutation = useDeleteRoomMutation()

  return {
    // Data
    room: roomQuery.room,
    participants: participantsQuery.data,
    
    // Loading states
    isLoadingRoom: roomQuery.isLoading,
    isLoadingParticipants: participantsQuery.isLoading,
    isUpdating: updateMutation.isUpdating,
    isDeleting: deleteMutation.isDeleting,
    
    // Error states
    roomError: roomQuery.error,
    participantsError: participantsQuery.error,
    
    // Actions
    updateRoom: (data: UpdateRoomDto) => 
      updateMutation.updateRoom(roomId, data),
    deleteRoom: () => deleteMutation.deleteRoom(roomId),
    
    // Refetch functions
    refetchRoom: roomQuery.refetch,
    refetchParticipants: participantsQuery.refetch,
  }
} 