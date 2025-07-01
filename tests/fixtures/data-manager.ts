import { Page, APIRequestContext } from '@playwright/test';
import { 
  generateTestData, 
  TEST_DATA_CLEANUP, 
  SAMPLE_TRANSCRIPTIONS,
  SAMPLE_QUIZ_CONFIGS,
  SAMPLE_ROOM_CONFIGS,
  TEST_USER_PROFILES 
} from './test-data';
import { generateRandomString } from '../utils/test-helpers';

export interface TestDataManager {
  // User management
  createTestUser(profile?: Partial<typeof TEST_USER_PROFILES.active_professor>): Promise<any>;
  cleanupTestUsers(): Promise<void>;
  
  // Content management
  createTestTranscription(data?: any): Promise<string>;
  createTestQuiz(data?: any): Promise<string>;
  createTestRoom(data?: any): Promise<string>;
  
  // Cleanup operations
  cleanupTestData(): Promise<void>;
  cleanupBySession(sessionId: string): Promise<void>;
}

/**
 * UI-based test data manager that creates data through the user interface
 */
export class UITestDataManager implements TestDataManager {
  private page: Page;
  private sessionId: string;
  private createdItems: {
    users: string[];
    transcriptions: string[];
    quizzes: string[];
    rooms: string[];
  };

  constructor(page: Page) {
    this.page = page;
    this.sessionId = `session_${Date.now()}_${generateRandomString(4)}`;
    this.createdItems = {
      users: [],
      transcriptions: [],
      quizzes: [],
      rooms: []
    };
  }

  async createTestUser(profile: any = {}): Promise<any> {
    const userData = {
      ...TEST_USER_PROFILES.new_student,
      ...profile,
      email: `test.${generateRandomString(8)}@example.com`
    };

    // Navigate to registration page
    await this.page.goto('/register');
    
    // Fill registration form
    await this.page.fill('[name="fullName"]', userData.fullName);
    await this.page.fill('[name="email"]', userData.email);
    await this.page.fill('[name="password"]', userData.password);
    
    // Select role if available
    if (await this.page.locator('[name="role"]').isVisible()) {
      await this.page.selectOption('[name="role"]', userData.role);
    }
    
    await this.page.click('button[type="submit"]');
    
    // Wait for successful registration
    await this.page.waitForURL(/\/login|\/dashboard/, { timeout: 10000 });
    
    this.createdItems.users.push(userData.email);
    return userData;
  }

  async createTestTranscription(data: any = {}): Promise<string> {
    const transcriptionData = {
      ...SAMPLE_TRANSCRIPTIONS.javascript_basic,
      title: `${data.title || 'Test Transcription'} ${generateRandomString(6)}`,
      ...data
    };

    await this.page.goto('/transcriptions');
    await this.page.fill('[name="title"]', transcriptionData.title);
    await this.page.fill('[name="content"]', transcriptionData.content);
    
    if (transcriptionData.tags) {
      // Handle tags input if available
      for (const tag of transcriptionData.tags) {
        await this.page.fill('[name="tags"]', tag);
        await this.page.keyboard.press('Enter');
      }
    }
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/\/transcriptions/, { timeout: 15000 });
    
