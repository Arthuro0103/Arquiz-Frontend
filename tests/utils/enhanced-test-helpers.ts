import { Page, expect, Browser, BrowserContext, Locator, Response } from '@playwright/test';
import { randomBytes } from 'crypto';

// === ABSOLUTE MODE CONFIGURATION ===
interface AbsoluteModeConfig {
  operationTimeouts: {
    navigation: number;
    apiRequest: number;
    elementWait: number;
    formSubmit: number;
  };
  retryPolicies: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  validationSettings: {
    strictMode: boolean;
    performanceThresholds: {
      pageLoad: number;
      apiResponse: number;
      elementInteraction: number;
    };
  };
  errorHandling: {
    captureScreenshots: boolean;
    logNetworkActivity: boolean;
    savePageContent: boolean;
  };
}

const ABSOLUTE_MODE_CONFIG: AbsoluteModeConfig = {
  operationTimeouts: {
    navigation: 30000,
    apiRequest: 15000,
    elementWait: 10000,
    formSubmit: 20000,
  },
  retryPolicies: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffMultiplier: 2,
  },
  validationSettings: {
    strictMode: true,
    performanceThresholds: {
      pageLoad: 3000,
      apiResponse: 2000,
      elementInteraction: 1000,
    },
  },
  errorHandling: {
    captureScreenshots: true,
    logNetworkActivity: true,
    savePageContent: true,
  },
};

/**
 * Enhanced Test User Interface with metadata and profiles
 */
export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role: 'professor' | 'student' | 'admin';
  profile: {
    department?: string;
    grade?: string;
    permissions: string[];
  };
  metadata: {
    created: Date;
    lastLogin?: Date;
    sessionCount: number;
    preferences: Record<string, any>;
  };
}

/**
 * Enhanced test user definitions with stronger passwords and detailed profiles
 */
export const ENHANCED_TEST_USERS: Record<string, TestUser> = {
  professor: {
    email: 'professor@arquiz.test',
    password: 'SecureProf123!@#',
    fullName: 'Professor Test User',
    role: 'professor',
    profile: {
      department: 'Mathematics',
      permissions: ['CREATE_QUIZ', 'MANAGE_ROOMS', 'VIEW_ANALYTICS', 'MANAGE_STUDENTS']
    },
    metadata: {
      created: new Date('2024-01-01'),
      sessionCount: 0,
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    }
  },
  student: {
    email: 'student@arquiz.test',
    password: 'SecureStud123!@#',
    fullName: 'Student Test User',
    role: 'student',
    profile: {
      grade: '10th',
      permissions: ['JOIN_QUIZ', 'VIEW_RESULTS']
    },
    metadata: {
      created: new Date('2024-01-01'),
      sessionCount: 0,
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    }
  },
  admin: {
    email: 'admin@arquiz.test',
    password: 'SecureAdmin123!@#',
    fullName: 'Admin Test User',
    role: 'admin',
    profile: {
      permissions: ['FULL_ACCESS', 'SYSTEM_ADMIN', 'USER_MANAGEMENT']
    },
    metadata: {
      created: new Date('2024-01-01'),
      sessionCount: 0,
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      }
    }
  }
};

/**
 * Backward compatibility - keeping original TEST_USERS
 */
export const TEST_USERS = {
  professor: {
    email: ENHANCED_TEST_USERS.professor.email,
    password: ENHANCED_TEST_USERS.professor.password,
    fullName: ENHANCED_TEST_USERS.professor.fullName,
    role: ENHANCED_TEST_USERS.professor.role
  },
  student: {
    email: ENHANCED_TEST_USERS.student.email,
    password: ENHANCED_TEST_USERS.student.password,
    fullName: ENHANCED_TEST_USERS.student.fullName,
    role: ENHANCED_TEST_USERS.student.role
  },
  admin: {
    email: ENHANCED_TEST_USERS.admin.email,
    password: ENHANCED_TEST_USERS.admin.password,
    fullName: ENHANCED_TEST_USERS.admin.fullName,
    role: ENHANCED_TEST_USERS.admin.role
  }
};

/**
 * Performance monitoring
 */
interface PerformanceMetric {
  name: string;
  duration: number;
  success: boolean;
  timestamp: Date;
}

let performanceMetrics: PerformanceMetric[] = [];

export function resetPerformanceMonitoring(): void {
  performanceMetrics = [];
}

