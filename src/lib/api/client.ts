// API Client for ArQuiz application
import { getSession } from 'next-auth/react'
import type {
  // Auth types
  LoginCredentials,
  RegisterCredentials,
  UserProfile,
  JwtPayload,
  
  // Room types
  Room,
  CreateRoomDto,
  UpdateRoomDto,
  RoomStatus,
  Participant,
  
  // Quiz types
  Quiz,
  Question,
  CreateQuizDto,
  UpdateQuizDto,
  QuizResult,
  QuizSearchFilters,
  QuizResponse,
  QuizzesResponse,
  QuestionResponse,
  QuestionsResponse,
  
  // Response types
  ApiError as QuizError
} from '../../../../shared/types'

// API base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:7777'

// Enhanced API response types using shared types
export interface ApiResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly message?: string;
  readonly error?: QuizError;
  readonly timestamp: string;
  readonly requestId?: string;
}

export interface ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, any>;
  readonly requestId?: string;
  readonly timestamp: string;
}

// Request configuration
interface RequestConfig extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
  retries?: number;
}

// Enhanced API client class with shared types
export class ApiClient {
  private baseUrl: string
  private defaultTimeout: number

  constructor(baseUrl: string = API_BASE_URL, timeout: number = 10000) {
    this.baseUrl = baseUrl
    this.defaultTimeout = timeout
  }

  // Get authentication headers
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const session = await getSession()
      
      if (session?.accessToken) {
        return {
          'Authorization': `Bearer ${session.accessToken}`,
        }
      }
      
      return {}
    } catch (error) {
      console.warn('Failed to get session for auth headers:', error)
      return {}
    }
  }

  // Build request headers
  private async buildHeaders(config?: RequestConfig): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Version': '1.0.0',
      'X-Request-ID': this.generateRequestId(),
    }

    // Add authentication headers unless explicitly skipped
    if (!config?.skipAuth) {
      const authHeaders = await this.getAuthHeaders()
      Object.assign(headers, authHeaders)
    }

    // Merge with provided headers
    if (config?.headers) {
      Object.assign(headers, config.headers)
    }

    return headers
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Handle API errors with enhanced error information
  private async handleError(response: Response, requestId?: string): Promise<never> {
    let errorData: any = {}
    
    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        errorData = await response.json()
      } else {
        errorData = { message: await response.text() }
      }
    } catch {
      errorData = { message: 'Failed to parse error response' }
    }

    const apiError: ApiError = Object.assign(new Error(), {
      name: 'ApiError',
      message: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      status: response.status,
      code: errorData.code,
      details: errorData.details,
      requestId: requestId || this.generateRequestId(),
      timestamp: new Date().toISOString(),
    })

    throw apiError
  }

  // Make HTTP request with timeout and error handling
  private async makeRequest<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { timeout = this.defaultTimeout, retries = 0, ...requestConfig } = config
    const url = `${this.baseUrl}${endpoint}`

    // Build headers
    const headers = await this.buildHeaders(config)
    const requestId = (headers as Record<string, string>)['X-Request-ID']

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...requestConfig,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleError(response, requestId)
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const apiResponse: ApiResponse<T> = await response.json()
        
        // Handle both wrapped and unwrapped responses
        if ('data' in apiResponse && apiResponse.success !== undefined) {
          return apiResponse.data as T
        }
        
        return apiResponse as T
      }

      return response.text() as unknown as T
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw Object.assign(new Error(), {
          name: 'TimeoutError',
          message: `Request timeout after ${timeout}ms`,
          status: 408,
          requestId,
          timestamp: new Date().toISOString(),
        } as ApiError)
      }

      // Retry logic for network errors
      if (retries > 0 && this.shouldRetry(error)) {
        await this.delay(1000 * (3 - retries)) // Exponential backoff
        return this.makeRequest(endpoint, { ...config, retries: retries - 1 })
      }

      throw error
    }
  }

  // Determine if request should be retried
  private shouldRetry(error: any): boolean {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true // Network error
    }
    
    if (error.status >= 500) {
      return true // Server error
    }
    
    return false
  }

  // Delay utility for retries
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // HTTP methods with enhanced type safety
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'DELETE' })
  }

  // Upload file with type safety
  async upload<T>(endpoint: string, formData: FormData, config?: RequestConfig): Promise<T> {
    const headers = await this.getAuthHeaders()
    
    // Don't set Content-Type for FormData - let browser set it with boundary
    delete (headers as any)['Content-Type']

    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
      headers,
    })
  }
}

// Create default API client instance
export const apiClient = new ApiClient()

