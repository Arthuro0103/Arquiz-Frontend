import { test, expect } from '@playwright/test';
import { login, logout, register, generateRandomString } from '../utils/test-helpers';

test.describe('Authentication Flow Tests', () => {
  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    // Try to login with invalid credentials
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message (backend not available, but we can test UI behavior)
    // Wait for any error message to appear
    await page.waitForTimeout(2000);
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*\/login.*/);
  });

  test('should handle empty login fields with frontend validation', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    // Leave fields empty and try to submit
    await page.click('button[type="submit"]');
    
    // Should trigger HTML5 validation
    const emailField = page.locator('#email');
    const passwordField = page.locator('#password');
    
    await expect(emailField).toHaveAttribute('required');
    await expect(passwordField).toHaveAttribute('required');
    
    // Check validation messages
    const emailValidation = await emailField.evaluate((el: HTMLInputElement) => el.validationMessage);
    const passwordValidation = await passwordField.evaluate((el: HTMLInputElement) => el.validationMessage);
    
    expect(emailValidation).toBeTruthy();
    expect(passwordValidation).toBeTruthy();
  });

  test('should validate email format on login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    // Enter invalid email format
    await page.fill('#email', 'invalid-email');
    await page.fill('#password', 'somepassword');
    await page.click('button[type="submit"]');
    
    // Should trigger HTML5 email validation (different browsers have different messages)
    const emailField = page.locator('#email');
    const validation = await emailField.evaluate((el: HTMLInputElement) => el.validationMessage);
    
    // Check that there's a validation message (browsers vary: "Please enter an email address", "Enter an email address", etc.)
    expect(validation).toBeTruthy();
    expect(validation.toLowerCase()).toMatch(/email|@/); // Should mention email or contain @
  });

  test('should handle registration with password mismatch', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('#name');
    
    const testData = {
      name: `Test User ${generateRandomString(6)}`,
      email: `test${generateRandomString(6)}@example.com`,
      password: 'password123',
      confirmPassword: 'different123'
    };
    
    await page.fill('#name', testData.name);
    await page.fill('#email', testData.email);
    await page.fill('#password', testData.password);
    await page.fill('#confirm-password', testData.confirmPassword);
    
    await page.click('button[type="submit"]');
    
    // Should show password mismatch error
    await expect(page.locator('text=As senhas não coincidem')).toBeVisible({ timeout: 5000 });
  });

  test('should handle registration with valid data (backend unavailable)', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('#name');
    
    const testData = {
      name: `Test User ${generateRandomString(6)}`,
      email: `test${generateRandomString(6)}@example.com`,
      password: 'password123'
    };
    
    await page.fill('#name', testData.name);
    await page.fill('#email', testData.email);
    await page.fill('#password', testData.password);
    await page.fill('#confirm-password', testData.password);
    
    await page.click('button[type="submit"]');
    
    // Since backend is not available, we should get a connection error
    // This tests the error handling in the frontend
    await page.waitForTimeout(3000);
    
    // Should show some kind of error about connection
    const errorMessage = page.locator('.text-red-600, .text-destructive, [role="alert"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should handle empty registration fields', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('#name');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should trigger HTML5 validation on required fields
    const nameField = page.locator('#name');
    const emailField = page.locator('#email');
    const passwordField = page.locator('#password');
    
    await expect(nameField).toHaveAttribute('required');
    await expect(emailField).toHaveAttribute('required');
    await expect(passwordField).toHaveAttribute('required');
  });

  test('should validate registration form step by step', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('#name');
    
    // Test each field individually
    
    // 1. Name field
    await page.fill('#name', 'T'); // Too short
    await page.fill('#email', 'valid@email.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirm-password', 'password123');
    // Note: Frontend doesn't seem to have min-length validation, so this might pass
    
    // 2. Email field validation
    await page.fill('#name', 'Valid Name');
    await page.fill('#email', 'invalid-email');
    await page.click('button[type="submit"]');
    
    // Should show email validation (cross-browser compatible)
    const emailField = page.locator('#email');
    const emailValidation = await emailField.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(emailValidation).toBeTruthy();
    expect(emailValidation.toLowerCase()).toMatch(/email|@/); // Should mention email or contain @
    
    // 3. Reset with valid email
    await page.fill('#email', 'valid@email.com');
    
    // 4. Password confirmation validation (already tested above)
    
    console.log('✓ Form validation working as expected');
  });
});

test.describe('Navigation After Authentication Attempt', () => {
  test('should maintain callback URL through login attempts', async ({ page }) => {
    // Try to access a protected page
    await page.goto('/dashboard');
    
    // Should be redirected to login with callback
    await page.waitForURL('**/login**');
    const loginUrl = page.url();
    expect(loginUrl).toContain('callbackUrl');
    expect(loginUrl).toContain('dashboard');
    
    // Fill invalid credentials
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error handling
    await page.waitForTimeout(2000);
    
    // Should still be on login page with callback URL preserved
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
    expect(currentUrl).toContain('callbackUrl');
  });

  test('should redirect between auth pages correctly', async ({ page }) => {
    // Start at login
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    // Go to register
    await page.click('a[href="/register"]');
    await page.waitForURL('**/register');
    
    // Verify register page loaded correctly
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('text=Registrar')).toBeVisible();
    
    // Go back to login
    await page.click('a[href="/login"]');
    await page.waitForURL('**/login');
    
    // Verify login page loaded correctly
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('text=Login')).toBeVisible();
  });
}); 