import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ApiError } from '../api/client'
import { queryKeys, cacheUtils } from '../queryClient'
import { useNotificationStore } from '../stores'

// Types for question operations
interface Question {
  id: string
  question: string
  type: 'multiple_choice' | 'true_false'
  options: string[]
  correctAnswer: number
  explanation?: string
  timeLimit?: number
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
  category?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
  isPublic: boolean
}

interface CreateQuestionData {
  question: string
  type: 'multiple_choice' | 'true_false'
  options: string[]
  correctAnswer: number
  explanation?: string
  timeLimit?: number
  points?: number
  difficulty: 'easy' | 'medium' | 'hard'
  category?: string
  tags?: string[]
  isPublic?: boolean
}

interface GenerateQuestionData {
  prompt: string
  type?: 'multiple_choice' | 'true_false'
  difficulty?: 'easy' | 'medium' | 'hard'
  count?: number
  category?: string
  includeExplanation?: boolean
}

// Questions list query
export const useQuestionsQuery = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.questions.list(filters),
    queryFn: () => api.questions.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Single question query
export const useQuestionQuery = (questionId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.questions.detail(questionId),
    queryFn: () => api.questions.get(questionId),
    enabled: enabled && !!questionId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Create question mutation
export const useCreateQuestionMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (questionData: CreateQuestionData) => api.questions.create(questionData),
    onSuccess: (data: any) => {
      // Invalidate questions list to show new question
      cacheUtils.invalidateQuestions()
      
      // Add the new question to the cache
      if (data?.id) {
        queryClient.setQueryData(queryKeys.questions.detail(data.id), data)
        showSuccess('Question created successfully', 'Your question has been created and is ready to use.')
      }
    },
    onError: (error: ApiError) => {
      showError('Failed to create question', error.message)
    },
  })
}

// Update question mutation
export const useUpdateQuestionMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ questionId, updates }: { questionId: string; updates: Partial<Question> }) =>
      api.questions.update(questionId, updates),
    onSuccess: (data: any, { questionId }) => {
      // Update the specific question in cache
      if (data) {
        queryClient.setQueryData(queryKeys.questions.detail(questionId), data)
      }
      
      // Invalidate questions list to reflect changes
      cacheUtils.invalidateQuestions()
      
      showSuccess('Question updated', 'Question has been updated successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to update question', error.message)
    },
  })
}

// Delete question mutation
export const useDeleteQuestionMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (questionId: string) => api.questions.delete(questionId),
    onSuccess: (_, questionId) => {
      // Remove question from cache
      queryClient.removeQueries({ queryKey: queryKeys.questions.detail(questionId) })
      
      // Invalidate questions list
      cacheUtils.invalidateQuestions()
      
      showSuccess('Question deleted', 'Question has been deleted successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to delete question', error.message)
    },
  })
}

// Generate questions using AI mutation
export const useGenerateQuestionsMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (generationData: GenerateQuestionData) => api.questions.generate(generationData),
    onSuccess: (data: any) => {
      // Invalidate questions list to show new generated questions
      cacheUtils.invalidateQuestions()
      
      const count = data?.questions?.length || data?.count || 1
      showSuccess('Questions generated successfully', `${count} question(s) have been generated using AI.`)
    },
    onError: (error: ApiError) => {
      showError('Failed to generate questions', error.message)
    },
  })
}

// Bulk operations mutation
export const useBulkQuestionOperationsMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ operation, questionIds, data }: { 
      operation: 'delete' | 'update' | 'move'
      questionIds: string[]
      data?: any 
    }) => {
      // This would be a custom endpoint for bulk operations
      // For now, we'll implement it as multiple individual operations
      const promises = questionIds.map(id => {
        switch (operation) {
          case 'delete':
            return api.questions.delete(id)
          case 'update':
            return api.questions.update(id, data)
          default:
            throw new Error(`Unsupported bulk operation: ${operation}`)
        }
      })
      return Promise.all(promises)
    },
    onSuccess: (_, { operation, questionIds }) => {
      // Invalidate all affected questions
      questionIds.forEach(id => {
        queryClient.removeQueries({ queryKey: queryKeys.questions.detail(id) })
      })
      
      // Invalidate questions list
      cacheUtils.invalidateQuestions()
      
      const count = questionIds.length
      const operationText = operation === 'delete' ? 'deleted' : 'updated'
      showSuccess(`Bulk operation completed`, `${count} question(s) have been ${operationText}.`)
    },
    onError: (error: ApiError) => {
      showError('Bulk operation failed', error.message)
    },
  })
}