export function getPerformanceReport(): { metrics: PerformanceMetric[]; total: number; average: number; failures: number } {
  const total = performanceMetrics.length;
  const failures = performanceMetrics.filter(m => !m.success).length;
  const average = total > 0 ? performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / total : 0;
  
  return { metrics: performanceMetrics, total, average, failures };
}

function trackPerformance(name: string, duration: number, success: boolean): void {
  performanceMetrics.push({
    name,
    duration,
    success,
    timestamp: new Date()
  });
}

/**
 * Enhanced login function with comprehensive error handling and validation
 */
export interface EnhancedLoginOptions {
  timeout?: number;
  rememberMe?: boolean;
  validateSession?: boolean;
  expectedRedirect?: string;
  retries?: number;
}

export async function enhancedLogin(
  page: Page, 
  userType: keyof typeof ENHANCED_TEST_USERS,
  options: EnhancedLoginOptions = {}
): Promise<void> {
  const startTime = Date.now();
  const {
    timeout = 15000,
    rememberMe = false,
    validateSession = true,
    expectedRedirect = '/dashboard',
    retries = 2
  } = options;

  const user = ENHANCED_TEST_USERS[userType];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Navigate to login page
      await page.goto('/login', { timeout });
      
      // Wait for login form with multiple selector strategies
      await enhancedWaitForElement(page, '#email', { timeout: timeout / 3 });
      
      // Verify form accessibility
      await expect(page.locator('#email')).toHaveAttribute('type', 'email');
      await expect(page.locator('#password')).toHaveAttribute('type', 'password');
      
      // Fill credentials with validation
      await enhancedFillForm(page, {
        email: user.email,
        password: user.password
      }, { clearFirst: true, validateInput: true });
      
      // Handle remember me option
      if (rememberMe) {
        const rememberSelectors = [
          'input[name="remember"]',
          '#remember',
          '[data-testid="remember-checkbox"]'
        ];
        
        for (const selector of rememberSelectors) {
          const element = page.locator(selector);
          if (await element.count() > 0) {
            await element.check();
            break;
          }
        }
      }
      
      // Submit login form
      const submitSelectors = [
        'button[type="submit"]',
        '[data-testid="login-submit"]',
        'button:has-text("Login")',
        'button:has-text("Entrar")'
      ];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          await element.click();
          submitted = true;
          break;
        }
      }
      
      if (!submitted) {
        throw new Error('Could not find login submit button');
      }
      
      // Wait for authentication to complete
      await page.waitForTimeout(2000);
      
      // Check for error messages
      const errorSelectors = [
        '.text-red-600',
        '[role="alert"]',
        '.error-message',
        '.alert-danger'
      ];
      
      let hasError = false;
      for (const selector of errorSelectors) {
        if (await page.locator(selector).count() > 0) {
          hasError = true;
          break;
        }
      }
      
      if (hasError) {
        throw new Error('Login form showed error message');
      }
      
      // Validate successful authentication
      if (validateSession) {
        // Wait for redirect or authentication state
        const authenticationIndicators = [
          () => page.waitForURL(new RegExp(expectedRedirect.replace('/', '\\/'))),
          () => page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 }),
          () => page.waitForSelector('.user-avatar', { timeout: 5000 }),
          () => page.waitForSelector('text="Dashboard"', { timeout: 5000 })
        ];
        
        let authenticated = false;
        for (const indicator of authenticationIndicators) {
          try {
            await indicator();
            authenticated = true;
            break;
          } catch {
            continue;
          }
        }
        
        if (!authenticated) {
          throw new Error('Authentication validation failed - no success indicators found');
        }
      }
      
      const duration = Date.now() - startTime;
      trackPerformance(`login_${userType}`, duration, true);
      return;
      
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retries) {
        console.warn(`Login attempt ${attempt + 1} failed, retrying...`, error);
        await page.waitForTimeout(1000 * (attempt + 1)); // Exponential backoff
        continue;
      }
    }
  }
  
  const duration = Date.now() - startTime;
  trackPerformance(`login_${userType}`, duration, false);
  throw new Error(`Enhanced login failed after ${retries + 1} attempts: ${lastError?.message}`);
}

/**
 * Enhanced register function with comprehensive validation
 */
export interface EnhancedRegisterOptions {
  timeout?: number;
  validateFields?: boolean;
  expectSuccess?: boolean;
  retries?: number;
}

