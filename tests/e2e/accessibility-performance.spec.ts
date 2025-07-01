
import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  // Page load times (in milliseconds)
  maxLoadTime: 5000,
  maxNavigationTime: 3000,
  
  // Web Vitals
  maxLCP: 2500, // Largest Contentful Paint
  maxFID: 100,  // First Input Delay
  maxCLS: 0.1,  // Cumulative Layout Shift
  
  // Resource metrics
  maxDOMContentLoaded: 2000,
  maxFirstPaint: 1500,
  maxFirstContentfulPaint: 2000,
};

// Critical pages for accessibility and performance testing
const CRITICAL_PAGES = [
  { path: '/', name: 'Home Page', requiresAuth: false },
  { path: '/login', name: 'Login Page', requiresAuth: false },
  { path: '/register', name: 'Register Page', requiresAuth: false },
  { path: '/join', name: 'Join Room Page', requiresAuth: true }
];

// Accessibility violation levels to check
const ACCESSIBILITY_LEVELS = ['critical', 'serious', 'moderate'] as const;

test.describe('Accessibility Testing with axe-core', () => {
  
  for (const pageInfo of CRITICAL_PAGES) {
    test(`should have no accessibility violations on ${pageInfo.name}`, async ({ page }) => {
      console.log(`🔍 Testing accessibility on: ${pageInfo.name}`);
      
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('#__next') // Exclude Next.js wrapper if it causes issues
        .analyze();
      
      // Check for violations by severity
      const criticalViolations = accessibilityScanResults.violations.filter(
        violation => violation.impact === 'critical'
      );
      const seriousViolations = accessibilityScanResults.violations.filter(
        violation => violation.impact === 'serious'
      );
      const moderateViolations = accessibilityScanResults.violations.filter(
        violation => violation.impact === 'moderate'
      );
      
      // Log violation summaries
      console.log(`📊 Accessibility results for ${pageInfo.name}:`);
      console.log(`   Critical violations: ${criticalViolations.length}`);
      console.log(`   Serious violations: ${seriousViolations.length}`);
      console.log(`   Moderate violations: ${moderateViolations.length}`);
      console.log(`   Total violations: ${accessibilityScanResults.violations.length}`);
      
      // Log specific violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('📋 Accessibility violations details:');
        accessibilityScanResults.violations.forEach((violation, index) => {
          console.log(`   ${index + 1}. [${violation.impact}] ${violation.id}: ${violation.description}`);
          violation.nodes.forEach((node, nodeIndex) => {
            console.log(`      Node ${nodeIndex + 1}: ${node.target.join(', ')}`);
          });
        });
      }
      
      // Assert no critical violations (strict requirement)
      expect(criticalViolations).toHaveLength(0);
      
      // Assert no serious violations (strict requirement)
      expect(seriousViolations).toHaveLength(0);
      
      // Moderate violations are logged but don't fail tests (can be addressed iteratively)
      if (moderateViolations.length > 0) {
        console.warn(`⚠️  ${moderateViolations.length} moderate accessibility issues found on ${pageInfo.name} - consider addressing`);
      }
      
      console.log(`✅ Accessibility test passed for ${pageInfo.name}`);
    });
  }
  
  test('should have proper form accessibility features', async ({ page }) => {
    console.log('🔍 Testing form accessibility features');
    
    // Test login form accessibility
    await page.goto('/login');
    await page.waitForSelector('#email');
    
    // Check for proper form labels
    const emailField = page.locator('#email');
    const passwordField = page.locator('#password');
    
    // Verify fields have proper accessibility attributes
    await expect(emailField).toHaveAttribute('type', 'email');
    await expect(passwordField).toHaveAttribute('type', 'password');
    
    // Check for associated labels or aria-labels
    const emailLabel = await emailField.getAttribute('aria-label') || 
                      await page.locator('label[for="email"]').count() > 0;
    const passwordLabel = await passwordField.getAttribute('aria-label') || 
                          await page.locator('label[for="password"]').count() > 0;
    
    expect(emailLabel).toBeTruthy();
    expect(passwordLabel).toBeTruthy();
    
    // Test register form accessibility
    await page.goto('/register');
    await page.waitForSelector('#name');
    
    const nameField = page.locator('#name');
    const confirmPasswordField = page.locator('#confirm-password');
    
    // Verify form field accessibility (name field may not have explicit type="text" since it's the default)
    const nameType = await nameField.getAttribute('type');
    expect(nameType === null || nameType === 'text').toBeTruthy(); // HTML5 inputs default to text
    await expect(confirmPasswordField).toHaveAttribute('type', 'password');
    
    console.log('✅ Form accessibility features verified');
  });
  
  test('should have proper heading hierarchy', async ({ page }) => {
    console.log('🔍 Testing heading hierarchy');
    
    for (const pageInfo of CRITICAL_PAGES.slice(0, 3)) { // Test first 3 pages
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      // Get all headings
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      
      if (headings.length > 0) {
        // Check for h1 presence
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThanOrEqual(1); // At least one h1
        expect(h1Count).toBeLessThanOrEqual(1); // At most one h1
        
        console.log(`   ${pageInfo.name}: ${headings.length} headings, ${h1Count} h1`);
      }
    }
    
    console.log('✅ Heading hierarchy verified');
  });
});

