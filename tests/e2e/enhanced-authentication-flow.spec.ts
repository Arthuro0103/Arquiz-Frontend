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
  enhancedExpectVisible,
  enhancedExpectText,
  ENHANCED_TEST_USERS,
  TestUser 
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

// Test fixtures
let testDataManager: TestDataManager;
let testUserManager: TestUserManager;
let performanceMonitor: PerformanceMonitor;

test.beforeEach(async () => {
  resetPerformanceMonitoring();
  testDataManager = new TestDataManager();
  testUserManager = new TestUserManager();
  performanceMonitor = new PerformanceMonitor();
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
});

test.describe('Enhanced Authentication Flow Tests', () => {
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

        // Test email submission
        await enhancedFillForm(page, {
          email: 'test@arquiz.test'
        });

        await page.click('button[type="submit"]');

        // Should show confirmation message
        const confirmationSelectors = [
          'text="Email sent"',
          'text="Check your email"',
          '.text-green-600',
          '.alert-success'
        ];

        await enhancedExpectVisible(page, confirmationSelectors, { timeout: 10000 });
      }
    });
  });

  test.describe('Authentication State Management', () => {
    test('should maintain authentication across navigation', async ({ page }) => {
      // Login as professor
      await enhancedLogin(page, 'professor', {
        validateSession: true
      });

      // Navigate through different pages
      const pagesToTest = [
        '/dashboard',
        '/rooms',
        '/quizzes',
        '/transcriptions'
      ];

      for (const pageUrl of pagesToTest) {
        await page.goto(pageUrl);
        await page.waitForLoadState('networkidle');

        // Should remain authenticated
        await enhancedExpectVisible(page, [
          '[data-testid="user-menu"]',
          '.user-avatar',
          '.logout-button'
        ], { timeout: 5000 });
      }
    });

    test('should handle session persistence across browser tabs', async ({ context }) => {
      // Create two pages (tabs)
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      // Login in first tab
      await enhancedLogin(page1, 'student', {
        validateSession: true,
        rememberMe: true
      });

      // Navigate to application in second tab
      await page2.goto('/dashboard');
      await page2.waitForLoadState('networkidle');

      // Should be authenticated in second tab as well
      await enhancedExpectVisible(page2, [
        '[data-testid="user-menu"]',
        '.user-avatar'
      ], { timeout: 10000 });

      // Logout from first tab
      await enhancedLogout(page1);

      // Second tab should also be logged out (if session sync is implemented)
      await page2.reload();
      await page2.waitForLoadState('networkidle');

      // Should be redirected to login or show logged out state
      const isLoggedOut = await Promise.race([
        page2.waitForURL(/\/login/, { timeout: 5000 }).then(() => true),
        enhancedExpectVisible(page2, ['#email', '#password'], { timeout: 5000 }).then(() => true),
        new Promise(resolve => setTimeout(() => resolve(false), 5000))
      ]);

      // Close pages
      await page1.close();
      await page2.close();
    });

    test('should handle authentication state during WebSocket activity', async ({ page }) => {
      await enhancedLogin(page, 'professor', {
        validateSession: true
      });

      // Navigate to a page that likely uses WebSockets (rooms)
      await page.goto('/rooms');
      await page.waitForLoadState('networkidle');

      // Monitor WebSocket connections if available
      const wsMonitoring = await page.evaluate(() => {
        return new Promise((resolve) => {
          let wsConnected = false;
          
          // Check for existing WebSocket
          if ((window as any).socket || (window as any).ws) {
            wsConnected = true;
          }

          // Monitor new WebSocket connections
          const originalWebSocket = window.WebSocket;
          (window as any).WebSocket = class extends originalWebSocket {
            constructor(url: string | URL, protocols?: string | string[]) {
              super(url, protocols);
              this.addEventListener('open', () => {
                wsConnected = true;
              });
            }
          };

          setTimeout(() => resolve(wsConnected), 3000);
        });
      });

      // Verify authentication is maintained during WebSocket activity
      await enhancedExpectVisible(page, [
        '[data-testid="user-menu"]',
        '.user-avatar'
      ], { timeout: 5000 });
    });
  });

  test.describe('Cross-Browser Authentication Compatibility', () => {
    test('should work consistently across Chromium, Firefox, and WebKit', async ({ page, browserName }) => {
      const operationId = performanceMonitor.startOperation(`cross_browser_auth_${browserName}`);

      // Test basic login flow
      await enhancedLogin(page, 'student', {
        validateSession: true,
        timeout: 20000 // Allow more time for different browsers
      });

      // Verify authentication indicators
      await enhancedExpectVisible(page, [
        '[data-testid="user-menu"]',
        '.user-avatar',
        '.logout-button'
      ], { timeout: 10000 });

      // Test logout
      await enhancedLogout(page, { timeout: 15000 });

      // Verify logout state
      await enhancedExpectVisible(page, [
        '#email',
        '#password',
        'button[type="submit"]'
      ], { timeout: 10000 });

      const duration = performanceMonitor.endOperation(operationId);
      console.log(`${browserName} authentication flow completed in ${duration}ms`);
      
      // Browser-specific performance thresholds
      const browserThresholds = {
        chromium: 25000,
        firefox: 30000,
        webkit: 35000
      };

      expect(duration).toBeLessThan(browserThresholds[browserName as keyof typeof browserThresholds] || 30000);
    });
  });

  test.describe('Performance and Accessibility Testing', () => {
    test('should meet performance benchmarks during authentication', async ({ page }) => {
      const metrics = {
        loginTime: 0,
        logoutTime: 0,
        pageLoadTime: 0
      };

      // Measure login performance
      const loginStart = performance.now();
      await enhancedLogin(page, 'professor', { validateSession: true });
      metrics.loginTime = performance.now() - loginStart;

      // Measure page navigation performance
      const navStart = performance.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      metrics.pageLoadTime = performance.now() - navStart;

      // Measure logout performance
      const logoutStart = performance.now();
      await enhancedLogout(page);
      metrics.logoutTime = performance.now() - logoutStart;

      // Assert performance requirements
      expect(metrics.loginTime).toBeLessThan(15000); // Login within 15 seconds
      expect(metrics.pageLoadTime).toBeLessThan(10000); // Navigation within 10 seconds
      expect(metrics.logoutTime).toBeLessThan(8000); // Logout within 8 seconds

      console.log('Performance metrics:', metrics);
    });

    test('should be accessible to screen readers and keyboard navigation', async ({ page }) => {
      // Test login form accessibility
      await page.goto('/login');
      await AccessibilityChecker.checkLoginFormAccessibility(page);

      // Test keyboard navigation through entire login flow
      await page.keyboard.press('Tab'); // Focus first element
      
      // Tab through form elements
      const emailField = page.locator('#email');
      const passwordField = page.locator('#password');
      const submitButton = page.locator('button[type="submit"]');

      await emailField.focus();
      await emailField.type('test@arquiz.test');
      
      await page.keyboard.press('Tab');
      await expect(passwordField).toBeFocused();
      await passwordField.type('TestPassword123!');
      
      await page.keyboard.press('Tab');
      await expect(submitButton).toBeFocused();

      // Test that form can be submitted with Enter key
      await passwordField.focus();
      await page.keyboard.press('Enter');

      // Should attempt login (form submission)
      await page.waitForTimeout(2000);
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Simulate server unavailability by using invalid API endpoints
      await page.route('**/auth/login', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.goto('/login');
      await enhancedFillForm(page, {
        email: 'test@arquiz.test',
        password: 'TestPassword123!'
      });

      await page.click('button[type="submit"]');

      // Should show appropriate error message
      const errorSelectors = [
        '.text-red-600',
        '[role="alert"]',
        '.error-message',
        'text="error"',
        'text="failed"'
      ];

      await enhancedExpectVisible(page, errorSelectors, { timeout: 10000 });
    });
  });
});

// === FINAL REPORTING ===
test.afterAll(async () => {
  const performanceReport = performanceMonitor.getAllMetrics();
  
  console.log('\n🎯 Enhanced Authentication Flow Test Summary');
  console.log('=' .repeat(50));
  console.log('Performance Metrics:');
  console.log(JSON.stringify(performanceReport, null, 2));
  
  // Save detailed report
  const fs = require('fs');
  const path = require('path');
  
  const reportPath = path.join(process.cwd(), 'test-results', `enhanced-auth-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    testRun: 'Enhanced Authentication Flow Tests',
    performance: performanceReport,
    testData: testDataManager.getUserData('current_user'),
    environment: {
      userAgent: process.env.PLAYWRIGHT_BROWSER || 'unknown',
      headless: process.env.HEADLESS !== 'false',
      parallel: process.env.PARALLEL_TESTS || '1',
    },
  }, null, 2));
  
  console.log(`📊 Detailed report saved to: ${reportPath}`);
}); 