export async function enhancedRegister(
  page: Page,
  userData: { name: string; email: string; password: string; confirmPassword?: string },
  options: EnhancedRegisterOptions = {}
): Promise<void> {
  const startTime = Date.now();
  const {
    timeout = 15000,
    validateFields = true,
    expectSuccess = true,
    retries = 2
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Navigate to registration page
      await page.goto('/register', { timeout });
      
      // Wait for registration form
      await enhancedWaitForElement(page, '#name', { timeout: timeout / 3 });
      
      // Validate form structure
      if (validateFields) {
        const requiredFields = ['name', 'email', 'password', 'confirm-password'];
        for (const field of requiredFields) {
          await expect(page.locator(`#${field}`)).toBeVisible();
          await expect(page.locator(`#${field}`)).toHaveAttribute('required');
        }
      }
      
      // Fill registration form
      const formData = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        'confirm-password': userData.confirmPassword || userData.password
      };
      
      await enhancedFillForm(page, formData, { 
        clearFirst: true, 
        validateInput: true 
      });
      
      // Submit registration
      await page.click('button[type="submit"]');
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      if (expectSuccess) {
        // Look for success indicators
        const successSelectors = [
          '.bg-green-500\\/15',
          '[data-testid="success-message"]',
          '.alert-success',
          'text="successfully"',
          'text="sucesso"'
        ];
        
        let hasSuccess = false;
        for (const selector of successSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            hasSuccess = true;
            break;
          } catch {
            continue;
          }
        }
        
        if (!hasSuccess) {
          // Check if we're redirected to a success page
          const currentUrl = page.url();
          if (!currentUrl.includes('register') && !currentUrl.includes('error')) {
            hasSuccess = true;
          }
        }
        
        if (!hasSuccess) {
          throw new Error('Registration success validation failed');
        }
      }
      
      const duration = Date.now() - startTime;
      trackPerformance('register', duration, true);
      return;
      
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retries) {
        console.warn(`Registration attempt ${attempt + 1} failed, retrying...`, error);
        await page.waitForTimeout(1000 * (attempt + 1));
        continue;
      }
    }
  }
  
  const duration = Date.now() - startTime;
  trackPerformance('register', duration, false);
  throw new Error(`Enhanced registration failed after ${retries + 1} attempts: ${lastError?.message}`);
}

/**
 * Enhanced logout function with session cleanup
 */
export interface EnhancedLogoutOptions {
  timeout?: number;
  validateLogout?: boolean;
  clearStorage?: boolean;
}

export async function enhancedLogout(
  page: Page,
  options: EnhancedLogoutOptions = {}
): Promise<void> {
  const startTime = Date.now();
  const {
    timeout = 10000,
    validateLogout = true,
    clearStorage = true
  } = options;

  try {
    // Look for logout button/link with multiple strategies
    const logoutSelectors = [
      '[data-testid="logout"]',
      '[data-testid="logout-button"]',
      'button:has-text("Logout")',
      'button:has-text("Sair")',
      'a:has-text("Logout")',
      'a:has-text("Sair")',
      '[aria-label="Logout"]',
      '.logout-button'
    ];
    
    let logoutElement: Locator | null = null;
    for (const selector of logoutSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        logoutElement = element;
        break;
      }
    }
    
    if (!logoutElement) {
      // Try to find user menu first
      const userMenuSelectors = [
        '[data-testid="user-menu"]',
        '.user-menu',
        '[aria-label="User menu"]',
        '.user-avatar',
        '.dropdown-toggle'
      ];
      
      for (const selector of userMenuSelectors) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          await element.click();
          await page.waitForTimeout(500);
          
          // Try logout selectors again
          for (const logoutSelector of logoutSelectors) {
            const logoutEl = page.locator(logoutSelector);
            if (await logoutEl.count() > 0) {
              logoutElement = logoutEl;
              break;
            }
          }
          break;
        }
      }
    }
    
    if (!logoutElement) {
      throw new Error('Could not find logout button');
    }
    
    await logoutElement.click();
    
    // Wait for logout to complete
    await page.waitForTimeout(2000);
    
    // Validate logout success
    if (validateLogout) {
      const logoutIndicators = [
        () => page.waitForURL(/.*\/login/, { timeout: 5000 }),
        () => page.waitForSelector('#email', { timeout: 5000 }),
        () => page.waitForSelector('text="Login"', { timeout: 5000 })
      ];
      
      let loggedOut = false;
      for (const indicator of logoutIndicators) {
        try {
          await indicator();
          loggedOut = true;
          break;
        } catch {
          continue;
        }
      }
      
      if (!loggedOut) {
        throw new Error('Logout validation failed - still appears to be logged in');
      }
    }
    
    // Clear storage if requested
    if (clearStorage) {
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
    
    const duration = Date.now() - startTime;
    trackPerformance('logout', duration, true);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    trackPerformance('logout', duration, false);
    throw new Error(`Enhanced logout failed: ${(error as Error).message}`);
  }
}

