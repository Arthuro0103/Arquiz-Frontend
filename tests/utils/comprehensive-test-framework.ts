import { Page, expect, Browser, BrowserContext, Locator, Response, Request } from '@playwright/test';

/**
 * Comprehensive Test Framework - Enhanced Testing Infrastructure
 * Provides advanced testing utilities for ArQuiz application
 */

// === CONFIGURATION ===
export interface ComprehensiveTestConfig {
  timeouts: {
    navigation: number;
    apiCall: number;
    elementWait: number;
    formSubmit: number;
    websocket: number;
    database: number;
  };
  retries: {
    maxAttempts: number;
    backoffBase: number;
    backoffMax: number;
    exponentialMultiplier: number;
  };
  performance: {
    pageLoadThreshold: number;
    apiResponseThreshold: number;
    interactionThreshold: number;
    memoryLeakThreshold: number;
  };
  security: {
    enableXssDetection: boolean;
    enableSqlInjectionDetection: boolean;
    enableCsrfValidation: boolean;
    enableAuthValidation: boolean;
  };
  accessibility: {
    enableWcagChecks: boolean;
    enableColorContrastChecks: boolean;
    enableKeyboardNavigation: boolean;
    enableScreenReaderChecks: boolean;
  };
  debugging: {
    captureNetworkLogs: boolean;
    captureConsoleLogs: boolean;
    captureScreenshots: boolean;
    captureVideoOnFailure: boolean;
    savePageHtml: boolean;
  };
}

export const DEFAULT_CONFIG: ComprehensiveTestConfig = {
  timeouts: {
    navigation: 30000,
    apiCall: 15000,
    elementWait: 10000,
    formSubmit: 20000,
    websocket: 12000,
    database: 25000,
  },
  retries: {
    maxAttempts: 3,
    backoffBase: 1000,
    backoffMax: 10000,
    exponentialMultiplier: 2,
  },
  performance: {
    pageLoadThreshold: 3000,
    apiResponseThreshold: 2000,
    interactionThreshold: 1000,
    memoryLeakThreshold: 50000000, // 50MB
  },
  security: {
    enableXssDetection: true,
    enableSqlInjectionDetection: true,
    enableCsrfValidation: true,
    enableAuthValidation: true,
  },
  accessibility: {
    enableWcagChecks: true,
    enableColorContrastChecks: true,
    enableKeyboardNavigation: true,
    enableScreenReaderChecks: false, // Requires special setup
  },
  debugging: {
    captureNetworkLogs: true,
    captureConsoleLogs: true,
    captureScreenshots: true,
    captureVideoOnFailure: true,
    savePageHtml: false,
  },
};

// === ADVANCED USER MANAGEMENT ===
export interface ComprehensiveTestUser {
  id?: string;
  email: string;
  password: string;
  fullName: string;
  role: 'professor' | 'student' | 'admin' | 'moderator';
  profile: {
    department?: string;
    grade?: string;
    permissions: string[];
    preferences: Record<string, any>;
    status: 'active' | 'inactive' | 'suspended';
  };
  metadata: {
    created: Date;
    lastLogin?: Date;
    sessionCount: number;
    testRuns: number;
    failedLogins: number;
  };
  security: {
    twoFactorEnabled: boolean;
    passwordLastChanged: Date;
    accountLocked: boolean;
    lockoutReason?: string;
  };
}

