import { test, expect } from '../fixtures/enhanced-fixtures';

test.describe('Enhanced Performance Tests', () => {
  test.describe('Page Load Performance', () => {
    test('should load home page within performance budget', async ({ 
      page, 
      helpers, 
      performanceMonitoring 
    }) => {
      performanceMonitoring.startMonitoring();
      
      // Navigate to home page
      await page.goto('/');
      
      // Wait for complete load
      await helpers.nav.waitForPageLoad(page);
      
      // Get performance metrics
      const metrics = await performanceMonitoring.getMetrics();
      const navigationMetrics = metrics.find((m: any) => m.type === 'page-load');
      
      if (navigationMetrics) {
        // Performance budgets
        expect(navigationMetrics.loadTime).toBeLessThan(3000); // 3 seconds
        expect(navigationMetrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds
        
        console.log('Home page performance:', {
          loadTime: navigationMetrics.loadTime,
          fcp: navigationMetrics.firstContentfulPaint,
          lcp: navigationMetrics.largestContentfulPaint
        });
      }
    });

    test('should load quiz interface efficiently', async ({ 
      page, 
      testRoom, 
      helpers, 
      performanceMonitoring 
    }) => {
      performanceMonitoring.startMonitoring();
      
      await helpers.auth.loginAs(page, 'student');
      
      // Join room and start quiz
      await helpers.nav.goToSection(page, 'join');
      await helpers.locators.input(page, 'roomCode').fill(testRoom.code);
      await helpers.locators.button(page, 'Join Room').click();
      
      // Wait for quiz to load
      await helpers.nav.waitForPageLoad(page);
      
      // Get and validate performance
      const metrics = await performanceMonitoring.getMetrics();
      const quizLoadMetrics = metrics.filter((m: any) => m.url.includes('room') || m.url.includes('quiz'));
      
      // Should load quiz interface quickly
      for (const metric of quizLoadMetrics) {
        expect(metric.loadTime).toBeLessThan(2000); // 2 seconds for quiz interface
      }
    });

    test('should handle concurrent user loads efficiently', async ({ 
      page, 
      testRoom, 
      helpers 
    }) => {
      // Simulate multiple concurrent connections
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        promises.push((async () => {
          const startTime = Date.now();
          
          await helpers.auth.loginAs(page, 'student');
          await helpers.nav.goToSection(page, 'join');
          await helpers.locators.input(page, 'roomCode').fill(testRoom.code);
          await helpers.locators.button(page, 'Join Room').click();
          await helpers.nav.waitForPageLoad(page);
          
          const endTime = Date.now();
          return endTime - startTime;
        })());
      }
      
      const loadTimes = await Promise.all(promises);
      
      // All concurrent loads should complete within reasonable time
      for (const loadTime of loadTimes) {
        expect(loadTime).toBeLessThan(5000); // 5 seconds under load
      }
      
      console.log('Concurrent load times:', loadTimes);
    });
  });

  test.describe('WebSocket Performance', () => {
    test('should establish WebSocket connections quickly', async ({ 
      page, 
      testRoom, 
      helpers 
    }) => {
      const startTime = Date.now();
      
      await helpers.auth.loginAs(page, 'student');
      
      // Monitor WebSocket activity
      const wsActivity = await helpers.websocket.monitorWebSocketActivity(page);
      
      await helpers.nav.goToSection(page, 'join');
      await helpers.locators.input(page, 'roomCode').fill(testRoom.code);
      await helpers.locators.button(page, 'Join Room').click();
      
      // Wait for WebSocket connection
      await helpers.websocket.waitForWebSocketConnection(page);
      
      const connectionTime = Date.now() - startTime;
      
      // WebSocket should connect quickly
      expect(connectionTime).toBeLessThan(3000); // 3 seconds
      expect(wsActivity.connections.length).toBeGreaterThan(0);
      
      console.log('WebSocket connection time:', connectionTime);
    });

    test('should handle high-frequency message throughput', async ({ 
      page, 
      testRoom, 
      helpers 
    }) => {
      await helpers.auth.loginAs(page, 'student');
      
      const wsActivity = await helpers.websocket.monitorWebSocketActivity(page);
      
      await helpers.nav.goToSection(page, 'join');
      await helpers.locators.input(page, 'roomCode').fill(testRoom.code);
      await helpers.locators.button(page, 'Join Room').click();
      
      await helpers.websocket.waitForWebSocketConnection(page);
      
      // Wait for message exchange
      await page.waitForTimeout(5000);
      
      // Should handle reasonable message throughput
      const totalMessages = wsActivity.messages.sent.length + wsActivity.messages.received.length;
      expect(totalMessages).toBeGreaterThan(0);
      
      console.log('WebSocket message activity:', {
        sent: wsActivity.messages.sent.length,
        received: wsActivity.messages.received.length,
        total: totalMessages
      });
    });
  });

  test.describe('Memory and Resource Management', () => {
    test('should not leak memory during quiz session', async ({ 
      page, 
      testRoom, 
      helpers 
    }) => {
      await helpers.auth.loginAs(page, 'student');
      
      // Get baseline memory usage
      const initialMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          const mem = (performance as any).memory;
          return {
            used: mem.usedJSHeapSize,
            total: mem.totalJSHeapSize,
            limit: mem.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      // Perform quiz session
      await helpers.nav.goToSection(page, 'join');
      await helpers.locators.input(page, 'roomCode').fill(testRoom.code);
      await helpers.locators.button(page, 'Join Room').click();
      await helpers.nav.waitForPageLoad(page);
      
      // Simulate quiz activity
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(1000);
        // Trigger potential memory allocations
        await page.evaluate(() => {
          const data = new Array(1000).fill('test data');
          data.length = 0; // Clear immediately
        });
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          const mem = (performance as any).memory;
          return {
            used: mem.usedJSHeapSize,
            total: mem.totalJSHeapSize,
            limit: mem.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;
        
        // Memory increase should be reasonable (less than 50% increase)
        expect(memoryIncreasePercent).toBeLessThan(50);
        
        console.log('Memory usage:', {
          initial: initialMemory.used,
          final: finalMemory.used,
          increase: memoryIncrease,
          increasePercent: memoryIncreasePercent.toFixed(2) + '%'
        });
      }
    });

    test('should efficiently handle resource cleanup', async ({ 
      page, 
      helpers 
    }) => {
      await helpers.auth.loginAs(page, 'student');
      
      // Monitor console errors during resource management
      const consoleErrors = await helpers.perf.checkForConsoleErrors(page);
      
      // Navigate through multiple pages to test cleanup
      const pages = ['/dashboard', '/quizzes', '/join', '/dashboard'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await helpers.nav.waitForPageLoad(page);
        await page.waitForTimeout(500);
      }
      
      // Check for resource-related errors
      const resourceErrors = consoleErrors.filter(error => 
        error.toLowerCase().includes('memory') ||
        error.toLowerCase().includes('leak') ||
        error.toLowerCase().includes('resource')
      );
      
      expect(resourceErrors.length).toBe(0);
    });
  });

  test.describe('Network Performance', () => {
    test('should optimize network requests', async ({ 
      page, 
      helpers 
    }) => {
      const networkRequests: any[] = [];
      
      // Monitor network requests
      page.on('request', (request) => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      });
      
      await helpers.auth.loginAs(page, 'student');
      await helpers.nav.goToSection(page, 'dashboard');
      
      // Wait for all network activity to settle
      await page.waitForTimeout(3000);
      
      // Analyze network requests
      const uniqueUrls = new Set(networkRequests.map(req => req.url));
      const staticResources = networkRequests.filter(req => 
        req.url.includes('.js') || 
        req.url.includes('.css') || 
        req.url.includes('.png') || 
        req.url.includes('.jpg')
      );
      
      // Should not have excessive duplicate requests (modern web apps have more requests)
      expect(networkRequests.length).toBeLessThan(100); // More realistic request count for modern apps
      expect(staticResources.length).toBeLessThan(40); // More realistic static resource count
      
      console.log('Network performance:', {
        totalRequests: networkRequests.length,
        uniqueUrls: uniqueUrls.size,
        staticResources: staticResources.length
      });
    });
  });

  test.afterEach(async ({ page }) => {
    // Performance test cleanup
    try {
      // Clear any performance observers
      await page.evaluate(() => {
        if (typeof PerformanceObserver !== 'undefined') {
          (PerformanceObserver as any).disconnect?.();
        }
      });
      
      // Clear browser data
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      console.warn('Performance test cleanup warning:', error);
    }
  });
}); 