/**
 * Enhanced element waiting with multiple selector strategies
 */
export interface EnhancedWaitOptions {
  timeout?: number;
  retries?: number;
  fallbackSelectors?: string[];
}

export async function enhancedWaitForElement(
  page: Page,
  selector: string,
  options: EnhancedWaitOptions = {}
): Promise<Locator> {
  const { timeout = 10000, retries = 2, fallbackSelectors = [] } = options;
  
  const allSelectors = [selector, ...fallbackSelectors];
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    for (const sel of allSelectors) {
      try {
        const element = page.locator(sel);
        await element.waitFor({ state: 'visible', timeout: timeout / allSelectors.length });
        return element;
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }
    
    if (attempt < retries) {
      await page.waitForTimeout(1000);
    }
  }
  
  throw new Error(`Could not find element with selectors: ${allSelectors.join(', ')}. Last error: ${lastError?.message}`);
}

/**
 * Enhanced form filling with validation
 */
export interface EnhancedFillFormOptions {
  timeout?: number;
  clearFirst?: boolean;
  validateInput?: boolean;
  retries?: number;
}

export async function enhancedFillForm(
  page: Page,
  formData: Record<string, string>,
  options: EnhancedFillFormOptions = {}
): Promise<void> {
  const { timeout = 10000, clearFirst = true, validateInput = true, retries = 2 } = options;
  
  for (const [field, value] of Object.entries(formData)) {
    if (!value) continue;
    
    let lastError: Error | null = null;
    let filled = false;
    
    for (let attempt = 0; attempt <= retries && !filled; attempt++) {
      try {
        const selectors = [
          `#${field}`,
          `[name="${field}"]`,
          `[data-testid="${field}"]`,
          `input[placeholder*="${field}"]`
        ];
        
        let element: Locator | null = null;
        for (const selector of selectors) {
          const el = page.locator(selector);
          if (await el.count() > 0) {
            element = el;
            break;
          }
        }
        
        if (!element) {
          throw new Error(`Could not find field: ${field}`);
        }
        
        await element.waitFor({ state: 'visible', timeout });
        
        if (clearFirst) {
          await element.clear();
        }
        
        await element.fill(value);
        
        // Validate input if requested
        if (validateInput) {
          const actualValue = await element.inputValue();
          if (actualValue !== value) {
            throw new Error(`Value not properly filled for field ${field}. Expected: ${value}, Got: ${actualValue}`);
          }
        }
        
        filled = true;
        
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          await page.waitForTimeout(500);
        }
      }
    }
    
    if (!filled) {
      throw new Error(`Failed to fill field ${field} after ${retries + 1} attempts: ${lastError?.message}`);
    }
  }
}

/**
 * Enhanced file upload with validation
 */
export interface EnhancedUploadOptions {
  timeout?: number;
  validateFile?: boolean;
  expectedFileTypes?: string[];
}

export async function enhancedUploadFile(
  page: Page,
  inputSelector: string,
  filePath: string,
  options: EnhancedUploadOptions = {}
): Promise<void> {
  const { timeout = 10000, validateFile = true, expectedFileTypes = [] } = options;
  
  const fileInput = page.locator(inputSelector);
  await fileInput.waitFor({ state: 'attached', timeout });
  
  // Validate file types if specified
  if (validateFile && expectedFileTypes.length > 0) {
    const acceptAttr = await fileInput.getAttribute('accept');
    if (acceptAttr) {
      const fileExtension = filePath.split('.').pop()?.toLowerCase();
      const isValidType = expectedFileTypes.some(type => 
        acceptAttr.includes(type) || acceptAttr.includes(`.${fileExtension}`)
      );
      
      if (!isValidType) {
        throw new Error(`File type not accepted. Expected: ${expectedFileTypes.join(', ')}, Got: ${fileExtension}`);
      }
    }
  }
  
  await fileInput.setInputFiles(filePath);
  
  // Validate file was uploaded
  if (validateFile) {
    const files = await fileInput.inputValue();
    if (!files) {
      throw new Error('File upload failed - no file selected');
    }
  }
}

