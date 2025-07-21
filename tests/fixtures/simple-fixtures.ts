import { test as base, expect, Page } from '@playwright/test';
import { AuthHelper } from './auth-helper';

// Define fixture types
type SimpleFixtures = {
  simplePage: Page;
  mockAuthenticatedPage: Page;
  mockRoom: { code: string; name: string; participants: number };
};

// Simple fixtures that don't require complex authentication
export const test = base.extend<SimpleFixtures>({
  // Simple page setup without authentication
  simplePage: async ({ page }, use) => {
    // Use AuthHelper for reliable page setup with immediate fallback
    const authHelper = new AuthHelper(page);
    await authHelper.navigateWithAuth('/');
    await use(page);
  },

  // Mock authenticated state without actual login
  mockAuthenticatedPage: async ({ page }, use) => {
    // Use AuthHelper for reliable authenticated page setup
    const authHelper = new AuthHelper(page);
    // Try dashboard first, fallback to home if needed
    await authHelper.navigateWithAuth('/dashboard');
    await use(page);
  },

  // Simple room testing without complex setup
  mockRoom: async ({ page }, use) => {
    const mockRoomData = {
      code: 'TEST123',
      name: 'Test Room',
      participants: 0
    };
    await use(mockRoomData);
  }
});

export { expect } from '@playwright/test'; 