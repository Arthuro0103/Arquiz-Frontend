import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ApiError } from '../api/client'
import { queryKeys, cacheUtils } from '../queryClient'
import { useNotificationStore } from '../stores'

// Types for participation operations
interface ParticipationSession {
  id: string
  roomId: string
  userId: string
  userName: string
  userRole: 'student' | 'teacher'
  status: 'active' | 'completed' | 'disconnected' | 'kicked'
  joinedAt: string
  leftAt?: string
  currentQuestionIndex: number
  totalAnswers: number
  score: number
  correctAnswers: number
  averageResponseTime: number
  isReady: boolean
}

interface Answer {
  id: string
  sessionId: string
  questionId: string
  selectedOption: number
  isCorrect: boolean
  responseTime: number
  submittedAt: string
  points: number
}

interface SessionResults {
  sessionId: string
  userId: string
  userName: string
  finalScore: number
  totalQuestions: number
  correctAnswers: number
  averageResponseTime: number
  rank: number
  completedAt: string
  answers: Answer[]
  performance: {
    accuracy: number
    speed: number
    consistency: number
    ranking: number
  }
}

interface JoinSessionData {
  name: string
  username?: string
}

interface SubmitAnswerData {
  questionId: string
  selectedOption: number
  responseTime: number
  timestamp: string
}

// Participation session query
export const useParticipationSessionQuery = (sessionId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.participation.session(sessionId),
    queryFn: () => api.participation.getSession(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 30 * 1000, // 30 seconds (session data changes frequently)
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  })
}

// Session results query
export const useSessionResultsQuery = (sessionId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.participation.results(sessionId),
    queryFn: () => api.participation.getResults(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes (results don't change often)
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Join room/session mutation
export const useJoinSessionMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ roomId, userData }: { roomId: string; userData: JoinSessionData }) =>
      api.participation.join(roomId, userData),
    onSuccess: (data: any, { roomId }) => {
      // Invalidate room data to update participant count
      cacheUtils.invalidateRoom(roomId)
      
      // If we got a session ID, prefetch session data
      if (data?.sessionId) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.participation.session(data.sessionId),
          queryFn: () => api.participation.getSession(data.sessionId),
        })
      }
      
      showSuccess('Joined successfully', 'Welcome to the session!')
    },
    onError: (error: ApiError) => {
      showError('Failed to join session', error.message)
    },
  })
}

// Submit answer mutation
export const useSubmitAnswerMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: ({ sessionId, answerData }: { sessionId: string; answerData: SubmitAnswerData }) =>
      api.participation.submitAnswer(sessionId, answerData),
    onMutate: async ({ sessionId, answerData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.participation.session(sessionId) })
      
      // Snapshot previous value
      const previousSession = queryClient.getQueryData(queryKeys.participation.session(sessionId))
      
      // Optimistically update session data
      queryClient.setQueryData(queryKeys.participation.session(sessionId), (old: any) => {
        if (!old) return old
        
        return {
          ...old,
          currentQuestionIndex: old.currentQuestionIndex + 1,
          totalAnswers: old.totalAnswers + 1,
          // We'll update score when the server response comes back
        }
      })
      
      return { previousSession }
    },
    onSuccess: (data: any, { sessionId }) => {
      // Update session with actual server response
      if (data) {
        queryClient.setQueryData(queryKeys.participation.session(sessionId), data)
      }
      
      // Provide feedback based on answer correctness
      if (data?.isCorrect) {
        showSuccess('Correct!', `+${data.points || 0} points`)
      } else {
        showError('Incorrect', 'Better luck on the next question!')
      }
    },
    onError: (error: ApiError, { sessionId }, context) => {
      // Rollback optimistic update
      if (context?.previousSession) {
        queryClient.setQueryData(queryKeys.participation.session(sessionId), context.previousSession)
      }
      
      showError('Failed to submit answer', error.message)
    },
    onSettled: (_, __, { sessionId }) => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: queryKeys.participation.session(sessionId) })
    },
  })
}

