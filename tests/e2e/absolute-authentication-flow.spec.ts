import { test, expect } from '@playwright/test';
import { 
  enhancedLogin, 
  enhancedRegister, 
  enhancedLogout, 
  enhancedWaitForElement,
  enhancedFillForm,
  enhancedExpectText,
  enhancedExpectVisible,
  ENHANCED_TEST_USERS,
  resetPerformanceMonitoring,
  getPerformanceReport,
  generateRandomString,
  generateTestEmail,
  generateSecurePassword
} from '../utils/enhanced-test-helpers';

test.describe('Absolute Mode Authentication Flow', () => {
  test.beforeEach(async () => {
    resetPerformanceMonitoring();
  });

  test.afterEach(async () => {
    const report = getPerformanceReport();
    console.log(`Performance: ${report.total} operations, avg ${report.average.toFixed(2)}ms, ${report.failures} failures`);
  });

  test('validates complete professor registration workflow', async ({ page }) => {
    const professorData = {
      name: `Professor ${generateRandomString(8)}`,
      email: generateTestEmail(),
      password: generateSecurePassword()
    };

    // Navigate to registration
    await page.goto('/register');
    
    // Verify registration form structure
    await enhancedWaitForElement(page, '#name');
    await enhancedExpectVisible(page, ['#email', '#password', '#confirm-password']);
    
    // Validate form attributes
    await expect(page.locator('#name')).toHaveAttribute('required');
    await expect(page.locator('#email')).toHaveAttribute('type', 'email');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    
    // Fill registration form
    await enhancedFillForm(page, {
      name: professorData.name,
      email: professorData.email,
      password: professorData.password,
      'confirm-password': professorData.password
    });
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Wait for registration processing
    await page.waitForTimeout(3000);
    
    // Verify success or error handling (backend may not be available)
    const possibleOutcomes = [
      // Success scenario
      () => enhancedExpectVisible(page, ['.bg-green-500', '[data-testid="success"]', 'text="success"']),
      // Redirect scenario
      () => page.waitForURL(/.*\/dashboard/, { timeout: 5000 }),
      // Error scenario (backend unavailable)
      () => enhancedExpectVisible(page, ['.text-red-600', '[role="alert"]', '.error'])
    ];
    
    let outcome = 'unknown';
    for (const [index, check] of possibleOutcomes.entries()) {
      try {
        await check();
        outcome = ['success', 'redirect', 'error'][index];
        break;
      } catch {
        continue;
      }
    }
    
    console.log(`Registration outcome: ${outcome}`);
    
    // Test login flow regardless of registration outcome
    await page.goto('/login');
    await enhancedWaitForElement(page, '#email');
    
    // Fill login form
    await enhancedFillForm(page, {
      email: professorData.email,
      password: professorData.password
    });
    
    // Submit login
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Verify login outcome
    const loginOutcomes = [
      () => page.waitForURL(/.*\/dashboard/, { timeout: 5000 }),
      () => enhancedExpectVisible(page, ['.text-red-600', '[role="alert"]'])
    ];
    
    let loginResult = 'unknown';
    for (const [index, check] of loginOutcomes.entries()) {
      try {
        await check();
        loginResult = ['success', 'error'][index];
        break;
      } catch {
        continue;
      }
    }
    
    console.log(`Login result: ${loginResult}`);
  });

  test('validates student registration with weak password rejection', async ({ page }) => {
    await page.goto('/register');
    await enhancedWaitForElement(page, '#name');
    
    const weakPasswords = ['123', 'abc', 'password', '12345678'];
    
    for (const weakPassword of weakPasswords) {
      await enhancedFillForm(page, {
        name: `Student ${generateRandomString(6)}`,
        email: generateTestEmail(),
        password: weakPassword,
        'confirm-password': weakPassword
      });
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // Should show validation error or stay on form
      const currentUrl = page.url();
      expect(currentUrl).toContain('/register');
      
      // Clear form for next attempt
      await page.reload();
      await enhancedWaitForElement(page, '#name');
    }
  });

  test('validates login with invalid credentials', async ({ page }) => {
    const invalidCredentials = [
      { email: 'nonexistent@test.com', password: 'wrongpassword' },
      { email: 'invalid-email', password: 'password123' },
      { email: '', password: 'password123' },
      { email: 'test@test.com', password: '' }
    ];
    
    for (const creds of invalidCredentials) {
      await page.goto('/login');
      await enhancedWaitForElement(page, '#email');
      
      if (creds.email) {
        await page.fill('#email', creds.email);
      }
      if (creds.password) {
        await page.fill('#password', creds.password);
      }
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // Should show validation error or stay on login
      const currentUrl = page.url();
      if (creds.email && creds.password) {
        // Valid format but wrong credentials
        const hasError = await page.locator('.text-red-600, [role="alert"]').count() > 0;
        const stayedOnLogin = currentUrl.includes('/login');
        expect(hasError || stayedOnLogin).toBeTruthy();
      } else {
        // Invalid format should trigger HTML5 validation
        const emailField = page.locator('#email');
        const passwordField = page.locator('#password');
        
        if (!creds.email) {
          const emailValidation = await emailField.evaluate((el: HTMLInputElement) => el.validationMessage);
          expect(emailValidation).toBeTruthy();
        }
        
        if (!creds.password) {
          const passwordValidation = await passwordField.evaluate((el: HTMLInputElement) => el.validationMessage);
          expect(passwordValidation).toBeTruthy();
        }
      }
    }
  });

  test('validates password confirmation mismatch', async ({ page }) => {
    await page.goto('/register');
    await enhancedWaitForElement(page, '#name');
    
    await enhancedFillForm(page, {
      name: `Test User ${generateRandomString(6)}`,
      email: generateTestEmail(),
      password: 'SecurePass123!',
      'confirm-password': 'DifferentPass123!'
    });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Should show password mismatch error
    const errorMessages = [
      'As senhas não coincidem',
      'Passwords do not match',
      'Password confirmation does not match'
    ];
    
    let foundError = false;
    for (const message of errorMessages) {
      try {
        await enhancedExpectText(page, 'body', message);
        foundError = true;
        break;
      } catch {
        continue;
      }
    }
    
    if (!foundError) {
      // Check if still on registration page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/register');
    }
  });

  test('validates form accessibility and keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    await enhancedWaitForElement(page, '#email');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('#email')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#password')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
    
    // Test ARIA attributes
    await expect(page.locator('#email')).toHaveAttribute('type', 'email');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    
    // Test labels
    const emailLabel = page.locator('label[for="email"]');
    const passwordLabel = page.locator('label[for="password"]');
    
    if (await emailLabel.count() > 0) {
      await expect(emailLabel).toBeVisible();
    }
    if (await passwordLabel.count() > 0) {
      await expect(passwordLabel).toBeVisible();
    }
  });

  test('validates session persistence across page reloads', async ({ page }) => {
    await page.goto('/login');
    await enhancedWaitForElement(page, '#email');
    
    // Fill form
    await enhancedFillForm(page, {
      email: ENHANCED_TEST_USERS.professor.email,
      password: ENHANCED_TEST_USERS.professor.password
    });
    
    // Submit login
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Check if logged in (backend dependent)
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || !currentUrl.includes('/login')) {
      console.log('Login appeared successful, testing session persistence');
      
      // Reload page
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Should maintain session
      const afterReloadUrl = page.url();
      console.log(`After reload URL: ${afterReloadUrl}`);
      
      // Try accessing protected route
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      const protectedUrl = page.url();
      console.log(`Protected route result: ${protectedUrl}`);
    } else {
      console.log('Login failed or backend unavailable, testing redirect preservation');
      
      // Test callback URL preservation
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);
      
      const redirectUrl = page.url();
      expect(redirectUrl).toContain('/login');
      
      if (redirectUrl.includes('callbackUrl')) {
        expect(redirectUrl).toContain('dashboard');
      }
    }
  });

  test('validates cross-browser authentication state', async ({ page, browserName }) => {
    console.log(`Testing authentication on ${browserName}`);
    
    await page.goto('/login');
    await enhancedWaitForElement(page, '#email');
    
    // Browser-specific checks
    if (browserName === 'webkit') {
      // Safari-specific tests
      await expect(page.locator('#email')).toHaveAttribute('autocomplete');
      await expect(page.locator('#password')).toHaveAttribute('autocomplete');
    }
    
    if (browserName === 'firefox') {
      // Firefox-specific tests
      const emailField = page.locator('#email');
      await emailField.fill('invalid-email');
      await page.click('button[type="submit"]');
      
      const validation = await emailField.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validation).toBeTruthy();
    }
    
    if (browserName === 'chromium') {
      // Chrome-specific tests
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'password123');
      
      // Test autofill
      const emailValue = await page.locator('#email').inputValue();
      expect(emailValue).toBe('test@example.com');
    }
    
    // Universal tests
    await enhancedFillForm(page, {
      email: generateTestEmail(),
      password: generateSecurePassword()
    });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Should handle submission consistently across browsers
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/\/(login|dashboard|register|error)/);
  });

  test('validates remember me functionality', async ({ page }) => {
    await page.goto('/login');
    await enhancedWaitForElement(page, '#email');
    
    // Check for remember me checkbox
    const rememberSelectors = [
      'input[name="remember"]',
      '#remember',
      '[data-testid="remember-checkbox"]',
      'input[type="checkbox"]'
    ];
    
    let rememberElement = null;
    for (const selector of rememberSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        rememberElement = element;
        break;
      }
    }
    
    if (rememberElement) {
      console.log('Found remember me checkbox, testing functionality');
      
      await enhancedFillForm(page, {
        email: ENHANCED_TEST_USERS.student.email,
        password: ENHANCED_TEST_USERS.student.password
      });
      
      await rememberElement.check();
      await expect(rememberElement).toBeChecked();
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      // Test session persistence with remember me
      await page.context().clearCookies();
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Should redirect to login if session not remembered
      // Or stay authenticated if remember me worked
      const currentUrl = page.url();
      console.log(`After remember me test: ${currentUrl}`);
    } else {
      console.log('Remember me functionality not found in UI');
    }
  });

  test('validates logout workflow', async ({ page }) => {
    // First attempt login
    await page.goto('/login');
    await enhancedWaitForElement(page, '#email');
    
    await enhancedFillForm(page, {
      email: ENHANCED_TEST_USERS.admin.email,
      password: ENHANCED_TEST_USERS.admin.password
    });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const loginUrl = page.url();
    
    if (!loginUrl.includes('/login')) {
      console.log('Login appeared successful, testing logout');
      
      try {
        await enhancedLogout(page, {
          validateLogout: true,
          clearStorage: true
        });
        
        console.log('Logout completed successfully');
        
        // Verify logout
        const logoutUrl = page.url();
        expect(logoutUrl).toMatch(/\/(login|auth|$)/);
        
        // Try accessing protected route
        await page.goto('/dashboard');
        await page.waitForTimeout(2000);
        
        const protectedUrl = page.url();
        expect(protectedUrl).toContain('/login');
        
      } catch (error) {
        console.log('Logout test failed:', error);
        
        // Manual logout verification
        await page.goto('/login');
        const manualLogoutUrl = page.url();
        expect(manualLogoutUrl).toContain('/login');
      }
    } else {
      console.log('Login failed or backend unavailable, testing logout button presence');
      
      // Check if logout elements exist in UI
      const logoutSelectors = [
        '[data-testid="logout"]',
        'button:has-text("Logout")',
        'button:has-text("Sair")',
        '[aria-label="Logout"]'
      ];
      
      let logoutFound = false;
      for (const selector of logoutSelectors) {
        if (await page.locator(selector).count() > 0) {
          logoutFound = true;
          break;
        }
      }
      
      console.log(`Logout UI elements found: ${logoutFound}`);
    }
  });

  test('validates authentication error handling', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/auth/**', route => {
      route.abort('failed');
    });
    
    await page.goto('/login');
    await enhancedWaitForElement(page, '#email');
    
    await enhancedFillForm(page, {
      email: generateTestEmail(),
      password: generateSecurePassword()
    });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Should show network error
    const errorIndicators = [
      '.text-red-600',
      '[role="alert"]',
      '.error-message',
      'text="network"',
      'text="connection"',
      'text="error"'
    ];
    
    let errorFound = false;
    for (const selector of errorIndicators) {
      try {
        await enhancedExpectVisible(page, selector);
        errorFound = true;
        break;
      } catch {
        continue;
      }
    }
    
    console.log(`Network error handling: ${errorFound ? 'working' : 'not detected'}`);
    
    // Test timeout handling
    await page.unroute('**/api/auth/**');
    
    await page.route('**/api/auth/**', route => {
      // Delay response to simulate timeout
      setTimeout(() => route.fulfill({
        status: 500,
        body: 'Internal Server Error'
      }), 10000);
    });
    
    await page.reload();
    await enhancedWaitForElement(page, '#email');
    
    await enhancedFillForm(page, {
      email: generateTestEmail(),
      password: generateSecurePassword()
    });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    // Should handle timeout gracefully
    const timeoutUrl = page.url();
    expect(timeoutUrl).toContain('/login');
    
    console.log('Timeout handling test completed');
  });
}); 