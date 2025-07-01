import { test as base, expect } from '@playwright/test';
import {
  AuthenticationHelper,
  NavigationHelper,
  FormHelper,
  AssertionHelper,
  WebSocketHelper,
  MobileHelper,
  AccessibilityHelper,
  PerformanceHelper,
  EnhancedLocators,
  ENHANCED_TEST_USERS,
  generateRandomString,
  generateTestEmail,
  waitForCondition,
  retryOperation
} from '../utils/enhanced-test-helpers';

export interface EnhancedTestFixtures {
  // Authentication fixtures
  authenticatedProfessor: void;
  authenticatedStudent: void;
  authenticatedAdmin: void;
  
  // Test data fixtures with cleanup
  testQuiz: {
    id: string;
    title: string;
    description: string;
    cleanup: () => Promise<void>;
  };
  testRoom: {
    id: string;
    name: string;
    code: string;
    description: string;
    cleanup: () => Promise<void>;
  };
  testTranscription: {
    id: string;
    title: string;
    content: string;
    cleanup: () => Promise<void>;
  };
  
  // Enhanced helper fixtures
  helpers: {
    auth: typeof AuthenticationHelper;
    nav: typeof NavigationHelper;
    form: typeof FormHelper;
    assert: typeof AssertionHelper;
    websocket: typeof WebSocketHelper;
    mobile: typeof MobileHelper;
    a11y: typeof AccessibilityHelper;
    perf: typeof PerformanceHelper;
    locators: typeof EnhancedLocators;
  };
  
  // Browser context with enhanced monitoring
  enhancedContext: {
    wsActivity: {
      connections: any[];
      messages: { sent: any[]; received: any[] };
    };
    consoleErrors: string[];
    performance: {
      navigationTiming: any;
      resourceTiming: any[];
    };
  };
  
  // Mobile testing fixture
  mobileViewport: void;
  
  // Performance monitoring fixture
  performanceMonitoring: {
    startMonitoring: () => void;
    getMetrics: () => Promise<any>;
    stop: () => void;
  };
}