    this.createdItems.transcriptions.push(transcriptionData.title);
    return transcriptionData.title;
  }

  async createTestQuiz(data: any = {}): Promise<string> {
    const quizData = {
      ...SAMPLE_QUIZ_CONFIGS.practice_session,
      title: `${data.title || 'Test Quiz'} ${generateRandomString(6)}`,
      ...data
    };

    await this.page.goto('/quizzes/create');
    await this.page.fill('[name="title"]', quizData.title);
    await this.page.fill('[name="description"]', quizData.description);
    
    // Fill additional quiz configuration fields if available
    if (await this.page.locator('[name="timePerQuestion"]').isVisible()) {
      await this.page.fill('[name="timePerQuestion"]', quizData.timePerQuestion?.toString() || '60');
    }
    
    if (await this.page.locator('[name="questionCount"]').isVisible()) {
      await this.page.fill('[name="questionCount"]', quizData.questionCount?.toString() || '10');
    }
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/\/quizzes/, { timeout: 15000 });
    
    this.createdItems.quizzes.push(quizData.title);
    return quizData.title;
  }

  async createTestRoom(data: any = {}): Promise<string> {
    const roomData = {
      ...SAMPLE_ROOM_CONFIGS.classroom_session,
      name: `${data.name || 'Test Room'} ${generateRandomString(6)}`,
      ...data
    };

    await this.page.goto('/rooms/create');
    await this.page.fill('[name="name"]', roomData.name);
    await this.page.fill('[name="description"]', roomData.description);
    
    // Fill additional room configuration fields
    if (await this.page.locator('[name="maxParticipants"]').isVisible()) {
      await this.page.fill('[name="maxParticipants"]', roomData.maxParticipants?.toString() || '30');
    }
    
    if (await this.page.locator('[name="timeMode"]').isVisible()) {
      await this.page.selectOption('[name="timeMode"]', roomData.timeMode || 'per_question');
    }
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/\/rooms/, { timeout: 15000 });
    
    this.createdItems.rooms.push(roomData.name);
    return roomData.name;
  }

  async cleanupTestUsers(): Promise<void> {
    // Note: User cleanup would depend on admin functionality
    console.log(`Cleanup needed for ${this.createdItems.users.length} test users`);
  }

  async cleanupTestData(): Promise<void> {
    console.log('Starting test data cleanup...');
    
    // Clean up rooms
    for (const roomName of this.createdItems.rooms) {
      try {
        await this.deleteRoom(roomName);
      } catch (error) {
        console.warn(`Failed to delete room ${roomName}:`, error);
      }
    }
    
    // Clean up quizzes
    for (const quizTitle of this.createdItems.quizzes) {
      try {
        await this.deleteQuiz(quizTitle);
      } catch (error) {
        console.warn(`Failed to delete quiz ${quizTitle}:`, error);
      }
    }
    
    // Clean up transcriptions
    for (const transcriptionTitle of this.createdItems.transcriptions) {
      try {
        await this.deleteTranscription(transcriptionTitle);
      } catch (error) {
        console.warn(`Failed to delete transcription ${transcriptionTitle}:`, error);
      }
    }
    
    console.log('Test data cleanup completed');
  }

  async cleanupBySession(sessionId: string): Promise<void> {
    console.log(`Cleaning up data for session: ${sessionId}`);
    // Implementation depends on how session tags are stored
  }

  private async deleteRoom(roomName: string): Promise<void> {
    await this.page.goto('/rooms');
    const roomElement = this.page.locator(`text="${roomName}"`).first();
    if (await roomElement.isVisible()) {
      await roomElement.click();
      // Look for delete button
      const deleteButton = this.page.locator('button:has-text("Delete"), [aria-label="Delete"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        // Confirm deletion if needed
        const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    }
  }

  private async deleteQuiz(quizTitle: string): Promise<void> {
    await this.page.goto('/quizzes');
    const quizElement = this.page.locator(`text="${quizTitle}"`).first();
    if (await quizElement.isVisible()) {
      await quizElement.click();
      const deleteButton = this.page.locator('button:has-text("Delete"), [aria-label="Delete"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    }
  }

  private async deleteTranscription(transcriptionTitle: string): Promise<void> {
    await this.page.goto('/transcriptions');
    const transcriptionElement = this.page.locator(`text="${transcriptionTitle}"`).first();
    if (await transcriptionElement.isVisible()) {
      await transcriptionElement.click();
      const deleteButton = this.page.locator('button:has-text("Delete"), [aria-label="Delete"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    }
  }
}

/**
 * API-based test data manager for faster test data creation and cleanup
 */
export class APITestDataManager implements TestDataManager {
  private request: APIRequestContext;
  private baseURL: string;
  private authToken?: string;

  constructor(request: APIRequestContext, baseURL: string = 'http://localhost:3000') {
    this.request = request;
    this.baseURL = baseURL;
  }

  async authenticate(email: string, password: string): Promise<void> {
    const response = await this.request.post(`${this.baseURL}/api/auth/login`, {
      data: { email, password }
    });
    
    if (response.ok()) {
      const data = await response.json();
      this.authToken = data.access_token;
    } else {
      throw new Error(`Authentication failed: ${response.status()}`);
    }
  }

  async createTestUser(profile: any = {}): Promise<any> {
    const userData = {
      ...TEST_USER_PROFILES.new_student,
      ...profile,
      email: `test.${generateRandomString(8)}@example.com`
    };

    const response = await this.request.post(`${this.baseURL}/api/auth/register`, {
      data: userData
    });

    if (response.ok()) {
      return await response.json();
    } else {
      throw new Error(`User creation failed: ${response.status()}`);
    }
  }

  async createTestTranscription(data: any = {}): Promise<string> {
    if (!this.authToken) {
      throw new Error('Authentication required');
    }

    const transcriptionData = {
      ...SAMPLE_TRANSCRIPTIONS.javascript_basic,
      title: `${data.title || 'Test Transcription'} ${generateRandomString(6)}`,
      ...data
    };

    const response = await this.request.post(`${this.baseURL}/api/transcriptions`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` },
      data: transcriptionData
    });

    if (response.ok()) {
      const result = await response.json();
      return result.id;
    } else {
      throw new Error(`Transcription creation failed: ${response.status()}`);
    }
  }

  async createTestQuiz(data: any = {}): Promise<string> {
    if (!this.authToken) {
      throw new Error('Authentication required');
    }

    const quizData = {
      ...SAMPLE_QUIZ_CONFIGS.practice_session,
      title: `${data.title || 'Test Quiz'} ${generateRandomString(6)}`,
      ...data
    };

    const response = await this.request.post(`${this.baseURL}/api/quizzes`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` },
      data: quizData
    });

    if (response.ok()) {
      const result = await response.json();
      return result.id;
    } else {
      throw new Error(`Quiz creation failed: ${response.status()}`);
    }
  }

  async createTestRoom(data: any = {}): Promise<string> {
    if (!this.authToken) {
      throw new Error('Authentication required');
    }

    const roomData = {
      ...SAMPLE_ROOM_CONFIGS.classroom_session,
      name: `${data.name || 'Test Room'} ${generateRandomString(6)}`,
      ...data
    };

    const response = await this.request.post(`${this.baseURL}/api/rooms`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` },
      data: roomData
    });

    if (response.ok()) {
      const result = await response.json();
      return result.id;
    } else {
      throw new Error(`Room creation failed: ${response.status()}`);
    }
  }

  async cleanupTestUsers(): Promise<void> {
    // Implementation depends on admin API availability
    console.log('API-based user cleanup not implemented');
  }

  async cleanupTestData(): Promise<void> {
    console.log('API-based cleanup not fully implemented');
  }

  async cleanupBySession(sessionId: string): Promise<void> {
    console.log(`API cleanup for session ${sessionId} not implemented`);
  }
} 