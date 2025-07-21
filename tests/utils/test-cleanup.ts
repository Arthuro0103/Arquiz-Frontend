/**
 * Test Cleanup Utility
 * Ensures all test files are properly formatted and handle any lint issues
 */

export function sanitizeTestData(data: any): any {
  // Remove any undefined values
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export function formatTestOutput(output: any): string {
  try {
    return JSON.stringify(output, null, 2);
  } catch (error) {
    return String(output);
  }
}

export function validateTestEnvironment(): boolean {
  // Check if required environment variables are set
  const requiredEnvVars = ['BASE_URL', 'API_BASE_URL'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Warning: ${envVar} environment variable not set`);
      return false;
    }
  }
  
  return true;
}

export function createMockData() {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student' as const,
    },
    room: {
      id: 'test-room-id',
      name: 'Test Room',
      accessCode: 'TEST123',
      status: 'WAITING' as const,
    },
    quiz: {
      id: 'test-quiz-id',
      title: 'Test Quiz',
      questions: [],
    },
  };
}

export function cleanupTestArtifacts(): void {
  // Clean up any temporary test files or data
  // This would be called in test teardown
  console.log('Cleaning up test artifacts...');
} 