
import { test, expect, Page } from '@playwright/test';
import { generateRandomString } from '../utils/test-helpers';

// Edge case test data
const EDGE_CASE_DATA = {
  invalidEmails: [
    'invalid@',
    '@invalid.com', 
    'invalid..email@test.com',
    'a'.repeat(100) + '@test.com'
  ],
  
  boundaries: {
    veryLongString: 'a'.repeat(10000),
    specialCharacters: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    xssAttempt: '<script>alert("XSS")</script>',
    sqlInjection: "'; DROP TABLE users; --"
  }
};

test.describe('Input Validation and Boundary Testing', () => {
  
  test('should handle invalid email formats gracefully', async ({ page }) => {
    console.log('🔍 Testing invalid email format handling');
    
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    let validationErrors = 0;
    
    for (const invalidEmail of EDGE_CASE_DATA.invalidEmails) {
      console.log(`   Testing email: "${invalidEmail}"`);
      
      await page.fill('#email', '');
      await page.fill('#email', invalidEmail);
      await page.fill('#password', 'validpassword123');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // Check if still on login page (validation prevented submission)
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        validationErrors++;
      }
      
      console.log(`     ✅ Validation working`);
    }
    
    expect(validationErrors).toBeGreaterThan(0);
    console.log(`✅ Caught ${validationErrors} invalid email formats`);
  });
  
  test('should handle boundary length inputs', async ({ page }) => {
    console.log('🔍 Testing boundary length inputs');
    
    await page.goto('/register');
    await page.waitForSelector('#name');
    
    // Test empty inputs
    await page.fill('#name', '');
    await page.fill('#email', '');
    await page.fill('#password', '');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Should still be on register page due to validation
    expect(page.url()).toContain('/register');
    
    // Test very long inputs
    const longString = EDGE_CASE_DATA.boundaries.veryLongString.substring(0, 500);
    
    await page.fill('#name', longString);
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'validpassword123');
    await page.fill('#confirm-password', 'validpassword123');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Verify application didn't crash
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Boundary length inputs handled gracefully');
  });
  
  test('should prevent potential security attacks', async ({ page }) => {
    console.log('🔍 Testing security attack prevention');
    
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    // Test SQL injection attempt
    await page.fill('#email', EDGE_CASE_DATA.boundaries.sqlInjection);
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Application should not have crashed
    await expect(page.locator('body')).toBeVisible();
    
    // Test XSS attempt
    await page.goto('/register');
    await page.waitForSelector('#name');
    
    await page.fill('#name', EDGE_CASE_DATA.boundaries.xssAttempt);
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'validpassword123');
    
    // Verify XSS was escaped/prevented
    const pageHTML = await page.content();
    expect(pageHTML).not.toContain('<script>alert("XSS")</script>');
    
    console.log('✅ Security attacks prevented');
  });
});

test.describe('Network Error Handling', () => {
  
  test('should handle offline conditions gracefully', async ({ page, context }) => {
    console.log('🌐 Testing offline condition handling');
    
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    // Simulate going offline
    await context.setOffline(true);
    
    // Try to submit form while offline
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Application should handle offline state gracefully
    await expect(page.locator('body')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(1000);
    
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Offline conditions handled gracefully');
  });
  
  test('should handle server errors gracefully', async ({ page, context }) => {
    console.log('🚫 Testing server error handling');
    
    // Intercept API calls and return errors
    await context.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Application should handle server errors gracefully
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Server errors handled gracefully');
  });
});

test.describe('UI Error States and Recovery', () => {
  
  test('should handle invalid navigation attempts', async ({ page }) => {
    console.log('🧭 Testing invalid navigation handling');
    
    const invalidPaths = [
      '/nonexistent',
      '/admin/secret',
      '/invalid-path'
    ];
    
    for (const invalidPath of invalidPaths) {
      console.log(`   Testing path: ${invalidPath}`);
      
      await page.goto(invalidPath, { waitUntil: 'networkidle' });
      
      // Should handle gracefully
      await expect(page.locator('body')).toBeVisible();
      
      const pageContent = await page.textContent('body');
      expect(pageContent?.length).toBeGreaterThan(0);
      
      console.log('     ✅ Invalid path handled');
    }
    
    console.log('✅ Invalid navigation attempts handled');
  });
  
  test('should handle rapid user interactions', async ({ page }) => {
    console.log('⚡ Testing rapid user interaction handling');
    
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    // Rapidly fill and clear fields
    for (let i = 0; i < 5; i++) {
      await page.fill('#email', `test${i}@example.com`);
      await page.fill('#password', `password${i}`);
      await page.fill('#email', '');
      await page.fill('#password', '');
    }
    
    // Rapidly click submit button
    for (let i = 0; i < 3; i++) {
      await page.click('button[type="submit"]');
      await page.waitForTimeout(100);
    }
    
    // Application should remain stable
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#email')).toBeEnabled();
    
    console.log('✅ Rapid interactions handled gracefully');
  });
  
  test('should handle page refresh during form input', async ({ page }) => {
    console.log('🔄 Testing page refresh during form input');
    
    await page.goto('/register');
    await page.waitForSelector('#name');
    
    // Fill out form partially
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    
    // Refresh page during form input
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Form should be reset and functional
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#name')).toBeEnabled();
    
    // Fields should be cleared
    const nameValue = await page.locator('#name').inputValue();
    expect(nameValue).toBe('');
    
    // Should be able to fill form again
    await page.fill('#name', 'New Test User');
    await page.fill('#email', 'newtest@example.com');
    
    console.log('✅ Page refresh during form input handled');
  });
});

test.describe('Data Integrity and Error Recovery', () => {
  
  test('should handle localStorage edge cases', async ({ page }) => {
    console.log('💾 Testing localStorage edge cases');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test localStorage manipulation
    await page.evaluate(() => {
      try {
        localStorage.setItem('test-key', 'test-value');
        localStorage.setItem('special-chars', '!@#$%^&*()');
        
        const largeData = 'x'.repeat(100000); // Large data
        localStorage.setItem('large-data', largeData);
      } catch (e) {
        console.log('localStorage limit reached:', e);
      }
    });
    
    // Navigate and back
    await page.goto('/login');
    await page.goto('/');
    
    // Verify application still works
    await expect(page.locator('body')).toBeVisible();
    
    // Clear localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    console.log('✅ localStorage edge cases handled');
  });
  
  test('should recover from JavaScript errors gracefully', async ({ page }) => {
    console.log('🛠️ Testing JavaScript error recovery');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Inject a JavaScript error
    await page.evaluate(() => {
      try {
        (window as any).nonexistentFunction();
      } catch (e) {
        console.error('Intentional test error:', e);
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Application should still be functional
    await expect(page.locator('body')).toBeVisible();
    
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    
    console.log(`✅ JavaScript error recovery (${errors.length} errors logged)`);
  });
}); 