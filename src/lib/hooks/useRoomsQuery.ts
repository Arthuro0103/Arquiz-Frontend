import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ApiError } from '../api/client'
import { queryKeys, cacheUtils } from '../queryClient'
import { useNotificationStore } from '../stores'

// Types for room operations
interface Room {
  id: string
  name: string
  code: string
  accessCode: string
  status: string
  createdAt: string
  maxParticipants: number
  currentParticipants: number
  quizId?: string
  description?: string
}

interface CreateRoomData {
  name: string
  description?: string
  maxParticipants?: number
  quizId?: string
}

interface JoinRoomData {
  name: string
  username?: string
}

// Room list query
export const useRoomsQuery = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.rooms.list(filters),
    queryFn: () => api.rooms.list(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Single room query
export const useRoomQuery = (roomId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.rooms.detail(roomId),
    queryFn: () => api.rooms.get(roomId),
    enabled: enabled && !!roomId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Room participants query
export const useRoomParticipantsQuery = (roomId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.rooms.participants(roomId),
    queryFn: () => api.rooms.participants(roomId),
    enabled: enabled && !!roomId,
    staleTime: 30 * 1000, // 30 seconds (participants change frequently)
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  })
}

// Create room mutation
export const useCreateRoomMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (roomData: CreateRoomData) => api.rooms.create(roomData),
    onSuccess: (data: any) => {
      // Invalidate rooms list to show new room
      cacheUtils.invalidateRooms()
      
      // Add the new room to the cache
      if (data?.id) {
        queryClient.setQueryData(queryKeys.rooms.detail(data.id), data)
        showSuccess('Room created successfully', `Room "${data.name || 'New Room'}" has been created.`)
      }
    },
    onError: (error: ApiError) => {
      showError('Failed to create room', error.message)
    },
  })
}

// Update room mutation
export const useUpdateRoomMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ roomId, updates }: { roomId: string; updates: Partial<Room> }) =>
      api.rooms.update(roomId, updates),
    onSuccess: (data: any, { roomId }) => {
      // Update the specific room in cache
      if (data) {
        queryClient.setQueryData(queryKeys.rooms.detail(roomId), data)
      }
      
      // Invalidate rooms list to reflect changes
      cacheUtils.invalidateRooms()
      
      showSuccess('Room updated', 'Room settings have been updated successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to update room', error.message)
    },
  })
}

// Delete room mutation
export const useDeleteRoomMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (roomId: string) => api.rooms.delete(roomId),
    onSuccess: (_, roomId) => {
      // Remove room from cache
      queryClient.removeQueries({ queryKey: queryKeys.rooms.detail(roomId) })
      queryClient.removeQueries({ queryKey: queryKeys.rooms.participants(roomId) })
      
      // Invalidate rooms list
      cacheUtils.invalidateRooms()
      
      showSuccess('Room deleted', 'Room has been deleted successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to delete room', error.message)
    },
  })
}

// Join room mutation
export const useJoinRoomMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ code, userData }: { code: string; userData: JoinRoomData }) =>
      api.rooms.join(code, userData),
    onSuccess: (data: any) => {
      // Update room data in cache
      if (data?.roomId) {
        cacheUtils.invalidateRoom(data.roomId)
      }
      
      showSuccess('Joined room successfully', `Welcome to the room!`)
    },
    onError: (error: ApiError) => {
      showError('Failed to join room', error.message)
    },
  })
}

// Leave room mutation
export const useLeaveroomMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (roomId: string) => api.rooms.leave(roomId),
    onSuccess: (_, roomId) => {
      // Invalidate room data
      cacheUtils.invalidateRoom(roomId)
      
      showSuccess('Left room', 'You have left the room successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to leave room', error.message)
    },
  })
}

// Kick participant mutation
export const useKickParticipantMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ roomId, participantId, reason }: { 
      roomId: string; 
      participantId: string; 
      reason?: string 
    }) => api.rooms.kickParticipant(roomId, participantId, reason),
    onSuccess: (_, { roomId }) => {
      // Invalidate participants list to reflect the change
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.participants(roomId) })
      
      showSuccess('Participant removed', 'Participant has been removed from the room.')
    },
    onError: (error: ApiError) => {
      showError('Failed to remove participant', error.message)
    },
  })
}

// Prefetch room data
export const usePrefetchRoom = () => {
  const queryClient = useQueryClient()

  return (roomId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.rooms.detail(roomId),
      queryFn: () => api.rooms.get(roomId),
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
  const kickMutation = useKickParticipantMutation()

  return {
    // Data
    room: roomQuery.data,
    participants: participantsQuery.data,
    
    // Loading states
    isLoadingRoom: roomQuery.isLoading,
    isLoadingParticipants: participantsQuery.isLoading,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isKicking: kickMutation.isPending,
    
    // Error states
    roomError: roomQuery.error,
    participantsError: participantsQuery.error,
    
    // Actions
    updateRoom: (updates: Partial<Room>) => 
      updateMutation.mutate({ roomId, updates }),
    deleteRoom: () => deleteMutation.mutate(roomId),
    kickParticipant: (participantId: string, reason?: string) =>
      kickMutation.mutate({ roomId, participantId, reason }),
    
    // Refetch functions
    refetchRoom: roomQuery.refetch,
    refetchParticipants: participantsQuery.refetch,
  }
}

// Export types
export type { Room, CreateRoomData, JoinRoomData } 