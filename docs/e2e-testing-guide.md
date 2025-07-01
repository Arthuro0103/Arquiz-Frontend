# ArQuiz E2E Testing Comprehensive Guide

## Overview

This guide covers the complete end-to-end testing setup for the ArQuiz application, including local development, CI/CD integration, Docker orchestration, and maintenance procedures.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Suite Structure](#test-suite-structure)
3. [Local Development](#local-development)
4. [CI/CD Integration](#cicd-integration)
5. [Docker Environment](#docker-environment)
6. [Test Categories](#test-categories)
7. [Maintenance & Troubleshooting](#maintenance--troubleshooting)
8. [Best Practices](#best-practices)

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Docker & Docker Compose (for containerized testing)

### Installation

```bash
# Install dependencies
cd Arquiz-Frontend
npm install

# Install Playwright browsers
npx playwright install

# Run basic test verification
npm run test:e2e -- tests/e2e/setup-verification.spec.ts
```

### Running Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run specific test suites
npm run test:professor      # Professor workflow tests
npm run test:student        # Student workflow tests
npm run test:reporting      # Test reporting & maintenance

# Run tests in specific browsers
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile

# Debug mode
npm run test:e2e:debug

# Interactive UI mode
npm run test:e2e:ui
```

## Test Suite Structure

```
Arquiz-Frontend/tests/
├── e2e/                              # End-to-end test suites
│   ├── authentication-flow.spec.ts   # Auth & registration testing
│   ├── real-time-websocket.spec.ts   # WebSocket & real-time features
│   ├── api-integration.spec.ts       # API endpoint testing
│   ├── cross-browser-responsive.spec.ts # Cross-browser compatibility
│   ├── accessibility-performance.spec.ts # WCAG & performance
│   ├── error-handling-edge-cases.spec.ts # Error resilience
│   ├── professor-workflow.spec.ts    # Professor experience
│   ├── student-workflow.spec.ts      # Student experience
│   └── test-reporting-maintenance.spec.ts # Test health monitoring
├── fixtures/                         # Test data & setup utilities
│   ├── index.ts                     # Extended Playwright fixtures
│   ├── test-data.ts                 # Sample data & generators
│   └── data-manager.ts              # Test data management
├── utils/                           # Helper utilities
│   ├── test-helpers.ts              # Common test functions
│   ├── test-reporter.ts             # Advanced reporting utilities
│   └── test-maintenance.ts          # Maintenance automation
└── docker/                         # Docker configurations
    ├── Dockerfile.e2e               # Multi-stage test container
    └── docker-compose.e2e.yml       # Complete test environment
```

## Local Development

### Environment Setup

Create `.env.test` file in `Arquiz-Frontend/`:

```env
# Application URLs
PLAYWRIGHT_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001

# Test configuration
NODE_ENV=test
CI=false

# Database (if running locally)
DATABASE_URL=postgresql://test:test@localhost:5433/arquiz_test
REDIS_URL=redis://localhost:6380

# Optional: Test user credentials
TEST_PROFESSOR_EMAIL=professor@arquiz.test
TEST_PROFESSOR_PASSWORD=password123
TEST_STUDENT_EMAIL=student@arquiz.test
TEST_STUDENT_PASSWORD=password123
```

### Running Local Tests

```bash
# Start application servers
cd ../Arquiz && npm run start:dev &
cd Arquiz-Frontend && npm run dev &

# Wait for servers to be ready, then run tests
npm run test:e2e

# Or run with server auto-start (if configured)
npm run test:e2e:local
```

### Test Development

```bash
# Generate new test from recording
npx playwright codegen localhost:3000

# Run tests in headed mode for debugging
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/professor-workflow.spec.ts

# Run tests with specific browser
npx playwright test --project=firefox

# Show test report
npm run test:show-report
```

## CI/CD Integration

### GitHub Actions Workflow

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/e2e-tests.yml`) that provides:

- **Multi-browser testing** (Chromium, Firefox, WebKit, Mobile)
- **Parallel execution** with fail-fast disabled
- **Artifact collection** (screenshots, videos, reports)
- **Performance testing** on main branch
- **Security testing** with scheduled runs
- **Report deployment** to GitHub Pages
- **Slack notifications** for results

### Workflow Triggers

```yaml
# Automatic triggers
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC

# Manual trigger with options
  workflow_dispatch:
    inputs:
      environment: [staging, production, development]
      browsers: [all, chromium, firefox, webkit, mobile]
```

### Environment Variables for CI

Configure in GitHub repository settings > Secrets:

```bash
# Required for full CI functionality
SLACK_WEBHOOK=https://hooks.slack.com/...  # For notifications

# Optional: Custom test environment URLs
STAGING_BASE_URL=https://staging.arquiz.com
PRODUCTION_BASE_URL=https://arquiz.com
```

### Branch Protection

Recommended branch protection rules:

```yaml
# .github/branch-protection.yml
protection_rules:
  main:
    required_status_checks:
      - "E2E Tests (chromium)"
      - "E2E Tests (firefox)"
      - "E2E Tests (webkit)"
    require_branches_to_be_up_to_date: true
    dismiss_stale_reviews: true
```

## Docker Environment

### Using Docker Compose

```bash
# Full test environment with all services
docker-compose -f docker/docker-compose.e2e.yml up --build

# Run specific test categories
docker-compose -f docker/docker-compose.e2e.yml --profile performance up
docker-compose -f docker/docker-compose.e2e.yml --profile security up
docker-compose -f docker/docker-compose.e2e.yml --profile reporting up

# Cleanup
docker-compose -f docker/docker-compose.e2e.yml down -v
```

### Environment Variables for Docker

```bash
# Set browser for testing
export BROWSER=firefox
docker-compose -f docker/docker-compose.e2e.yml up e2e-tests

# Override base URLs
export FRONTEND_URL=http://custom-frontend:3000
export BACKEND_URL=http://custom-backend:3001
docker-compose -f docker/docker-compose.e2e.yml up
```

### Building Custom Images

```bash
# Build development image
docker build -f docker/Dockerfile.e2e --target development -t arquiz-e2e:dev .

# Build CI image
docker build -f docker/Dockerfile.e2e --target ci -t arquiz-e2e:ci .

# Build production testing image
docker build -f docker/Dockerfile.e2e --target production -t arquiz-e2e:prod .
```

## Test Categories

### 1. Authentication Flow Testing (21 tests)
- **Coverage**: Login, registration, session management
- **Browsers**: All supported browsers
- **Features**: Form validation, error handling, redirects

### 2. Real-Time WebSocket Testing (9 tests)
- **Coverage**: WebSocket connections, multi-user scenarios
- **Features**: Connection resilience, performance monitoring
- **Scenarios**: Professor-student interactions, room management

### 3. API Integration Testing (18 tests)
- **Coverage**: REST endpoints, error handling, performance
- **Features**: Multi-role testing, concurrent requests
- **Validation**: Response times, error codes, data integrity

### 4. Cross-Browser & Responsive Testing (13 tests)
- **Coverage**: 5 browsers, 4 viewport configurations
- **Features**: Mobile optimization, responsive design
- **Validation**: Layout consistency, performance across devices

### 5. Accessibility & Performance Testing (10 tests)
- **Coverage**: WCAG 2.0/2.1 compliance, Web Vitals
- **Features**: Screen reader compatibility, keyboard navigation
- **Metrics**: Load times, accessibility violations

### 6. Error Handling & Edge Cases Testing (10 tests)
- **Coverage**: Input validation, security, network errors
- **Features**: XSS prevention, SQL injection protection
- **Scenarios**: Offline conditions, malformed inputs

### 7. Professor Workflow Testing (18 tests)
- **Coverage**: Quiz creation, room management, analytics
- **Features**: Real-time monitoring, participant management
- **Scenarios**: Complete teacher experience validation

### 8. Student Workflow Testing (17 tests)
- **Coverage**: Registration, room joining, quiz taking
- **Features**: Mobile optimization, accessibility
- **Scenarios**: Complete student experience validation

### 9. Test Reporting & Maintenance (10+ tests)
- **Coverage**: Test health monitoring, report generation
- **Features**: Dashboard creation, maintenance automation
- **Metrics**: Test reliability, performance trends

## Maintenance & Troubleshooting

### Regular Maintenance Tasks

```bash
# Update test dependencies
npm update @playwright/test
npx playwright install

# Run test health analysis
npm run test:maintenance:analyze

# Generate test health report
npm run test:health-report

# Clean up old test artifacts
npm run test:maintenance:cleanup

# Validate test selectors
npm run test:maintenance:validate-selectors
```

### Common Issues & Solutions

#### 1. Flaky Tests
```bash
# Identify flaky tests
npm run test:maintenance:analyze

# Run flaky test multiple times
npx playwright test --repeat-each=10 tests/e2e/flaky-test.spec.ts

# Fix with better waits
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible({ timeout: 10000 });
```

#### 2. Slow Tests
```bash
# Analyze test performance
npm run test:performance

# Profile specific test
npx playwright test --trace=on tests/e2e/slow-test.spec.ts
npx playwright show-trace trace.zip
```

#### 3. CI Failures
```bash
# Download CI artifacts for debugging
# Check GitHub Actions > Workflow Run > Artifacts

# Run in CI-like environment locally
CI=true npm run test:e2e

# Debug with CI environment variables
export CI=true
export PLAYWRIGHT_BASE_URL=http://localhost:3000
npm run test:e2e:debug
```

#### 4. Browser Issues
```bash
# Reinstall browsers
npx playwright install --force

# Clear browser data
rm -rf ~/.cache/ms-playwright

# Test specific browser
npx playwright test --project=chromium --headed
```

### Monitoring & Alerts

#### Test Health Metrics
- **Pass Rate**: Target >95%
- **Average Execution Time**: Target <10 minutes
- **Flakiness Rate**: Target <2%
- **Coverage**: Target >80% of critical paths

#### Automated Alerts
Configure alerts for:
- Test failure rate >5%
- Performance degradation >20%
- New accessibility violations
- Security test failures

## Best Practices

### Test Writing Guidelines

1. **Use Page Object Pattern**
```typescript
class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.click('button[type="submit"]');
  }
}
```

2. **Robust Element Selection**
```typescript
// Use multiple fallback selectors
const element = page.locator('[data-testid="submit"]').or(
  page.locator('button:has-text("Submit")').or(
    page.locator('button[type="submit"]')
  )
);
```

3. **Proper Waiting Strategies**
```typescript
// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for specific elements
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// Wait for API responses
await page.waitForResponse(response => 
  response.url().includes('/api/quiz') && response.status() === 200
);
```

### Performance Optimization

1. **Parallel Execution**
```typescript
// Configure in playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 1 : undefined,
  fullyParallel: true,
});
```

2. **Browser Reuse**
```typescript
// Use browser contexts instead of new browsers
test.describe.configure({ mode: 'parallel' });
```

3. **Smart Retries**
```typescript
// Configure retries for flaky tests
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

### Security Considerations

1. **Test Data Isolation**
- Use unique test data for each run
- Clean up test data after execution
- Avoid using production data

2. **Credential Management**
- Store test credentials in environment variables
- Use different credentials for each environment
- Rotate test credentials regularly

3. **Network Security**
- Run tests in isolated networks
- Use HTTPS for all communications
- Validate certificate chains

### Continuous Improvement

1. **Regular Reviews**
- Monthly test suite reviews
- Quarterly performance analysis
- Semi-annual framework updates

2. **Metrics Tracking**
- Test execution time trends
- Failure rate patterns
- Coverage improvements

3. **Team Training**
- Regular Playwright training sessions
- Best practices documentation
- Code review guidelines

## Support & Resources

### Documentation Links
- [Playwright Documentation](https://playwright.dev/)
- [GitHub Actions Guide](https://docs.github.com/en/actions)
- [Docker Compose Reference](https://docs.docker.com/compose/)

### Team Contacts
- **E2E Testing Lead**: [Name] - [email]
- **DevOps Engineer**: [Name] - [email]
- **QA Team**: [email]

### Troubleshooting Channels
- **Slack**: #e2e-testing
- **Issues**: GitHub Issues with `e2e-testing` label
- **Documentation**: [Internal Wiki Link]

---

*Last Updated: 2024-12-25*
*Version: 1.0.0* 