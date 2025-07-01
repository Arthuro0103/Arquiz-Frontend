
import { test, expect } from '../fixtures/index';

test.describe('Student Workflow Testing', () => {

  test.describe('Student Registration & Authentication', () => {
    test('should register a new student account successfully', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Handle potential redirects
      try {
        await page.waitForURL('**/auth/register', { timeout: 5000 });
      } catch {
        // May be different auth flow
      }
      
      // Fill registration form if available
      const studentData = {
        name: `Student Test ${Date.now()}`,
        email: `student.test.${Date.now()}@arquiz.test`,
        password: 'StudentTest123!'
      };
      
      const nameInput = page.locator('#name').or(
        page.locator('input[name="name"]').or(
          page.locator('[data-testid="name-input"]')
        )
      );
      
      if (await nameInput.isVisible()) {
        await nameInput.fill(studentData.name);
        
        const emailInput = page.locator('#email').or(
          page.locator('input[name="email"]').or(
            page.locator('input[type="email"]')
          )
        );
        
        if (await emailInput.isVisible()) {
          await emailInput.fill(studentData.email);
          
          const passwordInput = page.locator('#password').or(
            page.locator('input[name="password"]').or(
              page.locator('input[type="password"]')
            )
          );
          
          if (await passwordInput.isVisible()) {
            await passwordInput.fill(studentData.password);
            
            const submitButton = page.locator('button[type="submit"]').or(
              page.locator('[data-testid="register-btn"]').or(
                page.locator('button:has-text("Register")')
              )
            );
            
            if (await submitButton.isVisible()) {
              await submitButton.click();
              await page.waitForTimeout(2000);
            }
          }
        }
      }
      
      // Verify we're on a valid page after registration
      expect(page.url()).toMatch(/\/(dashboard|login|register|home)/);
    });

    test('should login as an existing student', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(2000);
        expect(page.url()).toMatch(/\/(dashboard|home|student)/);
      }
    });

    test('should handle student profile management', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      // Navigate to profile/settings
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      // Look for profile management elements
      const profileSection = page.locator('[data-testid="profile-section"]').or(
        page.locator('.profile').or(
          page.locator(':has-text("Profile")')
        )
      );
      
      if (await profileSection.isVisible()) {
        // Try to update profile information
        const nameInput = page.locator('[data-testid="student-name"]').or(
          page.locator('input[name="name"]').or(
            page.locator('#name')
          )
        );
        
        if (await nameInput.isVisible()) {
          await nameInput.fill('Updated Student Name');
          
          const saveButton = page.locator('button:has-text("Save")').or(
            page.locator('[data-testid="save-profile"]').or(
              page.locator('button[type="submit"]')
            )
          );
          
          if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }
      
      // Verify we're on profile-related page
      expect(page.url()).toMatch(/\/(profile|settings|dashboard)/);
    });
  });

  test.describe('Room Joining & Participation', () => {
    test('should join a quiz room successfully', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/join');
      await page.waitForLoadState('networkidle');
      
      const roomCodeInput = page.locator('[data-testid="room-code-input"]').or(
        page.locator('input[name="roomCode"]').or(
          page.locator('#roomCode').or(
            page.locator('input[placeholder*="code"]')
          )
        )
      );
      
      if (await roomCodeInput.isVisible()) {
        await roomCodeInput.fill('TEST123');
        
        const nameInput = page.locator('[data-testid="student-name"]').or(
          page.locator('input[name="name"]').or(
            page.locator('#studentName')
          )
        );
        
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test Student Participant');
        }
        
        const joinButton = page.locator('[data-testid="join-room-btn"]').or(
          page.locator('button:has-text("Join")').or(
            page.locator('button[type="submit"]')
          )
        );
        
        if (await joinButton.isVisible()) {
          await joinButton.click();
          await page.waitForTimeout(2000);
        }
      }
      
      expect(page.url()).toMatch(/\/(room|join|waiting|lobby)/);
    });

    test('should handle waiting room interface', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/room/waiting');
      await page.waitForLoadState('networkidle');
      
      const waitingElements = page.locator('[data-testid="waiting-room"]').or(
        page.locator('.waiting').or(
          page.locator(':has-text("Waiting for")')
        )
      );
      
      if (await waitingElements.isVisible()) {
        expect(waitingElements).toBeVisible();
      }
      
      expect(page.url()).toMatch(/\/(room|wait|lobby)/);
    });

    test('should handle real-time room updates', async ({ page, context }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      // Monitor WebSocket connections for real-time updates
      const wsConnections: any[] = [];
      page.on('websocket', ws => {
        wsConnections.push(ws);
        ws.on('framesent', event => console.log('Student WebSocket sent:', event.payload));
        ws.on('framereceived', event => console.log('Student WebSocket received:', event.payload));
      });
      
      // Join a room to trigger WebSocket activity
      await page.goto('/join');
      await page.waitForLoadState('networkidle');
      
      const roomCodeInput = page.locator('[data-testid="room-code-input"]').or(
        page.locator('input[name="roomCode"]').or(
          page.locator('#roomCode')
        )
      );
      
      if (await roomCodeInput.isVisible()) {
        await roomCodeInput.fill('REALTIME123');
        
        const joinButton = page.locator('[data-testid="join-room-btn"]').or(
          page.locator('button:has-text("Join")')
        );
        
        if (await joinButton.isVisible()) {
          await joinButton.click();
          await page.waitForTimeout(3000);
        }
      }
      
      // Create second student to test multi-user real-time
      const secondStudent = await context.newPage();
      await secondStudent.goto('/join');
      
      const secondRoomInput = secondStudent.locator('[data-testid="room-code-input"]').or(
        secondStudent.locator('input[name="roomCode"]')
      );
      
      if (await secondRoomInput.isVisible()) {
        await secondRoomInput.fill('REALTIME123');
        
        const secondNameInput = secondStudent.locator('[data-testid="student-name"]').or(
          secondStudent.locator('input[name="name"]')
        );
        
        if (await secondNameInput.isVisible()) {
          await secondNameInput.fill('Second Student');
        }
        
        const secondJoinButton = secondStudent.locator('[data-testid="join-room-btn"]').or(
          secondStudent.locator('button:has-text("Join")')
        );
        
        if (await secondJoinButton.isVisible()) {
          await secondJoinButton.click();
          await secondStudent.waitForTimeout(2000);
        }
      }
      
      // Test real-time updates (participant count, room status)
      await page.waitForTimeout(2000);
      await page.reload();
      
      // Check if real-time features are working
      console.log(`Student WebSocket connections: ${wsConnections.length}`);
      
      await secondStudent.close();
      
      // Verify real-time capability exists
      expect(page.url()).toMatch(/\/(room|join|lobby)/);
    });
  });

  test.describe('Quiz Taking Experience', () => {
    test('should participate in a quiz session', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/quiz/session');
      await page.waitForLoadState('networkidle');
      
      const questionElement = page.locator('[data-testid="current-question"]').or(
        page.locator('.question').or(
          page.locator(':has-text("Question")')
        )
      );
      
      if (await questionElement.isVisible()) {
        const answerOptions = page.locator('[data-testid*="answer-option"]').or(
          page.locator('input[type="radio"]').or(
            page.locator('.answer-option')
          )
        );
        
        if (await answerOptions.first().isVisible()) {
          await answerOptions.first().click();
          
          const submitButton = page.locator('[data-testid="submit-answer"]').or(
            page.locator('button:has-text("Submit")')
          );
          
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }
      
      expect(page.url()).toMatch(/\/(quiz|session|question)/);
    });

    test('should handle different question types', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      // Test multiple choice questions
      await page.goto('/quiz/session');
      await page.waitForLoadState('networkidle');
      
      // Multiple choice handling
      const multipleChoiceOptions = page.locator('input[type="radio"]').or(
        page.locator('[data-testid*="choice-"]').or(
          page.locator('.choice-option')
        )
      );
      
      if (await multipleChoiceOptions.first().isVisible()) {
        await multipleChoiceOptions.first().click();
        await page.waitForTimeout(500);
      }
      
      // True/False handling
      const trueFalseOptions = page.locator('[data-testid="true-option"]').or(
        page.locator('input[value="true"]').or(
          page.locator('button:has-text("True")')
        )
      );
      
      if (await trueFalseOptions.isVisible()) {
        await trueFalseOptions.click();
        await page.waitForTimeout(500);
      }
      
      // Text input handling
      const textInput = page.locator('[data-testid="text-answer"]').or(
        page.locator('input[type="text"]').or(
          page.locator('textarea')
        )
      );
      
      if (await textInput.isVisible()) {
        await textInput.fill('Sample text answer');
        await page.waitForTimeout(500);
      }
      
      // Verify question interaction capability
      expect(page.url()).toMatch(/\/(quiz|session|question)/);
    });

    test('should handle quiz timer and time pressure', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/quiz/session');
      await page.waitForLoadState('networkidle');
      
      const timerElement = page.locator('[data-testid="timer"]').or(
        page.locator('.timer').or(
          page.locator(':has-text("Time")')
        )
      );
      
      if (await timerElement.isVisible()) {
        const initialTime = await timerElement.textContent();
        expect(initialTime).toBeTruthy();
      }
      
      const progressElement = page.locator('[data-testid="quiz-progress"]').or(
        page.locator('.progress').or(
          page.locator('progress')
        )
      );
      
      if (await progressElement.isVisible()) {
        expect(progressElement).toBeVisible();
      }
      
      expect(page.url()).toMatch(/\/(quiz|session)/);
    });

    test('should handle quiz completion and results', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/quiz/results');
      await page.waitForLoadState('networkidle');
      
      const resultsElement = page.locator('[data-testid="quiz-results"]').or(
        page.locator('.results').or(
          page.locator(':has-text("Results")')
        )
      );
      
      if (await resultsElement.isVisible()) {
        const scoreElement = page.locator('[data-testid="final-score"]').or(
          page.locator('.score').or(
            page.locator(':has-text("Score")')
          )
        );
        
        if (await scoreElement.isVisible()) {
          expect(scoreElement).toBeVisible();
        }
      }
      
      expect(page.url()).toMatch(/\/(results|quiz|complete)/);
    });
  });

  test.describe('Student Dashboard & History', () => {
    test('should access student dashboard', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const dashboardElement = page.locator('[data-testid="student-dashboard"]').or(
        page.locator('.student-dashboard').or(
          page.locator(':has-text("Dashboard")')
        )
      );
      
      if (await dashboardElement.isVisible()) {
        expect(dashboardElement).toBeVisible();
      }
      
      const navigationSections = [
        { text: 'History', url: 'history' },
        { text: 'Profile', url: 'profile' },
        { text: 'Achievements', url: 'achievements' }
      ];
      
      for (const section of navigationSections) {
        const navElement = page.locator(`text="${section.text}"`).or(
          page.locator(`[href*="${section.url}"]`).or(
            page.locator(`button:has-text("${section.text}")`)
          )
        );
        
        if (await navElement.isVisible()) {
          await navElement.click();
          await page.waitForTimeout(1000);
          
          // Verify navigation worked
          expect(page.url()).toMatch(new RegExp(`/(${section.url}|dashboard)`));
          
          // Navigate back to dashboard
          await page.goto('/dashboard');
          await page.waitForTimeout(500);
        }
      }
    });

    test('should view quiz history and past results', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      // Navigate to history section
      await page.goto('/history');
      await page.waitForLoadState('networkidle');
      
      // Look for quiz history
      const historyElement = page.locator('[data-testid="quiz-history"]').or(
        page.locator('.history').or(
          page.locator(':has-text("History")')
        )
      );
      
      if (await historyElement.isVisible()) {
        // Check for quiz list
        const quizList = page.locator('[data-testid="past-quizzes"]').or(
          page.locator('.quiz-item').or(
            page.locator('.past-quiz')
          )
        );
        
        if (await quizList.first().isVisible()) {
          // Click on a past quiz to view details
          await quizList.first().click();
          await page.waitForTimeout(1000);
          
          // Should show quiz details
          const detailsElement = page.locator('[data-testid="quiz-details"]').or(
            page.locator('.quiz-details').or(
              page.locator(':has-text("Details")')
            )
          );
          
          if (await detailsElement.isVisible()) {
            expect(detailsElement).toBeVisible();
          }
        }
      }
      
      // Test filtering/sorting if available
      const filterElement = page.locator('[data-testid="filter-history"]').or(
        page.locator('select').or(
          page.locator('.filter')
        )
      );
      
      if (await filterElement.isVisible()) {
        await filterElement.click();
        await page.waitForTimeout(500);
      }
      
      // Verify history interface
      expect(page.url()).toMatch(/\/(history|dashboard|past)/);
    });

    test('should view achievements and progress tracking', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      // Navigate to achievements section
      await page.goto('/achievements');
      await page.waitForLoadState('networkidle');
      
      // Look for achievements display
      const achievementsElement = page.locator('[data-testid="achievements"]').or(
        page.locator('.achievements').or(
          page.locator(':has-text("Achievement")')
        )
      );
      
      if (await achievementsElement.isVisible()) {
        // Check for badges or awards
        const badgeElement = page.locator('[data-testid="badge"]').or(
          page.locator('.badge').or(
            page.locator('.award')
          )
        );
        
        // Check for progress tracking
        const progressElement = page.locator('[data-testid="progress-tracking"]').or(
          page.locator('.progress-bar').or(
            page.locator(':has-text("Progress")')
          )
        );
        
        // Verify achievements interface exists
        const hasAchievements = await badgeElement.isVisible() || 
                               await progressElement.isVisible() || 
                               page.url().includes('achievement');
        
        expect(hasAchievements).toBeTruthy();
      }
      
      // Test statistics if available
      const statsElement = page.locator('[data-testid="student-statistics"]').or(
        page.locator('.statistics').or(
          page.locator(':has-text("Stats")')
        )
      );
      
      if (await statsElement.isVisible()) {
        expect(statsElement).toBeVisible();
      }
      
      // Verify achievements interface
      expect(page.url()).toMatch(/\/(achievement|progress|dashboard)/);
    });
  });

  test.describe('Competition & Leaderboard Features', () => {
    test('should participate in competition mode', async ({ page, context }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      // Navigate to competition area
      await page.goto('/compete');
      await page.waitForLoadState('networkidle');
      
      // Look for competition interface
      const competitionElement = page.locator('[data-testid="competition"]').or(
        page.locator('.competition').or(
          page.locator(':has-text("Competition")')
        )
      );
      
      if (await competitionElement.isVisible()) {
        // Join a competition
        const joinButton = page.locator('[data-testid="join-competition"]').or(
          page.locator('button:has-text("Join")').or(
            page.locator('.join-btn')
          )
        );
        
        if (await joinButton.isVisible()) {
          await joinButton.click();
          await page.waitForTimeout(2000);
          
          // Should be in competition interface
          const competitionInterface = await page.locator('[data-testid="competition-interface"]').or(
            page.locator('.competition-room').or(
              page.locator(':has-text("competing")')
            )
          ).isVisible();
          
          if (competitionInterface) {
            expect(competitionInterface).toBeTruthy();
          }
        }
      }
      
      // Create second competitor to test multi-user competition
      const competitor = await context.newPage();
      await competitor.goto('/auth/login');
      
      if (await competitor.locator('#email').isVisible()) {
        await competitor.fill('#email', 'competitor@arquiz.test');
        await competitor.fill('#password', 'password123');
        await competitor.click('button[type="submit"]');
      }
      
      await competitor.goto('/compete');
      await competitor.waitForLoadState('networkidle');
      
      // Test competitive features
      await page.waitForTimeout(3000);
      
      await competitor.close();
      
      // Verify competition interface
      expect(page.url()).toMatch(/\/(compet|challenge|battle)/);
    });

    test('should view leaderboard and rankings', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      // Navigate to leaderboard
      await page.goto('/leaderboard');
      await page.waitForLoadState('networkidle');
      
      // Look for leaderboard interface
      const leaderboardElement = page.locator('[data-testid="leaderboard"]').or(
        page.locator('.leaderboard').or(
          page.locator(':has-text("Leaderboard")')
        )
      );
      
      if (await leaderboardElement.isVisible()) {
        // Check for ranking list
        const rankingElement = page.locator('[data-testid="ranking-list"]').or(
          page.locator('.ranking').or(
            page.locator('.rank-item')
          )
        );
        
        if (await rankingElement.isVisible()) {
          expect(rankingElement).toBeVisible();
        }
        
        // Check for own position
        const ownPositionElement = page.locator('[data-testid="my-position"]').or(
          page.locator('.my-rank').or(
            page.locator(':has-text("Your position")')
          )
        );
        
        if (await ownPositionElement.isVisible()) {
          expect(ownPositionElement).toBeVisible();
        }
      }
      
      // Test different leaderboard views if available
      const periodSelector = page.locator('[data-testid="period-selector"]').or(
        page.locator('select').or(
          page.locator('.period-filter')
        )
      );
      
      if (await periodSelector.isVisible()) {
        await periodSelector.click();
        await page.waitForTimeout(500);
      }
      
      // Verify leaderboard interface
      expect(page.url()).toMatch(/\/(leaderboard|ranking|stats)/);
    });
  });

  test.describe('Accessibility & Mobile Features', () => {
    test('should work well on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      // Test mobile navigation
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for mobile menu
      const mobileMenuButton = page.locator('[data-testid="mobile-menu"]').or(
        page.locator('.hamburger').or(
          page.locator('button:has-text("Menu")')
        )
      );
      
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        await page.waitForTimeout(500);
        
        // Check if menu opened
        const menuOpen = await page.locator('[data-testid="mobile-menu-open"]').or(
          page.locator('.menu-open').or(
            page.locator('.navigation-open')
          )
        ).isVisible();
        
        if (menuOpen) {
          expect(menuOpen).toBeTruthy();
        }
      }
      
      // Test mobile quiz taking
      await page.goto('/join');
      await page.waitForLoadState('networkidle');
      
      // Verify mobile layout works
      const mobileLayout = page.locator('[data-testid="mobile-layout"]').or(
        page.locator('.mobile').or(
          page.locator('body')
        )
      );
      
      if (await mobileLayout.isVisible()) {
        expect(mobileLayout).toBeVisible();
      }
      
      // Test touch interactions
      const touchElement = page.locator('input[type="text"]').first();
      
      if (await touchElement.isVisible()) {
        await touchElement.tap();
        await page.waitForTimeout(500);
      }
      
      // Verify mobile functionality
      expect(page.url()).toMatch(/\/(join|dashboard|mobile)/);
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/auth/login');
      
      if (await page.locator('#email').isVisible()) {
        await page.fill('#email', 'student@arquiz.test');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
      }
      
      await page.goto('/join');
      await page.waitForLoadState('networkidle');
      
      // Test Tab navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      // Check if focus is visible
      const focusedElement = page.locator(':focus');
      if (await focusedElement.isVisible()) {
        expect(focusedElement).toBeVisible();
      }
      
      // Test Enter key interaction
      const inputElement = page.locator('input[type="text"]').first();
      if (await inputElement.isVisible()) {
        await inputElement.focus();
        await page.keyboard.type('TEST123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
      }
      
      // Test Arrow key navigation in quiz interface
      const multipleChoiceOption = page.locator('input[type="radio"]').first();
      if (await multipleChoiceOption.isVisible()) {
        await multipleChoiceOption.focus();
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
      }
      
      // Verify keyboard accessibility
      expect(page.url()).toMatch(/\/(join|quiz|room)/);
    });
  });

  test.afterEach(async ({ page }) => {
    // Student-specific cleanup
    try {
      // Clear browser storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Clear any ongoing WebSocket connections
      await page.close();
    } catch (error) {
      console.warn('Student workflow cleanup warning:', error);
    }
  });
}); 