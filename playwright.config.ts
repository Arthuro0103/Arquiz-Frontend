import { defineConfig, devices } from '@playwright/test';

/**
 * Upgraded Playwright Configuration with Latest Features
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Test execution settings */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  
  /* Retry configuration - enhanced for stability */
  retries: process.env.CI ? 3 : 1, // More retries for flaky tests
  
  /* Worker configuration - optimized for performance */
  workers: process.env.CI ? 2 : Math.min(4, Math.ceil(require('os').cpus().length / 2)),
  
  /* Enhanced reporter configuration */
  reporter: [
    ['html', { 
      open: process.env.CI ? 'never' : 'on-failure',
      outputFolder: 'playwright-report'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line']
  ],
  
  /* Improved timeout configuration */
  timeout: 15 * 1000, // 15 seconds per test
  globalTimeout: 15 * 60 * 1000, // 15 minutes total
  
  /* Enhanced expect settings */
  expect: {
    timeout: 5 * 1000, // 5 seconds for assertions
    toHaveScreenshot: { 
      threshold: 0.2 // Allow 20% difference in screenshots
    },
    toMatchSnapshot: { threshold: 0.2 }
  },
  
  /* Enhanced global use settings */
  use: {
    baseURL: 'http://localhost:8888',
    
    /* Improved tracing and debugging */
    trace: 'retain-on-failure', // Keep traces for all failures
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* Enhanced timeouts */
    navigationTimeout: 10 * 1000, // 10 seconds for navigation
    actionTimeout: 5 * 1000, // 5 seconds for actions
    
    /* Modern browser features */
    headless: !!process.env.CI,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    /* Enhanced user agent */
    userAgent: 'ArQuiz-E2E-Tests/1.0 Playwright-Upgraded',
    
    /* Locale and timezone settings */
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    /* Accessibility settings */
    colorScheme: 'light'
  },

  /* Modern project configurations */
  projects: [
    // Setup project for authentication and global setup
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },
    
    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/
    },

    // Core desktop tests - Chromium
    {
      name: 'desktop-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome' // Use stable Chrome
      },
      dependencies: ['setup'],
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

    // Firefox testing
    {
      name: 'desktop-firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
      testMatch: [
        'basic-navigation.spec.ts',
        'authentication-flow.spec.ts',
        'cross-browser-integration.spec.ts'
      ]
    },

    // Safari testing
    {
      name: 'desktop-safari',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
      testMatch: [
        'basic-navigation.spec.ts',
        'authentication-flow.spec.ts'
      ]
    },

    // Mobile Chrome testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        navigationTimeout: 20 * 1000 // Longer timeout for mobile
      },
      dependencies: ['setup'],
      testMatch: [
        'basic-navigation.spec.ts',
        'authentication-flow.spec.ts',
        'mobile-responsive-coverage.spec.ts'
      ]
    },

    // Mobile Safari testing
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        navigationTimeout: 20 * 1000
      },
      dependencies: ['setup'],
      testMatch: [
        'basic-navigation.spec.ts',
        'mobile-responsive-coverage.spec.ts'
      ]
    },

    // Feature-rich workflows
    {
      name: 'workflows',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      dependencies: ['setup'],
      testMatch: [
        'student-workflow.spec.ts',
        'professor-workflow.spec.ts',
        'enhanced-student-workflow.spec.ts',
        'student-workflow-fixed.spec.ts'
      ]
    },

    // API and integration tests
    {
      name: 'api-integration',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      dependencies: ['setup'],
      testMatch: [
        'api-integration.spec.ts',
        'comprehensive-backend-coverage.spec.ts'
      ]
    },

    // Quality assurance tests
    {
      name: 'quality-assurance',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      dependencies: ['setup'],
      testMatch: [
        'accessibility-performance.spec.ts',
        'enhanced-accessibility.spec.ts',
        'enhanced-performance.spec.ts',
        'error-handling-edge-cases.spec.ts',
        'performance-security-testing.spec.ts'
      ]
    },

    // Comprehensive coverage verification
    {
      name: 'coverage-verification',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      dependencies: ['setup'],
      testMatch: [
        'complete-coverage-verification.spec.ts',
        'test-reporting-maintenance.spec.ts'
      ]
    }
  ],

  /* Enhanced global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  /* Output directory configuration */
  outputDir: 'test-results/',
  
  /* Enhanced metadata */
  metadata: {
    'test-environment': process.env.NODE_ENV || 'test',
    'playwright-version': require('@playwright/test/package.json').version,
    'node-version': process.version,
    'os': require('os').platform(),
    'timestamp': new Date().toISOString()
  }
}); 