export const COMPREHENSIVE_TEST_USERS: Record<string, ComprehensiveTestUser> = {
  professor_primary: {
    email: 'prof.primary@arquiz.test',
    password: 'SecureProf2024!@#$',
    fullName: 'Primary Professor User',
    role: 'professor',
    profile: {
      department: 'Mathematics',
      permissions: ['CREATE_QUIZ', 'MANAGE_ROOMS', 'VIEW_ANALYTICS', 'MANAGE_STUDENTS', 'GRADE_ASSIGNMENTS'],
      preferences: { theme: 'light', language: 'en', notifications: true },
      status: 'active',
    },
    metadata: {
      created: new Date('2024-01-01'),
      sessionCount: 0,
      testRuns: 0,
      failedLogins: 0,
    },
    security: {
      twoFactorEnabled: false,
      passwordLastChanged: new Date('2024-01-01'),
      accountLocked: false,
    },
  },
  professor_secondary: {
    email: 'prof.secondary@arquiz.test',
    password: 'SecureProf2024!@#$',
    fullName: 'Secondary Professor User',
    role: 'professor',
    profile: {
      department: 'Science',
      permissions: ['CREATE_QUIZ', 'MANAGE_ROOMS', 'VIEW_ANALYTICS'],
      preferences: { theme: 'dark', language: 'pt', notifications: false },
      status: 'active',
    },
    metadata: {
      created: new Date('2024-01-15'),
      sessionCount: 0,
      testRuns: 0,
      failedLogins: 0,
    },
    security: {
      twoFactorEnabled: true,
      passwordLastChanged: new Date('2024-01-15'),
      accountLocked: false,
    },
  },
  student_primary: {
    email: 'student.primary@arquiz.test',
    password: 'SecureStud2024!@#$',
    fullName: 'Primary Student User',
    role: 'student',
    profile: {
      grade: '10th',
      permissions: ['JOIN_QUIZ', 'VIEW_RESULTS', 'SUBMIT_ASSIGNMENTS'],
      preferences: { theme: 'light', language: 'en', notifications: true },
      status: 'active',
    },
    metadata: {
      created: new Date('2024-01-01'),
      sessionCount: 0,
      testRuns: 0,
      failedLogins: 0,
    },
    security: {
      twoFactorEnabled: false,
      passwordLastChanged: new Date('2024-01-01'),
      accountLocked: false,
    },
  },
  student_secondary: {
    email: 'student.secondary@arquiz.test',
    password: 'SecureStud2024!@#$',
    fullName: 'Secondary Student User',
    role: 'student',
    profile: {
      grade: '12th',
      permissions: ['JOIN_QUIZ', 'VIEW_RESULTS'],
      preferences: { theme: 'auto', language: 'pt', notifications: true },
      status: 'active',
    },
    metadata: {
      created: new Date('2024-01-10'),
      sessionCount: 0,
      testRuns: 0,
      failedLogins: 0,
    },
    security: {
      twoFactorEnabled: false,
      passwordLastChanged: new Date('2024-01-10'),
      accountLocked: false,
    },
  },
  admin_primary: {
    email: 'admin.primary@arquiz.test',
    password: 'SecureAdmin2024!@#$',
    fullName: 'Primary Admin User',
    role: 'admin',
    profile: {
      permissions: ['FULL_ACCESS', 'SYSTEM_ADMIN', 'USER_MANAGEMENT', 'SECURITY_ADMIN'],
      preferences: { theme: 'dark', language: 'en', notifications: true },
      status: 'active',
    },
    metadata: {
      created: new Date('2024-01-01'),
      sessionCount: 0,
      testRuns: 0,
      failedLogins: 0,
    },
    security: {
      twoFactorEnabled: true,
      passwordLastChanged: new Date('2024-01-01'),
      accountLocked: false,
    },
  },
  locked_user: {
    email: 'locked.user@arquiz.test',
    password: 'LockedUser2024!@#$',
    fullName: 'Locked Test User',
    role: 'student',
    profile: {
      permissions: ['JOIN_QUIZ'],
      preferences: { theme: 'light', language: 'en', notifications: false },
      status: 'suspended',
    },
    metadata: {
      created: new Date('2024-01-01'),
      sessionCount: 0,
      testRuns: 0,
      failedLogins: 5,
    },
    security: {
      twoFactorEnabled: false,
      passwordLastChanged: new Date('2024-01-01'),
      accountLocked: true,
      lockoutReason: 'too_many_failed_attempts',
    },
  },
};

