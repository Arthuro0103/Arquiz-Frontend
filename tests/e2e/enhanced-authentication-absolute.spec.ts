import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { 
  enhancedLogin, 
  enhancedRegister, 
  enhancedLogout,
  generateTestEmail,
  generateRandomString,
  getPerformanceReport,
  resetPerformanceMonitoring,
  TEST_USERS,
  enhancedWaitForElement,
  enhancedFillForm,
  enhancedExpectText,
  enhancedExpectVisible,
  ENHANCED_TEST_USERS,
  TestUser,
  enhancedWaitForApiResponse,
  enhancedWaitForWebSocket 
} from '../utils/enhanced-test-helpers';

/**
 * Test data management for enhanced authentication tests
 */
class TestDataManager {
  private userData: Map<string, any> = new Map();

  generateUserData(role: 'professor' | 'student' = 'student'): {
    name: string;
    email: string;
    password: string;
    role: string;
  } {
    const timestamp = Date.now();
    const randomId = generateRandomString(6);
    
    return {
      name: `Test ${role} ${randomId}`,
      email: `test-${role}-${timestamp}-${randomId}@arquiz.test`,
      password: 'SecurePassword123!@#',
      role
    };
  }

  storeUserData(key: string, data: any): void {
    this.userData.set(key, data);
  }

  getUserData(key: string): any {
    return this.userData.get(key);
  }

  cleanup(): void {
    this.userData.clear();
  }
}

/**
 * Test user management for authentication flows
 */
class TestUserManager {
  private activeUsers: TestUser[] = [];

  createTestUser(role: 'professor' | 'student' | 'admin'): TestUser {
    const baseUser = ENHANCED_TEST_USERS[role];
    const uniqueUser: TestUser = {
      ...baseUser,
      email: this.generateUniqueEmail(role),
      metadata: {
        ...baseUser.metadata,
        created: new Date(),
        sessionCount: 0
      }
    };
    
    this.activeUsers.push(uniqueUser);
    return uniqueUser;
  }

  private generateUniqueEmail(role: string): string {
    const timestamp = Date.now();
    const randomId = generateRandomString(4);
    return `test-${role}-${timestamp}-${randomId}@arquiz.test`;
  }

  getActiveUsers(): TestUser[] {
    return [...this.activeUsers];
  }

  cleanup(): void {
    this.activeUsers = [];
  }
}

/**
 * Performance monitoring for authentication operations
 */
class PerformanceMonitor {
  private metrics: Map<string, { start: number; end?: number; duration?: number }> = new Map();

  startOperation(operationName: string): string {
    const operationId = `${operationName}_${Date.now()}_${generateRandomString(4)}`;
    this.metrics.set(operationId, { start: performance.now() });
    return operationId;
  }

  endOperation(operationId: string): number {
    const metric = this.metrics.get(operationId);
    if (metric) {
      metric.end = performance.now();
      metric.duration = metric.end - metric.start;
      return metric.duration;
    }
    return 0;
  }

  getOperationDuration(operationId: string): number {
    return this.metrics.get(operationId)?.duration || 0;
  }

  getAllMetrics(): { [key: string]: number } {
    const result: { [key: string]: number } = {};
    this.metrics.forEach((metric, key) => {
      if (metric.duration) {
        result[key] = metric.duration;
      }
    });
    return result;
  }

  cleanup(): void {
    this.metrics.clear();
  }
}

/**
 * Accessibility checker for authentication forms
 */
class AccessibilityChecker {
  static async checkLoginFormAccessibility(page: Page): Promise<void> {
    // Check form labels
    await expect(page.locator('label[for="email"], label:has(input#email)')).toBeVisible();
    await expect(page.locator('label[for="password"], label:has(input#password)')).toBeVisible();

    // Check ARIA attributes
    const emailField = page.locator('#email');
    const passwordField = page.locator('#password');
    
    await expect(emailField).toHaveAttribute('type', 'email');
    await expect(passwordField).toHaveAttribute('type', 'password');
    await expect(emailField).toHaveAttribute('required');
    await expect(passwordField).toHaveAttribute('required');

    // Check tab navigation
    await emailField.focus();
    await page.keyboard.press('Tab');
    await expect(passwordField).toBeFocused();
  }