/**
 * Enhanced API response waiting with retry logic
 */
export interface EnhancedWaitApiOptions {
  timeout?: number;
  retries?: number;
  expectedStatus?: number[];
}

export async function enhancedWaitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: EnhancedWaitApiOptions = {}
): Promise<any> {
  const { timeout = 15000, retries = 3, expectedStatus = [200, 201] } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await page.waitForResponse(
        (response) => {
          const url = response.url();
          const matchesPattern = typeof urlPattern === 'string' 
            ? url.includes(urlPattern)
            : urlPattern.test(url);
          
          const hasValidStatus = expectedStatus.includes(response.status());
          
          return matchesPattern && hasValidStatus;
        },
        { timeout: timeout / (retries + 1) }
      );
      
      const responseData = await response.json().catch(() => ({}));
      return responseData;
      
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await page.waitForTimeout(1000);
      }
    }
  }
  
  throw new Error(`Failed to get API response for ${urlPattern} after ${retries + 1} attempts: ${lastError?.message}`);
}

/**
 * Enhanced text expectation with multiple selector strategies
 */
export async function enhancedExpectText(
  page: Page,
  selectors: string | string[],
  expectedText: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
  
  let found = false;
  let lastError: Error | null = null;
  
  for (const selector of selectorArray) {
    try {
      const element = page.locator(selector);
      await expect(element).toContainText(expectedText, { timeout });
      found = true;
      break;
    } catch (error) {
      lastError = error as Error;
      continue;
    }
  }
  
  if (!found) {
    throw new Error(`Text "${expectedText}" not found in any of selectors: ${selectorArray.join(', ')}. Last error: ${lastError?.message}`);
  }
}

/**
 * Enhanced visibility expectation with multiple selectors
 */
export async function enhancedExpectVisible(
  page: Page,
  selectors: string | string[],
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
  
  let found = false;
  let lastError: Error | null = null;
  
  for (const selector of selectorArray) {
    try {
      const element = page.locator(selector);
      await expect(element).toBeVisible({ timeout });
      found = true;
      break;
    } catch (error) {
      lastError = error as Error;
      continue;
    }
  }
  
  if (!found) {
    throw new Error(`No visible element found for selectors: ${selectorArray.join(', ')}. Last error: ${lastError?.message}`);
  }
}

/**
 * Enhanced room creation with comprehensive validation
 */
export interface EnhancedCreateRoomOptions {
  timeout?: number;
  validateCreation?: boolean;
  waitForParticipants?: boolean;
}

export async function enhancedCreateRoom(
  page: Page,
  roomData: { name: string; description?: string; maxParticipants?: number },
  options: EnhancedCreateRoomOptions = {}
): Promise<string | null> {
  const { timeout = 15000, validateCreation = true, waitForParticipants = false } = options;
  
  try {
    // Navigate to room creation page
    const createRoomSelectors = [
      '[data-testid="create-room"]',
      'button:has-text("Create Room")',
      'button:has-text("Criar Sala")',
      '[href="/rooms/create"]',
      '.create-room-button'
    ];
    
    let createButton: Locator | null = null;
    for (const selector of createRoomSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        createButton = element;
        break;
      }
    }
    
    if (!createButton) {
      throw new Error('Could not find create room button');
    }
    
    await createButton.click();
    
    // Wait for form to appear
    await enhancedWaitForElement(page, '#room-name', { 
      timeout,
      fallbackSelectors: ['[name="name"]', '[placeholder*="nome"]']
    });
    
    // Fill form data
    const formData: Record<string, string> = {
      'room-name': roomData.name,
      name: roomData.name
    };
    
    if (roomData.description) {
      formData.description = roomData.description;
    }
    
    if (roomData.maxParticipants) {
      formData['max-participants'] = roomData.maxParticipants.toString();
      formData.maxParticipants = roomData.maxParticipants.toString();
    }
    
    await enhancedFillForm(page, formData, { validateInput: true });
    
    // Submit form
    const submitSelectors = [
      'button[type="submit"]',
      '[data-testid="create-room-submit"]',
      'button:has-text("Create")',
      'button:has-text("Criar")'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await element.click();
        submitted = true;
        break;
      }
    }
    
    if (!submitted) {
      throw new Error('Could not find submit button');
    }
    
    // Wait for creation response
    await page.waitForTimeout(3000);
    
    if (validateCreation) {
      // Look for success indicators
      const successIndicators = [
        () => page.waitForURL(/.*\/rooms\/.*/, { timeout: 5000 }),
        () => page.waitForSelector('[data-testid="room-created"]', { timeout: 5000 }),
        () => page.waitForSelector('.room-access-code', { timeout: 5000 }),
        () => page.waitForSelector('text="Room created"', { timeout: 5000 })
      ];
      
      let created = false;
      for (const indicator of successIndicators) {
        try {
          await indicator();
          created = true;
          break;
        } catch {
          continue;
        }
      }
      
      if (!created) {
        throw new Error('Room creation validation failed');
      }
    }
    
    // Extract room ID from URL or access code
    const currentUrl = page.url();
    const roomIdMatch = currentUrl.match(/\/rooms\/([a-zA-Z0-9-]+)/);
    
    if (roomIdMatch) {
      return roomIdMatch[1];
    }
    
    // Try to extract access code as fallback
    try {
      const accessCodeElement = page.locator('.room-access-code, [data-testid="access-code"]');
      const accessCode = await accessCodeElement.textContent();
      return accessCode?.trim() || null;
    } catch {
      return null;
    }
    
  } catch (error) {
    throw new Error(`Enhanced room creation failed: ${(error as Error).message}`);
  }
}

