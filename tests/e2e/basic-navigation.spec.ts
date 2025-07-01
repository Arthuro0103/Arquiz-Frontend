import { test, expect } from '@playwright/test';

test.describe('Basic Navigation and Public Pages', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page loaded successfully
    await expect(page).toHaveTitle(/ArQuiz|Quiz|Home/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for login form to be visible
    await page.waitForSelector('#email', { timeout: 10000 });
    
    // Verify login form elements are present
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Verify form labels and content
    await expect(page.locator('text=Login')).toBeVisible();
    await expect(page.locator('text=Digite seu email e senha')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/register');
    
    // Wait for register form to be visible
    await page.waitForSelector('#name', { timeout: 10000 });
    
    // Verify register form elements are present
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Verify form labels and content
    await expect(page.locator('text=Registrar')).toBeVisible();
    await expect(page.locator('text=Crie sua conta')).toBeVisible();
  });

  test('should navigate between login and register pages', async ({ page }) => {
    // Start at login
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    // Click register link
    await page.click('a[href="/register"]');
    await page.waitForURL('**/register');
    await expect(page.locator('#name')).toBeVisible();
    
    // Click login link
    await page.click('a[href="/login"]');
    await page.waitForURL('**/login');
    await expect(page.locator('#email')).toBeVisible();
  });

  test('should show validation errors on empty login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for HTML5 validation or custom error messages
    // The form should not submit and show validation
    const emailField = page.locator('#email');
    const passwordField = page.locator('#password');
    
    // Check if HTML5 validation is triggered
    await expect(emailField).toHaveAttribute('required');
    await expect(passwordField).toHaveAttribute('required');
  });

  test('should show validation errors on empty register form', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('#name');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation on required fields
    const nameField = page.locator('#name');
    const emailField = page.locator('#email');
    const passwordField = page.locator('#password');
    
    await expect(nameField).toHaveAttribute('required');
    await expect(emailField).toHaveAttribute('required');
    await expect(passwordField).toHaveAttribute('required');
  });

  test('should handle password mismatch in register form', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('#name');
    
    // Fill form with mismatched passwords
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirm-password', 'different123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show password mismatch error
    await expect(page.locator('text=As senhas não coincidem')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Protected Routes Redirection', () => {
  test('should redirect to login when accessing protected pages', async ({ page }) => {
    const protectedPages = [
      '/dashboard',
      '/transcriptions',
      '/quizzes',
      '/rooms',
      '/profile'
    ];
    
    for (const protectedPage of protectedPages) {
      await page.goto(protectedPage);
      
      // Should be redirected to login with callback URL
      await page.waitForURL('**/login**', { timeout: 10000 });
      
      // Verify the callback URL is set correctly
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
      expect(currentUrl).toContain('callbackUrl');
      
      console.log(`✓ ${protectedPage} correctly redirects to login`);
    }
  });
}); 