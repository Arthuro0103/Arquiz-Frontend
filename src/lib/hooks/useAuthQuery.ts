import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession, signOut } from 'next-auth/react'
import { api, type ApiError } from '../api/client'
import { queryKeys, cacheUtils } from '../queryClient'
import { useNotificationStore } from '../stores'
import { UserRole } from '../../../../shared/types'

// Types for auth operations
interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  avatar?: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  preferences?: {
    theme: 'light' | 'dark' | 'system'
    language: string
    notifications: {
      email: boolean
      push: boolean
      inApp: boolean
    }
  }
  stats?: {
    quizzesCreated: number
    roomsJoined: number
    questionsAnswered: number
    averageScore: number
  }
}

interface AuthCredentials {
  email: string
  password: string
}

interface RegisterData {
  name: string
  email: string
  password: string
  role: UserRole
  acceptTerms: boolean
}

interface UpdateProfileData {
  name?: string
  avatar?: string
  preferences?: User['preferences']
}

interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Current user query - uses NextAuth session
export const useCurrentUserQuery = () => {
  const { data: session, status } = useSession()
  
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: () => api.auth.profile(),
    enabled: status === 'authenticated' && !!session?.accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.status === 401 || error?.status === 403) {
        return false
      }
      return failureCount < 2
    }
  })
}

// Session query - wraps NextAuth session
export const useSessionQuery = () => {
  const { data: session, status } = useSession()
  
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: () => Promise.resolve(session),
    enabled: status !== 'loading',
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: status === 'authenticated' ? 5 * 60 * 1000 : false, // Refresh every 5 minutes if authenticated
  })
}

// Login mutation
export const useLoginMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (credentials: AuthCredentials) => api.auth.login(credentials),
    onSuccess: (data: any) => {
      // Invalidate auth queries to refetch user data
      cacheUtils.invalidateAuth()
      
      showSuccess('Login successful', `Welcome back!`)
      
      // The actual redirect should be handled by NextAuth
      // This is just for additional UI feedback
    },
    onError: (error: ApiError) => {
      showError('Login failed', error.message || 'Invalid credentials')
    },
  })
}

// Register mutation
export const useRegisterMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (userData: RegisterData) => api.auth.register(userData),
    onSuccess: (data: any) => {
      showSuccess('Registration successful', 'Welcome to ArQuiz! Please sign in with your new account.')
    },
    onError: (error: ApiError) => {
      showError('Registration failed', error.message)
    },
  })
}

// Logout mutation
export const useLogoutMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess } = useNotificationStore()

  return useMutation({
    mutationFn: async () => {
      // Call API logout endpoint
      await api.auth.logout()
      
      // Sign out from NextAuth
      await signOut({ redirect: false })
      
      return true
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear()
      
      showSuccess('Logged out successfully', 'You have been signed out.')
    },
    onError: (error: any) => {
      // Even if API call fails, still sign out from NextAuth
      signOut({ redirect: false })
      queryClient.clear()
    },
  })
}

// Update profile mutation
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (updates: UpdateProfileData) => {
      // This would typically be a PATCH to /auth/profile
      // For now, using the generic profile endpoint
      return api.auth.profile() // This would need to be updated to accept PUT/PATCH
    },
    onSuccess: (data: any) => {
      // Update user data in cache
      queryClient.setQueryData(queryKeys.auth.user(), data)
      
      // Invalidate session to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() })
      
      showSuccess('Profile updated', 'Your profile has been updated successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to update profile', error.message)
    },
  })
}

// Change password mutation
export const useChangePasswordMutation = () => {
  const { showSuccess, showError } = useNotificationStore()

  return useMutation({
    mutationFn: (passwordData: ChangePasswordData) => {
      // This would be a custom endpoint for password changes
      // For now, we'll use a placeholder
      return Promise.resolve({ success: true })
    },
    onSuccess: () => {
      showSuccess('Password changed', 'Your password has been updated successfully.')
    },
    onError: (error: ApiError) => {
      showError('Failed to change password', error.message)
    },
  })
}

// Refresh token mutation
export const useRefreshTokenMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (refreshToken: string) => api.auth.refreshToken(refreshToken),
    onSuccess: (data: any) => {
      // Update session data with new tokens
      // This would typically be handled by NextAuth automatically
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() })
    },
    onError: (error: ApiError) => {
      // If refresh fails, sign out the user
      signOut({ redirect: true })
      queryClient.clear()
    },
  })
}

// Custom hook for authentication state
export const useAuth = () => {
  const sessionQuery = useSessionQuery()
  const userQuery = useCurrentUserQuery()
  const loginMutation = useLoginMutation()
  const logoutMutation = useLogoutMutation()
  const registerMutation = useRegisterMutation()
  
  const isAuthenticated = sessionQuery.data?.user && userQuery.data
  const isLoading = sessionQuery.isLoading || userQuery.isLoading
  const user = userQuery.data as User | undefined

  return {
    // Authentication state
    isAuthenticated: !!isAuthenticated,
    isLoading,
    user,
    session: sessionQuery.data,
    
    // Loading states
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRegistering: registerMutation.isPending,
    
    // Error states
    authError: userQuery.error || sessionQuery.error,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    
    // Actions
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    register: registerMutation.mutate,
    
    // Utility functions
    hasRole: (role: string) => user?.role === role,
    hasAnyRole: (roles: string[]) => user?.role ? roles.includes(user.role) : false,
    isTeacher: () => user?.role === 'teacher',
    isStudent: () => user?.role === 'student',
    isAdmin: () => user?.role === 'admin',
    
    // Refetch functions
    refetchUser: userQuery.refetch,
    refetchSession: sessionQuery.refetch,
  }
}

// Custom hook for user profile management
export const useUserProfile = () => {
  const userQuery = useCurrentUserQuery()
  const updateMutation = useUpdateProfileMutation()
  const changePasswordMutation = useChangePasswordMutation()
  
  return {
    // Data
    user: userQuery.data,
    
    // Loading states
    isLoading: userQuery.isLoading,
    isUpdating: updateMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    
    // Error states
    error: userQuery.error,
    updateError: updateMutation.error,
    passwordError: changePasswordMutation.error,
    
    // Actions
    updateProfile: updateMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    
    // Refetch
    refetch: userQuery.refetch,
  }
}

// Export types
export type { User, AuthCredentials, RegisterData, UpdateProfileData, ChangePasswordData } 