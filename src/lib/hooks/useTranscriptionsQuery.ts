import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ApiError } from '../api/client'
import { queryKeys, cacheUtils } from '../queryClient'
import { useNotificationStore } from '../stores'

// Types for transcription operations
interface Transcription {
  id: string
  title: string
  description?: string
  content: string
  tags: string[]
  privacyLevel: 'public' | 'private' | 'shared'
  characterCount: number
  wordCount: number
  associatedQuizzesCount: number
  createdAt: string
  updatedAt: string
  isArchived: boolean
  analysis?: {
    wordCount: number
    characterCount: number
    readingTimeMinutes: number
    complexityScore: number
    difficultyLevel: 'basic' | 'intermediate' | 'advanced'
    topicIdentification: string[]
    suggestedTags: string[]
    qualityScore: number
  }
}

interface CreateTranscriptionData {
  title: string
  description?: string
  content: string
  tags?: string[]
  privacyLevel?: 'public' | 'private' | 'shared'
}

interface UpdateTranscriptionData {
  title?: string
  description?: string
  content?: string
  tags?: string[]
  privacyLevel?: 'public' | 'private' | 'shared'
}

interface SearchFilters {
  searchTerm?: string
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  includeArchived?: boolean
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

// Transcriptions list query
export const useTranscriptionsQuery = (filters?: SearchFilters) => {
  return useQuery({
    queryKey: queryKeys.transcriptions.list(filters),
    queryFn: () => api.transcriptions.list(filters),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Single transcription query
export const useTranscriptionQuery = (transcriptionId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.transcriptions.detail(transcriptionId),
    queryFn: () => api.transcriptions.get(transcriptionId),
    enabled: enabled && !!transcriptionId,
    staleTime: 5 * 60 * 1000, // 5 minutes (transcriptions don't change often)
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

// Search transcriptions query
export const useSearchTranscriptionsQuery = (query: string, filters?: SearchFilters, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.transcriptions.search(query),
    queryFn: () => api.transcriptions.search(query, filters),
    enabled: enabled && !!query && query.length > 2, // Only search if query has more than 2 characters
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create transcription mutation
export const useCreateTranscriptionMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (transcriptionData: CreateTranscriptionData) => 
      api.transcriptions.create(transcriptionData),
    onSuccess: (data: any) => {
      // Invalidate transcriptions list to show new transcription
      cacheUtils.invalidateTranscriptions()
      
      // Add the new transcription to the cache
      if (data?.id) {
        queryClient.setQueryData(queryKeys.transcriptions.detail(data.id), data)
        showSuccess('Transcription created successfully', `"${data.title || 'New Transcription'}" has been created.`)
      }
    },
    onError: (error: ApiError) => {
      showError('Failed to create transcription', error.message)
    },
  })
}

// Update transcription mutation
export const useUpdateTranscriptionMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ transcriptionId, updates }: { transcriptionId: string; updates: UpdateTranscriptionData }) =>
      api.transcriptions.update(transcriptionId, updates),
    onSuccess: (data: any, { transcriptionId }) => {
      // Update the specific transcription in cache
      if (data) {
        queryClient.setQueryData(queryKeys.transcriptions.detail(transcriptionId), data)
      }
      
      // Invalidate transcriptions list to reflect changes
      cacheUtils.invalidateTranscriptions()
      
      showSuccess('Transcription updated', 'Transcription has been updated successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to update transcription', error.message)
    },
  })
}

// Delete transcription mutation
export const useDeleteTranscriptionMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (transcriptionId: string) => api.transcriptions.delete(transcriptionId),
    onSuccess: (_, transcriptionId) => {
      // Remove transcription from cache
      queryClient.removeQueries({ queryKey: queryKeys.transcriptions.detail(transcriptionId) })
      
      // Invalidate transcriptions list
      cacheUtils.invalidateTranscriptions()
      
      showSuccess('Transcription deleted', 'Transcription has been deleted successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to delete transcription', error.message)
    },
  })
}

// Archive transcription mutation
export const useArchiveTranscriptionMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ transcriptionId, archive }: { transcriptionId: string; archive: boolean }) =>
      api.transcriptions.update(transcriptionId, { isArchived: archive }),
    onSuccess: (data: any, { transcriptionId, archive }) => {
      // Update the specific transcription in cache
      if (data) {
        queryClient.setQueryData(queryKeys.transcriptions.detail(transcriptionId), data)
      }
      
      // Invalidate transcriptions list
      cacheUtils.invalidateTranscriptions()
      
      const action = archive ? 'archived' : 'unarchived'
      showSuccess(`Transcription ${action}`, `Transcription has been ${action} successfully.`)
    },
    onError: (error: ApiError) => {
      showError('Failed to update transcription', error.message)
    },
  })
}

