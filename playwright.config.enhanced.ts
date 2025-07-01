import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced Playwright Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Enhanced parallel execution */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Enhanced retry strategy */
  retries: process.env.CI ? 3 : 1,
  
  /* Optimized workers for CI/local */
  workers: process.env.CI ? 2 : 4,
  
  /* Enhanced reporting with more detail */
  reporter: [
    ['html', { 
      open: 'never', 
      outputFolder: 'test-results/html-report'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'],
    ...(process.env.CI ? [['github']] : []),
  ],
  
  /* Enhanced global settings */
  use: {
    /* Base URL with fallback */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8888',
    
    /* Enhanced tracing */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    /* Enhanced screenshot settings */
    screenshot: 'only-on-failure',
    
    /* Enhanced video settings */
    video: 'retain-on-failure',
    
    /* Optimized timeouts */
    actionTimeout: 15000,
    navigationTimeout: 45000,
    
    /* Enhanced browser context */
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    /* Locale and timezone */
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    /* Enhanced permissions */
    permissions: ['notifications'],
    
    /* Accept downloads */
    acceptDownloads: true,
    
    /* Enhanced user agent */
    userAgent: 'Arquiz-E2E-Tests/1.0',
    
    /* Enhanced browser launch options */
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=TranslateUI',
        '--disable-extensions',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config'
      ],
      // Enhanced for debugging
      ...(process.env.DEBUG ? {
        headless: false,
        devtools: true,
        slowMo: 100
      } : {})
    }
  },

  /* Enhanced project configurations */
  projects: [
    // Desktop browsers
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
    },

    {
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
          }
        }
      },
    },

    {
      name: 'Desktop Safari',
      use: { 
        ...devices['Desktop Safari'],
      },
    },

    {
      name: 'Desktop Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
    },

    // Mobile browsers with enhanced settings
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        isMobile: true,
        hasTouch: true,
      },
    },

    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true,
        hasTouch: true,
      },
    },

    {
      name: 'Tablet iPad',
      use: { 
        ...devices['iPad Pro'],
        isMobile: true,
        hasTouch: true,
      },
    },

    // Accessibility testing project
    {
      name: 'Accessibility Tests',
      use: { 
        ...devices['Desktop Chrome']
      },
      testMatch: '**/accessibility*.spec.ts',
    },

    // Performance testing project
    {
      name: 'Performance Tests',
      use: { 
        ...devices['Desktop Chrome'],
        // Optimized for performance testing
        video: 'off',
        screenshot: 'off',
      },
      testMatch: '**/performance*.spec.ts',
    },

    // API testing project
    {
      name: 'API Tests',
      use: {
        // API testing doesn't need browser context
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
      },
      testMatch: '**/api*.spec.ts',
    }
  ],

  /* Enhanced global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup'),
  globalTeardown: require.resolve('./tests/global-teardown'),

  /* Enhanced timeout settings */
  timeout: 90000,
  expect: {
    timeout: 15000,
    toHaveScreenshot: {
      threshold: 0.2,
      animations: 'disabled'
    },
    toMatchSnapshot: {
      threshold: 0.3
    }
  },

  /* Enhanced web server configuration */
  webServer: [
    {
      command: 'npm run dev',
      port: 8888,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        PORT: '8888'
      },
    },
    // Optional: Backend server for API tests
    ...(process.env.START_BACKEND ? [{
      command: 'npm run start:test-backend',
      port: 3000,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        PORT: '3000'
      },
    }] : [])
  ],

  /* Enhanced output directory */
  outputDir: 'test-results/artifacts',

  /* Enhanced metadata */
  metadata: {
    'test-suite': 'Arquiz E2E Tests',
    'version': process.env.npm_package_version || '1.0.0',
    'environment': process.env.NODE_ENV || 'test',
    'ci': !!process.env.CI,
    'timestamp': new Date().toISOString()
  },

  /* Enhanced grep patterns */
  grep: process.env.TEST_GREP ? new RegExp(process.env.TEST_GREP) : undefined,
  grepInvert: process.env.TEST_GREP_INVERT ? new RegExp(process.env.TEST_GREP_INVERT) : undefined,

  /* Enhanced test filtering */
  testIgnore: [
    '**/node_modules/**',
    '**/test-results/**',
    '**/coverage/**',
    '**/.git/**'
  ]
}); 