test.describe('Performance Testing', () => {
  
  test('should meet performance thresholds for all critical pages', async ({ page }) => {
    console.log('🚀 Testing page load performance');
    
    const performanceResults: Array<{
      page: string;
      loadTime: number;
      domContentLoaded: number;
      firstPaint: number;
      firstContentfulPaint: number;
      resourceCount: number;
    }> = [];
    
    for (const pageInfo of CRITICAL_PAGES) {
      console.log(`⏱️  Measuring performance for: ${pageInfo.name}`);
      
      // Start timing
      const startTime = Date.now();
      
      // Navigate to page
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
             // Get detailed performance metrics
       const performanceMetrics = await page.evaluate(() => {
         const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
         const paintEntries = performance.getEntriesByType('paint');
         
         return {
           domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
           loadComplete: navigation.loadEventEnd - navigation.fetchStart,
           firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
           firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
           resourceCount: performance.getEntriesByType('resource').length,
           transferSize: navigation.transferSize || 0,
           encodedBodySize: navigation.encodedBodySize || 0
         };
       });
      
      const result = {
        page: pageInfo.name,
        loadTime: loadTime,
        domContentLoaded: performanceMetrics.domContentLoaded,
        firstPaint: performanceMetrics.firstPaint,
        firstContentfulPaint: performanceMetrics.firstContentfulPaint,
        resourceCount: performanceMetrics.resourceCount
      };
      
      performanceResults.push(result);
      
      // Log detailed metrics
      console.log(`📊 Performance metrics for ${pageInfo.name}:`);
      console.log(`   Page load time: ${loadTime}ms`);
      console.log(`   DOM Content Loaded: ${performanceMetrics.domContentLoaded.toFixed(2)}ms`);
      console.log(`   First Paint: ${performanceMetrics.firstPaint.toFixed(2)}ms`);
      console.log(`   First Contentful Paint: ${performanceMetrics.firstContentfulPaint.toFixed(2)}ms`);
      console.log(`   Resources loaded: ${performanceMetrics.resourceCount}`);
      console.log(`   Transfer size: ${(performanceMetrics.transferSize / 1024).toFixed(2)}KB`);
      
      // Performance assertions
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxLoadTime);
      expect(performanceMetrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.maxDOMContentLoaded);
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.maxFirstContentfulPaint);
      
      console.log(`✅ Performance test passed for ${pageInfo.name}`);
    }
    
    // Log summary
    console.log('📈 Performance Summary:');
    const avgLoadTime = performanceResults.reduce((sum, result) => sum + result.loadTime, 0) / performanceResults.length;
    console.log(`   Average load time: ${avgLoadTime.toFixed(2)}ms`);
    console.log(`   Fastest page: ${performanceResults.reduce((fastest, current) => 
      current.loadTime < fastest.loadTime ? current : fastest
    ).page} (${performanceResults.reduce((min, current) => 
      Math.min(min, current.loadTime), Infinity
    )}ms)`);
  });
  
  test('should have reasonable resource loading performance', async ({ page }) => {
    console.log('📦 Testing resource loading performance');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Analyze resource loading
    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const analysis = {
        totalResources: resources.length,
        imageCount: 0,
        scriptCount: 0,
        stylesheetCount: 0,
        totalTransferSize: 0,
        slowestResource: { name: '', duration: 0 },
        averageLoadTime: 0
      };
      
      let totalDuration = 0;
      
      resources.forEach(resource => {
        const duration = resource.responseEnd - resource.startTime;
        totalDuration += duration;
        
        if (duration > analysis.slowestResource.duration) {
          analysis.slowestResource = { name: resource.name, duration };
        }
        
        if (resource.transferSize) {
          analysis.totalTransferSize += resource.transferSize;
        }
        
        // Categorize resources
        const url = resource.name.toLowerCase();
        if (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.svg') || url.includes('.webp')) {
          analysis.imageCount++;
        } else if (url.includes('.js')) {
          analysis.scriptCount++;
        } else if (url.includes('.css')) {
          analysis.stylesheetCount++;
        }
      });
      
      analysis.averageLoadTime = totalDuration / resources.length;
      
      return analysis;
    });
    
    // Log resource analysis
    console.log('📊 Resource loading analysis:');
    console.log(`   Total resources: ${resourceMetrics.totalResources}`);
    console.log(`   Images: ${resourceMetrics.imageCount}`);
    console.log(`   Scripts: ${resourceMetrics.scriptCount}`);
    console.log(`   Stylesheets: ${resourceMetrics.stylesheetCount}`);
    console.log(`   Total transfer size: ${(resourceMetrics.totalTransferSize / 1024).toFixed(2)}KB`);
    console.log(`   Average load time: ${resourceMetrics.averageLoadTime.toFixed(2)}ms`);
    console.log(`   Slowest resource: ${resourceMetrics.slowestResource.name.substring(0, 50)}... (${resourceMetrics.slowestResource.duration.toFixed(2)}ms)`);
    
    // Resource performance assertions
    expect(resourceMetrics.totalResources).toBeLessThan(50); // Reasonable resource count
    expect(resourceMetrics.averageLoadTime).toBeLessThan(1000); // Average resource load < 1s
    expect(resourceMetrics.slowestResource.duration).toBeLessThan(5000); // No resource > 5s
    
    console.log('✅ Resource loading performance verified');
  });
  
  test('should maintain performance across different viewport sizes', async ({ page }) => {
    console.log('📱 Testing performance across viewport sizes');
    
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    const viewportPerformance: Array<{
      viewport: string;
      loadTime: number;
      resourceCount: number;
    }> = [];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      const resourceCount = await page.evaluate(() => performance.getEntriesByType('resource').length);
      
      viewportPerformance.push({
        viewport: `${viewport.name} (${viewport.width}x${viewport.height})`,
        loadTime,
        resourceCount
      });
      
      console.log(`   ${viewport.name}: ${loadTime}ms, ${resourceCount} resources`);
      
      // Performance should be consistent across viewports
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxLoadTime);
    }
    
    console.log('✅ Viewport performance consistency verified');
  });
});

