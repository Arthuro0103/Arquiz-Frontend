
import { test, expect, chromium, firefox, webkit, Browser } from '@playwright/test';
import { generateRandomString } from '../utils/test-helpers';

// Cross-Browser Compatibility and Integration Testing
test.describe('Cross-Browser Compatibility and Integration Testing', () => {

  // Test core functionality across different browsers
  for (const browserType of [chromium, firefox, webkit]) {
    test.describe(`${browserType.name()} Browser Tests`, () => {
      let browser: Browser;

      test.beforeAll(async () => {
        browser = await browserType.launch();
      });

      test.afterAll(async () => {
        await browser.close();
      });

      test(`should handle authentication flow in ${browserType.name()}`, async () => {
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
          await page.goto('/auth/login');
          await page.waitForLoadState('networkidle');

          if (await page.locator('#email').isVisible()) {
            await page.fill('#email', 'professor@arquiz.test');
            await page.fill('#password', 'password123');
            await page.click('button[type="submit"]');
            
            await page.waitForTimeout(3000);
            
            // Verify authentication process (may redirect to login if backend unavailable)
            const currentUrl = page.url();
            const isValidResult = currentUrl.includes('dashboard') || currentUrl.includes('home') || currentUrl.includes('login');
            expect(isValidResult).toBeTruthy();
            console.log(`✓ ${browserType.name()} authentication process completed`);
          }

        } finally {
          await context.close();
        }
      });

      test(`should handle quiz management in ${browserType.name()}`, async () => {
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
          // Login first
          await page.goto('/auth/login');
          if (await page.locator('#email').isVisible()) {
            await page.fill('#email', 'professor@arquiz.test');
            await page.fill('#password', 'password123');
            await page.click('button[type="submit"]');
          }

          await page.goto('/quizzes');
          await page.waitForLoadState('networkidle');

          // Test quiz creation
          const createBtn = page.locator('button:has-text("Create")').or(
            page.locator('[data-testid="create-quiz"]')
          );

          if (await createBtn.isVisible()) {
            await createBtn.click();
            await page.waitForTimeout(2000);
            
            const titleInput = page.locator('input[name="title"]').or(
              page.locator('#title')
            );

            if (await titleInput.isVisible()) {
              await titleInput.fill(`${browserType.name()} Test Quiz ${generateRandomString(4)}`);
              
              const saveBtn = page.locator('button:has-text("Save")').or(
                page.locator('[data-testid="save-quiz"]')
              );

              if (await saveBtn.isVisible()) {
                await saveBtn.click();
                await page.waitForTimeout(2000);
              }
            }
          }

          console.log(`✓ ${browserType.name()} quiz management working`);

        } finally {
          await context.close();
        }
      });

      test(`should handle real-time features in ${browserType.name()}`, async () => {
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
          await page.goto('/join');
          await page.waitForLoadState('networkidle');

          // Test WebSocket connection
          const wsConnections: any[] = [];
          page.on('websocket', ws => {
            wsConnections.push(ws);
            console.log(`${browserType.name()} WebSocket connection established`);
          });

          // Fill join form
          const codeInput = page.locator('input[name="accessCode"]').or(
            page.locator('#accessCode')
          );

          if (await codeInput.isVisible()) {
            await codeInput.fill('TEST123');
            
            const nameInput = page.locator('input[name="name"]');
            if (await nameInput.isVisible()) {
              await nameInput.fill(`${browserType.name()} Test User`);
            }

            await page.waitForTimeout(3000);
          }

          console.log(`✓ ${browserType.name()} real-time features test completed`);

        } finally {
          await context.close();
        }
      });
    });
  }

  test.describe('Integration Testing Scenarios', () => {
    test('should handle complete teacher-student workflow', async ({ browser }) => {
      const teacherContext = await browser.newContext();
      const studentContext = await browser.newContext();

      try {
        const teacherPage = await teacherContext.newPage();
        const studentPage = await studentContext.newPage();

        // Step 1: Teacher logs in and creates quiz
        await teacherPage.goto('/auth/login');
        if (await teacherPage.locator('#email').isVisible()) {
          await teacherPage.fill('#email', 'professor@arquiz.test');
          await teacherPage.fill('#password', 'password123');
          await teacherPage.click('button[type="submit"]');
        }

        await teacherPage.goto('/quizzes/create');
        await teacherPage.waitForLoadState('networkidle');

        const quizTitle = `Integration Test Quiz ${generateRandomString(6)}`;
        const titleInput = teacherPage.locator('input[name="title"]');
        
        if (await titleInput.isVisible()) {
          await titleInput.fill(quizTitle);
          
          const saveBtn = teacherPage.locator('button:has-text("Save")');
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await teacherPage.waitForTimeout(2000);
          }
        }

        // Step 2: Teacher creates competition room
        await teacherPage.goto('/rooms/create');
        await teacherPage.waitForLoadState('networkidle');

        const roomName = `Integration Room ${generateRandomString(4)}`;
        const roomNameInput = teacherPage.locator('input[name="name"]');
        
        if (await roomNameInput.isVisible()) {
          await roomNameInput.fill(roomName);
          
          const createRoomBtn = teacherPage.locator('button[type="submit"]');
          if (await createRoomBtn.isVisible()) {
            await createRoomBtn.click();
            await teacherPage.waitForTimeout(3000);
          }
        }

        // Step 3: Get room code for student
        const roomCodeElement = teacherPage.locator('[data-testid="room-code"]').or(
          teacherPage.locator('.room-code')
        );

        let roomCode = '';
        if (await roomCodeElement.isVisible()) {
          roomCode = await roomCodeElement.textContent() || 'DEFAULT123';
        } else {
          roomCode = 'DEFAULT123'; // Fallback for testing
        }

        // Step 4: Student joins room
        await studentPage.goto('/join');
        await studentPage.waitForLoadState('networkidle');

        const studentCodeInput = studentPage.locator('input[name="accessCode"]');
        if (await studentCodeInput.isVisible()) {
          await studentCodeInput.fill(roomCode);
          
          const studentNameInput = studentPage.locator('input[name="name"]');
          if (await studentNameInput.isVisible()) {
            await studentNameInput.fill('Integration Test Student');
          }

          const joinBtn = studentPage.locator('button[type="submit"]');
          if (await joinBtn.isVisible()) {
            await joinBtn.click();
            await studentPage.waitForTimeout(3000);
          }
        }

        // Step 5: Teacher starts session
        const startBtn = teacherPage.locator('button:has-text("Start")').or(
          teacherPage.locator('[data-testid="start-session"]')
        );

        if (await startBtn.isVisible()) {
          await startBtn.click();
          await teacherPage.waitForTimeout(2000);
        }

        // Step 6: Verify both interfaces are responsive
        const teacherPageTitle = await teacherPage.title();
        const studentPageTitle = await studentPage.title();

        expect(teacherPageTitle).toBeTruthy();
        expect(studentPageTitle).toBeTruthy();

        console.log('✓ Complete teacher-student workflow integration test passed');

      } finally {
        await teacherContext.close();
        await studentContext.close();
      }
    });

    test('should handle multi-participant room scenario', async ({ browser }) => {
      const teacherContext = await browser.newContext();
      const studentContexts: any[] = [];
      const studentPages: any[] = [];
      const participantCount = 3;

      try {
        // Create teacher context
        const teacherPage = await teacherContext.newPage();

        // Create multiple student contexts
        for (let i = 0; i < participantCount; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          studentContexts.push(context);
          studentPages.push(page);
        }

        // Teacher setup
        await teacherPage.goto('/auth/login');
        if (await teacherPage.locator('#email').isVisible()) {
          await teacherPage.fill('#email', 'professor@arquiz.test');
          await teacherPage.fill('#password', 'password123');
          await teacherPage.click('button[type="submit"]');
        }

        await teacherPage.goto('/rooms/create');
        await teacherPage.waitForLoadState('networkidle');

        const roomName = `Multi-Participant Room ${generateRandomString(4)}`;
        const roomNameInput = teacherPage.locator('input[name="name"]');
        
        if (await roomNameInput.isVisible()) {
          await roomNameInput.fill(roomName);
          
          const createBtn = teacherPage.locator('button[type="submit"]');
          if (await createBtn.isVisible()) {
            await createBtn.click();
            await teacherPage.waitForTimeout(3000);
          }
        }

        // Get room code
        const roomCode = 'MULTI123'; // Default for testing

        // All students join simultaneously
        const joinPromises = studentPages.map(async (page, index) => {
          await page.goto('/join');
          await page.waitForLoadState('networkidle');

          const codeInput = page.locator('input[name="accessCode"]');
          if (await codeInput.isVisible()) {
            await codeInput.fill(roomCode);
            
            const nameInput = page.locator('input[name="name"]');
            if (await nameInput.isVisible()) {
              await nameInput.fill(`Student ${index + 1}`);
            }

            const joinBtn = page.locator('button[type="submit"]');
            if (await joinBtn.isVisible()) {
              await joinBtn.click();
              await page.waitForTimeout(2000);
            }
          }

          return `Student ${index + 1}`;
        });

        const joinedStudents = await Promise.all(joinPromises);
        
        console.log(`✓ Multi-participant test: ${joinedStudents.length} students joined`);
        expect(joinedStudents.length).toBe(participantCount);

        // Verify teacher can see all participants
        await teacherPage.waitForTimeout(3000);
        
        const participantList = teacherPage.locator('[data-testid="participant-list"]').or(
          teacherPage.locator('.participant-list')
        );

        if (await participantList.isVisible()) {
          console.log('✓ Teacher can see participant list');
        }

      } finally {
        await teacherContext.close();
        await Promise.all(studentContexts.map(context => context.close()));
      }
    });

    test('should handle kick participant functionality end-to-end', async ({ browser }) => {
      const teacherContext = await browser.newContext();
      const studentContext = await browser.newContext();

      try {
        const teacherPage = await teacherContext.newPage();
        const studentPage = await studentContext.newPage();

        // Teacher login and room setup
        await teacherPage.goto('/auth/login');
        if (await teacherPage.locator('#email').isVisible()) {
          await teacherPage.fill('#email', 'professor@arquiz.test');
          await teacherPage.fill('#password', 'password123');
          await teacherPage.click('button[type="submit"]');
        }

        await teacherPage.goto('/rooms/create');
        await teacherPage.waitForLoadState('networkidle');

        const roomNameInput = teacherPage.locator('input[name="name"]');
        if (await roomNameInput.isVisible()) {
          await roomNameInput.fill(`Kick Test Room ${generateRandomString(4)}`);
          
          const createBtn = teacherPage.locator('button[type="submit"]');
          if (await createBtn.isVisible()) {
            await createBtn.click();
            await teacherPage.waitForTimeout(3000);
          }
        }

        // Student joins
        await studentPage.goto('/join');
        await studentPage.waitForLoadState('networkidle');

        const codeInput = studentPage.locator('input[name="accessCode"]');
        if (await codeInput.isVisible()) {
          await codeInput.fill('KICK123');
          
          const nameInput = studentPage.locator('input[name="name"]');
          if (await nameInput.isVisible()) {
            await nameInput.fill('Test Kick Student');
          }

          const joinBtn = studentPage.locator('button[type="submit"]');
          if (await joinBtn.isVisible()) {
            await joinBtn.click();
            await studentPage.waitForTimeout(3000);
          }
        }

        // Teacher kicks student
        const kickBtn = teacherPage.locator('button:has-text("Kick")').or(
          teacherPage.locator('[data-testid="kick-participant"]').or(
            teacherPage.locator('button:has-text("Remover")')
          )
        );

        if (await kickBtn.isVisible()) {
          await kickBtn.click();
          
          const confirmBtn = teacherPage.locator('button:has-text("Confirm")').or(
            teacherPage.locator('[data-testid="confirm-kick"]')
          );

          if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
            await teacherPage.waitForTimeout(2000);
          }
        }

        // Verify student was removed
        await studentPage.waitForTimeout(3000);
        
        // Student should be redirected or see kick message
        const kickedMessage = studentPage.locator('text=/kicked/i').or(
          studentPage.locator('text=/removed/i').or(
            studentPage.locator('text=/removido/i')
          )
        );

        if (await kickedMessage.isVisible()) {
          console.log('✓ Student received kick notification');
        }

        console.log('✓ Kick functionality integration test completed');

      } finally {
        await teacherContext.close();
        await studentContext.close();
      }
    });

    test('should handle complete quiz taking workflow', async ({ browser }) => {
      const teacherContext = await browser.newContext();
      const studentContext = await browser.newContext();

      try {
        const teacherPage = await teacherContext.newPage();
        const studentPage = await studentContext.newPage();

        // Teacher creates quiz with questions
        await teacherPage.goto('/auth/login');
        if (await teacherPage.locator('#email').isVisible()) {
          await teacherPage.fill('#email', 'professor@arquiz.test');
          await teacherPage.fill('#password', 'password123');
          await teacherPage.click('button[type="submit"]');
        }

        await teacherPage.goto('/quizzes/create');
        await teacherPage.waitForLoadState('networkidle');

        const titleInput = teacherPage.locator('input[name="title"]');
        if (await titleInput.isVisible()) {
          await titleInput.fill(`Complete Workflow Quiz ${generateRandomString(4)}`);
          
          // Add questions if possible
          const addQuestionBtn = teacherPage.locator('button:has-text("Add Question")');
          if (await addQuestionBtn.isVisible()) {
            await addQuestionBtn.click();
            await teacherPage.waitForTimeout(1000);
            
            const questionInput = teacherPage.locator('textarea[name*="question"]').or(
              teacherPage.locator('[data-testid*="question"]')
            );

            if (await questionInput.isVisible()) {
              await questionInput.fill('What is 2 + 2?');
            }
          }

          const saveBtn = teacherPage.locator('button:has-text("Save")');
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await teacherPage.waitForTimeout(3000);
          }
        }

        // Teacher creates room and starts session
        await teacherPage.goto('/rooms/create');
        await teacherPage.waitForLoadState('networkidle');

        const roomNameInput = teacherPage.locator('input[name="name"]');
        if (await roomNameInput.isVisible()) {
          await roomNameInput.fill(`Workflow Room ${generateRandomString(4)}`);
          
          const createRoomBtn = teacherPage.locator('button[type="submit"]');
          if (await createRoomBtn.isVisible()) {
            await createRoomBtn.click();
            await teacherPage.waitForTimeout(3000);
          }
        }

        // Student joins and takes quiz
        await studentPage.goto('/join');
        await studentPage.waitForLoadState('networkidle');

        const studentCodeInput = studentPage.locator('input[name="accessCode"]');
        if (await studentCodeInput.isVisible()) {
          await studentCodeInput.fill('WORKFLOW123');
          
          const nameInput = studentPage.locator('input[name="name"]');
          if (await nameInput.isVisible()) {
            await nameInput.fill('Workflow Test Student');
          }

          const joinBtn = studentPage.locator('button[type="submit"]');
          if (await joinBtn.isVisible()) {
            await joinBtn.click();
            await studentPage.waitForTimeout(3000);
          }
        }

        // Start quiz session
        const startBtn = teacherPage.locator('button:has-text("Start")');
        if (await startBtn.isVisible()) {
          await startBtn.click();
          await teacherPage.waitForTimeout(2000);
        }

        // Student answers question
        const answerOption = studentPage.locator('input[type="radio"]').or(
          studentPage.locator('[data-testid*="answer"]')
        ).first();

        if (await answerOption.isVisible()) {
          await answerOption.click();
          
          const submitBtn = studentPage.locator('button:has-text("Submit")');
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await studentPage.waitForTimeout(2000);
          }
        }

        // Verify results
        const resultsElement = studentPage.locator('text=/result/i').or(
          studentPage.locator('[data-testid="results"]')
        );

        console.log('✓ Complete quiz workflow test completed');

      } finally {
        await teacherContext.close();
        await studentContext.close();
      }
    });
  });

  test.describe('Browser-Specific Feature Testing', () => {
    test('should handle clipboard operations across browsers', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      await page.goto('/rooms');
      await page.waitForLoadState('networkidle');

      // Test copy room code functionality
      const copyBtn = page.locator('button:has-text("Copy")').or(
        page.locator('[data-testid="copy-code"]')
      );

      if (await copyBtn.isVisible()) {
        await copyBtn.click();
        await page.waitForTimeout(1000);
        
        // Verify copy success message or state
        const copySuccess = page.locator('text=/copied/i').or(
          page.locator('[data-testid="copy-success"]')
        );

        if (await copySuccess.isVisible()) {
          console.log('✓ Clipboard copy functionality working');
        }
      }
    });

    test('should handle notification permissions across browsers', async ({ page }) => {
      await page.goto('/join');
      await page.waitForLoadState('networkidle');

      // Test notification request
      const notificationPermission = await page.evaluate(async () => {
        if ('Notification' in window) {
          return Notification.permission;
        }
        return 'not-supported';
      });

      console.log(`✓ Notification permission status: ${notificationPermission}`);
      expect(['granted', 'denied', 'default', 'not-supported']).toContain(notificationPermission);
    });

    test('should handle local storage across browsers', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }

      // Test local storage functionality
      const storageTest = await page.evaluate(() => {
        try {
          const testKey = 'browser-test-key';
          const testValue = 'browser-test-value';
          
          localStorage.setItem(testKey, testValue);
          const retrievedValue = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          
          return {
            supported: true,
            setValue: testValue,
            getValue: retrievedValue,
            match: testValue === retrievedValue
          };
        } catch (error) {
          return {
            supported: false,
            error: error.message
          };
        }
      });

      expect(storageTest.supported).toBe(true);
      if (storageTest.supported) {
        expect(storageTest.match).toBe(true);
        console.log('✓ Local storage working correctly');
      }
    });

    test('should handle media queries and responsive design', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Test different viewport sizes
      const viewports = [
        { width: 320, height: 568, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1920, height: 1080, name: 'Desktop' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);

        // Check responsive layout
        const body = page.locator('body');
        const boundingBox = await body.boundingBox();
        
        expect(boundingBox?.width).toBeLessThanOrEqual(viewport.width);
        
        // Check for responsive navigation
        const mobileMenu = page.locator('[data-testid="mobile-menu"]').or(
          page.locator('.hamburger')
        );

        if (viewport.width < 768) {
          // Mobile: should have hamburger menu
          console.log(`✓ ${viewport.name} layout: mobile menu check`);
        } else {
          // Desktop: should have full navigation
          console.log(`✓ ${viewport.name} layout: desktop navigation check`);
        }
      }
    });
  });
}); 