export const test = base.extend<EnhancedTestFixtures>({
  // Enhanced authentication fixtures with better error handling
  authenticatedProfessor: async ({ page }, use) => {
    await retryOperation(
      () => AuthenticationHelper.loginAs(page, 'professor'),
      3,
      2000
    );
    await use();
    // Cleanup is handled by global teardown
  },

  authenticatedStudent: async ({ page }, use) => {
    await retryOperation(
      () => AuthenticationHelper.loginAs(page, 'student'),
      3,
      2000
    );
    await use();
  },

  authenticatedAdmin: async ({ page }, use) => {
    await retryOperation(
      () => AuthenticationHelper.loginAs(page, 'admin'),
      3,
      2000
    );
    await use();
  },

  // Enhanced test quiz fixture with robust creation and cleanup
  testQuiz: async ({ page, authenticatedProfessor }, use) => {
    const quizData = {
      id: '',
      title: `E2E Test Quiz ${generateRandomString(8)}`,
      description: `Automated test quiz created at ${new Date().toISOString()}`,
      cleanup: async () => {}
    };

    try {
      // Navigate to quiz creation
      await NavigationHelper.goToSection(page, 'quizzes');
      
      // Create quiz via enhanced form helper
      await FormHelper.fillAndSubmit(page, {
        title: quizData.title,
        description: quizData.description
      }, 'quiz-creation');

      // Wait for successful creation
      await AssertionHelper.expectSuccessMessage(page);
      
      // Extract quiz ID from URL or response
      await waitForCondition(async () => {
        const url = page.url();
        return url.includes('/quiz') && url.split('/').length > 3;
      });
      
      const urlParts = page.url().split('/');
      quizData.id = urlParts[urlParts.length - 1];

      // Setup cleanup function
      quizData.cleanup = async () => {
        try {
          await page.goto(`/quizzes/${quizData.id}/delete`);
          await EnhancedLocators.button(page, 'Confirm Delete').click();
          await AssertionHelper.expectSuccessMessage(page);
        } catch (error) {
          console.warn(`Failed to cleanup quiz ${quizData.id}:`, error);
        }
      };

      await use(quizData);
    } catch (error) {
      console.error('Failed to create test quiz:', error);
      throw error;
    } finally {
      await quizData.cleanup();
    }
  },

  // Enhanced test room fixture with WebSocket monitoring
  testRoom: async ({ page, testQuiz }, use) => {
    const roomData = {
      id: '',
      name: `E2E Test Room ${generateRandomString(8)}`,
      code: '',
      description: `Automated test room created at ${new Date().toISOString()}`,
      cleanup: async () => {}
    };

    try {
      // Start WebSocket monitoring
      const wsActivity = await WebSocketHelper.monitorWebSocketActivity(page);
      
      // Navigate to room creation
      await NavigationHelper.goToSection(page, 'rooms');
      
      // Create room with enhanced form handling
      await FormHelper.fillAndSubmit(page, {
        name: roomData.name,
        description: roomData.description,
        quiz: testQuiz.id
      }, 'room-creation');

      // Wait for successful creation and extract room code
      await AssertionHelper.expectSuccessMessage(page);
      
      // Extract room code using enhanced locators
      const roomCodeElement = EnhancedLocators.section(page, 'room-code')
        .or(page.locator('[data-testid="room-code"]'))
        .or(page.locator('.room-code'))
        .or(page.locator(':has-text("Room Code:")'));
      
      await expect(roomCodeElement).toBeVisible({ timeout: 10000 });
      const roomCodeText = await roomCodeElement.textContent();
      roomData.code = roomCodeText?.match(/[A-Z0-9]{6,}/)?.[0] || '';
      
      // Extract room ID from URL
      const urlParts = page.url().split('/');
      roomData.id = urlParts[urlParts.length - 1];

      // Setup cleanup function
      roomData.cleanup = async () => {
        try {
          await page.goto(`/rooms/${roomData.id}/delete`);
          await EnhancedLocators.button(page, 'Confirm Delete').click();
          await AssertionHelper.expectSuccessMessage(page);
        } catch (error) {
          console.warn(`Failed to cleanup room ${roomData.id}:`, error);
        }
      };

      await use(roomData);
    } catch (error) {
      console.error('Failed to create test room:', error);
      throw error;
    } finally {
      await roomData.cleanup();
    }
  },

  // Enhanced test transcription fixture
  testTranscription: async ({ page, authenticatedProfessor }, use) => {
    const transcriptionData = {
      id: '',
      title: `E2E Test Transcription ${generateRandomString(8)}`,
      content: `
        This is a comprehensive test transcription created for automated testing.
        
        Introduction to Machine Learning:
        Machine Learning is a subset of artificial intelligence that focuses on algorithms.
        
        Key Concepts:
        1. Supervised Learning - Learning with labeled data
        2. Unsupervised Learning - Finding patterns in unlabeled data
        3. Reinforcement Learning - Learning through interaction and feedback
        
        Applications:
        - Image recognition and computer vision
        - Natural language processing
        - Recommendation systems
        - Autonomous vehicles
        
        Conclusion:
        Machine learning continues to evolve and transform various industries.
      `.trim(),
      cleanup: async () => {}
    };

    try {
      // Navigate to transcription creation
      await NavigationHelper.goToSection(page, 'transcriptions');
      
      // Create transcription
      await FormHelper.fillAndSubmit(page, {
        title: transcriptionData.title,
        content: transcriptionData.content
      }, 'transcription-creation');

      // Wait for successful creation
      await AssertionHelper.expectSuccessMessage(page);
      
      // Extract transcription ID
      const urlParts = page.url().split('/');
      transcriptionData.id = urlParts[urlParts.length - 1];

      // Setup cleanup function
      transcriptionData.cleanup = async () => {
        try {
          await page.goto(`/transcriptions/${transcriptionData.id}/delete`);
          await EnhancedLocators.button(page, 'Confirm Delete').click();
          await AssertionHelper.expectSuccessMessage(page);
        } catch (error) {
          console.warn(`Failed to cleanup transcription ${transcriptionData.id}:`, error);
        }
      };

      await use(transcriptionData);
    } catch (error) {
      console.error('Failed to create test transcription:', error);
      throw error;
    } finally {
      await transcriptionData.cleanup();
    }
  },

  // Helper classes fixture for easy access
  helpers: async ({}, use) => {
    await use({
      auth: AuthenticationHelper,
      nav: NavigationHelper,
      form: FormHelper,
      assert: AssertionHelper,
      websocket: WebSocketHelper,
      mobile: MobileHelper,
      a11y: AccessibilityHelper,
      perf: PerformanceHelper,
      locators: EnhancedLocators
    });
  },

  // Enhanced context with monitoring capabilities
  enhancedContext: async ({ page }, use) => {
    const context = {
      wsActivity: { connections: [] as any[], messages: { sent: [] as any[], received: [] as any[] } },
      consoleErrors: [] as string[],
      performance: { navigationTiming: null as any, resourceTiming: [] as any[] }
    };

    // Setup WebSocket monitoring
    context.wsActivity = await WebSocketHelper.monitorWebSocketActivity(page);

    // Setup console error monitoring
    context.consoleErrors = await PerformanceHelper.checkForConsoleErrors(page);

    // Setup performance monitoring
    page.on('load', async () => {
      try {
        context.performance.navigationTiming = await page.evaluate(() => 
          JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]))
        );
        context.performance.resourceTiming = await page.evaluate(() =>
          JSON.parse(JSON.stringify(performance.getEntriesByType('resource')))
        );
      } catch (error) {
        console.warn('Failed to collect performance metrics:', error);
      }
    });

    await use(context);
  },

  // Mobile viewport fixture
  mobileViewport: async ({ page }, use) => {
    await MobileHelper.setMobileViewport(page, 'mobile');
    await use();
    // Reset viewport in cleanup if needed
    await page.setViewportSize({ width: 1280, height: 720 });
  },

  // Performance monitoring fixture
  performanceMonitoring: async ({ page }, use) => {
    let isMonitoring = false;
    const metrics: any[] = [];

    const monitoring = {
      startMonitoring: () => {
        if (isMonitoring) return;
        isMonitoring = true;
        
        // Monitor page load performance
        page.on('load', async () => {
          if (!isMonitoring) return;
          try {
            const timing = await PerformanceHelper.measurePageLoad(page, page.url());
            metrics.push({
              timestamp: new Date(),
              type: 'page-load',
              url: page.url(),
              ...timing
            });
          } catch (error) {
            console.warn('Failed to measure page load:', error);
          }
        });
      },
      
      getMetrics: async () => {
        return [...metrics];
      },
      
      stop: () => {
        isMonitoring = false;
      }
    };

    await use(monitoring);
    monitoring.stop();
  }
});