// Duplicate transcription mutation
export const useDuplicateTranscriptionMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: async (transcriptionId: string) => {
      // First get the original transcription
      const original = await api.transcriptions.get(transcriptionId) as Transcription
      
      // Create a duplicate with modified title
      const duplicateData: CreateTranscriptionData = {
        title: `${original.title} (Copy)`,
        description: original.description,
        content: original.content,
        tags: original.tags,
        privacyLevel: original.privacyLevel,
      }
      
      return api.transcriptions.create(duplicateData)
    },
    onSuccess: (data: any) => {
      // Invalidate transcriptions list to show new duplicate
      cacheUtils.invalidateTranscriptions()
      
      // Add the duplicated transcription to the cache
      if (data?.id) {
        queryClient.setQueryData(queryKeys.transcriptions.detail(data.id), data)
        showSuccess('Transcription duplicated', `"${data.title}" has been created as a copy.`)
      }
    },
    onError: (error: ApiError) => {
      showError('Failed to duplicate transcription', error.message)
    },
  })
}

// Prefetch transcription data
export const usePrefetchTranscription = () => {
  const queryClient = useQueryClient()

  return (transcriptionId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.transcriptions.detail(transcriptionId),
      queryFn: () => api.transcriptions.get(transcriptionId),
      staleTime: 5 * 60 * 1000,
    })
  }
}

// Custom hook for transcription management
export const useTranscriptionManagement = (transcriptionId: string) => {
  const transcriptionQuery = useTranscriptionQuery(transcriptionId)
  const updateMutation = useUpdateTranscriptionMutation()
  const deleteMutation = useDeleteTranscriptionMutation()
  const archiveMutation = useArchiveTranscriptionMutation()
  const duplicateMutation = useDuplicateTranscriptionMutation()

  const transcription = transcriptionQuery.data as Transcription | undefined

  return {
    // Data
    transcription,
    
    // Loading states
    isLoading: transcriptionQuery.isLoading,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
    
    // Error states
    error: transcriptionQuery.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    
    // Actions
    updateTranscription: (updates: UpdateTranscriptionData) => 
      updateMutation.mutate({ transcriptionId, updates }),
    deleteTranscription: () => deleteMutation.mutate(transcriptionId),
    archiveTranscription: (archive: boolean = true) =>
      archiveMutation.mutate({ transcriptionId, archive }),
    duplicateTranscription: () => duplicateMutation.mutate(transcriptionId),
    
    // Computed values
    isArchived: transcription?.isArchived || false,
    wordCount: transcription?.analysis?.wordCount || 0,
    readingTime: transcription?.analysis?.readingTimeMinutes || 0,
    complexityScore: transcription?.analysis?.complexityScore || 0,
    qualityScore: transcription?.analysis?.qualityScore || 0,
    
    // Refetch functions
    refetch: transcriptionQuery.refetch,
  }
}

// Custom hook for transcription search and filtering
export const useTranscriptionSearch = () => {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filters, setFilters] = React.useState<SearchFilters>({})
  const [debouncedQuery, setDebouncedQuery] = React.useState('')

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const searchResults = useSearchTranscriptionsQuery(debouncedQuery, filters, debouncedQuery.length > 2)
  const listQuery = useTranscriptionsQuery(filters)

  // Use search results if searching, otherwise use regular list
  const results = debouncedQuery.length > 2 ? searchResults.data : listQuery.data
  const isLoading = debouncedQuery.length > 2 ? searchResults.isLoading : listQuery.isLoading
  const error = debouncedQuery.length > 2 ? searchResults.error : listQuery.error

  return {
    // Data
    transcriptions: (results as Transcription[]) || [],
    isLoading,
    error,
    
    // Search state
    searchQuery: searchTerm,
    setSearchQuery: setSearchTerm,
    filters,
    setFilters,
    
    // Actions
    clearSearch: () => {
      setSearchTerm('')
      setFilters({})
    },
    
    // Computed
    isSearching: debouncedQuery.length > 2,
    hasResults: ((results as Transcription[]) || []).length > 0,
    
    // Refetch
    refetch: debouncedQuery.length > 2 ? searchResults.refetch : listQuery.refetch,
  }
}

// Export types
export type { 
  Transcription, 
  CreateTranscriptionData, 
  UpdateTranscriptionData, 
  SearchFilters 
} 