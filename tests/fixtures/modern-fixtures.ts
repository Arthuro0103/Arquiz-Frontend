/**
 * Modern Playwright Fixtures with Latest Features
 * Enhanced with Page Object Model, Visual Testing, and Performance Monitoring
 */
import { test as base, expect, Page, BrowserContext, Browser } from '@playwright/test';
import { AuthHelper } from './auth-helper';
import { UITestDataManager } from './data-manager';

// Define fixture types
export interface ModernFixtures {
  authenticatedPage: Page;
  authHelper: AuthHelper;
  dataManager: UITestDataManager;
  visualTester: VisualTester;
  performanceMonitor: PerformanceMonitor;
  apiHelper: APIHelper;
  accessibilityTester: AccessibilityTester;
  mobileEmulator: MobileEmulator;
}

// Modern Visual Testing Helper
class VisualTester {
  constructor(private page: Page) {}

  async takeScreenshot(name: string, options?: { fullPage?: boolean; mask?: string[] }) {
    const maskSelectors = options?.mask || [];
    const locators = maskSelectors.map(selector => this.page.locator(selector));
    
    return await this.page.screenshot({
      fullPage: options?.fullPage || false,
      mask: locators,
      animations: 'disabled'
    });
  }

  async compareScreenshot(name: string, options?: { threshold?: number; maxDiffPixels?: number }) {
    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      threshold: options?.threshold || 0.2,
      maxDiffPixels: options?.maxDiffPixels || 100
    });
  }

  async waitForStableUI(timeout: number = 5000) {
    // Wait for animations and layout shifts to complete
    await this.page.waitForFunction(() => {
      return !document.querySelector('[data-loading="true"]') &&
             !document.querySelector('.animate-spin') &&
             document.readyState === 'complete';
    }, { timeout });
    
    // Additional wait for any pending animations
    await this.page.waitForTimeout(100);
  }
}

// Performance Monitoring Helper
class PerformanceMonitor {
  private metrics: any[] = [];

  constructor(private page: Page) {}

  async startMonitoring() {
    // Enable CDP for performance metrics
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('Performance.enable');
    return client;
  }

  async measurePageLoad(url: string) {
    const startTime = Date.now();
    
    await this.page.goto(url, { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // Get Core Web Vitals
    const vitals = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries.map(entry => ({
            name: entry.name,
            duration: entry.duration || 0,
            startTime: entry.startTime || 0
          })));
        }).observe({ entryTypes: ['measure', 'navigation'] });
        
        // Fallback after timeout
        setTimeout(() => resolve([]), 1000);
      });
    });

    this.metrics.push({ url, loadTime, vitals, timestamp: new Date() });
    return { loadTime, vitals };
  }

  getMetrics() {
    return this.metrics;
  }

  async checkPagePerformance() {
    const performanceEntries = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      };
    });

    // Assert performance thresholds
    expect(performanceEntries.domContentLoaded).toBeLessThan(3000); // 3 seconds
    expect(performanceEntries.loadComplete).toBeLessThan(5000); // 5 seconds
    
    return performanceEntries;
  }
}

// Enhanced API Helper
class APIHelper {
  constructor(private page: Page) {}

  async makeRequest(method: string, url: string, data?: any, headers?: Record<string, string>) {
    const response = await this.page.evaluate(async ({ method, url, data, headers }) => {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: data ? JSON.stringify(data) : undefined
      });
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: await response.text(),
        headers: Object.fromEntries(response.headers.entries())
      };
    }, { method, url, data, headers });

    return response;
  }

  async interceptRequest(urlPattern: string, responseData: any) {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  async waitForRequest(urlPattern: string, timeout: number = 5000) {
    return await this.page.waitForRequest(request => 
      request.url().includes(urlPattern), { timeout });
  }

  async waitForResponse(urlPattern: string, timeout: number = 5000) {
    return await this.page.waitForResponse(response => 
      response.url().includes(urlPattern), { timeout });
  }
}

// Accessibility Testing Helper
class AccessibilityTester {
  constructor(private page: Page) {}

  async checkA11y(options?: { include?: string[]; exclude?: string[]; rules?: string[] }) {
    // Inject axe-core
    await this.page.addScriptTag({
      url: 'https://unpkg.com/axe-core@4.8.2/axe.min.js'
    });

    const results = await this.page.evaluate((options) => {
      return (window as any).axe.run(document, options);
    }, options);

    // Assert no violations
    expect(results.violations).toHaveLength(0);
    
    return results;
  }

