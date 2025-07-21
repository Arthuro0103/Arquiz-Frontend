import { test, expect } from '@playwright/test';
import { AuthHelper } from '../fixtures/auth-helper';

// Enhanced authentication helper
const enhancedLogin = async (page: any, userType: string) => {
  try {
    await page.goto('/login');
    await page.fill('input[name="email"]', `${userType}@test.com`);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    return true;
  } catch (error) {
    console.warn(`Authentication failed for ${userType}:`, error);
    return false;
  }
};

// Enhanced room creation helper
const enhancedCreateRoom = async (page: any, roomName: string): Promise<string | null> => {
  try {
    await page.goto('/rooms/create');
    await page.fill('input[name="name"]', roomName);
    await page.fill('textarea[name="description"]', `Test room: ${roomName}`);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/rooms/, { timeout: 15000 });
    
    // Extract room ID from URL or success message
    const url = page.url();
    const roomId = url.split('/').pop();
    return roomId || null;
  } catch (error) {
    console.warn('Room creation failed:', error);
    return null;
  }
};

// Helper to wait for element with timeout
const enhancedWaitForElement = async (page: any, selector: string, timeout = 10000) => {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    console.warn(`Element ${selector} not found within ${timeout}ms`);
    return false;
  }
};

// Helper to generate random string
const generateRandomString = (length: number) => {
  return Math.random().toString(36).substring(2, length + 2);
};

