import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ApiError } from '../api/client'
import { queryKeys, cacheUtils } from '../queryClient'
import { useNotificationStore } from '../stores'

// Types for quiz operations
interface Quiz {
  id: string
  title: string
  description?: string
  difficulty: 'easy' | 'medium' | 'hard'
  timePerQuestion?: number
  totalQuestions: number
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
  createdBy: string
  tags?: string[]
  category?: string
  isPublic: boolean
}

interface CreateQuizData {
  title: string
  description?: string
  difficulty: 'easy' | 'medium' | 'hard'
  timePerQuestion?: number
  tags?: string[]
  category?: string
  isPublic?: boolean
}

interface QuizQuestion {
  id: string
  question: string
  type: 'multiple_choice' | 'true_false'
  options: string[]
  correctAnswer: number
  explanation?: string
  timeLimit?: number
  points: number
}

// Quiz list query
export const useQuizzesQuery = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.quizzes.list(filters),
    queryFn: () => api.quizzes.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Single quiz query
export const useQuizQuery = (quizId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.quizzes.detail(quizId),
    queryFn: () => api.quizzes.get(quizId),
    enabled: enabled && !!quizId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Quiz questions query
export const useQuizQuestionsQuery = (quizId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.quizzes.questions(quizId),
    queryFn: () => api.quizzes.questions(quizId),
    enabled: enabled && !!quizId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create quiz mutation
export const useCreateQuizMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (quizData: CreateQuizData) => api.quizzes.create(quizData),
    onSuccess: (data: any) => {
      // Invalidate quizzes list to show new quiz
      cacheUtils.invalidateQuizzes()
      
      // Add the new quiz to the cache
      if (data?.id) {
        queryClient.setQueryData(queryKeys.quizzes.detail(data.id), data)
        showSuccess('Quiz created successfully', `Quiz "${data.title || 'New Quiz'}" has been created.`)
      }
    },
    onError: (error: ApiError) => {
      showError('Failed to create quiz', error.message)
    },
  })
}

// Update quiz mutation
export const useUpdateQuizMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ quizId, updates }: { quizId: string; updates: Partial<Quiz> }) =>
      api.quizzes.update(quizId, updates),
    onSuccess: (data: any, { quizId }) => {
      // Update the specific quiz in cache
      if (data) {
        queryClient.setQueryData(queryKeys.quizzes.detail(quizId), data)
      }
      
      // Invalidate quizzes list to reflect changes
      cacheUtils.invalidateQuizzes()
      
      showSuccess('Quiz updated', 'Quiz has been updated successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to update quiz', error.message)
    },
  })
}

// Delete quiz mutation
export const useDeleteQuizMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (quizId: string) => api.quizzes.delete(quizId),
    onSuccess: (_, quizId) => {
      // Remove quiz from cache
      queryClient.removeQueries({ queryKey: queryKeys.quizzes.detail(quizId) })
      queryClient.removeQueries({ queryKey: queryKeys.quizzes.questions(quizId) })
      
      // Invalidate quizzes list
      cacheUtils.invalidateQuizzes()
      
      showSuccess('Quiz deleted', 'Quiz has been deleted successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to delete quiz', error.message)
    },
  })
}

// Add question to quiz mutation
export const useAddQuestionToQuizMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ quizId, questionData }: { quizId: string; questionData: Omit<QuizQuestion, 'id'> }) =>
      api.quizzes.addQuestion(quizId, questionData),
    onSuccess: (data: any, { quizId }) => {
      // Invalidate quiz questions to show new question
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.questions(quizId) })
      
      // Update quiz details (total questions count might have changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.detail(quizId) })
      
      showSuccess('Question added', 'Question has been added to the quiz successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to add question', error.message)
    },
  })
}

// Remove question from quiz mutation
export const useRemoveQuestionFromQuizMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ quizId, questionId }: { quizId: string; questionId: string }) =>
      api.quizzes.removeQuestion(quizId, questionId),
    onSuccess: (_, { quizId }) => {
      // Invalidate quiz questions to remove the question
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.questions(quizId) })
      
      // Update quiz details (total questions count might have changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.detail(quizId) })
      
      showSuccess('Question removed', 'Question has been removed from the quiz.')
    },
    onError: (error: ApiError) => {
      showError('Failed to remove question', error.message)
    },
  })
}

// Prefetch quiz data
export const usePrefetchQuiz = () => {
  const queryClient = useQueryClient()

  return (quizId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.quizzes.detail(quizId),
      queryFn: () => api.quizzes.get(quizId),
      staleTime: 3 * 60 * 1000,
    })
  }
}

// Custom hook for quiz management
export const useQuizManagement = (quizId: string) => {
  const quizQuery = useQuizQuery(quizId)
  const questionsQuery = useQuizQuestionsQuery(quizId)
  const updateMutation = useUpdateQuizMutation()
  const deleteMutation = useDeleteQuizMutation()
  const addQuestionMutation = useAddQuestionToQuizMutation()
  const removeQuestionMutation = useRemoveQuestionFromQuizMutation()

  return {
    // Data
    quiz: quizQuery.data,
    questions: questionsQuery.data,
    
    // Loading states
    isLoadingQuiz: quizQuery.isLoading,
    isLoadingQuestions: questionsQuery.isLoading,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAddingQuestion: addQuestionMutation.isPending,
    isRemovingQuestion: removeQuestionMutation.isPending,
    
    // Error states
    quizError: quizQuery.error,
    questionsError: questionsQuery.error,
    
    // Actions
    updateQuiz: (updates: Partial<Quiz>) => 
      updateMutation.mutate({ quizId, updates }),
    deleteQuiz: () => deleteMutation.mutate(quizId),
    addQuestion: (questionData: Omit<QuizQuestion, 'id'>) =>
      addQuestionMutation.mutate({ quizId, questionData }),
    removeQuestion: (questionId: string) =>
      removeQuestionMutation.mutate({ quizId, questionId }),
    
    // Refetch functions
    refetchQuiz: quizQuery.refetch,
    refetchQuestions: questionsQuery.refetch,
  }
}

// Export types
export type { Quiz, CreateQuizData, QuizQuestion } 