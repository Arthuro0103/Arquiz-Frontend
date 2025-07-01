import { TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  totalDuration: number;
  averageDuration: number;
  slowestTest: {
    title: string;
    duration: number;
  };
  fastestTest: {
    title: string;
    duration: number;
  };
  browserMetrics: Record<string, {
    tests: number;
    passed: number;
    failed: number;
    duration: number;
  }>;
  categoryMetrics: Record<string, {
    tests: number;
    passed: number;
    failed: number;
    duration: number;
  }>;
}

export interface TestFailureAnalysis {
  failureId: string;
  testTitle: string;
  errorMessage: string;
  errorStack?: string;
  category: 'network' | 'ui' | 'timeout' | 'assertion' | 'setup' | 'unknown';
  frequency: number;
  lastSeen: string;
  suggestions: string[];
}

export interface TestHealthReport {
  timestamp: string;
  metrics: TestMetrics;
  failures: TestFailureAnalysis[];
  trends: {
    passRateChange: number;
    durationChange: number;
    newFailures: number;
    resolvedFailures: number;
  };
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export class TestReporter {
  private outputDir: string;
  private historyDir: string;

  constructor(outputDir = 'test-results') {
    this.outputDir = outputDir;
    this.historyDir = path.join(outputDir, 'history');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.historyDir)) {
      fs.mkdirSync(this.historyDir, { recursive: true });
    }
  }

  /**
   * Generate comprehensive test metrics from results
   */
  generateMetrics(results: FullResult): TestMetrics {
    const allTests = this.getAllTests(results);
    
    const passedTests = allTests.filter(test => test.status === 'passed').length;
    const failedTests = allTests.filter(test => test.status === 'failed').length;
    const skippedTests = allTests.filter(test => test.status === 'skipped').length;
    
    const durations = allTests
      .filter(test => test.status !== 'skipped')
      .map(test => test.duration);
    
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0;
    
    const slowestTest = allTests.reduce((slowest, test) => {
      return test.duration > slowest.duration ? test : slowest;
    }, { title: '', duration: 0 });
    
    const fastestTest = allTests.reduce((fastest, test) => {
      return test.status !== 'skipped' && test.duration < fastest.duration 
        ? test : fastest;
    }, { title: '', duration: Infinity });

    // Browser-specific metrics
    const browserMetrics: Record<string, any> = {};
    
    // Category-specific metrics (based on test file names)
    const categoryMetrics: Record<string, any> = {};
    
    allTests.forEach(test => {
      // Extract browser from test project
      const browser = this.extractBrowser(test);
      if (!browserMetrics[browser]) {
        browserMetrics[browser] = { tests: 0, passed: 0, failed: 0, duration: 0 };
      }
      browserMetrics[browser].tests++;
      browserMetrics[browser].duration += test.duration;
      if (test.status === 'passed') browserMetrics[browser].passed++;
      if (test.status === 'failed') browserMetrics[browser].failed++;
      
      // Extract category from test file
      const category = this.extractCategory(test);
      if (!categoryMetrics[category]) {
        categoryMetrics[category] = { tests: 0, passed: 0, failed: 0, duration: 0 };
      }
      categoryMetrics[category].tests++;
      categoryMetrics[category].duration += test.duration;
      if (test.status === 'passed') categoryMetrics[category].passed++;
      if (test.status === 'failed') categoryMetrics[category].failed++;
    });

    return {
      totalTests: allTests.length,
      passedTests,
      failedTests,
      skippedTests,
      passRate: allTests.length > 0 ? (passedTests / allTests.length) * 100 : 0,
      totalDuration,
      averageDuration,
      slowestTest: {
        title: slowestTest.title,
        duration: slowestTest.duration
      },
      fastestTest: fastestTest.duration !== Infinity ? {
        title: fastestTest.title,
        duration: fastestTest.duration
      } : { title: '', duration: 0 },
      browserMetrics,
      categoryMetrics
    };
  }

  /**
   * Analyze test failures and categorize them
   */
  analyzeFailures(results: FullResult): TestFailureAnalysis[] {
    const failedTests = this.getAllTests(results).filter(test => test.status === 'failed');
    const failures: TestFailureAnalysis[] = [];

    failedTests.forEach(test => {
      const errorMessage = test.error?.message || 'Unknown error';
      const errorStack = test.error?.stack;
      
      const failure: TestFailureAnalysis = {
        failureId: this.generateFailureId(test.title, errorMessage),
        testTitle: test.title,
        errorMessage,
        errorStack,
        category: this.categorizeFailure(errorMessage, errorStack),
        frequency: 1, // Will be updated when comparing with history
        lastSeen: new Date().toISOString(),
        suggestions: this.generateSuggestions(errorMessage, errorStack)
      };

      failures.push(failure);
    });

    return failures;
  }

  /**
   * Generate comprehensive test health report
   */
  async generateHealthReport(results: FullResult): Promise<TestHealthReport> {
    const currentMetrics = this.generateMetrics(results);
    const currentFailures = this.analyzeFailures(results);
    const previousReport = await this.loadPreviousReport();
    
    const trends = this.calculateTrends(currentMetrics, currentFailures, previousReport);
    const recommendations = this.generateRecommendations(currentMetrics, currentFailures, trends);
    const riskLevel = this.assessRiskLevel(currentMetrics, trends);

    const report: TestHealthReport = {
      timestamp: new Date().toISOString(),
      metrics: currentMetrics,
      failures: currentFailures,
      trends,
      recommendations,
      riskLevel
    };

    await this.saveReport(report);
    return report;
  }

  /**
   * Generate HTML dashboard
   */
  async generateDashboard(report: TestHealthReport): Promise<string> {
    const dashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ArQuiz E2E Test Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header .timestamp { opacity: 0.9; font-size: 1.1rem; }
        .risk-${report.riskLevel} { border-left: 6px solid ${this.getRiskColor(report.riskLevel)}; }
        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .card h3 { color: #333; margin-bottom: 15px; font-size: 1.3rem; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .metric-value { font-weight: bold; font-size: 1.2rem; }
        .metric-value.success { color: #10b981; }
        .metric-value.warning { color: #f59e0b; }
        .metric-value.error { color: #ef4444; }
        .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 8px; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .progress-fill.success { background: #10b981; }
        .progress-fill.warning { background: #f59e0b; }
        .progress-fill.error { background: #ef4444; }
        .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .table th { background: #f9fafb; font-weight: 600; }
        .failure-item { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 12px; }
        .failure-title { font-weight: 600; color: #991b1b; margin-bottom: 8px; }
        .failure-message { color: #7f1d1d; font-family: 'Monaco', 'Consolas', monospace; font-size: 0.9rem; margin-bottom: 8px; }
        .suggestions { margin-top: 10px; }
        .suggestion { background: #f0f9ff; border-left: 3px solid #0ea5e9; padding: 8px 12px; margin-bottom: 6px; font-size: 0.9rem; }
        .recommendations { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; }
        .recommendations h3 { color: #065f46; margin-bottom: 15px; }
        .recommendation { margin-bottom: 10px; color: #047857; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header risk-${report.riskLevel}">
            <h1>🎭 ArQuiz E2E Test Dashboard</h1>
            <div class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</div>
            <div style="margin-top: 15px; font-size: 1.2rem;">
                Risk Level: <strong>${report.riskLevel.toUpperCase()}</strong>
            </div>
        </div>

        <div class="cards">
            <div class="card">
                <h3>📊 Test Summary</h3>
                <div class="metric">
                    <span>Total Tests</span>
                    <span class="metric-value">${report.metrics.totalTests}</span>
                </div>
                <div class="metric">
                    <span>Passed</span>
                    <span class="metric-value success">${report.metrics.passedTests}</span>
                </div>
                <div class="metric">
                    <span>Failed</span>
                    <span class="metric-value error">${report.metrics.failedTests}</span>
                </div>
                <div class="metric">
                    <span>Pass Rate</span>
                    <span class="metric-value ${report.metrics.passRate >= 95 ? 'success' : report.metrics.passRate >= 80 ? 'warning' : 'error'}">
                        ${report.metrics.passRate.toFixed(1)}%
                    </span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${report.metrics.passRate >= 95 ? 'success' : report.metrics.passRate >= 80 ? 'warning' : 'error'}" 
                         style="width: ${report.metrics.passRate}%"></div>
                </div>
            </div>

            <div class="card">
                <h3>⏱️ Performance</h3>
                <div class="metric">
                    <span>Total Duration</span>
                    <span class="metric-value">${(report.metrics.totalDuration / 1000).toFixed(1)}s</span>
                </div>
                <div class="metric">
                    <span>Average Test</span>
                    <span class="metric-value">${(report.metrics.averageDuration / 1000).toFixed(1)}s</span>
                </div>
                <div class="metric">
                    <span>Slowest Test</span>
                    <span class="metric-value warning">${(report.metrics.slowestTest.duration / 1000).toFixed(1)}s</span>
                </div>
                <div class="metric">
                    <span>Fastest Test</span>
                    <span class="metric-value success">${(report.metrics.fastestTest.duration / 1000).toFixed(1)}s</span>
                </div>
            </div>

            <div class="card">
                <h3>📈 Trends</h3>
                <div class="metric">
                    <span>Pass Rate Change</span>
                    <span class="metric-value ${report.trends.passRateChange >= 0 ? 'success' : 'error'}">
                        ${report.trends.passRateChange >= 0 ? '+' : ''}${report.trends.passRateChange.toFixed(1)}%
                    </span>
                </div>
                <div class="metric">
                    <span>Duration Change</span>
                    <span class="metric-value ${report.trends.durationChange <= 0 ? 'success' : 'warning'}">
                        ${report.trends.durationChange >= 0 ? '+' : ''}${report.trends.durationChange.toFixed(1)}%
                    </span>
                </div>
                <div class="metric">
                    <span>New Failures</span>
                    <span class="metric-value ${report.trends.newFailures === 0 ? 'success' : 'error'}">
                        ${report.trends.newFailures}
                    </span>
                </div>
                <div class="metric">
                    <span>Resolved Failures</span>
                    <span class="metric-value success">${report.trends.resolvedFailures}</span>
                </div>
            </div>
        </div>

        ${this.generateBrowserMetricsHtml(report.metrics.browserMetrics)}
        ${this.generateCategoryMetricsHtml(report.metrics.categoryMetrics)}
        ${this.generateFailuresHtml(report.failures)}
        ${this.generateRecommendationsHtml(report.recommendations)}
    </div>
</body>
</html>`;

    const dashboardPath = path.join(this.outputDir, 'dashboard.html');
    fs.writeFileSync(dashboardPath, dashboardHtml);
    return dashboardPath;
  }

  private getAllTests(results: FullResult): Array<TestResult & { title: string; duration: number; status: string; error?: Error }> {
    const tests: Array<any> = [];
    
    // Type assertion for FullResult which may have suites property
    const fullResults = results as any;
    if (fullResults.suites) {
      fullResults.suites.forEach((suite: any) => {
        if (suite.tests) {
          suite.tests.forEach((test: any) => {
            if (test.results) {
              test.results.forEach((result: any) => {
                tests.push({
                  title: test.title || 'Unknown Test',
                  duration: result.duration || 0,
                  status: result.status || 'unknown',
                  error: result.error,
                  projectName: suite.project?.()?.name || 'unknown'
                });
              });
            }
          });
        }
      });
    }
    
    return tests;
  }

  private extractBrowser(test: any): string {
    return test.projectName || 'chromium';
  }

  private extractCategory(test: any): string {
    const title = test.title.toLowerCase();
    if (title.includes('auth') || title.includes('login') || title.includes('register')) return 'authentication';
    if (title.includes('websocket') || title.includes('realtime')) return 'realtime';
    if (title.includes('api')) return 'api';
    if (title.includes('accessibility') || title.includes('performance')) return 'accessibility-performance';
    if (title.includes('error') || title.includes('edge')) return 'error-handling';
    if (title.includes('responsive') || title.includes('browser')) return 'cross-browser';
    return 'general';
  }

  private generateFailureId(title: string, errorMessage: string): string {
    return Buffer.from(`${title}-${errorMessage}`).toString('base64').slice(0, 16);
  }

  private categorizeFailure(errorMessage: string, errorStack?: string): TestFailureAnalysis['category'] {
    const message = errorMessage.toLowerCase();
    const stack = errorStack?.toLowerCase() || '';
    
    if (message.includes('timeout') || message.includes('timed out')) return 'timeout';
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) return 'network';
    if (message.includes('expect') || message.includes('assertion') || message.includes('tobevisible')) return 'assertion';
    if (message.includes('setup') || message.includes('beforeall') || message.includes('global')) return 'setup';
    if (message.includes('element') || message.includes('locator') || message.includes('selector')) return 'ui';
    
    return 'unknown';
  }

  private generateSuggestions(errorMessage: string, errorStack?: string): string[] {
    const suggestions: string[] = [];
    const category = this.categorizeFailure(errorMessage, errorStack);
    
    switch (category) {
      case 'timeout':
        suggestions.push('Increase timeout values in playwright.config.ts');
        suggestions.push('Check if elements are loading slowly');
        suggestions.push('Verify server response times');
        break;
      case 'network':
        suggestions.push('Check network connectivity during test execution');
        suggestions.push('Verify API endpoints are accessible');
        suggestions.push('Consider adding retry logic for network operations');
        break;
      case 'assertion':
        suggestions.push('Review expected vs actual values');
        suggestions.push('Check if UI elements have changed');
        suggestions.push('Verify test data setup');
        break;
      case 'ui':
        suggestions.push('Check if selectors still match DOM elements');
        suggestions.push('Verify page loading states');
        suggestions.push('Update selectors if UI has changed');
        break;
      case 'setup':
        suggestions.push('Review global setup configuration');
        suggestions.push('Check test environment preparation');
        suggestions.push('Verify dependencies are properly installed');
        break;
      default:
        suggestions.push('Review error details and stack trace');
        suggestions.push('Check recent code changes');
        suggestions.push('Verify test environment consistency');
    }
    
    return suggestions;
  }

  private calculateTrends(currentMetrics: TestMetrics, currentFailures: TestFailureAnalysis[], previousReport?: TestHealthReport) {
    if (!previousReport || !previousReport.metrics || typeof previousReport.metrics.passRate === 'undefined') {
      return {
        passRateChange: 0,
        durationChange: 0,
        newFailures: currentFailures.length,
        resolvedFailures: 0
      };
    }

    const passRateChange = currentMetrics.passRate - (previousReport.metrics.passRate || 0);
    const durationChange = previousReport.metrics.averageDuration > 0 
      ? ((currentMetrics.averageDuration - previousReport.metrics.averageDuration) / previousReport.metrics.averageDuration) * 100 
      : 0;
    
    const previousFailureIds = new Set(previousReport.failures.map(f => f.failureId));
    const currentFailureIds = new Set(currentFailures.map(f => f.failureId));
    
    const newFailures = currentFailures.filter(f => !previousFailureIds.has(f.failureId)).length;
    const resolvedFailures = previousReport.failures.filter(f => !currentFailureIds.has(f.failureId)).length;

    return {
      passRateChange,
      durationChange,
      newFailures,
      resolvedFailures
    };
  }

  private generateRecommendations(metrics: TestMetrics, failures: TestFailureAnalysis[], trends: any): string[] {
    const recommendations: string[] = [];

    if (metrics.passRate < 95) {
      recommendations.push(`🔴 Pass rate is ${metrics.passRate.toFixed(1)}% - investigate failing tests immediately`);
    }

    if (metrics.averageDuration > 30000) { // 30 seconds
      recommendations.push('⚠️ Average test duration is high - consider optimizing slow tests');
    }

    if (trends.passRateChange < -5) {
      recommendations.push('📉 Pass rate has decreased significantly - review recent changes');
    }

    if (trends.newFailures > 3) {
      recommendations.push(`🆕 ${trends.newFailures} new failures detected - prioritize investigation`);
    }

    if (failures.some(f => f.category === 'timeout')) {
      recommendations.push('⏱️ Timeout failures detected - review wait strategies and increase timeouts if needed');
    }

    if (failures.some(f => f.category === 'network')) {
      recommendations.push('🌐 Network failures detected - verify API stability and connectivity');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All metrics look healthy - maintain current testing practices');
    }

    return recommendations;
  }

  private assessRiskLevel(metrics: TestMetrics, trends: any): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    if (metrics.passRate < 80) riskScore += 3;
    else if (metrics.passRate < 95) riskScore += 1;

    if (trends.passRateChange < -10) riskScore += 3;
    else if (trends.passRateChange < -5) riskScore += 2;

    if (trends.newFailures > 5) riskScore += 2;
    else if (trends.newFailures > 2) riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private getRiskColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  }

  private generateBrowserMetricsHtml(browserMetrics: Record<string, any>): string {
    const browsers = Object.keys(browserMetrics);
    if (browsers.length === 0) return '';

    return `
        <div class="card">
            <h3>🌐 Browser Performance</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Browser</th>
                        <th>Tests</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Pass Rate</th>
                        <th>Avg Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${browsers.map(browser => {
                        const metrics = browserMetrics[browser];
                        const passRate = metrics.tests > 0 ? (metrics.passed / metrics.tests) * 100 : 0;
                        const avgDuration = metrics.tests > 0 ? metrics.duration / metrics.tests : 0;
                        return `
                            <tr>
                                <td>${browser}</td>
                                <td>${metrics.tests}</td>
                                <td class="metric-value success">${metrics.passed}</td>
                                <td class="metric-value error">${metrics.failed}</td>
                                <td class="metric-value ${passRate >= 95 ? 'success' : passRate >= 80 ? 'warning' : 'error'}">
                                    ${passRate.toFixed(1)}%
                                </td>
                                <td>${(avgDuration / 1000).toFixed(1)}s</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
  }

  private generateCategoryMetricsHtml(categoryMetrics: Record<string, any>): string {
    const categories = Object.keys(categoryMetrics);
    if (categories.length === 0) return '';

    return `
        <div class="card">
            <h3>📁 Category Performance</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Tests</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Pass Rate</th>
                        <th>Avg Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${categories.map(category => {
                        const metrics = categoryMetrics[category];
                        const passRate = metrics.tests > 0 ? (metrics.passed / metrics.tests) * 100 : 0;
                        const avgDuration = metrics.tests > 0 ? metrics.duration / metrics.tests : 0;
                        return `
                            <tr>
                                <td style="text-transform: capitalize;">${category.replace('-', ' ')}</td>
                                <td>${metrics.tests}</td>
                                <td class="metric-value success">${metrics.passed}</td>
                                <td class="metric-value error">${metrics.failed}</td>
                                <td class="metric-value ${passRate >= 95 ? 'success' : passRate >= 80 ? 'warning' : 'error'}">
                                    ${passRate.toFixed(1)}%
                                </td>
                                <td>${(avgDuration / 1000).toFixed(1)}s</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
  }

  private generateFailuresHtml(failures: TestFailureAnalysis[]): string {
    if (failures.length === 0) {
      return `
            <div class="card">
                <h3>✅ Test Failures</h3>
                <p style="color: #10b981; font-weight: 600;">No failures detected! All tests are passing.</p>
            </div>
        `;
    }

    return `
        <div class="card">
            <h3>🚨 Test Failures (${failures.length})</h3>
            ${failures.map(failure => `
                <div class="failure-item">
                    <div class="failure-title">${failure.testTitle}</div>
                    <div class="failure-message">${failure.errorMessage}</div>
                    <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 8px;">
                        Category: <strong>${failure.category}</strong> | 
                        Last seen: ${new Date(failure.lastSeen).toLocaleString()}
                    </div>
                    <div class="suggestions">
                        <strong>💡 Suggestions:</strong>
                        ${failure.suggestions.map(suggestion => 
                            `<div class="suggestion">${suggestion}</div>`
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
  }

  private generateRecommendationsHtml(recommendations: string[]): string {
    return `
        <div class="recommendations">
            <h3>🎯 Recommendations</h3>
            ${recommendations.map(rec => `
                <div class="recommendation">• ${rec}</div>
            `).join('')}
        </div>
    `;
  }

  private async loadPreviousReport(): Promise<TestHealthReport | undefined> {
    try {
      const historyFiles = fs.readdirSync(this.historyDir);
      if (historyFiles.length === 0) return undefined;

      const latestFile = historyFiles
        .filter(file => file.endsWith('.json'))
        .sort()
        .pop();

      if (!latestFile) return undefined;

      const content = fs.readFileSync(path.join(this.historyDir, latestFile), 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Could not load previous report:', error);
      return undefined;
    }
  }

  private async saveReport(report: TestHealthReport): Promise<void> {
    // Save current report
    const reportPath = path.join(this.outputDir, 'test-health-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Save to history
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const historyPath = path.join(this.historyDir, `report-${timestamp}.json`);
    fs.writeFileSync(historyPath, JSON.stringify(report, null, 2));

    // Cleanup old history files (keep last 30)
    try {
      const historyFiles = fs.readdirSync(this.historyDir)
        .filter(file => file.endsWith('.json'))
        .sort();

      if (historyFiles.length > 30) {
        const filesToDelete = historyFiles.slice(0, historyFiles.length - 30);
        filesToDelete.forEach(file => {
          fs.unlinkSync(path.join(this.historyDir, file));
        });
      }
    } catch (error) {
      console.warn('Could not cleanup history files:', error);
    }
  }
} 