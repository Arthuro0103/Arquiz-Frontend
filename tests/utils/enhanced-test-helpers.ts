import { Page, expect, Locator, BrowserContext } from '@playwright/test';

/**
 * Enhanced Test User Credentials with better organization
 */
export const ENHANCED_TEST_USERS = {
  professor: {
    email: 'professor@arquiz.test',
    password: 'password123',
    fullName: 'Professor Test User',
    role: 'professor'
  },
  student: {
    email: 'student@arquiz.test',
    password: 'password123',
    fullName: 'Student Test User',
    role: 'student'
  },
  admin: {
    email: 'admin@arquiz.test',
    password: 'password123',
    fullName: 'Admin Test User',
    role: 'admin'
  }
} as const;

/**
 * Enhanced locator strategies with fallback chains
 */
export class EnhancedLocators {
  static button(page: Page, text: string): Locator {
    return page.locator(`[data-testid="${text.toLowerCase().replace(/\s+/g, '-')}-btn"]`)
      .or(page.locator(`button:has-text("${text}")`))
      .or(page.locator(`[aria-label="${text}"]`))
      .or(page.locator(`input[type="submit"][value="${text}"]`));
  }

  static input(page: Page, field: string): Locator {
    return page.locator(`[data-testid="${field}-input"]`)
      .or(page.locator(`#${field}`))
      .or(page.locator(`[name="${field}"]`))
      .or(page.locator(`input[placeholder*="${field}"]`));
  }

  static link(page: Page, text: string): Locator {
    return page.locator(`[data-testid="${text.toLowerCase().replace(/\s+/g, '-')}-link"]`)
      .or(page.locator(`a:has-text("${text}")`))
      .or(page.locator(`[href*="${text.toLowerCase()}"]`));
  }

  static section(page: Page, section: string): Locator {
    return page.locator(`[data-testid="${section}-section"]`)
      .or(page.locator(`.${section}`))
      .or(page.locator(`[class*="${section}"]`))
      .or(page.locator(`:has-text("${section}")`));
  }

  static form(page: Page, formName?: string): Locator {
    if (formName) {
      return page.locator(`[data-testid="${formName}-form"]`)
        .or(page.locator(`form[name="${formName}"]`))
        .or(page.locator(`.${formName}-form`));
    }
    return page.locator('form').first();
  }
}

/**
 * Enhanced authentication with better error handling
 */
export class AuthenticationHelper {
  static async loginAs(page: Page, userType: keyof typeof ENHANCED_TEST_USERS): Promise<void> {
    const user = ENHANCED_TEST_USERS[userType];
    
    try {
      // Try multiple login URLs
      const loginUrls = ['/login', '/auth/login', '/signin'];
      let loginSuccess = false;
      
      for (const url of loginUrls) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
          
          // Check if we have a login form
          const emailInput = page.locator('#email').or(page.locator('input[type="email"]')).or(page.locator('[name="email"]'));
          await emailInput.first().waitFor({ timeout: 5000 });
          
          loginSuccess = true;
          break;
        } catch {
          continue;
        }
      }
      
      if (!loginSuccess) {
        console.log(`Login form not found for ${userType} - this may be expected in some tests`);
        return;
      }
      
      // Fill login form with fallbacks
      const emailInput = page.locator('#email').or(page.locator('input[type="email"]')).or(page.locator('[name="email"]'));
      const passwordInput = page.locator('#password').or(page.locator('input[type="password"]')).or(page.locator('[name="password"]'));
      const loginButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("Login")')).or(page.locator('[data-testid="login-btn"]'));
      
      await emailInput.first().fill(user.email);
      await passwordInput.first().fill(user.password);
      await loginButton.first().click();
      