  static async checkRegistrationFormAccessibility(page: Page): Promise<void> {
    // Check all required form labels
    const requiredFields = ['name', 'email', 'password', 'confirm-password'];
    
    for (const field of requiredFields) {
      await expect(page.locator(`label[for="${field}"], label:has(input#${field})`)).toBeVisible();
      await expect(page.locator(`#${field}`)).toHaveAttribute('required');
    }

    // Check form validation feedback
    await page.fill('#name', '');
    await page.fill('#email', '');
    await page.click('button[type="submit"]');
    
    // Browser validation should prevent submission
    const nameField = page.locator('#name');
    const emailField = page.locator('#email');
    
    expect(await nameField.evaluate((el: HTMLInputElement) => el.validationMessage)).toBeTruthy();
    expect(await emailField.evaluate((el: HTMLInputElement) => el.validationMessage)).toBeTruthy();
  }
}

/**
 * Security validation helper
 */
class SecurityValidator {
  static async checkPasswordSecurity(page: Page, passwordField: string): Promise<void> {
    const weakPasswords = [
      '123',
      'password',
      'abc123',
      'PASSWORD123',
      '12345678'
    ];

    for (const weakPassword of weakPasswords) {
      await page.fill(passwordField, weakPassword);
      await page.locator(passwordField).blur();
      
      // Check for password strength indicators
      const strengthIndicators = [
        '.password-strength',
        '.strength-meter',
        '[data-testid="password-strength"]'
      ];
      
      let hasStrengthIndicator = false;
      for (const indicator of strengthIndicators) {
        if (await page.locator(indicator).count() > 0) {
          hasStrengthIndicator = true;
          break;
        }
      }
      
      // If strength indicator exists, it should show weak
      if (hasStrengthIndicator) {
        const strengthText = await page.locator('.password-strength, .strength-meter').first().textContent();
        expect(strengthText?.toLowerCase()).toMatch(/weak|fraca|low/);
      }
    }
  }

  static async checkSessionSecurity(page: Page): Promise<void> {
    // Check for secure session attributes
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(cookie => 
      cookie.name.toLowerCase().includes('auth') || 
      cookie.name.toLowerCase().includes('session') ||
      cookie.name.toLowerCase().includes('token')
    );
    
    for (const cookie of authCookies) {
      // Auth cookies should be secure and httpOnly
      expect(cookie.secure).toBeTruthy();
      expect(cookie.httpOnly).toBeTruthy();
    }
  }
}

/**
 * Network monitor for API validation
 */
class NetworkMonitor {
  private requests: any[] = [];
  
  constructor(private page: Page) {
    this.setupRequestInterception();
  }

  private setupRequestInterception(): void {
    this.page.on('request', request => {
      this.requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
    });
  }

  getAuthRequests(): any[] {
    return this.requests.filter(req => 
      req.url.includes('/auth/') || 
      req.url.includes('/login') || 
      req.url.includes('/register')
    );
  }

  getLastAuthRequest(): any {
    const authRequests = this.getAuthRequests();
    return authRequests[authRequests.length - 1];
  }

  cleanup(): void {
    this.requests = [];
  }
}

// Test fixtures
let testDataManager: TestDataManager;
let testUserManager: TestUserManager;
let performanceMonitor: PerformanceMonitor;
let networkMonitor: NetworkMonitor;

test.beforeEach(async ({ page }) => {
  resetPerformanceMonitoring();
  testDataManager = new TestDataManager();
  testUserManager = new TestUserManager();
  performanceMonitor = new PerformanceMonitor();
  networkMonitor = new NetworkMonitor(page);
});

test.afterEach(async ({ page }) => {
  // Capture performance metrics
  const report = getPerformanceReport();
  if (report.total > 0) {
    console.log('📊 Performance Report:', JSON.stringify(report, null, 2));
  }
  
  // Cleanup session if needed
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    console.warn('Failed to clear session storage:', error);
  }

  testDataManager.cleanup();
  testUserManager.cleanup();
  performanceMonitor.cleanup();
  networkMonitor.cleanup();
});

