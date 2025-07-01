import { QueryClient } from '@tanstack/react-query'

// Default query options for all queries
const defaultQueryOptions = {
  queries: {
    // Stale time: how long data is considered fresh (5 minutes)
    staleTime: 5 * 60 * 1000,
    
    // Cache time: how long unused data stays in cache (10 minutes)
    gcTime: 10 * 60 * 1000,
    
    // Retry configuration
    retry: (failureCount: number, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false
      }
      
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Refetch on window focus (useful for real-time data)
    refetchOnWindowFocus: true,
    
    // Refetch on reconnect
    refetchOnReconnect: true,
    
    // Don't refetch on mount if data is fresh
    refetchOnMount: true,
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,
    
    // Retry delay for mutations
    retryDelay: 1000,
  },
}

// Create the query client
export const queryClient = new QueryClient({
  defaultOptions: defaultQueryOptions,
})

// Query keys factory for consistent key management
export const queryKeys = {
  // Auth related queries
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
  },
  
  // Room related queries
  rooms: {
    all: ['rooms'] as const,
    lists: () => [...queryKeys.rooms.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.rooms.lists(), { filters }] as const,
    details: () => [...queryKeys.rooms.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.rooms.details(), id] as const,
    participants: (roomId: string) => [...queryKeys.rooms.detail(roomId), 'participants'] as const,
  },
  
  // Quiz related queries
  quizzes: {
    all: ['quizzes'] as const,
    lists: () => [...queryKeys.quizzes.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.quizzes.lists(), { filters }] as const,
    details: () => [...queryKeys.quizzes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.quizzes.details(), id] as const,
    questions: (quizId: string) => [...queryKeys.quizzes.detail(quizId), 'questions'] as const,
  },
  
  // Question related queries
  questions: {
    all: ['questions'] as const,
    lists: () => [...queryKeys.questions.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.questions.lists(), { filters }] as const,
    details: () => [...queryKeys.questions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.questions.details(), id] as const,
  },
  
  // Participation related queries
  participation: {
    all: ['participation'] as const,
    session: (sessionId: string) => [...queryKeys.participation.all, 'session', sessionId] as const,
    results: (sessionId: string) => [...queryKeys.participation.session(sessionId), 'results'] as const,
  },
  
  // Reports related queries
  reports: {
    all: ['reports'] as const,
    performance: (filters?: any) => [...queryKeys.reports.all, 'performance', { filters }] as const,
    analytics: (filters?: any) => [...queryKeys.reports.all, 'analytics', { filters }] as const,
  },
  
  // Transcriptions related queries
  transcriptions: {
    all: ['transcriptions'] as const,
    lists: () => [...queryKeys.transcriptions.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.transcriptions.lists(), { filters }] as const,
    details: () => [...queryKeys.transcriptions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transcriptions.details(), id] as const,
    search: (query: string) => [...queryKeys.transcriptions.all, 'search', query] as const,
  },
}

// Utility functions for cache management
export const cacheUtils = {
  // Invalidate all queries for a specific domain
  invalidateAuth: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all }),
  invalidateRooms: () => queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
  invalidateQuizzes: () => queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all }),
  invalidateQuestions: () => queryClient.invalidateQueries({ queryKey: queryKeys.questions.all }),
  invalidateParticipation: () => queryClient.invalidateQueries({ queryKey: queryKeys.participation.all }),
  invalidateReports: () => queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
  invalidateTranscriptions: () => queryClient.invalidateQueries({ queryKey: queryKeys.transcriptions.all }),
  
  // Invalidate specific room data
  invalidateRoom: (roomId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.rooms.detail(roomId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.rooms.participants(roomId) })
  },
  
  // Invalidate specific quiz data
  invalidateQuiz: (quizId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.detail(quizId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.questions(quizId) })
  },
  
  // Remove all cached data
  clearAll: () => queryClient.clear(),
  
  // Remove specific query from cache
  removeQuery: (queryKey: any[]) => queryClient.removeQueries({ queryKey }),
  
  // Set query data manually
  setQueryData: <T>(queryKey: any[], data: T) => queryClient.setQueryData(queryKey, data),
  
  // Get query data from cache
  getQueryData: <T>(queryKey: any[]): T | undefined => queryClient.getQueryData(queryKey),
  
  // Prefetch query
  prefetchQuery: (queryKey: any[], queryFn: () => Promise<any>) => 
    queryClient.prefetchQuery({ queryKey, queryFn }),
}

// Error handling utilities
export const queryErrorUtils = {
  // Check if error is a network error
  isNetworkError: (error: any) => {
    return error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')
  },
  
  // Check if error is an authentication error
  isAuthError: (error: any) => {
    return error?.status === 401 || error?.status === 403
  },
  
  // Check if error is a validation error
  isValidationError: (error: any) => {
    return error?.status === 400 || error?.status === 422
  },
  
  // Check if error is a server error
  isServerError: (error: any) => {
    return error?.status >= 500
  },
  
  // Get user-friendly error message
  getErrorMessage: (error: any): string => {
    if (queryErrorUtils.isNetworkError(error)) {
      return 'Network error. Please check your internet connection.'
    }
    
    if (queryErrorUtils.isAuthError(error)) {
      return 'Authentication required. Please log in again.'
    }
    
    if (queryErrorUtils.isValidationError(error)) {
      return error?.message || 'Invalid data provided.'
    }
    
    if (queryErrorUtils.isServerError(error)) {
      return 'Server error. Please try again later.'
    }
    
    return error?.message || 'An unexpected error occurred.'
  },
}

// Performance monitoring
export const queryPerformance = {
  // Log slow queries
  logSlowQueries: (threshold = 2000) => {
    queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && event.query.state.fetchStatus === 'idle') {
        const duration = Date.now() - (event.query.state.dataUpdatedAt || 0)
        if (duration > threshold) {
          console.warn(`Slow query detected: ${JSON.stringify(event.query.queryKey)} took ${duration}ms`)
        }
      }
    })
  },
  
  // Get cache statistics
  getCacheStats: () => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: JSON.stringify(queries).length,
    }
  },
}

// Development helpers
if (process.env.NODE_ENV === 'development') {
  // Log cache stats every 30 seconds
  setInterval(() => {
    const stats = queryPerformance.getCacheStats()
    console.log('React Query Cache Stats:', stats)
  }, 30000)
  
  // Enable slow query logging
  queryPerformance.logSlowQueries()
} 