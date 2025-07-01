// Store reset utilities for ArQuiz application

// Function to reset all stores - will be populated as we create stores
const storeResetters: Array<() => void> = []

// Register a store reset function
export const registerStoreResetter = (resetFn: () => void) => {
  storeResetters.push(resetFn)
}

// Reset all registered stores
export const resetAllStores = () => {
  console.log('🔄 Resetting all ArQuiz stores...')
  storeResetters.forEach((resetFn, index) => {
    try {
      resetFn()
      console.log(`✅ Store ${index + 1} reset successfully`)
    } catch (error) {
      console.error(`❌ Error resetting store ${index + 1}:`, error)
    }
  })
  console.log(`🏪 Reset ${storeResetters.length} stores`)
}

// Clear localStorage and reset stores
export const resetApplicationState = () => {
  console.log('🧹 Resetting entire application state...')
  
  // Clear ArQuiz localStorage entries
  if (typeof window !== 'undefined') {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('arquiz-'))
    keys.forEach(key => localStorage.removeItem(key))
    console.log(`🗑️ Cleared ${keys.length} localStorage entries`)
  }
  
  // Reset all stores
  resetAllStores()
  
  console.log('✨ Application state reset complete')
}

// Utility to reset specific store types
export const resetStoresByType = (storeNames: string[]) => {
  console.log(`🎯 Resetting specific stores: ${storeNames.join(', ')}`)
  // This would need to be implemented with store-specific reset functions
  // For now, just log the intent
  console.log('Note: Specific store reset not yet implemented')
} 