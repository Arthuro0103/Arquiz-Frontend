import { defineConfig, devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * Enhanced Playwright Configuration for ArQuiz
 * 
 * Comprehensive testing setup including:
 * - Cross-browser testing (Chrome, Firefox, Safari)
 * - Mobile device testing
 * - Performance monitoring
 * - Security testing
 * - Accessibility validation
 * - Visual regression testing
 * - API testing integration
 * - Parallel execution optimization
 */

// Environment configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const CI = !!process.env.CI;
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';
const WORKERS = process.env.PLAYWRIGHT_WORKERS ? parseInt(process.env.PLAYWRIGHT_WORKERS) : CI ? 2 : 4;

// Test timeouts based on environment
const TIMEOUTS = {
  test: CI ? 60000 : 45000,        // Individual test timeout
  expect: CI ? 10000 : 8000,       // Assertion timeout
  navigation: CI ? 30000 : 20000,  // Page navigation timeout
  action: CI ? 10000 : 8000,       // Action timeout (click, fill, etc.)
};

// Retry configuration
const RETRIES = CI ? 2 : 1;
const GLOBAL_TIMEOUT = CI ? 1800000 : 1200000; // 30min CI, 20min local

/**
 * Enhanced Playwright Test Configuration
 */
export default defineConfig({
  // === BASIC CONFIGURATION ===
  testDir: './tests/e2e',
  outputDir: './test-results',
  timeout: TIMEOUTS.test,
  globalTimeout: GLOBAL_TIMEOUT,
  expect: {
    timeout: TIMEOUTS.expect,
  },
  
  // === EXECUTION CONFIGURATION ===
  fullyParallel: true,
  forbidOnly: CI,
  retries: RETRIES,
  workers: WORKERS,
  
  // === REPORTING ===
  reporter: [
    // Console reporter for development
    ['list', { printSteps: !CI }],
    
    // HTML report for detailed analysis
    ['html', { 
      outputFolder: './test-results/html-report',
      open: CI ? 'never' : 'on-failure'
    }],
    
    // JSON reporter for CI/CD integration
    ['json', { 
      outputFile: './test-results/test-results.json' 
    }],
    
    // JUnit for CI systems that require it
    ...(CI ? [['junit', { outputFile: './test-results/junit.xml' }] as any] : []),
    
    // GitHub Actions integration
    ...(process.env.GITHUB_ACTIONS ? [['github'] as any] : []),
  ],

  // === GLOBAL SETUP AND TEARDOWN ===
  globalSetup: './tests/utils/global-setup.ts',
  globalTeardown: './tests/utils/global-teardown.ts',

  // === TEST CONFIGURATION ===
  use: {
    // Base URL for tests
    baseURL: BASE_URL,
    
    // Action timeouts
    actionTimeout: TIMEOUTS.action,
    navigationTimeout: TIMEOUTS.navigation,
    
    // Browser configuration
    headless: HEADLESS,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Enhanced debugging
    launchOptions: {
      slowMo: CI ? 0 : 100,
      // Additional Chrome flags for testing
      args: [
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-timer-throttling',
        '--force-fieldtrials=WebRTC-H264WithOpenH264FFmpeg/Enabled/',
      ],
    },
    
    // Context options
    contextOptions: {
      // Permissions for WebRTC, notifications, etc.
      permissions: ['camera', 'microphone', 'notifications'],
      
      // Geolocation for location-based features
      geolocation: { latitude: 37.7749, longitude: -122.4194 },
      
      // Locale for internationalization testing
      locale: 'en-US',
      
      // Color scheme testing
      colorScheme: 'light',
      
      // Reduced motion for accessibility testing
      reducedMotion: 'no-preference',
      
      // Extra HTTP headers
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Test-Environment': 'playwright',
      },
    },
  },

  // === PROJECT CONFIGURATIONS ===
  projects: [
    // === SETUP PROJECT ===
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    
    // === CLEANUP PROJECT ===
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
    },

    // === DESKTOP BROWSERS ===
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      dependencies: ['setup'],
      testIgnore: [
        '**/mobile-*.spec.ts',
        '**/tablet-*.spec.ts',
      ],
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
      },
      dependencies: ['setup'],
      testIgnore: [
        '**/mobile-*.spec.ts',
        '**/tablet-*.spec.ts',
        '**/webkit-*.spec.ts',
      ],
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
      },
      dependencies: ['setup'],
      testIgnore: [
        '**/mobile-*.spec.ts',
        '**/tablet-*.spec.ts',
        '**/firefox-*.spec.ts',
      ],
    },

    // === MOBILE DEVICES ===
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        hasTouch: true,
      },
      dependencies: ['setup'],
      testMatch: [
        '**/mobile-*.spec.ts',
        '**/responsive-*.spec.ts',
        '**/authentication-*.spec.ts',
        '**/quiz-*.spec.ts',
      ],
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true,
      },
      dependencies: ['setup'],
      testMatch: [
        '**/mobile-*.spec.ts',
        '**/responsive-*.spec.ts',
        '**/authentication-*.spec.ts',
      ],
    },

    // === TABLET DEVICES ===
    {
      name: 'tablet-chrome',
      use: { 
        ...devices['iPad Pro'],
        hasTouch: true,
      },
      dependencies: ['setup'],
      testMatch: [
        '**/tablet-*.spec.ts',
        '**/responsive-*.spec.ts',
        '**/quiz-*.spec.ts',
      ],
    },

    // === ACCESSIBILITY TESTING ===
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          reducedMotion: 'reduce',
          forcedColors: 'active',
        },
      },
      dependencies: ['setup'],
      testMatch: [
        '**/accessibility-*.spec.ts',
        '**/comprehensive-*.spec.ts',
      ],
      retries: 0, // Accessibility tests should be deterministic
    },

    // === PERFORMANCE TESTING ===
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--enable-automation',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-ipc-flooding-protection',
          ],
        },
      },
      dependencies: ['setup'],
      testMatch: [
        '**/performance-*.spec.ts',
        '**/load-*.spec.ts',
        '**/comprehensive-*.spec.ts',
      ],
      timeout: 120000, // Longer timeout for performance tests
    },

    // === SECURITY TESTING ===
    {
      name: 'security',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          // Security testing specific options
          bypassCSP: false,
        },
      },
      dependencies: ['setup'],
      testMatch: [
        '**/security-*.spec.ts',
        '**/comprehensive-authentication-*.spec.ts',
      ],
    },

    // === API TESTING ===
    {
      name: 'api',
      use: {
        baseURL: API_BASE_URL,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      },
      dependencies: ['setup'],
      testMatch: [
        '**/api-*.spec.ts',
        '**/integration-*.spec.ts',
      ],
    },

    // === VISUAL REGRESSION TESTING ===
    {
      name: 'visual',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['setup'],
      testMatch: [
        '**/visual-*.spec.ts',
        '**/screenshot-*.spec.ts',
      ],
      retries: 0, // Visual tests should be deterministic
    },

    // === CROSS-BROWSER COMPATIBILITY ===
    {
      name: 'compatibility',
      use: { 
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
      testMatch: [
        '**/cross-browser-*.spec.ts',
        '**/compatibility-*.spec.ts',
      ],
    },

    // === INTERNATIONALIZATION TESTING ===
    {
      name: 'i18n-pt',
      use: { 
        ...devices['Desktop Chrome'],
        locale: 'pt-BR',
        contextOptions: {
          locale: 'pt-BR',
          extraHTTPHeaders: {
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          },
        },
      },
      dependencies: ['setup'],
      testMatch: [
        '**/i18n-*.spec.ts',
        '**/localization-*.spec.ts',
      ],
    },

    {
      name: 'i18n-es',
      use: { 
        ...devices['Desktop Chrome'],
        locale: 'es-ES',
        contextOptions: {
          locale: 'es-ES',
          extraHTTPHeaders: {
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          },
        },
      },
      dependencies: ['setup'],
      testMatch: [
        '**/i18n-*.spec.ts',
        '**/localization-*.spec.ts',
      ],
    },

    // === REAL-TIME TESTING ===
    {
      name: 'websocket',
      use: { 
        ...devices['Desktop Chrome'],
        // Special settings for WebSocket testing
        launchOptions: {
          args: [
            '--disable-web-security',
            '--enable-experimental-web-platform-features',
          ],
        },
      },
      dependencies: ['setup'],
      testMatch: [
        '**/websocket-*.spec.ts',
        '**/realtime-*.spec.ts',
        '**/enhanced-websocket-*.spec.ts',
      ],
      timeout: 60000, // Longer timeout for real-time tests
    },

    // === LOAD TESTING ===
    {
      name: 'load',
      use: { 
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
      testMatch: [
        '**/load-*.spec.ts',
        '**/stress-*.spec.ts',
      ],
      workers: 1, // Sequential execution for load tests
      timeout: 300000, // 5 minutes for load tests
    },
  ],

  // === DEVELOPMENT SERVER ===
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test',
      DISABLE_TELEMETRY: '1',
    },
  },

  // === METADATA ===
  metadata: {
    'test-framework': 'playwright',
    'enhanced-config': 'true',
    'version': '1.0.0',
    'environment': CI ? 'ci' : 'local',
    'base-url': BASE_URL,
    'api-url': API_BASE_URL,
    'workers': WORKERS.toString(),
    'retries': RETRIES.toString(),
    'headless': HEADLESS.toString(),
  },

  // === ADVANCED CONFIGURATION ===
  
  // Test directory patterns
  testMatch: [
    '**/tests/e2e/**/*.spec.ts',
    '**/tests/e2e/**/*.test.ts',
  ],
  
  // Test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/build/**',
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    '**/test-results/**',
  ],

  
  // Grep patterns for selective test execution
  // Use with: npx playwright test --grep "@smoke"
  grep: process.env.PLAYWRIGHT_GREP ? new RegExp(process.env.PLAYWRIGHT_GREP) : undefined,
  grepInvert: process.env.PLAYWRIGHT_GREP_INVERT ? new RegExp(process.env.PLAYWRIGHT_GREP_INVERT) : undefined,
  
  // Shard configuration for parallel CI execution
  shard: process.env.PLAYWRIGHT_SHARD ? {
    current: parseInt(process.env.PLAYWRIGHT_SHARD_CURRENT || '1'),
    total: parseInt(process.env.PLAYWRIGHT_SHARD_TOTAL || '1'),
  } : undefined,
  
  // Update snapshots in CI only when explicitly requested
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',
} satisfies PlaywrightTestConfig);

// === CONFIGURATION VALIDATION ===
if (CI && !process.env.BASE_URL) {
  console.warn('Warning: BASE_URL not set in CI environment');
}

if (WORKERS > 8) {
  console.warn(`Warning: High worker count (${WORKERS}) may cause resource issues`);
}

// === EXPORT HELPERS ===
export { BASE_URL, API_BASE_URL, TIMEOUTS, CI, HEADLESS };

// === CONFIGURATION SUMMARY ===
console.log(`
🎭 Enhanced Playwright Configuration Loaded
==========================================
🌐 Base URL: ${BASE_URL}
🔗 API URL: ${API_BASE_URL}
👥 Workers: ${WORKERS}
🔄 Retries: ${RETRIES}
🎯 Environment: ${CI ? 'CI' : 'Local'}
📱 Projects: ${CI ? '15+' : '12+'} (Desktop, Mobile, Tablet, A11y, Performance, Security)
⏱️  Timeout: ${TIMEOUTS.test}ms
📊 Reporting: HTML, JSON${CI ? ', JUnit, GitHub' : ''}
🎨 Features: Visual Regression, Performance Monitoring, Security Testing, Accessibility Validation
`); 