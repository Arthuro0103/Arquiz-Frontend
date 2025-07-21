import { test, expect, Page, BrowserContext } from '@playwright/test';
import { 
  enhancedLogin, 
  enhancedLogout,
  ENHANCED_TEST_USERS,
  enhancedWaitForElement,
  enhancedFillForm,
  enhancedExpectVisible,
  enhancedCreateRoom,
  generateRandomString
} from '../utils/enhanced-test-helpers';

/**
 * Room Start Redirect Flow E2E Tests
 * 
 * Tests the complete flow when a room is started:
 * 1. Teacher starts room from manage page
 * 2. Students in lobby are redirected to compete page
 * 3. Teacher is redirected to monitoring page
 * 4. WebSocket events are properly handled
 * 5. Loading states are shown during transitions
 * 6. Error handling for various scenarios
 */

test.describe('Room Start Redirect Flow', () => {
  let teacherPage: Page;
  let studentPage: Page;
  let teacherContext: BrowserContext;
  let studentContext: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    // Create separate browser contexts for teacher and student
    teacherContext = await browser.newContext();
    studentContext = await browser.newContext();
    
    teacherPage = await teacherContext.newPage();
    studentPage = await studentContext.newPage();

    // Enable console logging for debugging
    teacherPage.on('console', msg => console.log('TEACHER:', msg.text()));
    studentPage.on('console', msg => console.log('STUDENT:', msg.text()));
  });

  test.afterEach(async () => {
    await teacherContext.close();
    await studentContext.close();
  });

  test('should redirect teacher to monitoring page when room is started from manage page', async () => {
    // Login as teacher
    await enhancedLogin(teacherPage, 'professor');
    
    // Create a room
    const roomId = await enhancedCreateRoom(teacherPage, { name: 'Test Room', description: 'Test Description' });
    if (!roomId) throw new Error('Failed to create room');
    
    // Navigate to manage page
    await teacherPage.goto(`/rooms/${roomId}/manage`);
    await enhancedWaitForElement(teacherPage, '[data-testid="start-room-button"]');
    
    // Verify initial state
    await enhancedExpectVisible(teacherPage, '[data-testid="room-status-waiting"]');
    await enhancedExpectVisible(teacherPage, '[data-testid="start-room-button"]');
    
    // Click start room button
    await teacherPage.click('[data-testid="start-room-button"]');
    
    // Verify loading state appears
    await enhancedExpectVisible(teacherPage, '[data-testid="start-room-loading"]');
    
    // Wait for success toast
    await enhancedWaitForElement(teacherPage, '.toast-success');
    
    // Verify redirect to monitoring page
    await teacherPage.waitForURL(`/rooms/${roomId}/monitoring`, { timeout: 10000 });
    
    // Verify monitoring page loaded correctly
    await enhancedExpectVisible(teacherPage, '[data-testid="monitoring-dashboard"]');
    await enhancedExpectVisible(teacherPage, '[data-testid="room-status-active"]');
  });

  test('should redirect student from lobby to compete page when room is started', async () => {
    // Setup: Teacher creates and starts room
    await enhancedLogin(teacherPage, 'professor');
    const roomId = await enhancedCreateRoom(teacherPage, { name: 'Test Room', description: 'Test Description' });
    if (!roomId) throw new Error('Failed to create room');
    
    // Student joins lobby
    await enhancedLogin(studentPage, 'student');
    await studentPage.goto(`/rooms/${roomId}/lobby`);
    await enhancedWaitForElement(studentPage, '[data-testid="lobby-waiting"]');
    
    // Verify student is in lobby
    await enhancedExpectVisible(studentPage, '[data-testid="waiting-for-start"]');
    
    // Teacher starts room
    await teacherPage.goto(`/rooms/${roomId}/manage`);
    await enhancedWaitForElement(teacherPage, '[data-testid="start-room-button"]');
    await teacherPage.click('[data-testid="start-room-button"]');
    
    // Student should be redirected to compete page
    await studentPage.waitForURL(`/rooms/${roomId}/compete`, { timeout: 10000 });
    
    // Verify compete page loaded correctly
    await enhancedExpectVisible(studentPage, '[data-testid="quiz-interface"]');
    await enhancedExpectVisible(studentPage, '[data-testid="competition-active"]');
  });

  test('should handle multiple students redirecting simultaneously', async () => {
    const numberOfStudents = 3;
    const studentPages: Page[] = [];
    const studentContexts: BrowserContext[] = [];
    
    // Setup: Create multiple student contexts
    for (let i = 0; i < numberOfStudents; i++) {
      const context = await teacherContext.browser()?.newContext();
      if (context) {
        studentContexts.push(context);
        const page = await context.newPage();
        studentPages.push(page);
      }
    }
    
    try {
      // Teacher creates room
      await enhancedLogin(teacherPage, 'professor');
      const roomId = await enhancedCreateRoom(teacherPage, { name: 'Multi-Student Test Room' });
      if (!roomId) throw new Error('Failed to create room');
      
      // All students join lobby
      for (let i = 0; i < numberOfStudents; i++) {
        await enhancedLogin(studentPages[i], 'student');
        await studentPages[i].goto(`/rooms/${roomId}/lobby`);
        await enhancedWaitForElement(studentPages[i], '[data-testid="lobby-waiting"]');
      }
      
      // Teacher starts room
      await teacherPage.goto(`/rooms/${roomId}/manage`);
      await enhancedWaitForElement(teacherPage, '[data-testid="start-room-button"]');
      await teacherPage.click('[data-testid="start-room-button"]');
      
      // All students should be redirected
      const redirectPromises = studentPages.map(page => 
        page.waitForURL(`/rooms/${roomId}/compete`, { timeout: 15000 })
      );
      
      await Promise.all(redirectPromises);
      
      // Verify all students are on compete page
      for (const page of studentPages) {
        await enhancedExpectVisible(page, '[data-testid="quiz-interface"]');
      }
      
    } finally {
      // Cleanup
      for (const context of studentContexts) {
        await context.close();
      }
    }
  });

  test('should show loading states during room transition', async () => {
    // Teacher setup
    await enhancedLogin(teacherPage, 'professor');
    const roomId = await enhancedCreateRoom(teacherPage, { name: 'Loading Test Room' });
    if (!roomId) throw new Error('Failed to create room');
    
    // Student setup
    await enhancedLogin(studentPage, 'student');
    await studentPage.goto(`/rooms/${roomId}/lobby`);
    await enhancedWaitForElement(studentPage, '[data-testid="lobby-waiting"]');
    
    // Teacher navigates to manage page
    await teacherPage.goto(`/rooms/${roomId}/manage`);
    await enhancedWaitForElement(teacherPage, '[data-testid="start-room-button"]');
    
    // Start room and verify loading states
    await teacherPage.click('[data-testid="start-room-button"]');
    
    // Verify teacher loading state
    await enhancedExpectVisible(teacherPage, '[data-testid="start-room-loading"]');
    
    // Verify student transition loading
    await enhancedExpectVisible(studentPage, '[data-testid="room-transition-loading"]');
    
    // Wait for transitions to complete
    await Promise.all([
      teacherPage.waitForURL(`/rooms/${roomId}/monitoring`, { timeout: 10000 }),
      studentPage.waitForURL(`/rooms/${roomId}/compete`, { timeout: 10000 })
    ]);
    
    // Verify loading states are gone
    await expect(teacherPage.locator('[data-testid="start-room-loading"]')).toBeHidden();
    await expect(studentPage.locator('[data-testid="room-transition-loading"]')).toBeHidden();
  });

  test('should handle WebSocket connection errors gracefully', async () => {
    // Setup
    await enhancedLogin(teacherPage, 'professor');
    const roomId = await enhancedCreateRoom(teacherPage, { name: 'WebSocket Test Room' });
    if (!roomId) throw new Error('Failed to create room');
    
    await enhancedLogin(studentPage, 'student');
    await studentPage.goto(`/rooms/${roomId}/lobby`);
    
    // Simulate WebSocket disconnection
    await studentPage.evaluate(() => {
      // @ts-ignore
      window.mockWebSocketDisconnect?.();
    });
    
    // Teacher starts room
    await teacherPage.goto(`/rooms/${roomId}/manage`);
    await enhancedWaitForElement(teacherPage, '[data-testid="start-room-button"]');
    await teacherPage.click('[data-testid="start-room-button"]');
    
    // Student should still be redirected via API polling fallback
    await studentPage.waitForURL(`/rooms/${roomId}/compete`, { timeout: 15000 });
    
    // Verify error handling message appeared
    await enhancedExpectVisible(studentPage, '[data-testid="websocket-reconnection-message"]');
  });

  test('should handle room start validation errors', async () => {
    // Teacher setup
    await enhancedLogin(teacherPage, 'professor');
    const roomId = await enhancedCreateRoom(teacherPage, { name: 'Validation Test Room' });
    if (!roomId) throw new Error('Failed to create room');
    
    // Navigate to manage page
    await teacherPage.goto(`/rooms/${roomId}/manage`);
    await enhancedWaitForElement(teacherPage, '[data-testid="start-room-button"]');
    
    // Mock room validation failure
    await teacherPage.route(`/api/rooms/${roomId}/control/start`, route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Cannot start room without questions',
            code: 'ROOM_VALIDATION_ERROR'
          }
        })
      });
    });
    
    // Try to start room
    await teacherPage.click('[data-testid="start-room-button"]');
    
    // Verify error message appears
    await enhancedExpectVisible(teacherPage, '[data-testid="room-start-error"]');
    await expect(teacherPage.locator('[data-testid="room-start-error"]'))
      .toContainText('Cannot start room without questions');
    
    // Verify button is re-enabled
    await expect(teacherPage.locator('[data-testid="start-room-button"]')).toBeEnabled();
  });

  test('should handle offline scenario gracefully', async () => {
    // Setup
    await enhancedLogin(teacherPage, 'professor');
    const roomId = await enhancedCreateRoom(teacherPage, { name: 'Offline Test Room' });
    if (!roomId) throw new Error('Failed to create room');
    
    await enhancedLogin(studentPage, 'student');
    await studentPage.goto(`/rooms/${roomId}/lobby`);
    
    // Simulate offline mode
    await teacherContext.setOffline(true);
    
    // Try to start room
    await teacherPage.goto(`/rooms/${roomId}/manage`);
    await enhancedWaitForElement(teacherPage, '[data-testid="start-room-button"]');
    await teacherPage.click('[data-testid="start-room-button"]');
    
    // Verify offline error message
    await enhancedExpectVisible(teacherPage, '[data-testid="offline-error"]');
    
    // Restore connection
    await teacherContext.setOffline(false);
    
    // Try again
    await teacherPage.click('[data-testid="start-room-button"]');
    
    // Should work now
    await teacherPage.waitForURL(`/rooms/${roomId}/monitoring`, { timeout: 10000 });
  });

  test('should maintain room state consistency across users', async () => {
    // Setup multiple users
    await enhancedLogin(teacherPage, 'professor');
    const roomId = await enhancedCreateRoom(teacherPage, { name: 'Consistency Test Room' });
    if (!roomId) throw new Error('Failed to create room');
    
    await enhancedLogin(studentPage, 'student');
    await studentPage.goto(`/rooms/${roomId}/lobby`);
    
    // Verify initial state
    await enhancedExpectVisible(teacherPage, '[data-testid="room-status-waiting"]');
    await enhancedExpectVisible(studentPage, '[data-testid="room-status-waiting"]');
    
    // Teacher starts room
    await teacherPage.goto(`/rooms/${roomId}/manage`);
    await enhancedWaitForElement(teacherPage, '[data-testid="start-room-button"]');
    await teacherPage.click('[data-testid="start-room-button"]');
    
    // Wait for both users to be on correct pages
    await Promise.all([
      teacherPage.waitForURL(`/rooms/${roomId}/monitoring`, { timeout: 10000 }),
      studentPage.waitForURL(`/rooms/${roomId}/compete`, { timeout: 10000 })
    ]);
    
    // Verify both users see consistent room state
    await enhancedExpectVisible(teacherPage, '[data-testid="room-status-active"]');
    await enhancedExpectVisible(studentPage, '[data-testid="room-status-active"]');
    
    // Verify participant count is consistent
    const teacherParticipantCount = await teacherPage.textContent('[data-testid="participant-count"]');
    const studentParticipantCount = await studentPage.textContent('[data-testid="participant-count"]');
    
    expect(teacherParticipantCount).toBe(studentParticipantCount);
  });

  test('should handle rapid start/stop room operations', async () => {
    // Setup
    await enhancedLogin(teacherPage, 'professor');
    const roomId = await enhancedCreateRoom(teacherPage, { name: 'Rapid Operations Test Room' });
    if (!roomId) throw new Error('Failed to create room');
    
    await teacherPage.goto(`/rooms/${roomId}/manage`);
    await enhancedWaitForElement(teacherPage, '[data-testid="start-room-button"]');
    
    // Rapid start operations
    for (let i = 0; i < 3; i++) {
      await teacherPage.click('[data-testid="start-room-button"]');
      await enhancedWaitForElement(teacherPage, '[data-testid="start-room-loading"]');
      
      // Wait for operation to complete
      await teacherPage.waitForURL(`/rooms/${roomId}/monitoring`, { timeout: 10000 });
      
      // Navigate back to manage
      await teacherPage.goto(`/rooms/${roomId}/manage`);
      await enhancedWaitForElement(teacherPage, '[data-testid="stop-room-button"]');
      
      // Stop room
      await teacherPage.click('[data-testid="stop-room-button"]');
      await enhancedWaitForElement(teacherPage, '[data-testid="start-room-button"]');
    }
    
    // Verify final state is consistent
    await enhancedExpectVisible(teacherPage, '[data-testid="room-status-waiting"]');
  });
});

test.describe('Room Start Redirect Performance', () => {
  test('should complete redirect flow within acceptable time limits', async ({ page }) => {
    await enhancedLogin(page, 'professor');
    const roomId = await enhancedCreateRoom(page, { name: 'Performance Test Room' });
    if (!roomId) throw new Error('Failed to create room');
    
    await page.goto(`/rooms/${roomId}/manage`);
    await enhancedWaitForElement(page, '[data-testid="start-room-button"]');
    
    // Measure redirect performance
    const startTime = Date.now();
    await page.click('[data-testid="start-room-button"]');
    await page.waitForURL(`/rooms/${roomId}/monitoring`, { timeout: 10000 });
    const endTime = Date.now();
    
    const redirectTime = endTime - startTime;
    
    // Should redirect within 5 seconds
    expect(redirectTime).toBeLessThan(5000);
    
    console.log(`Room start redirect completed in ${redirectTime}ms`);
  });
}); 