/**
 * Enhanced WebSocket connection monitoring
 */
export async function enhancedWaitForWebSocket(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, timeout);
    
    const checkConnection = () => {
      page.evaluate(() => {
        return new Promise((resolve) => {
          const checkWS = () => {
            // Check for various WebSocket implementations
            const checks = [
              () => window.WebSocket && WebSocket.CONNECTING !== undefined,
              () => (window as any).io && (window as any).io.connected,
              () => (window as any).socket && (window as any).socket.connected,
              () => document.querySelector('[data-ws-connected="true"]')
            ];
            
            for (const check of checks) {
              try {
                if (check()) {
                  resolve(true);
                  return;
                }
              } catch (e) {
                continue;
              }
            }
            
            setTimeout(checkWS, 100);
          };
          
          checkWS();
        });
      }).then(() => {
        clearTimeout(timeoutId);
        resolve();
      }).catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    };
    
    checkConnection();
  });
}

// ===== BACKWARD COMPATIBILITY FUNCTIONS =====

export async function login(page: Page, userType: keyof typeof TEST_USERS): Promise<void> {
  return enhancedLogin(page, userType);
}

export async function register(page: Page, userData: { name: string; email: string; password: string; confirmPassword?: string }): Promise<void> {
  return enhancedRegister(page, userData);
}

export async function logout(page: Page): Promise<void> {
  return enhancedLogout(page);
}

export async function waitForElement(page: Page, selector: string, timeout: number = 5000): Promise<void> {
  await enhancedWaitForElement(page, selector, { timeout });
}

export async function fillForm(page: Page, formData: Record<string, string>): Promise<void> {
  return enhancedFillForm(page, formData);
}

export async function uploadFile(page: Page, inputSelector: string, filePath: string): Promise<void> {
  return enhancedUploadFile(page, inputSelector, filePath);
}

export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout: number = 10000): Promise<any> {
  return enhancedWaitForApiResponse(page, urlPattern, { timeout });
}

export async function expectElementToContainText(page: Page, selector: string, text: string): Promise<void> {
  return enhancedExpectText(page, selector, text);
}

export async function expectElementToBeVisible(page: Page, selector: string): Promise<void> {
  return enhancedExpectVisible(page, selector);
}

export async function expectElementToBeHidden(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeHidden();
}

export async function createTestRoom(page: Page, roomData: { name: string; description?: string; maxParticipants?: number }): Promise<string | null> {
  return enhancedCreateRoom(page, roomData);
}

export async function waitForWebSocketConnection(page: Page, timeout: number = 10000): Promise<void> {
  return enhancedWaitForWebSocket(page, { timeout });
}

export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateTestEmail(): string {
  return `test_${generateRandomString(8)}@example.com`;
}

export function generateSecurePassword(): string {
  return `Secure${generateRandomString(6)}!@#`;
} 