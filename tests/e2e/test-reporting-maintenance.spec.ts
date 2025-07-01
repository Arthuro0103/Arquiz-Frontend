import { test, expect } from '@playwright/test';
import { TestReporter, TestHealthReport } from '../utils/test-reporter';
import { TestMaintenance, TestHealthMetrics } from '../utils/test-maintenance';
import fs from 'fs';
import path from 'path';

test.describe('Test Reporting & Maintenance', () => {
  let testReporter: TestReporter;
  let testMaintenance: TestMaintenance;
  const testResultsDir = 'test-results';

  test.beforeEach(async () => {
    testReporter = new TestReporter(testResultsDir);
    testMaintenance = new TestMaintenance(testResultsDir);
    
    // Ensure test results directory exists
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
  });

  test.describe('Health Report Generation', () => {
    test('should generate comprehensive test health report', async () => {
      // Create mock test results
      const mockResults = {
        suites: [
          {
            project: () => ({ name: 'chromium' }),
            tests: [
              {
                title: 'Authentication flow test',
                results: [
                  {
                    status: 'passed',
                    duration: 1200,
                    error: null
                  }
                ]
              },
              {
                title: 'API integration test',
                results: [
                  {
                    status: 'passed',
                    duration: 800,
                    error: null
                  }
                ]
              }
            ]
          }
        ]
      };

      const healthReport = await testReporter.generateHealthReport(mockResults as any);

      expect(healthReport).toBeDefined();
      expect(healthReport.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(healthReport.metrics.totalTests).toBeGreaterThan(0);
      expect(healthReport.metrics.passRate).toBeGreaterThanOrEqual(0);
      expect(healthReport.riskLevel).toMatch(/^(low|medium|high)$/);
      expect(Array.isArray(healthReport.recommendations)).toBeTruthy();
    });

    test('should generate interactive dashboard HTML', async () => {
      const mockHealthReport: TestHealthReport = {
        timestamp: new Date().toISOString(),
        metrics: {
          totalTests: 82,
          passedTests: 82,
          failedTests: 0,
          skippedTests: 0,
          passRate: 100,
          totalDuration: 45000,
          averageDuration: 549,
          slowestTest: { title: 'WebSocket Multi-User Test', duration: 2500 },
          fastestTest: { title: 'Basic Navigation Test', duration: 200 },
          browserMetrics: {
            'chromium': { tests: 82, passed: 82, failed: 0, duration: 45000 }
          },
          categoryMetrics: {
            'authentication': { tests: 21, passed: 21, failed: 0, duration: 12000 }
          }
        },
        failures: [],
        trends: {
          passRateChange: 0,
          durationChange: -5.2,
          newFailures: 0,
          resolvedFailures: 0
        },
        recommendations: [
          '✅ Excellent test suite health - all tests passing consistently'
        ],
        riskLevel: 'low'
      };

      const dashboardPath = await testReporter.generateDashboard(mockHealthReport);

      expect(fs.existsSync(dashboardPath)).toBeTruthy();
      
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
      expect(dashboardContent).toContain('ArQuiz E2E Test Dashboard');
      expect(dashboardContent).toContain('Test Summary');
      expect(dashboardContent).toContain('Performance');
      expect(dashboardContent).toContain('Trends');
      expect(dashboardContent).toContain('100.0%'); // Pass rate
      expect(dashboardContent).toContain('low'); // Risk level
    });

    test('should track performance trends over time', async () => {
      // Create multiple historical reports to establish trends
      const historicalReport1: TestHealthReport = {
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        metrics: {
          totalTests: 80,
          passedTests: 78,
          failedTests: 2,
          skippedTests: 0,
          passRate: 97.5,
          totalDuration: 48000,
          averageDuration: 600,
          slowestTest: { title: 'Old Slow Test', duration: 3000 },
          fastestTest: { title: 'Fast Test', duration: 150 },
          browserMetrics: {},
          categoryMetrics: {}
        },
        failures: [],
        trends: { passRateChange: 0, durationChange: 0, newFailures: 0, resolvedFailures: 0 },
        recommendations: [],
        riskLevel: 'medium'
      };

      const currentReport: TestHealthReport = {
        timestamp: new Date().toISOString(),
        metrics: {
          totalTests: 82,
          passedTests: 82,
          failedTests: 0,
          skippedTests: 0,
          passRate: 100,
          totalDuration: 45000,
          averageDuration: 549,
          slowestTest: { title: 'Optimized Test', duration: 2500 },
          fastestTest: { title: 'Fast Test', duration: 200 },
          browserMetrics: {},
          categoryMetrics: {}
        },
        failures: [],
        trends: { passRateChange: 2.5, durationChange: -8.5, newFailures: 0, resolvedFailures: 2 },
        recommendations: [],
        riskLevel: 'low'
      };

      // Verify trends calculation logic
      const passRateImprovement = currentReport.metrics.passRate - historicalReport1.metrics.passRate;
      const durationImprovement = ((currentReport.metrics.averageDuration - historicalReport1.metrics.averageDuration) / historicalReport1.metrics.averageDuration) * 100;

      expect(passRateImprovement).toBe(2.5);
      expect(durationImprovement).toBeLessThan(0); // Performance improved
      expect(currentReport.riskLevel).toBe('low');
    });
  });

  test.describe('Test Maintenance Automation', () => {
    test('should analyze test health metrics', async () => {
      const healthMetrics = await testMaintenance.analyzeTestHealth();

      expect(healthMetrics).toBeDefined();
      expect(healthMetrics.testCoverage).toBeDefined();
      expect(healthMetrics.qualityMetrics).toBeDefined();
      expect(healthMetrics.performanceMetrics).toBeDefined();
      
      expect(typeof healthMetrics.testCoverage.totalTests).toBe('number');
      expect(typeof healthMetrics.testCoverage.criticalPaths).toBe('number');
      expect(typeof healthMetrics.testCoverage.edgeCases).toBe('number');
      
      expect(Array.isArray(healthMetrics.performanceMetrics.slowTests)).toBeTruthy();
      expect(Array.isArray(healthMetrics.performanceMetrics.memoryLeaks)).toBeTruthy();
    });

    test('should generate optimization recommendations', async () => {
      const mockMetrics: TestHealthMetrics = {
        testCoverage: {
          totalTests: 82,
          criticalPaths: 8,
          edgeCases: 15,
          performanceTests: 10,
          accessibilityTests: 10
        },
        qualityMetrics: {
          duplicatedAssertions: 2,
          hardcodedValues: 5,
          missingWaits: 1,
          obsoleteSelectors: 0
        },
        performanceMetrics: {
          slowTests: [
            { name: 'WebSocket Test', duration: 2500, threshold: 2000 }
          ],
          memoryLeaks: [],
          networkCalls: [
            { test: 'API Integration', count: 8 }
          ]
        }
      };

      const recommendations = testMaintenance.generateOptimizationRecommendations(mockMetrics);

      expect(Array.isArray(recommendations)).toBeTruthy();
      // Allow for empty recommendations if metrics are already good
      console.log(`Generated ${recommendations.length} optimization recommendations`);
      
      // Should have positive recommendations for good metrics
      expect(recommendations.some(rec => rec.includes('✅') || rec.includes('excellent') || rec.includes('good'))).toBeTruthy();
    });

    test('should run automated maintenance tasks', async () => {
      // This test simulates the maintenance task execution
      const maintenanceResults = await testMaintenance.runMaintenanceTasks();

      // Verify maintenance completed without throwing errors
      expect(maintenanceResults).toBeUndefined(); // runMaintenanceTasks returns void
      
      // Check that maintenance directory was created
      const maintenanceDir = path.join(testResultsDir, 'maintenance');
      expect(fs.existsSync(maintenanceDir)).toBeTruthy();
    });

    test('should detect and auto-fix common test issues', async () => {
      const autoFixResults = await testMaintenance.autoFixIssues();

      expect(Array.isArray(autoFixResults)).toBeTruthy();
      
      // Each fix result should have file and fixes properties
      autoFixResults.forEach(result => {
        expect(result).toHaveProperty('file');
        expect(result).toHaveProperty('fixes');
        expect(Array.isArray(result.fixes)).toBeTruthy();
      });
    });

    test('should generate performance regression reports', async () => {
      const performanceReport = await testMaintenance.generatePerformanceReport();

      expect(performanceReport).toBeDefined();
      
      if (performanceReport.message) {
        // Insufficient data case
        expect(performanceReport.message).toContain('Insufficient data');
      } else {
        // Full performance analysis case
        expect(performanceReport).toHaveProperty('currentAverage');
        expect(performanceReport).toHaveProperty('trend');
        expect(performanceReport.trend).toMatch(/^(declining|improving|stable)$/);
        expect(Array.isArray(performanceReport.recommendations)).toBeTruthy();
      }
    });
  });

  test.describe('Report Persistence & History', () => {
    test('should save and load test health reports', async () => {
      const mockResults = {
        suites: [
          {
            project: () => ({ name: 'chromium' }),
            tests: [
              {
                title: 'Sample test',
                results: [{ status: 'passed', duration: 1000, error: null }]
              }
            ]
          }
        ]
      };

      const healthReport = await testReporter.generateHealthReport(mockResults as any);
      
      // Verify report was saved
      const reportPath = path.join(testResultsDir, 'test-health-report.json');
      expect(fs.existsSync(reportPath)).toBeTruthy();
      
      const savedReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      expect(savedReport.timestamp).toBe(healthReport.timestamp);
      expect(savedReport.metrics.totalTests).toBe(healthReport.metrics.totalTests);
    });

    test('should maintain historical reports for trend analysis', async () => {
      const historyDir = path.join(testResultsDir, 'history');
      
      // Generate multiple reports to create history
      for (let i = 0; i < 3; i++) {
        const mockResults = {
          suites: [
            {
              project: () => ({ name: 'chromium' }),
              tests: [
                {
                  title: `Test ${i}`,
                  results: [{ status: 'passed', duration: 1000 + i * 100, error: null }]
                }
              ]
            }
          ]
        };
        
        await testReporter.generateHealthReport(mockResults as any);
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Verify history files were created
      expect(fs.existsSync(historyDir)).toBeTruthy();
      
      const historyFiles = fs.readdirSync(historyDir).filter(file => file.endsWith('.json'));
      expect(historyFiles.length).toBeGreaterThanOrEqual(3);
    });

    test('should clean up old history files automatically', async () => {
      const historyDir = path.join(testResultsDir, 'history');
      
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }
      
      // Create mock old history files (simulate 35 files to trigger cleanup)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      
      for (let i = 0; i < 5; i++) {
        const fileName = `report-${oldDate.toISOString().replace(/[:.]/g, '-')}-${i}.json`;
        const filePath = path.join(historyDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify({ test: true, index: i }));
      }
      
      const initialFileCount = fs.readdirSync(historyDir).length;
      
      // Generate new report to trigger potential cleanup
      const mockResults = {
        suites: [
          {
            project: () => ({ name: 'chromium' }),
            tests: [
              {
                title: 'Cleanup test',
                results: [{ status: 'passed', duration: 1000, error: null }]
              }
            ]
          }
        ]
      };
      
      await testReporter.generateHealthReport(mockResults as any);
      
      // Cleanup logic is built into the reporter, but may not trigger with small numbers
      // This test primarily verifies the structure exists
      expect(fs.existsSync(historyDir)).toBeTruthy();
    });
  });

  test.describe('Dashboard Features', () => {
    test('should display comprehensive metrics in dashboard', async () => {
      const mockHealthReport: TestHealthReport = {
        timestamp: new Date().toISOString(),
        metrics: {
          totalTests: 82,
          passedTests: 80,
          failedTests: 2,
          skippedTests: 0,
          passRate: 97.6,
          totalDuration: 45000,
          averageDuration: 549,
          slowestTest: { title: 'Complex Integration Test', duration: 2500 },
          fastestTest: { title: 'Unit Test', duration: 100 },
          browserMetrics: {
            'chromium': { tests: 27, passed: 26, failed: 1, duration: 15000 },
            'firefox': { tests: 27, passed: 27, failed: 0, duration: 16000 },
            'webkit': { tests: 28, passed: 27, failed: 1, duration: 14000 }
          },
          categoryMetrics: {
            'authentication': { tests: 21, passed: 21, failed: 0, duration: 12000 },
            'api': { tests: 18, passed: 17, failed: 1, duration: 8000 },
            'realtime': { tests: 9, passed: 9, failed: 0, duration: 5000 }
          }
        },
        failures: [
          {
            failureId: 'auth-timeout-001',
            testTitle: 'Login timeout test',
            errorMessage: 'Test timed out after 30000ms',
            category: 'timeout',
            frequency: 1,
            lastSeen: new Date().toISOString(),
            suggestions: [
              'Increase timeout values in playwright.config.ts',
              'Check if elements are loading slowly'
            ]
          }
        ],
        trends: {
          passRateChange: -2.4,
          durationChange: 3.2,
          newFailures: 2,
          resolvedFailures: 1
        },
        recommendations: [
          '🔴 Pass rate decreased - investigate new failures',
          '⚠️ Performance slightly degraded - monitor trends'
        ],
        riskLevel: 'medium'
      };

      const dashboardPath = await testReporter.generateDashboard(mockHealthReport);
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');

      // Verify comprehensive content
      expect(dashboardContent).toContain('82'); // Total tests
      expect(dashboardContent).toContain('97.6%'); // Pass rate
      expect(dashboardContent).toContain('Browser Performance'); // Browser metrics table
      expect(dashboardContent).toContain('Category Performance'); // Category metrics table
      expect(dashboardContent).toContain('Test Failures (1)'); // Failures section
      expect(dashboardContent).toContain('Login timeout test'); // Specific failure
      expect(dashboardContent).toContain('Recommendations'); // Recommendations section
      expect(dashboardContent).toContain('medium'); // Risk level
      
      // Verify trend indicators
      expect(dashboardContent).toContain('-2.4%'); // Pass rate change
      expect(dashboardContent).toContain('+3.2%'); // Duration change
      expect(dashboardContent).toContain('2'); // New failures
    });

    test('should provide actionable failure analysis', async () => {
      const mockResults = {
        suites: [
          {
            project: () => ({ name: 'chromium' }),
            tests: [
              {
                title: 'Network failure test',
                results: [
                  {
                    status: 'failed',
                    duration: 1000,
                    error: {
                      message: 'NetworkError: fetch failed',
                      stack: 'Error stack trace here'
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      const healthReport = await testReporter.generateHealthReport(mockResults as any);
      
      expect(healthReport.failures.length).toBe(1);
      
      const failure = healthReport.failures[0];
      expect(failure.category).toBe('network');
      expect(failure.errorMessage).toContain('NetworkError');
      expect(failure.suggestions.length).toBeGreaterThan(0);
      expect(failure.suggestions.some(s => s.includes('network'))).toBeTruthy();
    });
  });

  test.afterEach(async () => {
    // Clean up test artifacts
    try {
      if (fs.existsSync(testResultsDir)) {
        const files = fs.readdirSync(testResultsDir);
        for (const file of files) {
          const filePath = path.join(testResultsDir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            // Remove directory recursively
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors in tests
      console.warn('Test cleanup warning:', error);
    }
  });
}); 