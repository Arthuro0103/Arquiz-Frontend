import { Page, expect } from '@playwright/test';

/**
 * Test user credentials
 */
export const TEST_USERS = {
  professor: {
    email: 'professor@test.com',
    password: 'Test123!',
    fullName: 'Test Professor',
    role: 'professor'
  },
  student: {
    email: 'student@test.com',
    password: 'Test123!',
    fullName: 'Test Student',
    role: 'student'
  },
  admin: {
    email: 'admin@test.com',
    password: 'Test123!',
    fullName: 'Test Admin',
    role: 'admin'
  }
};

/**
 * Login helper function
 */
export async function login(page: Page, userType: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userType];
  
  await page.goto('/login');
  
  // Wait for the login form to be visible
  await page.waitForSelector('#email', { timeout: 5000 });
  
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login redirect
  await page.waitForURL(/\/dashboard|\//, { timeout: 10000 });
}

/**
 * Register helper function
 */
export async function register(page: Page, userData: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}) {
  await page.goto('/register');
  
  // Wait for the register form to be visible
  await page.waitForSelector('#name', { timeout: 5000 });
  
  await page.fill('#name', userData.name);
  await page.fill('#email', userData.email);
  await page.fill('#password', userData.password);
  await page.fill('#confirm-password', userData.confirmPassword || userData.password);
  await page.click('button[type="submit"]');
  
  // Wait for success message or redirect
  await page.waitForSelector('.bg-green-500\\/15, [data-testid="success-message"]', { timeout: 10000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  // Look for logout button/link and click it
  await page.click('[data-testid="logout"], [aria-label="Logout"], text="Logout"');
  
  // Wait for redirect to login page
  await page.waitForURL(/\/login/, { timeout: 10000 });
}

/**
 * Wait for element to be visible and ready
 */
export async function waitForElement(page: Page, selector: string, timeout: number = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Fill form helper - tries both id and name selectors
 */
export async function fillForm(page: Page, formData: Record<string, string>) {
  for (const [field, value] of Object.entries(formData)) {
    // Try id selector first, then name selector as fallback
    const idSelector = `#${field}`;
    const nameSelector = `[name="${field}"]`;
    
    if (await page.locator(idSelector).count() > 0) {
      await page.fill(idSelector, value);
    } else if (await page.locator(nameSelector).count() > 0) {
      await page.fill(nameSelector, value);
    } else {
      throw new Error(`Could not find input field for: ${field} (tried id="${field}" and name="${field}")`);
    }
  }
}

/**
 * Upload file helper
 */
export async function uploadFile(page: Page, inputSelector: string, filePath: string) {
  await page.setInputFiles(inputSelector, filePath);
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout: number = 10000) {
  return page.waitForResponse(response => {
    const url = response.url();
    if (typeof urlPattern === 'string') {
      return url.includes(urlPattern);
    }
    return urlPattern.test(url);
  }, { timeout });
}

/**
 * Check if element contains text
 */
export async function expectElementToContainText(page: Page, selector: string, text: string) {
  await expect(page.locator(selector)).toContainText(text);
}

/**
 * Check if element is visible
 */
export async function expectElementToBeVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Check if element is hidden
 */
export async function expectElementToBeHidden(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeHidden();
}

/**
 * Create test room helper
 */
export async function createTestRoom(page: Page, roomData: {
  name: string;
  description?: string;
  maxParticipants?: number;
}) {
  await page.goto('/rooms/create');
  
  await fillForm(page, {
    name: roomData.name,
    description: roomData.description || 'Test room description',
    maxParticipants: roomData.maxParticipants?.toString() || '50'
  });
  
  await page.click('button[type="submit"]');
  
  // Wait for room creation success
  await page.waitForURL(/\/rooms\/\w+/, { timeout: 10000 });
  
  // Extract room code/ID from URL
  const url = page.url();
  const roomId = url.split('/').pop();
  return roomId;
}

/**
 * Create test quiz helper
 */
export async function createTestQuiz(page: Page, quizData: {
  title: string;
  description?: string;
  transcriptionContent?: string;
}) {
  await page.goto('/transcriptions');
  
  // First create a transcription
  await page.fill('[name="title"]', `Transcription for ${quizData.title}`);
  await page.fill('[name="content"]', quizData.transcriptionContent || 'Sample transcription content for testing');
  await page.click('button[type="submit"]');
  
  // Wait for transcription creation
  await page.waitForURL(/\/transcriptions/, { timeout: 10000 });
  
  // Navigate to quiz creation
  await page.goto('/quizzes/create');
  await fillForm(page, {
    title: quizData.title,
    description: quizData.description || 'Test quiz description'
  });
  
  await page.click('button[type="submit"]');
  
  // Wait for quiz creation
  await page.waitForURL(/\/quizzes\/\w+/, { timeout: 10000 });
  
  const url = page.url();
  const quizId = url.split('/').pop();
  return quizId;
}

/**
 * Generate random string for unique test data
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `test-${generateRandomString(8)}@example.com`;
}

/**
 * Wait for WebSocket connection
 */
export async function waitForWebSocketConnection(page: Page, timeout: number = 10000) {
  await page.waitForFunction(() => {
    return window.WebSocket && window.WebSocket.OPEN;
  }, { timeout });
} 