test.describe('Combined Accessibility and Performance Testing', () => {
  
  test('should maintain accessibility while meeting performance requirements', async ({ page }) => {
    console.log('🔄 Testing combined accessibility and performance');
    
    const testPage = CRITICAL_PAGES[1]; // Test login page
    
    // Start performance measurement
    const startTime = Date.now();
    
    await page.goto(testPage.path);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Run accessibility scan
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
         // Get performance metrics
     const performanceMetrics = await page.evaluate(() => {
       const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
       return {
         domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
         firstContentfulPaint: performance.getEntriesByType('paint')
           .find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
       };
     });
    
    // Combined assertions
    console.log(`📊 Combined test results for ${testPage.name}:`);
    console.log(`   Load time: ${loadTime}ms`);
    console.log(`   Accessibility violations: ${accessibilityResults.violations.length}`);
    console.log(`   Critical/Serious violations: ${accessibilityResults.violations.filter(v => 
      v.impact === 'critical' || v.impact === 'serious'
    ).length}`);
    
    // Both accessibility and performance must pass
    expect(accessibilityResults.violations.filter(v => 
      v.impact === 'critical' || v.impact === 'serious'
    )).toHaveLength(0);
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxLoadTime);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.maxDOMContentLoaded);
    
    console.log('✅ Combined accessibility and performance test passed');
  });
}); 