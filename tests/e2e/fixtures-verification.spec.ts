
import { test, expect } from '../fixtures/simple-fixtures';
import { generateRandomString } from '../utils/enhanced-test-helpers';

test.describe('Test Fixtures and Data Management Verification', () => {
  test('should be able to use simple page fixture', async ({ simplePage }) => {
    // Test that we can use simple page fixtures successfully
    const page = simplePage;
    
    // Verify we can access the page
    await expect(page).toHaveURL(/.*localhost.*/);
    
    // Check for basic page elements
    const bodyElement = page.locator('body');
    await expect(bodyElement).toBeVisible();
    
    console.log('Simple page fixture working correctly');
  });

  test('should be able to create mock room data', async ({ mockRoom }) => {
    // Test that we can use mock room fixtures successfully
    expect(mockRoom).toBeDefined();
    expect(mockRoom.code).toBe('TEST123');
    expect(mockRoom.name).toBe('Test Room');
    expect(mockRoom.participants).toBe(0);
    
    console.log('Mock room fixture created successfully:', mockRoom.name);
  });

  test('should generate random test data', async ({ simplePage }) => {
    // Test random data generation
    const randomString1 = generateRandomString(8);
    const randomString2 = generateRandomString(10);
    
    expect(randomString1).toBeDefined();
    expect(randomString2).toBeDefined();
    expect(randomString1.length).toBe(8);
    expect(randomString2.length).toBe(10);
    expect(randomString1).not.toBe(randomString2);
    
    console.log('Random data generation working:', randomString1, randomString2);
  });

  test('should handle mock authenticated state', async ({ mockAuthenticatedPage }) => {
    // Test mock authentication
    const page = mockAuthenticatedPage;
    
    // Verify we can access the page (may be dashboard or home)
    await expect(page).toHaveURL(/.*localhost.*/);
    
    // Check for basic page structure
    const bodyElement = page.locator('body');
    await expect(bodyElement).toBeVisible();
    
    console.log('Mock authenticated page fixture working correctly');
  });

  test('should handle basic navigation', async ({ simplePage }) => {
    const page = simplePage;
    
    // Test basic navigation capabilities
    await page.goto('/login', { timeout: 8000 });
    await expect(page).toHaveURL(/.*login.*/);
    
    await page.goto('/register', { timeout: 8000 });
    await expect(page).toHaveURL(/.*register.*/);
    
    console.log('Basic navigation test completed');
  });

  test('should verify test environment setup', async ({ simplePage }) => {
    const page = simplePage;
    
    // Verify basic test environment is working
    const title = await page.title();
    expect(title).toBeTruthy();
    
    const url = page.url();
    expect(url).toContain('localhost');
    
    console.log('Test environment verified:', { title, url });
  });
}); 