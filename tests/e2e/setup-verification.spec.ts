
import { test, expect } from '@playwright/test';

test.describe('Playwright Setup Verification', () => {
  test('should be able to navigate to the application', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
    
    // Verify the page loads and contains expected elements
    await expect(page).toHaveTitle(/ArQuiz|Quiz|Home/i);
    
    // Verify basic page structure
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have correct viewport and browser configuration', async ({ page, browserName }) => {
    // Log browser information
    console.log(`Running test on: ${browserName}`);
    
    // Verify viewport is set
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    expect(viewport?.width).toBeGreaterThan(0);
    expect(viewport?.height).toBeGreaterThan(0);
  });

  test('should be able to take screenshots', async ({ page }) => {
    await page.goto('/');
    
    // Take a screenshot to verify screenshot functionality
    await page.screenshot({ path: 'test-results/setup-verification.png' });
    
    // Verify we can interact with the page
    await page.locator('body').click();
  });

  test('should handle navigation between pages', async ({ page }) => {
    // Start at home page
    await page.goto('/');
    
    // Try to navigate to login page (should exist)
    await page.goto('/login');
    await expect(page).toHaveURL(/.*\/login/);
    
    // Navigate back to home
    await page.goto('/');
    await expect(page).toHaveURL(/.*\//);
  });
}); 