  async checkKeyboardNavigation() {
    // Test tab navigation
    await this.page.keyboard.press('Tab');
    const activeElement = await this.page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeDefined();
  }

  async checkColorContrast() {
    const contrastIssues = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues: any[] = [];
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          // Simple contrast check (would need full contrast calculation in real implementation)
          issues.push({ element: el.tagName, color, backgroundColor });
        }
      });
      
      return issues;
    });

    return contrastIssues;
  }
}

// Mobile Device Emulator
class MobileEmulator {
  constructor(private page: Page) {}

  async setDeviceMode(device: 'mobile' | 'tablet' | 'desktop') {
    const viewports = {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 720 }
    };

    await this.page.setViewportSize(viewports[device]);
  }

  async simulateNetworkConditions(preset: 'slow-3g' | 'fast-3g' | 'offline') {
    const conditions = {
      'slow-3g': { downloadThroughput: 50000, uploadThroughput: 50000, latency: 2000 },
      'fast-3g': { downloadThroughput: 750000, uploadThroughput: 250000, latency: 100 },
      'offline': { downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
    };

    const client = await this.page.context().newCDPSession(this.page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: preset === 'offline',
      ...conditions[preset]
    });
  }

  async testTouchGestures() {
    // Test touch interactions
    await this.page.touchscreen.tap(100, 100);
    
    // Test swipe gesture
    await this.page.touchscreen.tap(100, 100);
    await this.page.mouse.move(100, 100);
    await this.page.mouse.down();
    await this.page.mouse.move(200, 100);
    await this.page.mouse.up();
  }
}

// Define the modern test fixture
export const test = base.extend<ModernFixtures>({
  // Authenticated page fixture
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const authHelper = new AuthHelper(page);
    await authHelper.authenticateUser('teacher');
    
    await use(page);
    await context.close();
  },

  // Auth helper fixture
  authHelper: async ({ page }, use) => {
    const authHelper = new AuthHelper(page);
    await use(authHelper);
  },

  // Data manager fixture
  dataManager: async ({ page }, use) => {
    const dataManager = new UITestDataManager(page);
    await use(dataManager);
  },

  // Visual testing fixture
  visualTester: async ({ page }, use) => {
    const visualTester = new VisualTester(page);
    await use(visualTester);
  },

  // Performance monitoring fixture
  performanceMonitor: async ({ page }, use) => {
    const performanceMonitor = new PerformanceMonitor(page);
    await use(performanceMonitor);
  },

  // API helper fixture
  apiHelper: async ({ page }, use) => {
    const apiHelper = new APIHelper(page);
    await use(apiHelper);
  },

  // Accessibility testing fixture
  accessibilityTester: async ({ page }, use) => {
    const accessibilityTester = new AccessibilityTester(page);
    await use(accessibilityTester);
  },

  // Mobile emulator fixture
  mobileEmulator: async ({ page }, use) => {
    const mobileEmulator = new MobileEmulator(page);
    await use(mobileEmulator);
  }
});

// Export enhanced expect with custom matchers
export { expect } from '@playwright/test';

// Helper function for common test patterns
export class TestPatterns {
  static async waitForPageLoad(page: Page, url?: string) {
    if (url) {
      await page.goto(url, { waitUntil: 'networkidle' });
    }
    
    await page.waitForFunction(() => document.readyState === 'complete');
    await page.waitForTimeout(100); // Additional buffer
  }

  static async fillFormAndSubmit(page: Page, formData: Record<string, string>, submitSelector: string) {
    for (const [field, value] of Object.entries(formData)) {
      await page.fill(`[name="${field}"], [data-testid="${field}"], #${field}`, value);
    }
    await page.click(submitSelector);
  }

  static async waitForToast(page: Page, message?: string, timeout: number = 5000) {
    const toastSelector = '[data-sonner-toaster]';
    await page.waitForSelector(toastSelector, { timeout });
    
    if (message) {
      await expect(page.locator(toastSelector)).toContainText(message);
    }
  }

  static async mockApiResponse(page: Page, endpoint: string, response: any) {
    await page.route(`**/api/${endpoint}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }
} 