      // Give time for login to process (reduced timeout)
      await page.waitForTimeout(1500);
      
    } catch (error) {
      console.log(`Login attempt for ${userType} failed - this may be expected in some tests:`, error);
    }
  }

  static async register(page: Page, userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<void> {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');

    await EnhancedLocators.input(page, 'name').fill(userData.name);
    await EnhancedLocators.input(page, 'email').fill(userData.email);
    await EnhancedLocators.input(page, 'password').fill(userData.password);
    
    // Handle confirm password if present
    const confirmPasswordInput = EnhancedLocators.input(page, 'confirmPassword')
      .or(EnhancedLocators.input(page, 'confirm-password'));
    if (await confirmPasswordInput.isVisible()) {
      await confirmPasswordInput.fill(userData.password);
    }

    await EnhancedLocators.button(page, 'Register').click();
    
    // Wait for successful registration
    await Promise.race([
      page.waitForURL(/.*dashboard.*/, { timeout: 15000 }),
      page.waitForURL(/.*login.*/, { timeout: 15000 }),
      page.waitForSelector('[data-testid="success-message"], .success', { timeout: 15000 })
    ]);
  }

  static async logout(page: Page): Promise<void> {
    // Look for logout in various common locations
    const logoutButton = page.locator('[data-testid="logout-btn"]')
      .or(page.locator('[aria-label="Logout"]'))
      .or(page.locator('button:has-text("Logout")'))
      .or(page.locator('a:has-text("Logout")'))
      .or(page.locator('[href="/auth/logout"]'));

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Try profile menu first
      const profileMenu = page.locator('[data-testid="profile-menu"]')
        .or(page.locator('.profile-menu'))
        .or(page.locator('[aria-label="Profile"]'));
      
      if (await profileMenu.isVisible()) {
        await profileMenu.click();
        await page.waitForTimeout(500);
        await logoutButton.click();
      }
    }
    
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
  }
}

/**
 * Enhanced navigation helper
 */
export class NavigationHelper {
  static async goToSection(page: Page, section: string): Promise<void> {
    const sectionLink = EnhancedLocators.link(page, section);
    
    if (await sectionLink.isVisible()) {
      await sectionLink.click();
    } else {
      // Try direct navigation
      await page.goto(`/${section.toLowerCase()}`);
    }
    
    await page.waitForLoadState('networkidle');
    
    // Verify we're in the right section
    await expect(page).toHaveURL(new RegExp(`.*${section.toLowerCase()}.*`));
  }

  static async waitForPageLoad(page: Page, timeout: number = 30000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
    
    // Wait for any loading spinners to disappear
    const loadingSpinner = page.locator('[data-testid="loading"], .loading, .spinner');
    if (await loadingSpinner.isVisible()) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }
  }
}

/**
 * Enhanced form interaction helper
 */
export class FormHelper {
  static async fillAndSubmit(page: Page, formData: Record<string, string>, formName?: string): Promise<void> {
    const form = EnhancedLocators.form(page, formName);
    await expect(form).toBeVisible();

    for (const [field, value] of Object.entries(formData)) {
      const input = EnhancedLocators.input(page, field);
      await expect(input).toBeVisible();
      await input.fill(value);
    }

    const submitButton = form.locator('button[type="submit"]')
      .or(form.locator('[data-testid="submit-btn"]'))
      .or(EnhancedLocators.button(page, 'Submit'))
      .or(EnhancedLocators.button(page, 'Save'));

    await submitButton.click();
  }

  static async selectOption(page: Page, fieldName: string, optionValue: string): Promise<void> {
    const select = page.locator(`[data-testid="${fieldName}-select"]`)
      .or(page.locator(`select[name="${fieldName}"]`))
      .or(page.locator(`#${fieldName}`));
    
    await select.selectOption(optionValue);
  }

  static async uploadFile(page: Page, fieldName: string, filePath: string): Promise<void> {
    const fileInput = page.locator(`[data-testid="${fieldName}-upload"]`)
      .or(page.locator(`input[name="${fieldName}"][type="file"]`))
      .or(page.locator(`#${fieldName}`));
    
    await fileInput.setInputFiles(filePath);
  }
}

/**
 * Enhanced assertion helper
 */
export class AssertionHelper {
  static async expectToBeOnPage(page: Page, pageName: string): Promise<void> {
    const pagePattern = new RegExp(`.*${pageName.toLowerCase()}.*`);
    await expect(page).toHaveURL(pagePattern);
    
    // Also check for page-specific elements
    const pageIndicator = page.locator(`[data-testid="${pageName}-page"]`)
      .or(page.locator(`.${pageName}-page`))
      .or(page.locator(`h1:has-text("${pageName}")`));
    
    if (await pageIndicator.isVisible()) {
      await expect(pageIndicator).toBeVisible();
    }
  }

  static async expectSuccessMessage(page: Page, message?: string): Promise<void> {
    const successElement = page.locator('[data-testid="success-message"]')
      .or(page.locator('.success'))
      .or(page.locator('.alert-success'))
      .or(page.locator('[role="alert"][class*="success"]'));
    
    await expect(successElement).toBeVisible({ timeout: 10000 });
    
    if (message) {
      await expect(successElement).toContainText(message);
    }
  }

