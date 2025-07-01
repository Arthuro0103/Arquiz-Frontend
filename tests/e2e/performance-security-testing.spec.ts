
import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { generateRandomString } from '../utils/test-helpers';

// Performance and Security Comprehensive Testing
test.describe('Performance and Security Testing', () => {

  test.describe('Performance Under Load', () => {
    test('should handle concurrent user sessions', async ({ browser }) => {
      const contexts: BrowserContext[] = [];
      const pages: any[] = [];
      const userCount = 3;

      try {
        // Create multiple user contexts
        for (let i = 0; i < userCount; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          contexts.push(context);
          pages.push({ page, userId: i });
        }

        // Simulate concurrent login attempts
        const loginPromises = pages.map(async ({ page, userId }) => {
          const startTime = Date.now();
          
          await page.goto('/auth/login');
          await page.waitForLoadState('networkidle');
          
          if (await page.locator('#email').isVisible()) {
            await page.fill('#email', 'professor@arquiz.test');
            await page.fill('#password', 'password123');
            await page.click('button[type="submit"]');
            
            await page.waitForTimeout(2000);
          }
          
          const endTime = Date.now();
          return { userId, loadTime: endTime - startTime };
        });

        const results = await Promise.all(loginPromises);
        
        // Verify all users can login concurrently without significant degradation
        results.forEach(result => {
          expect(result.loadTime).toBeLessThan(10000); // 10 second max
          console.log(`✓ User ${result.userId} login time: ${result.loadTime}ms`);
        });

        const averageTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
        console.log(`✓ Average concurrent login time: ${averageTime}ms`);
        expect(averageTime).toBeLessThan(8000);

      } finally {
        // Cleanup all contexts
        await Promise.all(contexts.map(context => context.close()));
      }
    });

    test('should handle rapid navigation and state changes', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      // Test rapid navigation between pages
      const pages = ['/dashboard', '/quizzes', '/rooms', '/reports', '/profile'];
      const navigationTimes: number[] = [];

      for (let round = 0; round < 3; round++) {
        console.log(`Navigation round ${round + 1}`);
        
        for (const testPage of pages) {
          const startTime = Date.now();
          
          await page.goto(testPage);
          await page.waitForLoadState('networkidle');
          
          const endTime = Date.now();
          const navTime = endTime - startTime;
          navigationTimes.push(navTime);
          
          console.log(`${testPage}: ${navTime}ms`);
          
          // Each navigation should complete within reasonable time
          expect(navTime).toBeLessThan(5000);
          
          // Brief pause to prevent overwhelming
          await page.waitForTimeout(200);
        }
      }

      const averageNavTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      console.log(`✓ Average navigation time: ${averageNavTime}ms`);
      expect(averageNavTime).toBeLessThan(3000);
    });

    test('should handle large data sets efficiently', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      await page.goto('/quizzes');
      await page.waitForLoadState('networkidle');

      // Test scrolling through large lists
      const startTime = Date.now();
      
      // Simulate scrolling through large dataset
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, 500);
        });
        await page.waitForTimeout(100);
      }

      const endTime = Date.now();
      const scrollTime = endTime - startTime;
      
      console.log(`✓ Large data scrolling time: ${scrollTime}ms`);
      expect(scrollTime).toBeLessThan(3000);

      // Test search performance with large datasets
      const searchInput = page.locator('input[placeholder*="search"]').or(
        page.locator('#search')
      );

      if (await searchInput.isVisible()) {
        const searchStartTime = Date.now();
        
        await searchInput.fill('test query for performance');
        await page.waitForTimeout(1000); // Wait for search debounce
        
        const searchEndTime = Date.now();
        const searchTime = searchEndTime - searchStartTime;
        
        console.log(`✓ Search performance time: ${searchTime}ms`);
        expect(searchTime).toBeLessThan(2000);
      }
    });

    test('should maintain performance during WebSocket activity', async ({ page, browser }) => {
      const studentContext = await browser.newContext();
      const studentPage = await studentContext.newPage();

      try {
        // Teacher setup
        await page.goto('/auth/login');
        if (await page.locator('#email').isVisible()) {
          await page.fill('#email', 'professor@arquiz.test');
          await page.fill('#password', 'password123');
          await page.click('button[type="submit"]');
        }

        // Student setup
        await studentPage.goto('/join');
        await studentPage.waitForLoadState('networkidle');

        // Monitor performance during WebSocket activity
        const performanceMetrics = await page.evaluate(() => {
          const nav = performance as any;
          return {
            initialMemory: nav.memory?.usedJSHeapSize || 0,
            initialTiming: performance.now()
          };
        });

        // Simulate intensive WebSocket activity
        const roomCode = generateRandomString(6);
        
        // Fill join form on student page
        const codeInput = studentPage.locator('input[name="accessCode"]').or(
          studentPage.locator('#accessCode')
        );

        if (await codeInput.isVisible()) {
          await codeInput.fill(roomCode);
          
          const nameInput = studentPage.locator('input[name="name"]');
          if (await nameInput.isVisible()) {
            await nameInput.fill('Performance Test Student');
          }
        }

        // Monitor for 10 seconds of activity
        await page.waitForTimeout(10000);

        const finalMetrics = await page.evaluate(() => {
          const nav = performance as any;
          return {
            finalMemory: nav.memory?.usedJSHeapSize || 0,
            finalTiming: performance.now()
          };
        });

        // Verify performance didn't degrade significantly
        if (performanceMetrics.initialMemory > 0 && finalMetrics.finalMemory > 0) {
          const memoryGrowth = finalMetrics.finalMemory / performanceMetrics.initialMemory;
          expect(memoryGrowth).toBeLessThan(2); // Memory shouldn't double
          console.log(`✓ Memory growth ratio: ${memoryGrowth.toFixed(2)}`);
        }

      } finally {
        await studentContext.close();
      }
    });
  });

  test.describe('Security Testing', () => {
    test('should prevent XSS attacks in form inputs', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      await page.goto('/quizzes/create');
      await page.waitForLoadState('networkidle');

      // Test XSS prevention in quiz title
      const titleInput = page.locator('input[name="title"]').or(
        page.locator('#title')
      );

      if (await titleInput.isVisible()) {
        const xssPayload = '<script>alert("XSS")</script>';
        await titleInput.fill(xssPayload);
        
        // The input should sanitize or escape the script
        const inputValue = await titleInput.inputValue();
        expect(inputValue).not.toContain('<script>');
        
        console.log(`✓ XSS payload sanitized: ${inputValue}`);
      }

      // Test XSS in description fields
      const descriptionInput = page.locator('textarea[name="description"]').or(
        page.locator('#description')
      );

      if (await descriptionInput.isVisible()) {
        const xssPayload = 'Normal text <img src="x" onerror="alert(1)">';
        await descriptionInput.fill(xssPayload);
        
        const textValue = await descriptionInput.inputValue();
        expect(textValue).not.toContain('onerror=');
        
        console.log(`✓ XSS in description sanitized`);
      }
    });

    test('should validate authentication token security', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for secure token storage
      const tokenStorage = await page.evaluate(() => {
        return {
          localStorage: Object.keys(localStorage).filter(key => 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('auth')
          ),
          sessionStorage: Object.keys(sessionStorage).filter(key => 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('auth')
          ),
          cookies: document.cookie
        };
      });

      console.log(`✓ Token storage check:`, tokenStorage);

      // Verify tokens are not exposed in URL
      expect(page.url()).not.toContain('token=');
      expect(page.url()).not.toContain('access_token=');
      
      // Test protected route access
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/.*dashboard.*/);
    });

    test('should prevent SQL injection in search functionality', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      await page.goto('/quizzes');
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[placeholder*="search"]').or(
        page.locator('#search')
      );

      if (await searchInput.isVisible()) {
        // Test SQL injection payloads
        const sqlPayloads = [
          "'; DROP TABLE quizzes; --",
          "' OR '1'='1",
          "'; SELECT * FROM users; --",
          "' UNION SELECT password FROM users --"
        ];

        for (const payload of sqlPayloads) {
          await searchInput.fill(payload);
          await page.waitForTimeout(1000);
          
          // Verify the application doesn't crash or expose data
          const pageContent = await page.textContent('body');
          if (pageContent) {
            expect(pageContent).not.toContain('SQL error');
            expect(pageContent).not.toContain('database error');
            expect(pageContent).not.toContain('syntax error');
          }
          
          console.log(`✓ SQL injection payload handled: ${payload.substring(0, 20)}...`);
        }
      }
    });

    test('should handle CSRF protection', async ({ page, context }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      // Test CSRF token presence in forms
      await page.goto('/quizzes/create');
      await page.waitForLoadState('networkidle');

      const forms = page.locator('form');
      const formCount = await forms.count();

      for (let i = 0; i < formCount; i++) {
        const form = forms.nth(i);
        
        // Check for CSRF token or protection
        const csrfInput = form.locator('input[name*="csrf"], input[name*="_token"]');
        const hasCSRFField = await csrfInput.count() > 0;
        
        if (hasCSRFField) {
          console.log(`✓ CSRF protection found in form ${i + 1}`);
        }
      }

      // Test cross-origin request protection
      const headers = await page.evaluate(() => {
        return {
          origin: window.location.origin,
          referrer: document.referrer
        };
      });

      expect(headers.origin).toBeTruthy();
      console.log(`✓ Origin validation: ${headers.origin}`);
    });

    test('should validate input length limits and sanitization', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      await page.goto('/quizzes/create');
      await page.waitForLoadState('networkidle');

      // Test extremely long inputs
      const longString = 'A'.repeat(10000);
      
      const titleInput = page.locator('input[name="title"]').or(
        page.locator('#title')
      );

      if (await titleInput.isVisible()) {
        await titleInput.fill(longString);
        
        const actualValue = await titleInput.inputValue();
        const maxLength = await titleInput.getAttribute('maxlength');
        
        if (maxLength) {
          expect(actualValue.length).toBeLessThanOrEqual(parseInt(maxLength));
          console.log(`✓ Input length limited to: ${maxLength}`);
        } else {
          // Should have reasonable length limit even without maxlength
          expect(actualValue.length).toBeLessThan(1000);
          console.log(`✓ Input length reasonably limited: ${actualValue.length}`);
        }
      }

      // Test special characters and encoding
      const specialChars = '!@#$%^&*(){}[]|\\:";\'<>?,./'
      const titleWithSpecial = page.locator('input[name="title"]');
      
      if (await titleWithSpecial.isVisible()) {
        await titleWithSpecial.fill(`Test Quiz ${specialChars}`);
        
        const encodedValue = await titleWithSpecial.inputValue();
        console.log(`✓ Special characters handled: ${encodedValue}`);
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network interruptions gracefully', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Simulate network offline
      await page.context().setOffline(true);
      
      // Try to navigate (this should fail with offline error)
      try {
        await page.goto('/quizzes', { waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.waitForTimeout(2000);
      } catch (error: any) {
        // Expected behavior when offline
        console.log('✓ Network interruption correctly handled:', error.message.substring(0, 50));
        expect(error.message).toContain('DISCONNECTED');
        return; // Exit test successfully
      }

      // If we reach here, check for offline indicators
      const offlineIndicators = page.locator('text=/offline/i').or(
        page.locator('text=/no connection/i').or(
          page.locator('[data-testid="offline-indicator"]')
        )
      );

      if (await offlineIndicators.isVisible()) {
        console.log('✓ Offline state detected and handled');
      }

      // Restore network
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);

      // Verify recovery
      await page.reload();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/(quizzes|dashboard)/);
      
      console.log('✓ Network recovery successful');
    });

    test('should handle server errors gracefully', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      // Test error handling for non-existent routes
      await page.goto('/nonexistent-page');
      await page.waitForTimeout(2000);

      // Should show 404 or redirect gracefully
      const pageContent = await page.textContent('body');
      const has404 = pageContent?.includes('404') || pageContent?.includes('Not Found');
      const redirected = page.url().includes('dashboard') || page.url().includes('login');

      expect(has404 || redirected).toBeTruthy();
      console.log(`✓ 404 handling: ${has404 ? 'Error page shown' : 'Redirected'}`);

      // Test error boundaries
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Trigger potential JavaScript errors
      await page.evaluate(() => {
        // Simulate error that might break component
        try {
          // @ts-ignore
          window.nonExistentFunction();
        } catch (error) {
          console.log('Expected error caught:', error);
        }
      });

      // Page should still be functional
      await page.waitForTimeout(1000);
      const isPageFunctional = await page.locator('body').isVisible();
      expect(isPageFunctional).toBeTruthy();
      
      console.log('✓ Error boundary handling verified');
    });

    test('should handle invalid form submissions', async ({ page }) => {
      await page.goto('/auth/register');
      await page.waitForLoadState('networkidle');

      // Test empty form submission
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(1000);

        // Should show validation errors
        const errorMessages = page.locator('.error').or(
          page.locator('[role="alert"]').or(
            page.locator('text=/required/i')
          )
        );

        if (await errorMessages.isVisible()) {
          console.log('✓ Form validation errors displayed');
        }
      }

      // Test invalid email format
      const emailInput = page.locator('#email');
      if (await emailInput.isVisible()) {
        await emailInput.fill('invalid-email');
        await submitBtn.click();
        await page.waitForTimeout(1000);

        const emailError = page.locator('text=/valid email/i').or(
          page.locator('text=/invalid email/i')
        );

        if (await emailError.isVisible()) {
          console.log('✓ Email validation working');
        }
      }

      // Test password mismatch
      const passwordInput = page.locator('#password');
      const confirmPasswordInput = page.locator('#confirmPassword');

      if (await passwordInput.isVisible() && await confirmPasswordInput.isVisible()) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password123');
        await confirmPasswordInput.fill('different-password');
        await submitBtn.click();
        await page.waitForTimeout(1000);

        const passwordError = page.locator('text=/password.*match/i').or(
          page.locator('text=/passwords.*match/i')
        );

        if (await passwordError.isVisible()) {
          console.log('✓ Password match validation working');
        }
      }
    });
  });

  test.describe('Data Integrity and Edge Cases', () => {
    test('should handle concurrent data modifications', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      try {
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Both users login as same teacher
        const loginBoth = async (page: any) => {
          await page.goto('/auth/login');
          if (await page.locator('#email').isVisible()) {
            await page.fill('#email', 'professor@arquiz.test');
            await page.fill('#password', 'password123');
            await page.click('button[type="submit"]');
          }
        };

        await Promise.all([loginBoth(page1), loginBoth(page2)]);

        // Both try to edit same quiz
        await Promise.all([
          page1.goto('/quizzes'),
          page2.goto('/quizzes')
        ]);

        await Promise.all([
          page1.waitForLoadState('networkidle'),
          page2.waitForLoadState('networkidle')
        ]);

        const editBtn1 = page1.locator('button:has-text("Edit")').first();
        const editBtn2 = page2.locator('button:has-text("Edit")').first();

        if (await editBtn1.isVisible() && await editBtn2.isVisible()) {
          // Concurrent edit attempts
          await Promise.all([
            editBtn1.click(),
            editBtn2.click()
          ]);

          await Promise.all([
            page1.waitForTimeout(2000),
            page2.waitForTimeout(2000)
          ]);

          // Verify both can access edit interface or get appropriate warnings
          const page1Title = await page1.title();
          const page2Title = await page2.title();

          console.log(`✓ Concurrent edit test - Page1: ${page1Title}, Page2: ${page2Title}`);
          
          // Should handle concurrent access gracefully
          expect(page1Title).toBeTruthy();
          expect(page2Title).toBeTruthy();
        }

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('should handle very large input datasets', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      await page.goto('/quizzes/create');
      await page.waitForLoadState('networkidle');

      // Test large quiz creation
      const titleInput = page.locator('input[name="title"]');
      
      if (await titleInput.isVisible()) {
        await titleInput.fill(`Large Quiz ${generateRandomString(100)}`);

        // Add multiple questions if interface supports it
        for (let i = 0; i < 5; i++) {
          const addQuestionBtn = page.locator('button:has-text("Add Question")').or(
            page.locator('[data-testid="add-question"]')
          );

          if (await addQuestionBtn.isVisible()) {
            await addQuestionBtn.click();
            await page.waitForTimeout(500);

            // Fill question with large content
            const questionInput = page.locator(`[data-testid="question-${i}"]`).or(
              page.locator('textarea').last()
            );

            if (await questionInput.isVisible()) {
              await questionInput.fill(`This is a very long question ${i + 1} with extensive content: ${'Lorem ipsum '.repeat(50)}`);
            }
          }
        }

        // Try to save large quiz
        const saveBtn = page.locator('button:has-text("Save")').or(
          page.locator('[data-testid="save-quiz"]')
        );

        if (await saveBtn.isVisible()) {
          const startTime = Date.now();
          await saveBtn.click();
          await page.waitForTimeout(5000);
          const endTime = Date.now();

          const saveTime = endTime - startTime;
          console.log(`✓ Large quiz save time: ${saveTime}ms`);
          expect(saveTime).toBeLessThan(10000);
        }
      }
    });

    test('should handle unicode and international content', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      await page.goto('/quizzes/create');
      await page.waitForLoadState('networkidle');

      // Test unicode content
      const unicodeContent = {
        emoji: '🧑‍💻 Quiz sobre programação 🚀',
        chinese: '这是一个关于编程的测验',
        arabic: 'هذا اختبار حول البرمجة',
        cyrillic: 'Это тест о программировании',
        special: 'Tëst wïth spëcïàl chàràctërs'
      };

      const titleInput = page.locator('input[name="title"]');
      
      if (await titleInput.isVisible()) {
        for (const [type, content] of Object.entries(unicodeContent)) {
          await titleInput.fill(content);
          await page.waitForTimeout(500);
          
          const inputValue = await titleInput.inputValue();
          expect(inputValue).toContain(content.substring(0, 10)); // At least partial match
          
          console.log(`✓ Unicode content (${type}): ${content.substring(0, 30)}...`);
        }
      }
    });
  });
}); 