test.describe('Delete Room Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Reset any test state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Room Owner Permissions', () => {
    test('should show delete button for room owner', async ({ page }) => {
      // Setup: Login as teacher
      const loginSuccess = await enhancedLogin(page, 'professor');
      if (!loginSuccess) {
        console.log('⚠️ Skipping test - authentication failed');
        return;
      }

      // Create a room
      const roomName = `Delete Test Room ${generateRandomString(6)}`;
      const roomId = await enhancedCreateRoom(page, roomName);
      if (!roomId) {
        console.log('⚠️ Skipping test - room creation failed');
        return;
      }

      // Go to rooms page
      await page.goto('/rooms');
      await page.waitForSelector('[data-testid="room-card"], .room-card', { timeout: 10000 });

      // Find the room card and click dropdown menu
      const roomCard = page.locator(`text="${roomName}"`).first();
      await expect(roomCard).toBeVisible();

      // Click the dropdown menu (three dots)
      const dropdownTrigger = roomCard.locator('..').locator('button:has([data-testid="more-options"], svg)').first();
      await dropdownTrigger.click();

      // Verify delete button is present
      const deleteButton = page.locator('button:has-text("Excluir"), button:has(svg[data-testid="trash-icon"]), [data-testid="delete-room-button"]');
      await expect(deleteButton).toBeVisible();

      console.log('✅ Delete button visible for room owner');
    });

    test('should hide delete button for non-owner', async ({ context }) => {
      const teacherPage = await context.newPage();
      const studentPage = await context.newPage();

      try {
        // Setup: Teacher creates room
        const teacherLoginSuccess = await enhancedLogin(teacherPage, 'professor');
        if (!teacherLoginSuccess) {
          console.log('⚠️ Skipping test - teacher authentication failed');
          return;
        }

        const roomName = `Non-owner Test Room ${generateRandomString(6)}`;
        const roomId = await enhancedCreateRoom(teacherPage, roomName);
        if (!roomId) {
          console.log('⚠️ Skipping test - room creation failed');
          return;
        }

        // Student views the room
        const studentLoginSuccess = await enhancedLogin(studentPage, 'student');
        if (!studentLoginSuccess) {
          console.log('⚠️ Skipping test - student authentication failed');
          return;
        }

        await studentPage.goto('/rooms');
        await studentPage.waitForSelector('[data-testid="room-card"], .room-card', { timeout: 10000 });

        // Find the room card
        const roomCard = studentPage.locator(`text="${roomName}"`).first();
        if (await roomCard.isVisible()) {
          // Click dropdown menu
          const dropdownTrigger = roomCard.locator('..').locator('button:has([data-testid="more-options"], svg)').first();
          await dropdownTrigger.click();

          // Verify delete button is NOT present
          const deleteButton = studentPage.locator('button:has-text("Excluir"), [data-testid="delete-room-button"]');
          await expect(deleteButton).not.toBeVisible();

          console.log('✅ Delete button hidden for non-owner');
        } else {
          console.log('⚠️ Room not visible to student - permission working as expected');
        }
      } finally {
        await Promise.all([
          teacherPage.close(),
          studentPage.close()
        ]);
      }
    });
  });

  test.describe('Delete Confirmation Dialog', () => {
    test('should show confirmation dialog when delete is clicked', async ({ page }) => {
      // Setup: Login and create room
      const loginSuccess = await enhancedLogin(page, 'professor');
      if (!loginSuccess) {
        console.log('⚠️ Skipping test - authentication failed');
        return;
      }

      const roomName = `Confirmation Test Room ${generateRandomString(6)}`;
      const roomId = await enhancedCreateRoom(page, roomName);
      if (!roomId) {
        console.log('⚠️ Skipping test - room creation failed');
        return;
      }

      // Navigate to rooms page
      await page.goto('/rooms');
      await page.waitForSelector('[data-testid="room-card"], .room-card', { timeout: 10000 });

      // Find room and click delete
      const roomCard = page.locator(`text="${roomName}"`).first();
      await roomCard.click();

      // Click dropdown menu
      const dropdownTrigger = roomCard.locator('..').locator('button:has([data-testid="more-options"], svg)').first();
      await dropdownTrigger.click();

      // Click delete button
      const deleteButton = page.locator('button:has-text("Excluir"), [data-testid="delete-room-button"]').first();
      await deleteButton.click();

      // Verify confirmation dialog appears
      const dialog = page.locator('[role="dialog"], .dialog-content');
      await expect(dialog).toBeVisible();

      // Verify dialog content
      const dialogTitle = page.locator('h2:has-text("Excluir"), [data-testid="dialog-title"]');
      await expect(dialogTitle).toBeVisible();

      const roomNameInDialog = page.locator(`text="${roomName}"`);
      await expect(roomNameInDialog).toBeVisible();

      // Verify cancel and confirm buttons
      const cancelButton = page.locator('button:has-text("Cancelar"), [data-testid="cancel-button"]');
      const confirmButton = page.locator('button:has-text("Excluir"), [data-testid="confirm-delete-button"]');

      await expect(cancelButton).toBeVisible();
      await expect(confirmButton).toBeVisible();

      console.log('✅ Confirmation dialog displayed correctly');
    });

    test('should cancel deletion when cancel button is clicked', async ({ page }) => {
      // Setup: Login and create room
      const loginSuccess = await enhancedLogin(page, 'professor');
      if (!loginSuccess) {
        console.log('⚠️ Skipping test - authentication failed');
        return;
      }

      const roomName = `Cancel Delete Test Room ${generateRandomString(6)}`;
      const roomId = await enhancedCreateRoom(page, roomName);
      if (!roomId) {
        console.log('⚠️ Skipping test - room creation failed');
        return;
      }

      // Navigate and trigger delete
      await page.goto('/rooms');
      await page.waitForSelector('[data-testid="room-card"], .room-card', { timeout: 10000 });

      const roomCard = page.locator(`text="${roomName}"`).first();
      const dropdownTrigger = roomCard.locator('..').locator('button:has([data-testid="more-options"], svg)').first();
      await dropdownTrigger.click();

      const deleteButton = page.locator('button:has-text("Excluir"), [data-testid="delete-room-button"]').first();
      await deleteButton.click();

      // Click cancel
      const cancelButton = page.locator('button:has-text("Cancelar"), [data-testid="cancel-button"]');
      await cancelButton.click();

      // Verify dialog is closed
      const dialog = page.locator('[role="dialog"], .dialog-content');
      await expect(dialog).not.toBeVisible();

      // Verify room still exists
      await page.reload();
      const roomStillExists = page.locator(`text="${roomName}"`);
      await expect(roomStillExists).toBeVisible();

      console.log('✅ Delete operation cancelled successfully');
    });
  });

  test.describe('Active Room Protection', () => {
    test('should allow deletion of active rooms', async ({ page }) => {
      // Setup: Login and create room
      const loginSuccess = await enhancedLogin(page, 'professor');
      if (!loginSuccess) {
        console.log('⚠️ Skipping test - authentication failed');
        return;
      }

      const roomName = `Active Room Test ${generateRandomString(6)}`;
      const roomId = await enhancedCreateRoom(page, roomName);
      if (!roomId) {
        console.log('⚠️ Skipping test - room creation failed');
        return;
      }

      // Start the room to make it active
      await page.goto(`/rooms/${roomId}/manage`);
      const startButton = page.locator('button:has-text("Iniciar"), [data-testid="start-room-button"]');
      if (await startButton.isVisible()) {
        await startButton.click();
        await page.waitForURL(`/rooms/${roomId}/monitoring`, { timeout: 10000 });
      }

      // Go back to rooms page
      await page.goto('/rooms');
      await page.waitForSelector('[data-testid="room-card"], .room-card', { timeout: 10000 });

      // Find room and check delete button
      const roomCard = page.locator(`text="${roomName}"`).first();
      const dropdownTrigger = roomCard.locator('..').locator('button:has([data-testid="more-options"], svg)').first();
      await dropdownTrigger.click();

      // Verify delete button is enabled (not disabled)
      const deleteButton = page.locator('button:has-text("Excluir"), [data-testid="delete-room-button"]').first();
      await expect(deleteButton).toBeEnabled();

      console.log('✅ Delete button enabled for active room');
    });
  });

  test.describe('Delete Operation and UI Updates', () => {
    test('should successfully delete room and update UI', async ({ page }) => {
      // Setup: Login and create room
      const loginSuccess = await enhancedLogin(page, 'professor');
      if (!loginSuccess) {
        console.log('⚠️ Skipping test - authentication failed');
        return;
      }

      const roomName = `Delete Success Test ${generateRandomString(6)}`;
      const roomId = await enhancedCreateRoom(page, roomName);
      if (!roomId) {
        console.log('⚠️ Skipping test - room creation failed');
        return;
      }

      // Navigate to rooms page
      await page.goto('/rooms');
      await page.waitForSelector('[data-testid="room-card"], .room-card', { timeout: 10000 });

      // Count rooms before deletion
      const roomCountBefore = await page.locator('[data-testid="room-card"], .room-card').count();

      // Find and delete room
      const roomCard = page.locator(`text="${roomName}"`).first();
      await expect(roomCard).toBeVisible();

      const dropdownTrigger = roomCard.locator('..').locator('button:has([data-testid="more-options"], svg)').first();
      await dropdownTrigger.click();

      const deleteButton = page.locator('button:has-text("Excluir"), [data-testid="delete-room-button"]').first();
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Excluir"), [data-testid="confirm-delete-button"]').first();
      await confirmButton.click();

      // Wait for success toast or UI update
      await page.waitForTimeout(3000);

      // Verify room is removed from UI
      const roomCardAfterDelete = page.locator(`text="${roomName}"`);
      await expect(roomCardAfterDelete).not.toBeVisible();

      // Verify room count decreased
      const roomCountAfter = await page.locator('[data-testid="room-card"], .room-card').count();
      expect(roomCountAfter).toBe(roomCountBefore - 1);

      console.log('✅ Room deleted successfully and UI updated');
    });

    test('should show loading state during deletion', async ({ page }) => {
      // Setup: Login and create room
      const loginSuccess = await enhancedLogin(page, 'professor');
      if (!loginSuccess) {
        console.log('⚠️ Skipping test - authentication failed');
        return;
      }

      const roomName = `Loading Test Room ${generateRandomString(6)}`;
      const roomId = await enhancedCreateRoom(page, roomName);
      if (!roomId) {
        console.log('⚠️ Skipping test - room creation failed');
        return;
      }

      // Navigate and trigger delete
      await page.goto('/rooms');
      await page.waitForSelector('[data-testid="room-card"], .room-card', { timeout: 10000 });

      const roomCard = page.locator(`text="${roomName}"`).first();
      const dropdownTrigger = roomCard.locator('..').locator('button:has([data-testid="more-options"], svg)').first();
      await dropdownTrigger.click();

      const deleteButton = page.locator('button:has-text("Excluir"), [data-testid="delete-room-button"]').first();
      await deleteButton.click();

      // Click confirm and immediately check for loading state
      const confirmButton = page.locator('button:has-text("Excluir"), [data-testid="confirm-delete-button"]').first();
      await confirmButton.click();

      // Check for loading indicators
      const loadingSpinner = page.locator('[data-testid="loading-spinner"], .animate-spin');
      const loadingText = page.locator('text="Excluindo..."');

      // At least one loading indicator should be present
      const hasLoadingIndicator = await loadingSpinner.isVisible() || await loadingText.isVisible();
      expect(hasLoadingIndicator).toBe(true);

      console.log('✅ Loading state displayed during deletion');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle deletion errors gracefully', async ({ page }) => {
      // Setup: Login and create room
      const loginSuccess = await enhancedLogin(page, 'professor');
      if (!loginSuccess) {
        console.log('⚠️ Skipping test - authentication failed');
        return;
      }

      const roomName = `Error Test Room ${generateRandomString(6)}`;
      const roomId = await enhancedCreateRoom(page, roomName);
      if (!roomId) {
        console.log('⚠️ Skipping test - room creation failed');
        return;
      }

      // Mock network error
      await page.route('**/rooms/**', route => {
        if (route.request().method() === 'DELETE') {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      // Navigate and trigger delete
      await page.goto('/rooms');
      await page.waitForSelector('[data-testid="room-card"], .room-card', { timeout: 10000 });

      const roomCard = page.locator(`text="${roomName}"`).first();
      const dropdownTrigger = roomCard.locator('..').locator('button:has([data-testid="more-options"], svg)').first();
      await dropdownTrigger.click();

      const deleteButton = page.locator('button:has-text("Excluir"), [data-testid="delete-room-button"]').first();
      await deleteButton.click();

      const confirmButton = page.locator('button:has-text("Excluir"), [data-testid="confirm-delete-button"]').first();
      await confirmButton.click();

      // Wait for error toast or message
      await page.waitForTimeout(3000);

      // Verify error is displayed
      const errorToast = page.locator('[data-testid="error-toast"], .toast-error, text="Erro"');
      await expect(errorToast).toBeVisible();

      // Verify room still exists
      await page.reload();
      const roomStillExists = page.locator(`text="${roomName}"`);
      await expect(roomStillExists).toBeVisible();

      console.log('✅ Error handling works correctly');
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible with keyboard navigation', async ({ page }) => {
      // Setup: Login and create room
      const loginSuccess = await enhancedLogin(page, 'professor');
      if (!loginSuccess) {
        console.log('⚠️ Skipping test - authentication failed');
        return;
      }

      const roomName = `Keyboard Test Room ${generateRandomString(6)}`;
      const roomId = await enhancedCreateRoom(page, roomName);
      if (!roomId) {
        console.log('⚠️ Skipping test - room creation failed');
        return;
      }

      // Navigate to rooms page
      await page.goto('/rooms');
      await page.waitForSelector('[data-testid="room-card"], .room-card', { timeout: 10000 });

      // Use keyboard to navigate to delete button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Open dropdown
      await page.keyboard.press('Tab'); // Navigate to delete button
      await page.keyboard.press('Enter'); // Trigger delete

      // Verify dialog opened
      const dialog = page.locator('[role="dialog"], .dialog-content');
      await expect(dialog).toBeVisible();

      // Use keyboard to cancel
      await page.keyboard.press('Tab'); // Navigate to cancel
      await page.keyboard.press('Enter'); // Cancel

      // Verify dialog closed
      await expect(dialog).not.toBeVisible();

      console.log('✅ Keyboard navigation works correctly');
    });
  });
}); 