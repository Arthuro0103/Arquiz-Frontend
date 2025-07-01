#!/bin/bash

# Enhanced Test Suite Runner for Fullarquiz
# This script runs comprehensive E2E tests with enhanced configuration

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_RESULTS_DIR="test-results"
REPORTS_DIR="$TEST_RESULTS_DIR/reports"
ENHANCED_CONFIG="playwright.config.enhanced.ts"
STANDARD_CONFIG="playwright.config.ts"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    log_info "Cleaning up previous test results..."
    rm -rf "$TEST_RESULTS_DIR/artifacts"
    rm -rf "$TEST_RESULTS_DIR/html-report"
    mkdir -p "$REPORTS_DIR"
}

setup_environment() {
    log_info "Setting up test environment..."
    
    # Check if enhanced config exists, fallback to standard
    if [ -f "$ENHANCED_CONFIG" ]; then
        CONFIG_FILE="$ENHANCED_CONFIG"
        log_info "Using enhanced Playwright configuration"
    else
        CONFIG_FILE="$STANDARD_CONFIG"
        log_warning "Enhanced config not found, using standard configuration"
    fi
    
    # Set environment variables
    export NODE_ENV=test
    export PLAYWRIGHT_BASE_URL=${PLAYWRIGHT_BASE_URL:-"http://localhost:8888"}
    export CI=${CI:-false}
    
    # Check if servers are running
    if ! curl -s "$PLAYWRIGHT_BASE_URL" > /dev/null; then
        log_warning "Frontend server not running at $PLAYWRIGHT_BASE_URL"
        log_info "Please start the frontend server with: npm run dev"
    fi
}

run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    local browser=${3:-"all"}
    
    log_info "Running $suite_name tests..."
    
    local cmd="npx playwright test"
    
    if [ "$test_pattern" != "all" ]; then
        cmd="$cmd $test_pattern"
    fi
    
    if [ "$browser" != "all" ]; then
        cmd="$cmd --project='$browser'"
    fi
    
    cmd="$cmd --config=$CONFIG_FILE"
    
    if $cmd; then
        log_success "$suite_name tests completed successfully"
        return 0
    else
        log_error "$suite_name tests failed"
        return 1
    fi
}

