import { test as base, expect } from '@playwright/test';

// Simple test fixtures for now
export interface EnhancedTestFixtures {
  authenticatedProfessor: void;
  authenticatedStudent: void;
  authenticatedAdmin: void;
}

export const test = base.extend<EnhancedTestFixtures>({
  authenticatedProfessor: async ({ page }, use) => {
    // TODO: Implement authentication
    await use();
  },

  authenticatedStudent: async ({ page }, use) => {
    // TODO: Implement authentication
    await use();
  },

  authenticatedAdmin: async ({ page }, use) => {
    // TODO: Implement authentication
    await use();
  },
});

export { expect }; 