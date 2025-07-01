import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  try {
    // Clean up test data
    await cleanupTestData();
    
    // Clean up test artifacts (if needed)
    await cleanupTestArtifacts();
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

async function cleanupTestData(): Promise<void> {
  console.log('🗑️  Cleaning up test data...');
  
  const apiURL = process.env.API_BASE_URL || 'http://localhost:3000';
  
  try {
    // Note: In a real application, you might want to clean up test data
    // However, for this implementation, we'll keep test users for consistency
    // You could implement cleanup logic here if needed
    
    console.log('ℹ️  Test data cleanup skipped (keeping test users for consistency)');
  } catch (error) {
    console.warn('⚠️  Error during test data cleanup:', error);
  }
}

async function cleanupTestArtifacts(): Promise<void> {
  console.log('🗂️  Cleaning up test artifacts...');
  
  try {
    // Cleanup temporary files, screenshots, videos (if needed)
    // Playwright handles most of this automatically based on configuration
    
    console.log('ℹ️  Test artifacts cleanup handled by Playwright configuration');
  } catch (error) {
    console.warn('⚠️  Error during test artifacts cleanup:', error);
  }
}

export default globalTeardown; 