generate_reports() {
    log_info "Generating comprehensive test reports..."
    
    # Generate HTML report
    if [ -f "$TEST_RESULTS_DIR/results.json" ]; then
        npx playwright show-report --host=0.0.0.0 --port=9323 &
        REPORT_PID=$!
        
        log_info "HTML report available at: http://localhost:9323"
        log_info "Report server PID: $REPORT_PID"
        
        # Save PID for cleanup
        echo $REPORT_PID > "$TEST_RESULTS_DIR/report-server.pid"
    fi
    
    # Generate summary report
    cat > "$REPORTS_DIR/test-summary.md" << EOF
# Enhanced Test Suite Results

## Test Execution Summary
- **Date**: $(date)
- **Configuration**: $CONFIG_FILE
- **Environment**: $NODE_ENV
- **Base URL**: $PLAYWRIGHT_BASE_URL

## Test Results
$(if [ -f "$TEST_RESULTS_DIR/results.json" ]; then
    echo "- **Total Tests**: $(jq '.suites | map(.specs | length) | add' "$TEST_RESULTS_DIR/results.json" 2>/dev/null || echo "N/A")"
    echo "- **Passed**: $(jq '[.suites[].specs[].tests[] | select(.results[].status == "passed")] | length' "$TEST_RESULTS_DIR/results.json" 2>/dev/null || echo "N/A")"
    echo "- **Failed**: $(jq '[.suites[].specs[].tests[] | select(.results[].status == "failed")] | length' "$TEST_RESULTS_DIR/results.json" 2>/dev/null || echo "N/A")"
    echo "- **Skipped**: $(jq '[.suites[].specs[].tests[] | select(.results[].status == "skipped")] | length' "$TEST_RESULTS_DIR/results.json" 2>/dev/null || echo "N/A")"
else
    echo "- **Status**: Results file not found"
fi)

## Files Generated
- HTML Report: \`$TEST_RESULTS_DIR/html-report/index.html\`
- JSON Results: \`$TEST_RESULTS_DIR/results.json\`
- JUnit Results: \`$TEST_RESULTS_DIR/results.xml\`
- Test Artifacts: \`$TEST_RESULTS_DIR/artifacts/\`

## Quick Commands
\`\`\`bash
# View HTML report
npx playwright show-report

# Run specific test suite
npm run test:enhanced -- tests/e2e/enhanced-student-workflow.spec.ts

# Run with specific browser
npm run test:enhanced -- --project="Desktop Chrome"

# Debug failed tests
npm run test:enhanced -- --debug
\`\`\`
EOF
    
    log_success "Reports generated in $REPORTS_DIR/"
}

main() {
    log_info "Starting Enhanced Fullarquiz Test Suite"
    log_info "======================================="
    
    cleanup
    setup_environment
    
    local failed_suites=0
    
    # Run enhanced test suites
    if [ "${RUN_ENHANCED_STUDENT:-true}" = "true" ]; then
        if ! run_test_suite "Enhanced Student Workflow" "tests/e2e/enhanced-student-workflow.spec.ts"; then
            ((failed_suites++))
        fi
    fi
    
    if [ "${RUN_PERFORMANCE:-true}" = "true" ]; then
        if ! run_test_suite "Performance Tests" "tests/e2e/enhanced-performance.spec.ts" "Desktop Chrome"; then
            ((failed_suites++))
        fi
    fi
    
    if [ "${RUN_ACCESSIBILITY:-true}" = "true" ]; then
        if ! run_test_suite "Accessibility Tests" "tests/e2e/enhanced-accessibility.spec.ts"; then
            ((failed_suites++))
        fi
    fi
    
    # Run original test suites if requested
    if [ "${RUN_ORIGINAL:-false}" = "true" ]; then
        if ! run_test_suite "Professor Workflow" "tests/e2e/professor-workflow.spec.ts"; then
            ((failed_suites++))
        fi
        
        if ! run_test_suite "Student Workflow" "tests/e2e/student-workflow.spec.ts"; then
            ((failed_suites++))
        fi
    fi
    
    # Run all tests if no specific suites requested
    if [ "${RUN_ALL:-false}" = "true" ]; then
        if ! run_test_suite "All Tests" "all"; then
            ((failed_suites++))
        fi
    fi
    
    generate_reports
    
    # Summary
    echo ""
    log_info "======================================="
    if [ $failed_suites -eq 0 ]; then
        log_success "All test suites completed successfully! 🎉"
        exit 0
    else
        log_error "$failed_suites test suite(s) failed ❌"
        log_info "Check the reports for detailed failure information"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --student)
        export RUN_ENHANCED_STUDENT=true
        export RUN_PERFORMANCE=false
        export RUN_ACCESSIBILITY=false
        export RUN_ORIGINAL=false
        ;;
    --performance)
        export RUN_ENHANCED_STUDENT=false
        export RUN_PERFORMANCE=true
        export RUN_ACCESSIBILITY=false
        export RUN_ORIGINAL=false
        ;;
    --accessibility)
        export RUN_ENHANCED_STUDENT=false
        export RUN_PERFORMANCE=false
        export RUN_ACCESSIBILITY=true
        export RUN_ORIGINAL=false
        ;;
    --original)
        export RUN_ENHANCED_STUDENT=false
        export RUN_PERFORMANCE=false
        export RUN_ACCESSIBILITY=false
        export RUN_ORIGINAL=true
        ;;
    --all)
        export RUN_ALL=true
        ;;
    --help)
        echo "Enhanced Test Suite Runner"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  --student       Run enhanced student workflow tests only"
        echo "  --performance   Run performance tests only"
        echo "  --accessibility Run accessibility tests only"
        echo "  --original      Run original test suites only"
        echo "  --all           Run all available tests"
        echo "  --help          Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  PLAYWRIGHT_BASE_URL     Frontend server URL (default: http://localhost:8888)"
        echo "  DEBUG                   Enable debug mode"
        echo "  CI                      Enable CI mode"
        echo ""
        exit 0
        ;;
esac

# Run main function
main "$@" 