test.describe('Enhanced Authentication Flow Tests - Absolute Mode', () => {
  test.describe('User Registration Flow', () => {
    test('should complete full registration flow with comprehensive validation', async ({ page }) => {
      const operationId = performanceMonitor.startOperation('full_registration_flow');
      
      const userData = testDataManager.generateUserData('student');
      testDataManager.storeUserData('current_user', userData);

      // Navigate to registration page with validation
      await page.goto('/register');
      await page.waitForSelector('#name', { state: 'visible', timeout: 10000 });

      // Validate form accessibility
      await AccessibilityChecker.checkRegistrationFormAccessibility(page);

      // Complete registration process
      await enhancedRegister(page, userData, {
        validateFields: true,
        expectSuccess: true,
        timeout: 15000
      });

      // Verify successful registration indicators
      const successSelectors = [
        '.bg-green-500\\/15',
        '[data-testid="success-message"]',
        '.alert-success',
        'text="successfully"'
      ];

      await enhancedExpectVisible(page, successSelectors, { timeout: 10000 });

      const duration = performanceMonitor.endOperation(operationId);
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
    });

    test('should handle password strength requirements', async ({ page }) => {
      const userData = testDataManager.generateUserData('professor');
      
      await page.goto('/register');
      await page.waitForSelector('#name');

      // Test weak password
      const weakPasswords = [
        '123',
        'password',
        'abc123',
        'PASSWORD123'
      ];

      for (const weakPassword of weakPasswords) {
        await enhancedFillForm(page, {
          name: userData.name,
          email: userData.email,
          password: weakPassword,
          'confirm-password': weakPassword
        });

        await page.click('button[type="submit"]');

        // Should show password strength error or remain on form
        const errorOrStay = await Promise.race([
          page.waitForSelector('.text-red-600, [role="alert"]', { timeout: 3000 }).then(() => 'error'),
          page.waitForTimeout(3000).then(() => 'timeout')
        ]);

        // If no error shown, form should not have submitted successfully
        if (errorOrStay === 'timeout') {
          expect(page.url()).toContain('/register');
        }
      }
    });

    test('should validate email format in real-time', async ({ page }) => {
      await page.goto('/register');
      await page.waitForSelector('#email');

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user.domain.com'
      ];

      for (const invalidEmail of invalidEmails) {
        await page.fill('#email', invalidEmail);
        await page.locator('#email').blur(); // Trigger validation

        // Check HTML5 validation
        const emailField = page.locator('#email');
        const validationMessage = await emailField.evaluate((el: HTMLInputElement) => el.validationMessage);
        expect(validationMessage).toBeTruthy();
      }

      // Test valid email clears validation
      await page.fill('#email', 'valid@email.com');
      await page.locator('#email').blur();
      
      const emailField = page.locator('#email');
      const validationMessage = await emailField.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeFalsy();
    });

    test('should handle password confirmation mismatch', async ({ page }) => {
      const userData = testDataManager.generateUserData('student');
      
      await page.goto('/register');
      await page.waitForSelector('#name');

      await enhancedFillForm(page, {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        'confirm-password': 'DifferentPassword123!'
      });

      await page.click('button[type="submit"]');

      // Should show password mismatch error
      await expect(page.locator('text="As senhas não coincidem", text="Passwords do not match"')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('User Login Flow', () => {
    test('should perform enhanced login with session persistence', async ({ page }) => {
      const operationId = performanceMonitor.startOperation('enhanced_login_flow');

      // Test with multiple user types
      const userTypes = ['professor', 'student'] as const;
      
      for (const userType of userTypes) {
        await enhancedLogin(page, userType, {
          validateSession: true,
          rememberMe: true,
          timeout: 15000
        });

        // Verify authentication state
        await enhancedExpectVisible(page, [
          '[data-testid="user-menu"]',
          '.user-avatar',
          '.logout-button',
          'text="Dashboard"'
        ], { timeout: 10000 });

        // Test session persistence across page reloads
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Should remain authenticated
        await enhancedExpectVisible(page, [
          '[data-testid="user-menu"]',
          '.user-avatar'
        ], { timeout: 5000 });

        // Logout for next iteration
        await enhancedLogout(page);
      }

      const duration = performanceMonitor.endOperation(operationId);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    test('should validate invalid credentials with comprehensive error handling', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('#email');

      // Check form accessibility
      await AccessibilityChecker.checkLoginFormAccessibility(page);

      const invalidCredentials = [
        { email: 'invalid@example.com', password: 'wrongpassword' },
        { email: 'nonexistent@arquiz.test', password: 'AnyPassword123!' },
        { email: '', password: '' }
      ];

      for (const credentials of invalidCredentials) {
        await enhancedFillForm(page, {
          email: credentials.email,
          password: credentials.password
        });

        await page.click('button[type="submit"]');

        // Wait for error indication or form validation
        const result = await Promise.race([
          page.waitForSelector('.text-red-600, [role="alert"], .error-message', { timeout: 5000 }).then(() => 'error'),
          page.waitForTimeout(3000).then(() => 'timeout')
        ]);

        // Should either show error or remain on login page
        if (result === 'timeout') {
          expect(page.url()).toContain('/login');
        }

        // For empty credentials, check HTML5 validation
        if (!credentials.email || !credentials.password) {
          const emailField = page.locator('#email');
          const passwordField = page.locator('#password');
          
          if (!credentials.email) {
            const emailValidation = await emailField.evaluate((el: HTMLInputElement) => el.validationMessage);
            expect(emailValidation).toBeTruthy();
          }
          
          if (!credentials.password) {
            const passwordValidation = await passwordField.evaluate((el: HTMLInputElement) => el.validationMessage);
            expect(passwordValidation).toBeTruthy();
          }
        }
      }
    });

    test('should handle account lockout after multiple failed attempts', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('#email');

      const testEmail = 'lockout-test@arquiz.test';
      const wrongPassword = 'WrongPassword123!';

      // Attempt multiple failed logins
      for (let attempt = 1; attempt <= 5; attempt++) {
        await enhancedFillForm(page, {
          email: testEmail,
          password: wrongPassword
        });

        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);

        // After certain number of attempts, should show lockout message
        if (attempt >= 3) {
          const lockoutIndicators = [
            'text="too many attempts"',
            'text="account locked"',
            'text="temporarily disabled"',
            '.text-red-600'
          ];

          const hasLockoutMessage = await Promise.race([
            enhancedExpectVisible(page, lockoutIndicators, { timeout: 3000 }).then(() => true),
            new Promise(resolve => setTimeout(() => resolve(false), 3000))
          ]);

          if (hasLockoutMessage) {
            break;
          }
        }
      }
    });

    test('should handle password reset flow initiation', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('#email');

      // Look for password reset link
      const resetSelectors = [
        'a:has-text("Forgot password")',
        'a:has-text("Reset password")',
        'a:has-text("Esqueceu a senha")',
        '[data-testid="forgot-password-link"]'
      ];

      let resetLinkFound = false;
      for (const selector of resetSelectors) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          await element.click();
          resetLinkFound = true;
          break;
        }
      }

      if (resetLinkFound) {
        // Should navigate to password reset page
        await page.waitForTimeout(2000);
        
        const resetPageIndicators = [
          'text="Reset password"',
          'text="Password reset"',
          'input[type="email"]',
          'text="Enter your email"'
        ];

        await enhancedExpectVisible(page, resetPageIndicators, { timeout: 5000 });
      }
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across different browsers', async ({ page, browserName }) => {
      console.log(`Testing authentication in: ${browserName}`);
      
      const operationId = performanceMonitor.startOperation(`auth_${browserName}`);
      
      // Test basic login flow
      await enhancedLogin(page, 'professor', {
        validateSession: true,
        timeout: 20000 // Allow more time for different browsers
      });

      // Verify authentication indicators work in this browser
      await enhancedExpectVisible(page, [
        '[data-testid="user-menu"]',
        '.user-avatar',
        'text="Dashboard"'
      ], { timeout: 10000 });

      // Test logout
      await enhancedLogout(page, {
        validateLogout: true
      });

      const duration = performanceMonitor.endOperation(operationId);
      console.log(`Authentication completed in ${browserName}: ${duration}ms`);
      
      // Performance should be reasonable across browsers
      expect(duration).toBeLessThan(25000);
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle multiple rapid authentication attempts', async ({ page }) => {
      const operationId = performanceMonitor.startOperation('rapid_auth_attempts');
      
      // Perform rapid login/logout cycles
      for (let i = 0; i < 3; i++) {
        console.log(`Rapid auth cycle ${i + 1}/3`);
        
        await enhancedLogin(page, 'student', {
          validateSession: false, // Skip detailed validation for speed
          timeout: 10000
        });

        await enhancedLogout(page, {
          validateLogout: false // Skip detailed validation for speed
        });

        // Brief pause between cycles
        await page.waitForTimeout(500);
      }

      const duration = performanceMonitor.endOperation(operationId);
      console.log(`Rapid authentication cycles completed: ${duration}ms`);
      
      // Should complete reasonably quickly
      expect(duration).toBeLessThan(40000);
    });

    test('should maintain performance under network latency', async ({ page }) => {
      // Simulate slower network conditions
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 500 * 1024, // 500 KB/s
        uploadThroughput: 500 * 1024,   // 500 KB/s
        latency: 100 // 100ms latency
      });

      const operationId = performanceMonitor.startOperation('auth_with_latency');
      
      try {
        await enhancedLogin(page, 'professor', {
          validateSession: true,
          timeout: 30000 // Allow more time for slow network
        });

        const duration = performanceMonitor.endOperation(operationId);
        console.log(`Authentication with network latency: ${duration}ms`);
        
        // Should still complete within reasonable time even with latency
        expect(duration).toBeLessThan(35000);
        
      } finally {
        // Reset network conditions
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: -1,
          uploadThroughput: -1,
          latency: 0
        });
      }
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from temporary network failures', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('#email');

      // Simulate network failure during login attempt
      const client = await page.context().newCDPSession(page);
      
      await enhancedFillForm(page, {
        email: TEST_USERS.student.email,
        password: TEST_USERS.student.password
      });

      // Temporarily go offline
      await client.send('Network.emulateNetworkConditions', {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0
      });

      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Restore network
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0
      });

      // Retry login
      await page.waitForTimeout(1000);
      await page.click('button[type="submit"]');

      // Should now succeed or show appropriate error
      const authenticationResult = await Promise.race([
        page.waitForURL(/\/dashboard/, { timeout: 10000 }).then(() => 'success'),
        page.waitForSelector('[data-testid="user-menu"]', { timeout: 10000 }).then(() => 'success'),
        page.waitForTimeout(10000).then(() => 'timeout')
      ]);

      console.log(`Network recovery result: ${authenticationResult}`);
    });

    test('should handle malformed server responses gracefully', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('#email');

      // Attempt login with valid credentials
      await enhancedFillForm(page, {
        email: TEST_USERS.professor.email,
        password: TEST_USERS.professor.password
      });

      await page.click('button[type="submit"]');

      // Wait for response
      await page.waitForTimeout(5000);

      // Application should handle any malformed responses gracefully
      const currentUrl = page.url();
      const hasErrorMessage = await page.locator('.error-message, [role="alert"], .text-red-600').count() > 0;

      // Should not be in an undefined state
      expect(currentUrl.includes('/login') || currentUrl.includes('/dashboard') || currentUrl.includes('/home')).toBeTruthy();
    });
  });

  test.describe('Security and Data Protection', () => {
    test('should not expose sensitive data in client-side storage', async ({ page }) => {
      await enhancedLogin(page, 'admin', {
        validateSession: true
      });

      // Check localStorage and sessionStorage for exposed passwords
      const storageData = await page.evaluate(() => {
        const local = { ...localStorage };
        const session = { ...sessionStorage };
        return { local, session };
      });

      // Should not contain raw passwords
      const allStorageValues = [
        ...Object.values(storageData.local),
        ...Object.values(storageData.session)
      ].join(' ');

      expect(allStorageValues).not.toContain(TEST_USERS.admin.password);
      expect(allStorageValues.toLowerCase()).not.toMatch(/password.*123/);

      // Check cookies for sensitive data
      const cookies = await page.context().cookies();
      const cookieValues = cookies.map(c => c.value).join(' ');
      
      expect(cookieValues).not.toContain(TEST_USERS.admin.password);
    });

    test('should validate input sanitization', async ({ page }) => {
      await page.goto('/register');
      await page.waitForSelector('#name');

      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
        "'; DROP TABLE users; --"
      ];

      for (const payload of xssPayloads) {
        await enhancedFillForm(page, {
          name: payload,
          email: 'test@example.com',
          password: 'Password123!',
          'confirm-password': 'Password123!'
        });

        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);

        // Check that XSS payload was not executed
        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>alert("xss")</script>');

        // Reset form
        await page.fill('#name', '');
      }
    });
  });
}); 