// Prefetch question data
export const usePrefetchQuestion = () => {
  const queryClient = useQueryClient()

  return (questionId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.questions.detail(questionId),
      queryFn: () => api.questions.get(questionId),
      staleTime: 3 * 60 * 1000,
    })
  }
}

// Custom hook for question management
export const useQuestionManagement = (questionId: string) => {
  const questionQuery = useQuestionQuery(questionId)
  const updateMutation = useUpdateQuestionMutation()
  const deleteMutation = useDeleteQuestionMutation()

  return {
    // Data
    question: questionQuery.data,
    
    // Loading states
    isLoading: questionQuery.isLoading,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Error states
    error: questionQuery.error,
    
    // Actions
    updateQuestion: (updates: Partial<Question>) => 
      updateMutation.mutate({ questionId, updates }),
    deleteQuestion: () => deleteMutation.mutate(questionId),
    
    // Refetch functions
    refetch: questionQuery.refetch,
  }
}

// Custom hook for AI question generation
export const useQuestionGeneration = () => {
  const generateMutation = useGenerateQuestionsMutation()
  
  return {
    // State
    isGenerating: generateMutation.isPending,
    generationError: generateMutation.error,
    lastGenerated: generateMutation.data,
    
    // Actions
    generateQuestions: (data: GenerateQuestionData) => generateMutation.mutate(data),
    
    // Reset
    reset: generateMutation.reset,
  }
}

// Custom hook for question filtering and search
export const useQuestionFilters = (questions: Question[] = [], filters: any = {}) => {
  return useQuery({
    queryKey: ['questions', 'filtered', filters],
    queryFn: () => {
      let filtered = [...questions]
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(q =>
          q.question.toLowerCase().includes(searchLower) ||
          q.explanation?.toLowerCase().includes(searchLower) ||
          q.category?.toLowerCase().includes(searchLower) ||
          q.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        )
      }
      
      // Difficulty filter
      if (filters.difficulty && filters.difficulty !== 'all') {
        filtered = filtered.filter(q => q.difficulty === filters.difficulty)
      }
      
      // Type filter
      if (filters.type && filters.type !== 'all') {
        filtered = filtered.filter(q => q.type === filters.type)
      }
      
      // Category filter
      if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter(q => q.category === filters.category)
      }
      
      // Public/Private filter
      if (filters.visibility && filters.visibility !== 'all') {
        const isPublic = filters.visibility === 'public'
        filtered = filtered.filter(q => q.isPublic === isPublic)
      }
      
      // Sort
      if (filters.sortBy) {
        filtered.sort((a, b) => {
          const aVal = a[filters.sortBy as keyof Question]
          const bVal = b[filters.sortBy as keyof Question]
          
          // Handle undefined values
          if (aVal === undefined && bVal === undefined) return 0
          if (aVal === undefined) return filters.sortOrder === 'desc' ? 1 : -1
          if (bVal === undefined) return filters.sortOrder === 'desc' ? -1 : 1
          
          if (filters.sortOrder === 'desc') {
            return bVal > aVal ? 1 : -1
          }
          return aVal > bVal ? 1 : -1
        })
      }
      
      return filtered
    },
    enabled: questions.length > 0,
    staleTime: Infinity, // Only recompute when dependencies change
  })
}

// Export types
export type { Question, CreateQuestionData, GenerateQuestionData } 