import { test as base, expect } from '@playwright/test';
import { login, logout, TEST_USERS, generateRandomString } from '../utils/test-helpers';

export interface TestFixtures {
  // Authentication fixtures
  authenticatedProfessor: void;
  authenticatedStudent: void;
  authenticatedAdmin: void;
  
  // Test data fixtures
  testTranscription: {
    title: string;
    content: string;
    id?: string;
  };
  testQuiz: {
    title: string;
    description: string;
    id?: string;
  };
  testRoom: {
    name: string;
    description: string;
    code?: string;
    id?: string;
  };
}

export const test = base.extend<TestFixtures>({
  // Authenticated Professor fixture
  authenticatedProfessor: async ({ page }, use) => {
    await login(page, 'professor');
    await use();
    // Cleanup is handled by page cleanup
  },

  // Authenticated Student fixture
  authenticatedStudent: async ({ page }, use) => {
    await login(page, 'student');
    await use();
    // Cleanup is handled by page cleanup
  },

  // Authenticated Admin fixture
  authenticatedAdmin: async ({ page }, use) => {
    await login(page, 'admin');
    await use();
    // Cleanup is handled by page cleanup
  },

  // Test Transcription fixture
  testTranscription: async ({ page, authenticatedProfessor }, use) => {
    const transcriptionData = {
      title: `Test Transcription ${generateRandomString(6)}`,
      content: `This is a test transcription content created for testing purposes. 
      It contains sample text that can be used to generate quiz questions.
      The content should be long enough to create meaningful questions.
      
      Key topics covered:
      1. Introduction to the subject
      2. Main concepts and definitions
      3. Practical examples
      4. Summary and conclusions
      
      This transcription will be used to test the quiz generation functionality.`
    };

    // Create the transcription via the UI
    await page.goto('/transcriptions');
    await page.fill('[name="title"]', transcriptionData.title);
    await page.fill('[name="content"]', transcriptionData.content);
    await page.click('button[type="submit"]');
    
    // Wait for creation and extract ID if possible
    await page.waitForURL(/\/transcriptions/, { timeout: 15000 });
    
    await use(transcriptionData);
    
    // Cleanup: Delete the transcription if needed
    // Note: This depends on your UI implementation
  },

  // Test Quiz fixture
  testQuiz: async ({ page, testTranscription }, use) => {
    const quizData = {
      title: `Test Quiz ${generateRandomString(6)}`,
      description: 'This is a test quiz created for automated testing purposes.'
    };

    // Create the quiz via the UI
    await page.goto('/quizzes/create');
    await page.fill('[name="title"]', quizData.title);
    await page.fill('[name="description"]', quizData.description);
    // Select the test transcription if available
    await page.click('button[type="submit"]');
    
    // Wait for creation
    await page.waitForURL(/\/quizzes/, { timeout: 15000 });
    
    await use(quizData);
    
    // Cleanup: Delete the quiz if needed
  },

  // Test Room fixture
  testRoom: async ({ page, testQuiz }, use) => {
    const roomData: {
      name: string;
      description: string;
      code?: string;
      id?: string;
    } = {
      name: `Test Room ${generateRandomString(6)}`,
      description: 'This is a test room created for automated testing purposes.'
    };

    // Create the room via the UI
    await page.goto('/rooms/create');
    await page.fill('[name="name"]', roomData.name);
    await page.fill('[name="description"]', roomData.description);
    // Configure room settings as needed
    await page.click('button[type="submit"]');
    
    // Wait for creation and extract room code
    await page.waitForURL(/\/rooms/, { timeout: 15000 });
    
    // Try to extract room code from the success page or URL
    try {
      const roomCodeElement = page.locator('[data-testid="room-code"], .room-code');
      if (await roomCodeElement.isVisible()) {
        roomData.code = await roomCodeElement.textContent() || undefined;
      }
    } catch (error) {
      console.warn('Could not extract room code:', error);
    }
    
    await use(roomData);
    
    // Cleanup: Delete the room if needed
  }
});

export { expect } from '@playwright/test'; 