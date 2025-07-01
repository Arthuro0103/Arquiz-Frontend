import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Global timeout for each test */
  timeout: 30 * 1000, // 30 seconds - more realistic
  /* Global timeout for the entire test run */
  globalTimeout: 20 * 60 * 1000, // 20 minutes for focused suite
  /* Expect timeout for assertions */
  expect: {
    timeout: 8 * 1000, // 8 seconds for assertions
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8888',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot only on failure */
    screenshot: 'only-on-failure',
    /* Record video only on failure */
    video: 'retain-on-failure',
    /* Navigation timeout */
    navigationTimeout: 15 * 1000, // 15 seconds for page navigation
    /* Action timeout */
    actionTimeout: 10 * 1000, // 10 seconds for actions like click, fill
  },

  /* Configure projects for comprehensive testing */
  projects: [
    // Core functionality tests - primary browser
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        'basic-navigation.spec.ts',
        'authentication-flow.spec.ts',
        'frontend-routes.spec.ts',
        'websocket-realtime.spec.ts',
        'kick-participant-frontend.spec.ts',
        'setup-verification.spec.ts',
        'fixtures-verification.spec.ts'
      ]
    },

    // Mobile testing - single mobile device
    {
      name: 'mobile',
      use: { 
        ...devices['Pixel 5'],
        navigationTimeout: 18 * 1000,
      },
      testMatch: [
        'basic-navigation.spec.ts',
        'authentication-flow.spec.ts',
        'cross-browser-responsive.spec.ts',
        'mobile-responsive-coverage.spec.ts'
      ]
    },

    // Full feature tests - comprehensive workflows
    {
      name: 'full-features',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        'student-workflow.spec.ts',
        'professor-workflow.spec.ts',
        'api-integration.spec.ts',
        'enhanced-student-workflow.spec.ts',
        'student-workflow-fixed.spec.ts'
      ]
    },

    // Quality assurance - accessibility, performance, and maintenance
    {
      name: 'quality',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        'accessibility-performance.spec.ts',
        'enhanced-performance.spec.ts',
        'error-handling-edge-cases.spec.ts',
        'enhanced-accessibility.spec.ts',
        'test-reporting-maintenance.spec.ts'
      ]
    },

    // Comprehensive Coverage Tests - Complete backend and frontend verification
    {
      name: 'comprehensive-coverage',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        'comprehensive-backend-coverage.spec.ts',
        'complete-coverage-verification.spec.ts',
        'performance-security-testing.spec.ts'
      ]
    },

    // Cross-browser integration testing
    {
      name: 'cross-browser',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        'cross-browser-integration.spec.ts'
      ]
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8888',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start the server
  },
}); 