// === PERFORMANCE MONITORING ===
export interface PerformanceMetric {
  name: string;
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata: {
    browser?: string;
    viewport?: string;
    userAgent?: string;
    memoryUsage?: number;
    networkLatency?: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private config: ComprehensiveTestConfig;

  constructor(config: ComprehensiveTestConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  startTimer(name: string, operation: string): (success?: boolean, metadata?: Record<string, any>) => PerformanceMetric {
    const startTime = performance.now();
    const startTimestamp = new Date();

    return (success: boolean = true, metadata: Record<string, any> = {}) => {
      const duration = performance.now() - startTime;
      const metric: PerformanceMetric = {
        name,
        operation,
        duration,
        success,
        timestamp: startTimestamp,
        metadata,
      };

      this.metrics.push(metric);
      this.validatePerformanceThreshold(metric);
      return metric;
    };
  }

  private validatePerformanceThreshold(metric: PerformanceMetric): void {
    const { performance: thresholds } = this.config;
    
    switch (metric.operation) {
      case 'page_load':
        if (metric.duration > thresholds.pageLoadThreshold) {
          console.warn(`Page load performance warning: ${metric.duration}ms > ${thresholds.pageLoadThreshold}ms`);
        }
        break;
      case 'api_call':
        if (metric.duration > thresholds.apiResponseThreshold) {
          console.warn(`API response performance warning: ${metric.duration}ms > ${thresholds.apiResponseThreshold}ms`);
        }
        break;
      case 'interaction':
        if (metric.duration > thresholds.interactionThreshold) {
          console.warn(`Interaction performance warning: ${metric.duration}ms > ${thresholds.interactionThreshold}ms`);
        }
        break;
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getReport(): {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
    fastestOperation: PerformanceMetric | null;
  } {
    const total = this.metrics.length;
    const successful = this.metrics.filter(m => m.success).length;
    const failed = total - successful;
    const averageDuration = total > 0 ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total : 0;
    
    const sortedByDuration = [...this.metrics].sort((a, b) => a.duration - b.duration);
    const slowestOperation = sortedByDuration[sortedByDuration.length - 1] || null;
    const fastestOperation = sortedByDuration[0] || null;

    return {
      total,
      successful,
      failed,
      averageDuration,
      slowestOperation,
      fastestOperation,
    };
  }

  reset(): void {
    this.metrics = [];
  }
}

// === NETWORK MONITORING ===
export class NetworkMonitor {
  private requests: Request[] = [];
  private responses: Response[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.setupInterception();
  }

  private setupInterception(): void {
    this.page.on('request', (request) => {
      this.requests.push(request);
    });

    this.page.on('response', (response) => {
      this.responses.push(response);
    });
  }

  getRequests(filter?: (request: Request) => boolean): Request[] {
    return filter ? this.requests.filter(filter) : [...this.requests];
  }

  getResponses(filter?: (response: Response) => boolean): Response[] {
    return filter ? this.responses.filter(filter) : [...this.responses];
  }

  getApiRequests(): Request[] {
    return this.requests.filter(req => 
      req.url().includes('/api/') || 
      req.url().includes('/auth/') ||
      req.method() !== 'GET' ||
      req.headers()['content-type']?.includes('application/json')
    );
  }

  getFailedRequests(): Response[] {
    return this.responses.filter(res => res.status() >= 400);
  }



  reset(): void {
    this.requests = [];
    this.responses = [];
  }
}

// === SECURITY TESTING ===
export class SecurityTester {
  private config: ComprehensiveTestConfig;

  constructor(config: ComprehensiveTestConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  async testXssVulnerabilities(page: Page, inputSelectors: string[]): Promise<{
    tested: number;
    vulnerabilities: Array<{ selector: string; payload: string; detected: boolean }>;
  }> {
    if (!this.config.security.enableXssDetection) {
      return { tested: 0, vulnerabilities: [] };
    }

    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
      '"><script>alert("xss")</script>',
      '<svg onload=alert("xss")>',
    ];

    const results: Array<{ selector: string; payload: string; detected: boolean }> = [];

    for (const selector of inputSelectors) {
      for (const payload of xssPayloads) {
        try {
          await page.fill(selector, payload);
          await page.keyboard.press('Tab');
          
          const value = await page.inputValue(selector);
          const detected = value !== payload || !value.includes('<script>');
          
          results.push({ selector, payload, detected });
        } catch (error) {
          results.push({ selector, payload, detected: true });
        }
      }
    }

    return {
      tested: results.length,
      vulnerabilities: results.filter(r => !r.detected),
    };
  }

  async testSqlInjectionInputs(page: Page, inputSelectors: string[]): Promise<{
    tested: number;
    vulnerabilities: Array<{ selector: string; payload: string; detected: boolean }>;
  }> {
    if (!this.config.security.enableSqlInjectionDetection) {
      return { tested: 0, vulnerabilities: [] };
    }

    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1#",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
    ];

    const results: Array<{ selector: string; payload: string; detected: boolean }> = [];

    for (const selector of inputSelectors) {
      for (const payload of sqlPayloads) {
        try {
          await page.fill(selector, payload);
          
          // Submit form if there's a submit button
          const submitButton = page.locator('button[type="submit"]').first();
          if (await submitButton.count() > 0) {
            await submitButton.click();
            await page.waitForTimeout(1000);
          }
          
          // Check for error messages that might indicate SQL injection protection
          const errorSelectors = ['.error', '[role="alert"]', '.text-red-600'];
          let errorFound = false;
          
          for (const errorSelector of errorSelectors) {
            if (await page.locator(errorSelector).count() > 0) {
              errorFound = true;
              break;
            }
          }
          
          // If no error, check if the page behaved normally (good sign)
          const detected = errorFound || page.url().includes('error') || page.url().includes('login');
          
          results.push({ selector, payload, detected });
        } catch (error) {
          // Form rejection is good
          results.push({ selector, payload, detected: true });
        }
      }
    }

    return {
      tested: results.length,
      vulnerabilities: results.filter(r => !r.detected),
    };
  }

  async checkCsrfProtection(page: Page): Promise<{
    isProtected: boolean;
    details: string[];
  }> {
    if (!this.config.security.enableCsrfValidation) {
      return { isProtected: true, details: ['CSRF validation disabled'] };
    }

    const details: string[] = [];
    let isProtected = false;

    const forms = await page.locator('form').all();
    
    for (const form of forms) {
      const csrfInputs = await form.locator('input[name*="csrf"], input[name*="token"], input[type="hidden"]').all();
      
      if (csrfInputs.length > 0) {
        isProtected = true;
        details.push(`Form has ${csrfInputs.length} potential CSRF protection input(s)`);
      } else {
        details.push('Form found without visible CSRF protection');
      }
    }

    return { isProtected, details };
  }

  async validateAuthenticationSecurity(page: Page): Promise<{
    secure: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    if (!this.config.security.enableAuthValidation) {
      return { secure: true, issues: [], recommendations: [] };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check password field security
    const passwordFields = await page.locator('input[type="password"]').all();
    
    for (const field of passwordFields) {
      const autocomplete = await field.getAttribute('autocomplete');
      if (!autocomplete || autocomplete === 'on') {
        issues.push('Password field allows autocomplete');
        recommendations.push('Set autocomplete="new-password" or "current-password"');
      }
    }

    // Check for secure cookie attributes
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(cookie => 
      cookie.name.toLowerCase().includes('auth') || 
      cookie.name.toLowerCase().includes('session') ||
      cookie.name.toLowerCase().includes('token')
    );

    for (const cookie of authCookies) {
      if (!cookie.secure) {
        issues.push(`Auth cookie '${cookie.name}' is not secure`);
        recommendations.push('Set Secure flag on authentication cookies');
      }
      
      if (!cookie.httpOnly) {
        issues.push(`Auth cookie '${cookie.name}' is not httpOnly`);
        recommendations.push('Set HttpOnly flag on authentication cookies');
      }
    }

    // Check for password strength requirements
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.count() > 0) {
      await passwordInput.fill('weak');
      
      const strengthIndicators = await page.locator('.password-strength, .strength-meter, [data-testid="password-strength"]').count();
      if (strengthIndicators === 0) {
        issues.push('No visible password strength indicator');
        recommendations.push('Implement password strength validation feedback');
      }
    }

    return {
      secure: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

// === ACCESSIBILITY TESTING ===
export class AccessibilityTester {
  private config: ComprehensiveTestConfig;

  constructor(config: ComprehensiveTestConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  async checkWcagCompliance(page: Page): Promise<{
    compliant: boolean;
    violations: Array<{
      rule: string;
      description: string;
      impact: 'minor' | 'moderate' | 'serious' | 'critical';
      elements: string[];
    }>;
  }> {
    if (!this.config.accessibility.enableWcagChecks) {
      return { compliant: true, violations: [] };
    }

    const violations: Array<{
      rule: string;
      description: string;
      impact: 'minor' | 'moderate' | 'serious' | 'critical';
      elements: string[];
    }> = [];

    // Check for missing alt text on images
    const images = await page.locator('img').all();
    const imagesWithoutAlt: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      
      if (!alt && src && !src.includes('data:')) {
        imagesWithoutAlt.push(`img[src="${src}"]`);
      }
    }

    if (imagesWithoutAlt.length > 0) {
      violations.push({
        rule: 'WCAG 1.1.1',
        description: 'Images must have alternative text',
        impact: 'serious',
        elements: imagesWithoutAlt,
      });
    }

    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;
    const invalidHeadings: string[] = [];

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.charAt(1));
      
      if (i === 0 && level !== 1) {
        invalidHeadings.push(`First heading should be h1, found ${tagName}`);
      } else if (level > previousLevel + 1) {
        invalidHeadings.push(`Heading level skipped: ${tagName} after h${previousLevel}`);
      }
      
      previousLevel = level;
    }

    if (invalidHeadings.length > 0) {
      violations.push({
        rule: 'WCAG 1.3.1',
        description: 'Headings must be properly structured',
        impact: 'moderate',
        elements: invalidHeadings,
      });
    }

    // Check form labels
    const inputs = await page.locator('input, select, textarea').all();
    const unlabeledInputs: string[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      
      if (id) {
        const labelCount = await page.locator(`label[for="${id}"]`).count();
        if (labelCount === 0 && !ariaLabel) {
          unlabeledInputs.push(`input#${id}`);
        }
      } else if (!ariaLabel) {
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());
        unlabeledInputs.push(`${tagName}[unlabeled]`);
      }
    }

    if (unlabeledInputs.length > 0) {
      violations.push({
        rule: 'WCAG 3.3.2',
        description: 'Form inputs must have accessible labels',
        impact: 'serious',
        elements: unlabeledInputs,
      });
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  async checkColorContrast(page: Page): Promise<{
    passed: boolean;
    results: Array<{
      element: string;
      foreground: string;
      background: string;
      ratio: number;
      level: 'AA' | 'AAA' | 'fail';
    }>;
  }> {
    if (!this.config.accessibility.enableColorContrastChecks) {
      return { passed: true, results: [] };
    }

    // This is a simplified version - in practice, you'd use a library like axe-core
    const results = await page.evaluate(() => {
      const getComputedColor = (element: Element, property: 'color' | 'background-color'): string => {
        return window.getComputedStyle(element).getPropertyValue(property);
      };

      const calculateLuminance = (rgb: string): number => {
        const values = rgb.match(/\d+/g);
        if (!values) return 0;
        
        const [r, g, b] = values.map(v => {
          const val = parseInt(v) / 255;
          return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const calculateContrast = (fg: string, bg: string): number => {
        const fgLum = calculateLuminance(fg);
        const bgLum = calculateLuminance(bg);
        const brightest = Math.max(fgLum, bgLum);
        const darkest = Math.min(fgLum, bgLum);
        return (brightest + 0.05) / (darkest + 0.05);
      };

      const textElements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label'));
      const results: Array<{
        element: string;
        foreground: string;
        background: string;
        ratio: number;
        level: 'AA' | 'AAA' | 'fail';
      }> = [];

      textElements.slice(0, 20).forEach((element, index) => { // Limit for performance
        const fg = getComputedColor(element, 'color');
        const bg = getComputedColor(element, 'background-color');
        
        if (fg && bg && fg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgba(0, 0, 0, 0)') {
          const ratio = calculateContrast(fg, bg);
          let level: 'AA' | 'AAA' | 'fail' = 'fail';
          
          if (ratio >= 7) level = 'AAA';
          else if (ratio >= 4.5) level = 'AA';
          
          results.push({
            element: `${element.tagName.toLowerCase()}:nth-child(${index + 1})`,
            foreground: fg,
            background: bg,
            ratio: Math.round(ratio * 100) / 100,
            level,
          });
        }
      });

      return results;
    });

    return {
      passed: results.every(r => r.level !== 'fail'),
      results,
    };
  }

  async checkKeyboardNavigation(page: Page): Promise<{
    navigable: boolean;
    issues: string[];
    focusableElements: number;
  }> {
    if (!this.config.accessibility.enableKeyboardNavigation) {
      return { navigable: true, issues: [], focusableElements: 0 };
    }

    const issues: string[] = [];
    
    const focusableElements = await page.evaluate(() => {
      const selectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ];
      
      return Array.from(document.querySelectorAll(selectors.join(','))).length;
    });

    try {
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      
      if (!firstFocused || firstFocused === 'BODY') {
        issues.push('No element receives focus on first Tab press');
      }

      for (let i = 0; i < Math.min(5, focusableElements); i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }

      await page.keyboard.press('Shift+Tab');
      const afterReverse = await page.evaluate(() => document.activeElement?.tagName);
      
      if (!afterReverse || afterReverse === 'BODY') {
        issues.push('Reverse tab navigation (Shift+Tab) does not work correctly');
      }

    } catch (error) {
      issues.push(`Keyboard navigation error: ${error}`);
    }

    return {
      navigable: issues.length === 0,
      issues,
      focusableElements,
    };
  }
}

// === COMPREHENSIVE TEST SUITE ===
export class ComprehensiveTestSuite {
  private config: ComprehensiveTestConfig;
  private performanceMonitor: PerformanceMonitor;
  private securityTester: SecurityTester;
  private accessibilityTester: AccessibilityTester;

  constructor(config: ComprehensiveTestConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.performanceMonitor = new PerformanceMonitor(config);
    this.securityTester = new SecurityTester(config);
    this.accessibilityTester = new AccessibilityTester(config);
  }

  async runComprehensiveTest(
    page: Page,
    testName: string,
    testFunction: () => Promise<void>
  ): Promise<{
    success: boolean;
    performance: any;
    security: any;
    accessibility: any;
    errors: string[];
  }> {
    const stopTimer = this.performanceMonitor.startTimer(testName, 'comprehensive_test');
    const networkMonitor = new NetworkMonitor(page);
    const errors: string[] = [];

    try {
      await testFunction();

      const securityResults = {
        csrf: await this.securityTester.checkCsrfProtection(page),
      };

      const accessibilityResults = {
        wcag: await this.accessibilityTester.checkWcagCompliance(page),
        keyboard: await this.accessibilityTester.checkKeyboardNavigation(page),
      };

      stopTimer(true, {
        networkRequests: networkMonitor.getRequests().length,
        failedRequests: networkMonitor.getFailedRequests().length,
      });

      return {
        success: true,
        performance: this.performanceMonitor.getReport(),
        security: securityResults,
        accessibility: accessibilityResults,
        errors,
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      stopTimer(false);

      return {
        success: false,
        performance: this.performanceMonitor.getReport(),
        security: null,
        accessibility: null,
        errors,
      };
    }
  }

  reset(): void {
    this.performanceMonitor.reset();
  }
}

// === UTILITY FUNCTIONS ===
export function generateSecureTestData(): {
  email: string;
  password: string;
  name: string;
  hash: string;
} {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const hash = `${timestamp}${randomId}`.substring(0, 8);

  return {
    email: `test-${hash}@arquiz.test`,
    password: `SecureTest${timestamp}!@#`,
    name: `Test User ${hash}`,
    hash,
  };
}

export function generateRandomString(length: number = 12): string {
  return Math.random().toString(36).substring(2, length + 2);
}

export const comprehensiveTestFramework = new ComprehensiveTestSuite(); 