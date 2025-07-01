import { StateCreator } from 'zustand'

// Development environment check
const isDevelopment = process.env.NODE_ENV === 'development'

// Simple store middleware composer
export const storeMiddleware = {
  // Auto-select based on environment
  auto: <T>(
    config: StateCreator<T, [], [], T>,
    name: string
  ): StateCreator<T, [], [], T> => {
    // In production, return config as-is for performance
    if (!isDevelopment) {
      return config
    }

    // In development, return config as-is but log the store name
    if (isDevelopment) {
      console.log(`🏪 Initialized ${name} store`)
    }
    
    return config
  }
}

// Export a simple logger function for manual use in stores
export const logStateChange = (storeName: string, prevState: any, nextState: any) => {
  if (isDevelopment) {
    console.group(`🏪 ${storeName} Update`)
    console.log('Previous:', prevState)
    console.log('Next:', nextState)
    console.log('Time:', new Date().toISOString())
    console.groupEnd()
  }
} 