// API Client for ArQuiz application
import { getSession } from 'next-auth/react'

// API base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:7777'

// API response types
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
  error?: string
}

export interface ApiError {
  status: number
  message: string
  code?: string
  details?: any
}

// Request configuration
interface RequestConfig extends RequestInit {
  timeout?: number
  skipAuth?: boolean
}

// Create API client class
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

  // Handle API errors
  private async handleError(response: Response): Promise<never> {
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

    const apiError: ApiError = {
      status: response.status,
      message: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      code: errorData.code,
      details: errorData.details,
    }

    throw apiError
  }

  // Make HTTP request with timeout and error handling
  private async makeRequest<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { timeout = this.defaultTimeout, ...requestConfig } = config
    const url = `${this.baseUrl}${endpoint}`

    // Build headers
    const headers = await this.buildHeaders(config)

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
        await this.handleError(response)
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        return data.data || data // Handle both wrapped and unwrapped responses
      }

      return response.text() as unknown as T
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`)
      }

      throw error
    }
  }

  // HTTP methods
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

  // Upload file
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

// Convenience functions for common operations
export const api = {
  // Auth endpoints
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post('/auth/login', credentials, { skipAuth: true }),
    register: (userData: { name: string; email: string; password: string; role: string }) =>
      apiClient.post('/auth/register', userData, { skipAuth: true }),
    logout: () => apiClient.post('/auth/logout'),
    refreshToken: (refreshToken: string) =>
      apiClient.post('/auth/refresh', { refreshToken }, { skipAuth: true }),
    profile: () => apiClient.get('/auth/profile'),
  },

  // Room endpoints
  rooms: {
    list: (filters?: any) => apiClient.get('/rooms', { body: filters }),
    create: (roomData: any) => apiClient.post('/rooms', roomData),
    get: (id: string) => apiClient.get(`/rooms/${id}`),
    update: (id: string, updates: any) => apiClient.patch(`/rooms/${id}`, updates),
    delete: (id: string) => apiClient.delete(`/rooms/${id}`),
    join: (code: string, userData: any) => apiClient.post(`/rooms/join/${code}`, userData),
    leave: (id: string) => apiClient.post(`/rooms/${id}/leave`),
    participants: (id: string) => apiClient.get(`/rooms/${id}/participants`),
    kickParticipant: (roomId: string, participantId: string, reason?: string) =>
      apiClient.post(`/rooms/${roomId}/kick/${participantId}`, { reason }),
  },

  // Quiz endpoints
  quizzes: {
    list: (filters?: any) => apiClient.get('/quizzes', { body: filters }),
    create: (quizData: any) => apiClient.post('/quizzes', quizData),
    get: (id: string) => apiClient.get(`/quizzes/${id}`),
    update: (id: string, updates: any) => apiClient.patch(`/quizzes/${id}`, updates),
    delete: (id: string) => apiClient.delete(`/quizzes/${id}`),
    questions: (id: string) => apiClient.get(`/quizzes/${id}/questions`),
    addQuestion: (quizId: string, questionData: any) =>
      apiClient.post(`/quizzes/${quizId}/questions`, questionData),
    removeQuestion: (quizId: string, questionId: string) =>
      apiClient.delete(`/quizzes/${quizId}/questions/${questionId}`),
  },

  // Question endpoints
  questions: {
    list: (filters?: any) => apiClient.get('/questions', { body: filters }),
    create: (questionData: any) => apiClient.post('/questions', questionData),
    get: (id: string) => apiClient.get(`/questions/${id}`),
    update: (id: string, updates: any) => apiClient.patch(`/questions/${id}`, updates),
    delete: (id: string) => apiClient.delete(`/questions/${id}`),
    generate: (prompt: any) => apiClient.post('/questions/generate', prompt),
  },

  // Participation endpoints
  participation: {
    join: (roomId: string, userData: any) => apiClient.post(`/participation/join/${roomId}`, userData),
    submitAnswer: (sessionId: string, answerData: any) =>
      apiClient.post(`/participation/${sessionId}/answer`, answerData),
    getResults: (sessionId: string) => apiClient.get(`/participation/${sessionId}/results`),
    getSession: (sessionId: string) => apiClient.get(`/participation/${sessionId}`),
  },

  // Reports endpoints
  reports: {
    performance: (filters?: any) => apiClient.get('/reports/performance', { body: filters }),
    analytics: (filters?: any) => apiClient.get('/reports/analytics', { body: filters }),
    export: (type: string, filters?: any) => apiClient.post(`/reports/export/${type}`, filters),
  },

  // Transcriptions endpoints
  transcriptions: {
    list: (filters?: any) => apiClient.get('/transcriptions', { body: filters }),
    create: (transcriptionData: any) => apiClient.post('/transcriptions', transcriptionData),
    get: (id: string) => apiClient.get(`/transcriptions/${id}`),
    update: (id: string, updates: any) => apiClient.patch(`/transcriptions/${id}`, updates),
    delete: (id: string) => apiClient.delete(`/transcriptions/${id}`),
    search: (query: string, filters?: any) =>
      apiClient.get(`/transcriptions/search?q=${encodeURIComponent(query)}`, { body: filters }),
  },
}

// Types are already exported above 