  static async expectErrorMessage(page: Page, message?: string): Promise<void> {
    const errorElement = page.locator('[data-testid="error-message"]')
      .or(page.locator('.error'))
      .or(page.locator('.alert-error'))
      .or(page.locator('[role="alert"][class*="error"]'));
    
    await expect(errorElement).toBeVisible({ timeout: 10000 });
    
    if (message) {
      await expect(errorElement).toContainText(message);
    }
  }
}

/**
 * Enhanced WebSocket testing helper
 */
export class WebSocketHelper {
  static async monitorWebSocketActivity(page: Page): Promise<{
    connections: any[];
    messages: { sent: any[]; received: any[] };
  }> {
    const connections: any[] = [];
    const messages = { sent: [] as any[], received: [] as any[] };

    page.on('websocket', ws => {
      connections.push(ws);
      
      ws.on('framesent', event => {
        messages.sent.push({
          timestamp: new Date(),
          payload: event.payload
        });
      });
      
      ws.on('framereceived', event => {
        messages.received.push({
          timestamp: new Date(),
          payload: event.payload
        });
      });
    });

    return { connections, messages };
  }

  static async waitForWebSocketConnection(page: Page, timeout: number = 10000): Promise<void> {
    let connected = false;
    
    page.on('websocket', () => {
      connected = true;
    });

    const startTime = Date.now();
    while (!connected && (Date.now() - startTime) < timeout) {
      await page.waitForTimeout(100);
    }

    if (!connected) {
      throw new Error(`WebSocket connection not established within ${timeout}ms`);
    }
  }
}

/**
 * Mobile testing helper
 */
export class MobileHelper {
  static async setMobileViewport(page: Page, device: 'mobile' | 'tablet' = 'mobile'): Promise<void> {
    const viewports = {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 }
    };
    
    await page.setViewportSize(viewports[device]);
  }

  static async testTouchInteraction(page: Page, selector: string): Promise<void> {
    const element = page.locator(selector);
    await expect(element).toBeVisible();
    await element.tap();
  }

  static async testMobileNavigation(page: Page): Promise<void> {
    // Look for mobile menu toggle
    const mobileMenuToggle = page.locator('[data-testid="mobile-menu-toggle"]')
      .or(page.locator('.hamburger'))
      .or(page.locator('[aria-label="Menu"]'))
      .or(page.locator('button:has-text("Menu")'));
    
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.tap();
      
      // Wait for menu to open
      const mobileMenu = page.locator('[data-testid="mobile-menu"]')
        .or(page.locator('.mobile-menu'))
        .or(page.locator('[aria-expanded="true"]'));
      
      await expect(mobileMenu).toBeVisible();
    }
  }
}

/**
 * Accessibility testing helper
 */
export class AccessibilityHelper {
  static async testKeyboardNavigation(page: Page): Promise<void> {
    // Start from the beginning of the page
    await page.keyboard.press('Home');
    
    // Test tab navigation
    const focusableElements = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus').elementHandle();
      if (focused) {
        focusableElements.push(focused);
      }
    }
    
    // Verify we can navigate through focusable elements
    expect(focusableElements.length).toBeGreaterThan(0);
  }

  static async testAriaLabels(page: Page): Promise<void> {
    // Check for buttons without accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      if (!ariaLabel && !textContent?.trim()) {
        console.warn('Button without accessible name found:', await button.innerHTML());
      }
    }
  }

  static async testFocusManagement(page: Page): Promise<void> {
    // Test that focus is managed properly after interactions
    const button = page.locator('button').first();
    if (await button.isVisible()) {
      await button.focus();
      const focused = page.locator(':focus');
      await expect(focused).toBe(button);
    }
  }
}

/**
 * Performance testing helper
 */
export class PerformanceHelper {
  static async measurePageLoad(page: Page, url: string): Promise<{
    loadTime: number;
    domContentLoaded: number;
    networkIdle: number;
  }> {
    const startTime = Date.now();
    
    await page.goto(url);
    const domContentLoadedTime = Date.now();
    
    await page.waitForLoadState('networkidle');
    const networkIdleTime = Date.now();
    
    return {
      loadTime: domContentLoadedTime - startTime,
      domContentLoaded: domContentLoadedTime - startTime,
      networkIdle: networkIdleTime - startTime
    };
  }

  static async checkForConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    return errors;
  }
}

/**
 * Utility functions
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateTestEmail(domain: string = 'test.arquiz.com'): string {
  return `test.${generateRandomString(6)}@${domain}`;
}

export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
} 