// Type-safe convenience functions for common operations
export const api = {
  // Auth endpoints with shared types
  auth: {
    login: (credentials: LoginCredentials): Promise<{ user: UserProfile; accessToken: string; refreshToken: string }> =>
      apiClient.post('/auth/login', credentials, { skipAuth: true }),
    
    register: (userData: RegisterCredentials): Promise<{ user: UserProfile; accessToken: string; refreshToken: string }> =>
      apiClient.post('/auth/register', userData, { skipAuth: true }),
    
    logout: (): Promise<{ success: boolean }> => 
      apiClient.post('/auth/logout'),
    
    refreshToken: (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> =>
      apiClient.post('/auth/refresh', { refreshToken }, { skipAuth: true }),
    
    profile: (): Promise<UserProfile> => 
      apiClient.get('/auth/profile'),
    
    updateProfile: (updates: Partial<UserProfile>): Promise<UserProfile> =>
      apiClient.patch('/auth/profile', updates),
  },

  // Room endpoints with shared types
  rooms: {
    list: (filters?: { status?: RoomStatus; search?: string }): Promise<Room[]> => {
      const queryParams = filters ? `?${new URLSearchParams(filters as any).toString()}` : ''
      return apiClient.get(`/rooms${queryParams}`)
    },
    
    create: (roomData: CreateRoomDto): Promise<Room> => 
      apiClient.post('/rooms', roomData),
    
    get: (id: string): Promise<Room> => 
      apiClient.get(`/rooms/${id}`),
    
    update: (id: string, updates: UpdateRoomDto): Promise<Room> => 
      apiClient.patch(`/rooms/${id}`, updates),
    
    delete: (id: string): Promise<{ success: boolean }> => 
      apiClient.delete(`/rooms/${id}`),
    
    join: (code: string, userData: { name: string }): Promise<{ room: Room; participant: Participant }> => 
      apiClient.post(`/rooms/join/${code}`, userData),
    
    leave: (id: string): Promise<{ success: boolean }> => 
      apiClient.post(`/rooms/${id}/leave`),
    
    participants: (id: string): Promise<Participant[]> => 
      apiClient.get(`/rooms/${id}/participants`),
    
    kickParticipant: (roomId: string, participantId: string, reason?: string): Promise<{ success: boolean }> =>
      apiClient.post(`/rooms/${roomId}/kick/${participantId}`, { reason }),
  },

  // Quiz endpoints with shared types
  quizzes: {
    list: (filters?: QuizSearchFilters): Promise<Quiz[]> => {
      const queryParams = filters ? `?${new URLSearchParams(filters as any).toString()}` : ''
      return apiClient.get(`/quizzes${queryParams}`)
    },
    
    create: (quizData: CreateQuizDto): Promise<QuizResponse> => 
      apiClient.post('/quizzes', quizData),
    
    get: (id: string): Promise<Quiz> => 
      apiClient.get(`/quizzes/${id}`),
    
    update: (id: string, updates: UpdateQuizDto): Promise<QuizResponse> => 
      apiClient.patch(`/quizzes/${id}`, updates),
    
    delete: (id: string): Promise<{ success: boolean }> => 
      apiClient.delete(`/quizzes/${id}`),
    
    questions: (id: string): Promise<Question[]> => 
      apiClient.get(`/quizzes/${id}/questions`),
    
    addQuestion: (quizId: string, questionData: any): Promise<Question> =>
      apiClient.post(`/quizzes/${quizId}/questions`, questionData),
    
    removeQuestion: (quizId: string, questionId: string): Promise<{ success: boolean }> =>
      apiClient.delete(`/quizzes/${quizId}/questions/${questionId}`),
    
    results: (id: string): Promise<QuizResult[]> =>
      apiClient.get(`/quizzes/${id}/results`),
  },

  // Question endpoints with shared types
  questions: {
    list: (filters?: { type?: string; difficulty?: string; search?: string }): Promise<Question[]> => {
      const queryParams = filters ? `?${new URLSearchParams(filters as any).toString()}` : ''
      return apiClient.get(`/questions${queryParams}`)
    },
    
    create: (questionData: any): Promise<QuestionResponse> => 
      apiClient.post('/questions', questionData),
    
    get: (id: string): Promise<Question> => 
      apiClient.get(`/questions/${id}`),
    
    update: (id: string, updates: any): Promise<QuestionResponse> => 
      apiClient.patch(`/questions/${id}`, updates),
    
    delete: (id: string): Promise<{ success: boolean }> => 
      apiClient.delete(`/questions/${id}`),
    
    generate: (prompt: any): Promise<Question[]> => 
      apiClient.post('/questions/generate', prompt),
  },

  // Participation endpoints with shared types
  participation: {
    join: (roomId: string, userData: { name: string }): Promise<{ sessionId: string; room: Room }> => 
      apiClient.post(`/participation/join/${roomId}`, userData),
    
    submitAnswer: (sessionId: string, answerData: any): Promise<{ correct: boolean; score: number }> =>
      apiClient.post(`/participation/${sessionId}/answer`, answerData),
    
    getResults: (sessionId: string): Promise<QuizResult> => 
      apiClient.get(`/participation/${sessionId}/results`),
    
    getSession: (sessionId: string): Promise<{ session: any; room: Room }> => 
      apiClient.get(`/participation/${sessionId}`),
  },

  // Reports endpoints
  reports: {
    performance: (filters?: any): Promise<any> => 
      apiClient.get('/reports/performance', { body: filters }),
    
    analytics: (filters?: any): Promise<any> => 
      apiClient.get('/reports/analytics', { body: filters }),
    
    export: (type: string, filters?: any): Promise<Blob> => 
      apiClient.post(`/reports/export/${type}`, filters),
  },

  // Transcriptions endpoints
  transcriptions: {
    list: (filters?: any): Promise<any[]> => 
      apiClient.get('/transcriptions', { body: filters }),
    
    create: (transcriptionData: any): Promise<any> => 
      apiClient.post('/transcriptions', transcriptionData),
    
    get: (id: string): Promise<any> => 
      apiClient.get(`/transcriptions/${id}`),
    
    update: (id: string, updates: any): Promise<any> => 
      apiClient.patch(`/transcriptions/${id}`, updates),
    
    delete: (id: string): Promise<{ success: boolean }> => 
      apiClient.delete(`/transcriptions/${id}`),
    
    search: (query: string, filters?: any): Promise<any[]> =>
      apiClient.get(`/transcriptions/search?q=${encodeURIComponent(query)}`, { body: filters }),
  },
}

// Export types for use in components
export type { RequestConfig } 