// Leave session mutation
export const useLeaveSessionMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (sessionId: string) => {
      // This would be a custom endpoint for leaving a session
      // For now, we'll use a placeholder
      return Promise.resolve({ success: true })
    },
    onSuccess: (_, sessionId) => {
      // Remove session data from cache
      queryClient.removeQueries({ queryKey: queryKeys.participation.session(sessionId) })
      
      showSuccess('Left session', 'You have left the session successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to leave session', error.message)
    },
  })
}

// Custom hook for participation management
export const useParticipationManagement = (sessionId: string) => {
  const sessionQuery = useParticipationSessionQuery(sessionId)
  const resultsQuery = useSessionResultsQuery(sessionId, (sessionQuery.data as any)?.status === 'completed')
  const submitAnswerMutation = useSubmitAnswerMutation()
  const leaveMutation = useLeaveSessionMutation()

  const session = sessionQuery.data as ParticipationSession | undefined
  const results = resultsQuery.data as SessionResults | undefined

  return {
    // Data
    session,
    results,
    
    // Loading states
    isLoadingSession: sessionQuery.isLoading,
    isLoadingResults: resultsQuery.isLoading,
    isSubmittingAnswer: submitAnswerMutation.isPending,
    isLeaving: leaveMutation.isPending,
    
    // Error states
    sessionError: sessionQuery.error,
    resultsError: resultsQuery.error,
    submitError: submitAnswerMutation.error,
    
    // Actions
    submitAnswer: (answerData: SubmitAnswerData) =>
      submitAnswerMutation.mutate({ sessionId, answerData }),
    leaveSession: () => leaveMutation.mutate(sessionId),
    
    // Computed values
    isSessionActive: session?.status === 'active',
    isSessionCompleted: session?.status === 'completed',
    currentProgress: session 
      ? (session.currentQuestionIndex / session.totalAnswers) * 100 
      : 0,
    
    // Refetch functions
    refetchSession: sessionQuery.refetch,
    refetchResults: resultsQuery.refetch,
  }
}

// Custom hook for real-time session updates
export const useRealTimeParticipation = (sessionId: string, enabled = true) => {
  const queryClient = useQueryClient()
  
  // Use shorter intervals for real-time updates during active sessions
  const sessionQuery = useQuery({
    queryKey: queryKeys.participation.session(sessionId),
    queryFn: () => api.participation.getSession(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 1000, // 1 second
    gcTime: 30 * 1000, // 30 seconds
    refetchInterval: 2000, // Refetch every 2 seconds
    refetchIntervalInBackground: true,
  })

  const updateSessionData = (updater: (oldData: any) => any) => {
    queryClient.setQueryData(queryKeys.participation.session(sessionId), updater)
  }

  const invalidateSession = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.participation.session(sessionId) })
  }

  return {
    session: sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    error: sessionQuery.error,
    updateSessionData,
    invalidateSession,
    refetch: sessionQuery.refetch,
  }
}

// Custom hook for session analytics
export const useSessionAnalytics = (sessionId: string) => {
  const resultsQuery = useSessionResultsQuery(sessionId)
  const results = resultsQuery.data as SessionResults | undefined
  
  const analytics = results ? {
    accuracyPercentage: (results.correctAnswers / results.totalQuestions) * 100,
    averageTimePerQuestion: results.averageResponseTime,
    performanceGrade: results.performance.accuracy > 0.8 ? 'A' : 
                     results.performance.accuracy > 0.6 ? 'B' : 
                     results.performance.accuracy > 0.4 ? 'C' : 'D',
    rank: results.rank,
    totalParticipants: results.performance.ranking,
  } : null

  return {
    analytics,
    isLoading: resultsQuery.isLoading,
    error: resultsQuery.error,
    refetch: resultsQuery.refetch,
  }
}

// Export types
export type { 
  ParticipationSession, 
  Answer, 
  SessionResults, 
  JoinSessionData, 
  SubmitAnswerData 
} 