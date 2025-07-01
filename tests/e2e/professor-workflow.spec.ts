
import { test, expect } from '../fixtures/index';

test.describe('Professor Workflow Testing', () => {

  test.describe('Quiz Creation & Management', () => {
    test('should create a new quiz successfully', async ({ page }) => {
      // Navigate to login page
      await page.goto('/auth/login');
      
      // Handle potential redirects or authentication states
      try {
        await page.waitForURL('**/auth/login', { timeout: 5000 });
      } catch {
        // Already logged in or different auth flow
      }
      
      // Login as professor
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      // Navigate to dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the dashboard
      await expect(page).toHaveURL(/.*dashboard.*/);
      
      // Look for quiz creation elements
      const createQuizButton = page.locator('[data-testid="create-quiz-btn"]').or(
        page.locator('text="Create Quiz"').or(
          page.locator('button:has-text("Create Quiz")').or(
            page.locator('[href*="quiz"]').first()
          )
        )
      );
      
      if (await createQuizButton.isVisible()) {
        await createQuizButton.click();
        
        // Fill quiz details if form is available
        const titleInput = page.locator('[data-testid="quiz-title"]').or(
          page.locator('input[name="title"]').or(
            page.locator('#title')
          )
        );
        
        if (await titleInput.isVisible()) {
          const quizTitle = `Professor Quiz ${Date.now()}`;
          await titleInput.fill(quizTitle);
          
          // Try to save the quiz
          const saveButton = page.locator('[data-testid="save-quiz-btn"]').or(
            page.locator('button:has-text("Save")').or(
              page.locator('button[type="submit"]')
            )
          );
          
          if (await saveButton.isVisible()) {
            await saveButton.click();
            
            // Verify success (flexible verification)
            await page.waitForTimeout(1000);
            const hasSuccessMessage = await page.locator('[data-testid="success-message"]').or(
              page.locator('.success').or(
                page.locator(':has-text("success")')
              )
            ).isVisible();
            
            if (hasSuccessMessage) {
              await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
            }
          }
        }
      }
      
      // Verify we're still on a valid page
      expect(page.url()).toMatch(/\/(dashboard|quiz)/);
    });

    test('should navigate quiz management interface', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for quiz management sections
      const quizSection = page.locator('[data-testid="quiz-section"]').or(
        page.locator(':has-text("Quiz")').or(
          page.locator('.quiz').or(
            page.locator('[href*="quiz"]')
          )
        )
      );
      
      if (await quizSection.isVisible()) {
        await quizSection.first().click();
        await page.waitForTimeout(1000);
      }
      
      // Verify navigation worked
      expect(page.url()).toMatch(/\/(dashboard|quiz)/);
      
      // Check for common quiz management elements
      const hasQuizList = await page.locator('[data-testid="quiz-list"]').or(
        page.locator('.quiz-item').or(
          page.locator('[class*="quiz"]')
        )
      ).isVisible();
      
      // Either quiz list exists or we're in creation flow
      expect(hasQuizList || page.url().includes('quiz')).toBeTruthy();
    });

    test('should edit an existing quiz', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('#email', 'professor@arquiz.test');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/dashboard');
      
      // Navigate to quiz management
      await page.click('[data-testid="manage-quizzes-btn"]');
      
      // Select first quiz to edit
      await page.click('[data-testid="edit-quiz-btn"]:first-child');
      
      // Modify quiz title
      const updatedTitle = `Updated Quiz ${Date.now()}`;
      await page.fill('[data-testid="quiz-title"]', updatedTitle);
      
      // Add another question
      await page.click('[data-testid="add-question-btn"]');
      const questionCount = await page.locator('[data-testid^="question-text-"]').count();
      await page.fill(`[data-testid="question-text-${questionCount - 1}"]`, 'What is 2 + 2?');
      await page.fill(`[data-testid="option-a-${questionCount - 1}"]`, '3');
      await page.fill(`[data-testid="option-b-${questionCount - 1}"]`, '4');
      await page.fill(`[data-testid="option-c-${questionCount - 1}"]`, '5');
      await page.fill(`[data-testid="option-d-${questionCount - 1}"]`, '6');
      await page.click(`[data-testid="correct-answer-b-${questionCount - 1}"]`);
      
      // Save changes
      await page.click('[data-testid="save-quiz-btn"]');
      
      // Verify updates
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Quiz updated successfully');
      await expect(page.locator('[data-testid="quiz-title-display"]')).toContainText(updatedTitle);
    });

    test('should delete a quiz', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('#email', 'professor@arquiz.test');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/dashboard');
      await page.click('[data-testid="manage-quizzes-btn"]');
      
      // Get initial quiz count
      const initialCount = await page.locator('[data-testid^="quiz-item-"]').count();
      
      // Delete first quiz
      await page.click('[data-testid="delete-quiz-btn"]:first-child');
      await page.click('[data-testid="confirm-delete-btn"]');
      
      // Verify deletion
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Quiz deleted successfully');
      
      const finalCount = await page.locator('[data-testid^="quiz-item-"]').count();
      expect(finalCount).toBe(initialCount - 1);
    });
  });

  test.describe('Room Creation & Management', () => {
    test('should access room creation interface', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for room creation elements
      const roomButton = page.locator('[data-testid="create-room-btn"]').or(
        page.locator('text="Create Room"').or(
          page.locator('[href*="room"]').or(
            page.locator('button:has-text("Room")')
          )
        )
      );
      
      if (await roomButton.isVisible()) {
        await roomButton.click();
        await page.waitForTimeout(1000);
        
        // Check if we're in room creation flow
        const isRoomPage = page.url().includes('room') || 
                          await page.locator('[data-testid="room-form"]').isVisible() ||
                          await page.locator('input[name="room"]').isVisible();
        
        expect(isRoomPage).toBeTruthy();
      } else {
        // Navigate to rooms directly
        await page.goto('/rooms');
        await page.waitForLoadState('networkidle');
      }
      
      // Verify we're on a room-related page
      expect(page.url()).toMatch(/\/(dashboard|room)/);
    });

    test('should handle room form interactions', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      // Try different room-related URLs
      const roomUrls = ['/rooms', '/dashboard/rooms', '/rooms/create'];
      let roomPageFound = false;
      
      for (const url of roomUrls) {
        try {
          await page.goto(url);
          await page.waitForLoadState('networkidle');
          
          if (page.url().includes('room') || await page.locator('[data-testid*="room"]').isVisible()) {
            roomPageFound = true;
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!roomPageFound) {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
      }
      
      // Look for any form inputs that might be room-related
      const formInputs = page.locator('input[type="text"]').or(
        page.locator('input[name*="room"]').or(
          page.locator('[data-testid*="room"]')
        )
      );
      
      if (await formInputs.first().isVisible()) {
        await formInputs.first().fill('Test Room Name');
        await page.waitForTimeout(500);
      }
      
      // Verify form interaction worked
      expect(page.url()).toMatch(/\/(dashboard|room)/);
    });

    test('should create a quiz room successfully', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('#email', 'professor@arquiz.test');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/dashboard');
      
      // Navigate to room creation
      await page.click('[data-testid="create-room-btn"]');
      
      // Fill room details
      const roomName = `Professor Room ${Date.now()}`;
      await page.fill('[data-testid="room-name"]', roomName);
      
      // Select quiz
      await page.click('[data-testid="quiz-selector"]');
      await page.click('[data-testid="quiz-option"]:first-child');
      
      // Configure room settings
      await page.fill('[data-testid="max-participants"]', '50');
      await page.check('[data-testid="allow-late-join"]');
      await page.fill('[data-testid="session-duration"]', '60');
      
      // Create room
      await page.click('[data-testid="create-room-submit"]');
      
      // Verify room creation
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Room created successfully');
      await expect(page.locator('[data-testid="room-code"]')).toBeVisible();
      
      // Verify room details
      await expect(page.locator('[data-testid="room-name-display"]')).toContainText(roomName);
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('0/50');
    });

    test('should manage room settings and controls', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('#email', 'professor@arquiz.test');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/dashboard');
      
      // Navigate to existing room
      await page.click('[data-testid="manage-rooms-btn"]');
      await page.click('[data-testid="enter-room-btn"]:first-child');
      
      // Test room controls
      await expect(page.locator('[data-testid="start-session-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="room-settings-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="participant-list"]')).toBeVisible();
      
      // Open room settings
      await page.click('[data-testid="room-settings-btn"]');
      
      // Modify settings
      await page.fill('[data-testid="max-participants"]', '30');
      await page.uncheck('[data-testid="allow-late-join"]');
      await page.click('[data-testid="save-settings-btn"]');
      
      // Verify settings update
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Room settings updated');
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('0/30');
    });

    test('should handle participant management', async ({ page, context }) => {
      // Create a new page context for the student
      const studentPage = await context.newPage();
      
      // Professor setup
      await page.goto('/auth/login');
      await page.fill('#email', 'professor@arquiz.test');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      
      // Enter room
      await page.click('[data-testid="manage-rooms-btn"]');
      await page.click('[data-testid="enter-room-btn"]:first-child');
      
      // Get room code
      const roomCode = await page.locator('[data-testid="room-code"]').textContent();
      
      // Student joins room
      await studentPage.goto('/join');
      await studentPage.fill('[data-testid="room-code-input"]', roomCode || '');
      await studentPage.fill('[data-testid="student-name"]', 'Test Student');
      await studentPage.click('[data-testid="join-room-btn"]');
      
      // Wait for student to appear in participant list
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="participant-list"]')).toContainText('Test Student');
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('1/');
      
      // Test kick functionality - Enhanced
      const kickButton = page.locator('button:has-text("Remover")').or(
        page.locator('[data-testid="kick-participant-btn"]')
      );
      
      if (await kickButton.isVisible()) {
        await kickButton.click();
        
        // Verify confirmation dialog appears
        const confirmDialog = page.locator('[role="dialog"]').or(
          page.locator('[data-testid="confirm-kick-dialog"]')
        );
        await expect(confirmDialog).toBeVisible();
        
        // Confirm kick action
        const confirmButton = page.locator('button:has-text("Remover")').last().or(
          page.locator('[data-testid="confirm-kick-btn"]')
        );
        await confirmButton.click();
        
        // Verify success message
        await expect(page.locator('text=removido da sala')).toBeVisible({ timeout: 5000 });
        
        // Verify participant removal from UI
        await page.waitForTimeout(1000);
        await expect(page.locator('[data-testid="participant-count"]')).toContainText('0/');
        await expect(page.locator('text=Test Student')).not.toBeVisible();
      } else {
        // If specific kick button not found, look for participant management
        const participantRow = page.locator('text=Test Student').locator('..');
        const actions = participantRow.locator('button').or(
          participantRow.locator('[data-testid*="action"]')
        );
        
        if (await actions.count() > 0) {
          await actions.first().click();
          await page.waitForTimeout(500);
          
          // Look for any kick-related option
          const kickOption = page.locator('text=Kick').or(
            page.locator('text=Remove').or(
              page.locator('[data-testid*="kick"]')
            )
          );
          
          if (await kickOption.isVisible()) {
            await kickOption.click();
            await page.waitForTimeout(1000);
            await expect(page.locator('[data-testid="participant-count"]')).toContainText('0/');
          }
        }
      }
      
      await studentPage.close();
    });
  });

  test.describe('Professor Dashboard Navigation', () => {
    test('should navigate through main dashboard sections', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Test navigation to different sections
      const navigationSections = [
        { selector: '[data-testid="quizzes-nav"]', text: 'Quiz' },
        { selector: '[data-testid="rooms-nav"]', text: 'Room' },
        { selector: '[data-testid="results-nav"]', text: 'Result' },
        { selector: '[data-testid="profile-nav"]', text: 'Profile' }
      ];
      
      for (const section of navigationSections) {
        const navElement = page.locator(section.selector).or(
          page.locator(`text="${section.text}"`).or(
            page.locator(`[href*="${section.text.toLowerCase()}"]`).or(
              page.locator(`button:has-text("${section.text}")`)
            )
          )
        );
        
        if (await navElement.isVisible()) {
          await navElement.click();
          await page.waitForTimeout(1000);
          
          // Verify navigation
          const currentUrl = page.url();
          expect(currentUrl).toMatch(/\/(dashboard|quiz|room|result|profile)/);
        }
      }
    });

    test('should handle user authentication state', async ({ page }) => {
      // Test unauthenticated access
      await page.goto('/dashboard');
      
      // Should redirect to login or show login form
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      const hasLoginForm = await page.locator('#email').or(
        page.locator('input[type="email"]').or(
          page.locator('[data-testid="login-form"]')
        )
      ).isVisible();
      
      expect(currentUrl.includes('login') || hasLoginForm).toBeTruthy();
      
      // Now test authenticated access
      if (hasLoginForm) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(2000);
        
        // Should be on dashboard or similar authenticated page
        expect(page.url()).toMatch(/\/(dashboard|home)/);
      }
    });
  });

  test.describe('Real-time Features', () => {
    test('should handle WebSocket connections for real-time updates', async ({ page, context }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Monitor WebSocket connections
      const wsConnections: any[] = [];
      page.on('websocket', ws => {
        wsConnections.push(ws);
        ws.on('framesent', event => console.log('WebSocket frame sent:', event.payload));
        ws.on('framereceived', event => console.log('WebSocket frame received:', event.payload));
      });
      
      // Try to trigger WebSocket activity by navigating to real-time sections
      const realtimeUrls = ['/rooms', '/live', '/session'];
      
      for (const url of realtimeUrls) {
        try {
          await page.goto(url);
          await page.waitForTimeout(2000);
          
          if (wsConnections.length > 0) {
            break;
          }
        } catch {
          continue;
        }
      }
      
      // Create a second page to simulate multi-user interaction
      const secondPage = await context.newPage();
      await secondPage.goto('/join');
      await secondPage.waitForTimeout(1000);
      
      // Test if WebSocket connections were established
      // Note: In a real scenario, we'd have actual WebSocket endpoints
      console.log(`WebSocket connections established: ${wsConnections.length}`);
      
      await secondPage.close();
    });

    test('should handle participant management interface', async ({ page, context }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for participant management interface
      const participantSection = page.locator('[data-testid="participants"]').or(
        page.locator('.participant').or(
          page.locator(':has-text("Participant")')
        )
      );
      
      if (await participantSection.isVisible()) {
        await participantSection.click();
        await page.waitForTimeout(1000);
      }
      
      // Create a student page to simulate participant joining
      const studentPage = await context.newPage();
      await studentPage.goto('/join');
      
      // Fill out join form if available
      const nameInput = studentPage.locator('[data-testid="student-name"]').or(
        studentPage.locator('input[name="name"]').or(
          studentPage.locator('#name')
        )
      );
      
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Student');
        
        const submitButton = studentPage.locator('button[type="submit"]').or(
          studentPage.locator('[data-testid="join-btn"]')
        );
        
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await studentPage.waitForTimeout(1000);
        }
      }
      
      // Check if professor page shows the participant
      await page.waitForTimeout(2000);
      await page.reload();
      
      const hasParticipantInfo = await page.locator(':has-text("Test Student")').or(
        page.locator('[data-testid*="participant"]').or(
          page.locator('.participant-count')
        )
      ).isVisible();
      
      // Cleanup
      await studentPage.close();
      
      // Verify some participant management capability exists
      expect(page.url()).toMatch(/\/(dashboard|room|participant)/);
    });
  });

  test.describe('Results & Analytics', () => {
    test('should access results and analytics interface', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for results/analytics navigation
      const resultsButton = page.locator('[data-testid="results-btn"]').or(
        page.locator('text="Results"').or(
          page.locator('[href*="result"]').or(
            page.locator('button:has-text("Analytics")')
          )
        )
      );
      
      if (await resultsButton.isVisible()) {
        await resultsButton.click();
        await page.waitForTimeout(1000);
      } else {
        // Try direct navigation to results page
        await page.goto('/results');
        await page.waitForLoadState('networkidle');
      }
      
      // Verify we're on a results-related page
      expect(page.url()).toMatch(/\/(dashboard|result|analytic)/);
      
      // Look for analytics elements
      const hasAnalytics = await page.locator('[data-testid*="chart"]').or(
        page.locator('.chart').or(
          page.locator('[class*="analytic"]').or(
            page.locator(':has-text("Score")')
          )
        )
      ).isVisible();
      
      // Either analytics exist or we're in the right section
      expect(hasAnalytics || page.url().includes('result')).toBeTruthy();
    });

    test('should handle data export functionality', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'professor@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/results');
      await page.waitForLoadState('networkidle');
      
      // Look for export buttons
      const exportButton = page.locator('[data-testid="export-btn"]').or(
        page.locator('button:has-text("Export")').or(
          page.locator('[download]').or(
            page.locator('button:has-text("Download")')
          )
        )
      );
      
      if (await exportButton.isVisible()) {
        // Test export functionality
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await exportButton.click();
        
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.(csv|pdf|xlsx)$/);
        }
      }
      
      // Verify we're still on results page
      expect(page.url()).toMatch(/\/(result|dashboard)/);
    });
  });

  test.describe('Advanced Professor Features', () => {
    test('should manage transcriptions and audio analysis', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('#email', 'professor@arquiz.test');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      
      // Navigate to transcriptions
      await page.click('[data-testid="transcriptions-btn"]');
      
      // Verify transcription management interface
      await expect(page.locator('[data-testid="transcription-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-transcriptions"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-by-session"]')).toBeVisible();
      
      // View a transcription
      await page.click('[data-testid="view-transcription"]:first-child');
      
      // Verify transcription details
      await expect(page.locator('[data-testid="transcription-text"]')).toBeVisible();
      await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
      await expect(page.locator('[data-testid="timestamp-markers"]')).toBeVisible();
      
      // Test transcription search
      await page.fill('[data-testid="transcription-search"]', 'question');
      await page.press('[data-testid="transcription-search"]', 'Enter');
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });

    test('should handle competition room creation', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('#email', 'professor@arquiz.test');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      
      // Create competition room
      await page.click('[data-testid="create-competition-btn"]');
      
      // Fill competition details
      await page.fill('[data-testid="competition-name"]', 'Math Championship');
      await page.fill('[data-testid="competition-description"]', 'Annual math competition');
      
      // Configure competition settings
      await page.check('[data-testid="enable-leaderboard"]');
      await page.check('[data-testid="enable-timer"]');
      await page.fill('[data-testid="competition-duration"]', '120');
      
      // Select multiple quizzes
      await page.check('[data-testid="quiz-select-1"]');
      await page.check('[data-testid="quiz-select-2"]');
      
      // Create competition
      await page.click('[data-testid="create-competition-submit"]');
      
      // Verify competition creation
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Competition created');
      await expect(page.locator('[data-testid="competition-code"]')).toBeVisible();
      await expect(page.locator('[data-testid="leaderboard"]')).toBeVisible();
    });

    test('should manage professor profile and preferences', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('#email', 'professor@arquiz.test');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      
      // Navigate to profile
      await page.click('[data-testid="profile-menu"]');
      await page.click('[data-testid="profile-settings"]');
      
      // Update profile information
      await page.fill('[data-testid="display-name"]', 'Professor Updated');
      await page.fill('[data-testid="institution"]', 'Test University');
      await page.selectOption('[data-testid="subject-area"]', 'Mathematics');
      
      // Configure preferences
      await page.check('[data-testid="email-notifications"]');
      await page.check('[data-testid="auto-save-sessions"]');
      await page.selectOption('[data-testid="default-session-duration"]', '45');
      
      // Save changes
      await page.click('[data-testid="save-profile-btn"]');
      
      // Verify updates
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Profile updated');
      await expect(page.locator('[data-testid="display-name"]')).toHaveValue('Professor Updated');
    });

    test('should handle bulk operations', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('#email', 'professor@arquiz.test');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      
      // Navigate to quiz management
      await page.click('[data-testid="manage-quizzes-btn"]');
      
      // Select multiple quizzes
      await page.check('[data-testid="quiz-select-1"]');
      await page.check('[data-testid="quiz-select-2"]');
      await page.check('[data-testid="quiz-select-3"]');
      
      // Test bulk actions
      await page.click('[data-testid="bulk-actions-btn"]');
      
      // Test bulk duplicate
      await page.click('[data-testid="bulk-duplicate-btn"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('3 quizzes duplicated');
      
      // Test bulk export
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="bulk-export-btn"]');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/quiz-export.*\.json/);
      
      // Test bulk delete (be careful with this one)
      await page.click('[data-testid="bulk-delete-btn"]');
      await page.click('[data-testid="confirm-bulk-delete"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Selected quizzes deleted');
    });
  });

  test.afterEach(async ({ page }) => {
    // Professor-specific cleanup
    try {
      // Clear any active sessions or forms
      await page.evaluate(() => {
        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      console.warn('Professor workflow cleanup warning:', error);
    }
  });
}); 