// Re-export enhanced expect for convenience
export { expect } from '@playwright/test';

// Export additional test utilities
export const TestUtils = {
  /**
   * Create a test user with random credentials
   */
  createTestUser: (role: 'student' | 'professor' | 'admin' = 'student') => ({
    name: `Test ${role} ${generateRandomString(6)}`,
    email: generateTestEmail(),
    password: 'TestPassword123!',
    role
  }),

  /**
   * Generate test data for various entities
   */
  generateTestData: {
    quiz: () => ({
      title: `Test Quiz ${generateRandomString(8)}`,
      description: `Quiz created for testing at ${new Date().toISOString()}`,
      questions: [
        {
          text: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correct: 1
        },
        {
          text: 'Which programming language is primarily used for web development?',
          options: ['Python', 'JavaScript', 'C++', 'Java'],
          correct: 1
        }
      ]
    }),
    
    room: () => ({
      name: `Test Room ${generateRandomString(8)}`,
      description: `Room created for testing at ${new Date().toISOString()}`,
      maxParticipants: 10,
      isPublic: true
    }),
    
    transcription: () => ({
      title: `Test Transcription ${generateRandomString(8)}`,
      content: `
        Sample educational content for testing.
        
        Topic: Introduction to Testing
        
        Testing is a crucial part of software development that ensures quality and reliability.
        
        Types of Testing:
        1. Unit Testing - Testing individual components
        2. Integration Testing - Testing component interactions
        3. End-to-End Testing - Testing complete user workflows
        
        Best Practices:
        - Write clear, maintainable tests
        - Test edge cases and error conditions
        - Keep tests independent and isolated
        - Use descriptive test names
        
        Conclusion:
        Proper testing leads to more robust and maintainable software.
      `.trim()
    })
  },

  /**
   * Validate test environment
   */
  validateEnvironment: async (page: any) => {
    // Check if required services are running
    try {
      await page.goto('/health-check');
      const healthStatus = await page.locator('[data-testid="health-status"]').textContent();
      if (!healthStatus?.includes('healthy')) {
        throw new Error('Application health check failed');
      }
    } catch (error) {
      console.warn('Health check not available or failed:', error);
    }
  },

  /**
   * Setup test data cleanup
   */
  setupCleanup: () => {
    const cleanupTasks: (() => Promise<void>)[] = [];
    
    return {
      addCleanupTask: (task: () => Promise<void>) => {
        cleanupTasks.push(task);
      },
      
      runCleanup: async () => {
        for (const task of cleanupTasks.reverse()) {
          try {
            await task();
          } catch (error) {
            console.warn('Cleanup task failed:', error);
          }
        }
        cleanupTasks.length = 0;
      }
    };
  }
}; 