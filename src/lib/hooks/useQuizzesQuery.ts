import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { 
  Quiz, 
  Question,
  CreateQuizDto, 
  UpdateQuizDto,
  QuizSearchFilters,
  QuizSearchResult,
  QuizError,
  QuizResult
} from '../../../../shared/types'

// Re-export shared types for convenience
export type { 
  Quiz, 
  Question,
  CreateQuizDto, 
  UpdateQuizDto,
  QuizSearchFilters,
  QuizSearchResult,
  QuizError,
  QuizResult
} from '../../../../shared/types'

interface UseQuizzesQueryOptions {
  filters?: QuizSearchFilters
  enabled?: boolean
}

interface UseQuizzesQueryResult {
  quizzes: Quiz[]
  isLoading: boolean
  error: QuizError | null
  refetch: () => void
}

// Hook for fetching quizzes with optional filters
export const useQuizzesQuery = (options: UseQuizzesQueryOptions = {}): UseQuizzesQueryResult => {
  const { filters, enabled = true } = options

  const {
    data: quizzesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['quizzes', filters],
    queryFn: async (): Promise<QuizSearchResult> => {
      const searchParams = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(key, v.toString()))
            } else if (value instanceof Date) {
              searchParams.append(key, value.toISOString())
            } else {
              searchParams.append(key, value.toString())
            }
          }
        })
      }

      const response = await fetch(`/api/quizzes?${searchParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch quizzes: ${response.statusText}`)
      }

      return response.json()
    },
    enabled,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  })

  return {
    quizzes: quizzesData?.quizzes || [],
    isLoading,
    error: error as QuizError | null,
    refetch
  }
}

interface UseCreateQuizMutationResult {
  createQuiz: (data: CreateQuizDto) => Promise<Quiz>
  isCreating: boolean
  createError: QuizError | null
}

// Hook for creating quizzes
export const useCreateQuizMutation = (): UseCreateQuizMutationResult => {
  const queryClient = useQueryClient()

  const {
    mutateAsync: createQuiz,
    isPending: isCreating,
    error: createError
  } = useMutation({
    mutationFn: async (data: CreateQuizDto): Promise<Quiz> => {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to create quiz: ${response.statusText}`)
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch quizzes queries
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
    },
  })

  return {
    createQuiz,
    isCreating,
    createError: createError as QuizError | null
  }
}

interface UseUpdateQuizMutationResult {
  updateQuiz: (quizId: string, data: UpdateQuizDto) => Promise<Quiz>
  isUpdating: boolean
  updateError: QuizError | null
}

// Hook for updating quizzes
export const useUpdateQuizMutation = (): UseUpdateQuizMutationResult => {
  const queryClient = useQueryClient()

  const {
    mutateAsync: updateQuiz,
    isPending: isUpdating,
    error: updateError
  } = useMutation({
    mutationFn: async ({ quizId, data }: { quizId: string; data: UpdateQuizDto }): Promise<Quiz> => {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to update quiz: ${response.statusText}`)
      }

      return response.json()
    },
    onSuccess: (updatedQuiz) => {
      // Update the specific quiz in cache
      queryClient.setQueryData(['quiz', updatedQuiz.id], updatedQuiz)
      // Invalidate quizzes list
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
    },
  })

  return {
    updateQuiz: (quizId: string, data: UpdateQuizDto) => updateQuiz({ quizId, data }),
    isUpdating,
    updateError: updateError as QuizError | null
  }
}

interface UseQuizQueryResult {
  quiz: Quiz | null
  isLoading: boolean
  error: QuizError | null
  refetch: () => void
}

// Hook for fetching a specific quiz
export const useQuizQuery = (quizId: string | null): UseQuizQueryResult => {
  const {
    data: quiz,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async (): Promise<Quiz> => {
      if (!quizId) {
        throw new Error('Quiz ID is required')
      }

      const response = await fetch(`/api/quizzes/${quizId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch quiz: ${response.statusText}`)
      }

      return response.json()
    },
    enabled: !!quizId,
    staleTime: 60000, // 1 minute
  })

  return {
    quiz: quiz || null,
    isLoading,
    error: error as QuizError | null,
    refetch
  }
}

interface UseDeleteQuizMutationResult {
  deleteQuiz: (quizId: string) => Promise<void>
  isDeleting: boolean
  deleteError: QuizError | null
}

// Hook for deleting quizzes
export const useDeleteQuizMutation = (): UseDeleteQuizMutationResult => {
  const queryClient = useQueryClient()

  const {
    mutateAsync: deleteQuiz,
    isPending: isDeleting,
    error: deleteError
  } = useMutation({
    mutationFn: async (quizId: string): Promise<void> => {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to delete quiz: ${response.statusText}`)
      }
    },
    onSuccess: (_, quizId) => {
      // Remove the specific quiz from cache
      queryClient.removeQueries({ queryKey: ['quiz', quizId] })
      // Invalidate quizzes list
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
    },
  })

  return {
    deleteQuiz,
    isDeleting,
    deleteError: deleteError as QuizError | null
  }
}

interface UseQuizResultsQueryResult {
  results: QuizResult[]
  isLoading: boolean
  error: QuizError | null
  refetch: () => void
}

// Hook for fetching quiz results
export const useQuizResultsQuery = (quizId: string | null): UseQuizResultsQueryResult => {
  const {
    data: results,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['quiz-results', quizId],
    queryFn: async (): Promise<QuizResult[]> => {
      if (!quizId) {
        throw new Error('Quiz ID is required')
      }

      const response = await fetch(`/api/quizzes/${quizId}/results`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch quiz results: ${response.statusText}`)
      }

      return response.json()
    },
    enabled: !!quizId,
    staleTime: 30000, // 30 seconds
  })

  return {
    results: results || [],
    isLoading,
    error: error as QuizError | null,
    refetch
  }
}

interface UseSubmitQuizMutationResult {
  submitQuiz: (quizId: string, answers: any[]) => Promise<QuizResult>
  isSubmitting: boolean
  submitError: QuizError | null
}

// Hook for submitting quiz answers
export const useSubmitQuizMutation = (): UseSubmitQuizMutationResult => {
  const queryClient = useQueryClient()

  const {
    mutateAsync: submitQuiz,
    isPending: isSubmitting,
    error: submitError
  } = useMutation({
    mutationFn: async ({ quizId, answers }: { quizId: string; answers: any[] }): Promise<QuizResult> => {
      const response = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to submit quiz: ${response.statusText}`)
      }

      return response.json()
    },
    onSuccess: (result) => {
      // Invalidate quiz results to show the new submission
      queryClient.invalidateQueries({ queryKey: ['quiz-results', result.quizId] })
    },
  })

  return {
    submitQuiz: (quizId: string, answers: any[]) => submitQuiz({ quizId, answers }),
    isSubmitting,
    submitError: submitError as QuizError | null
  }
} 