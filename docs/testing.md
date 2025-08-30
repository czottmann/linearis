<!-- Generated: 2025-08-30T19:51:49+02:00 -->

# Testing

The zco-linear-cli currently has minimal automated testing infrastructure, with
testing primarily done through manual integration testing and performance
benchmarking. The project relies on TypeScript's compile-time type checking and
real-world API testing against Linear's production environment.

Testing focuses on performance validation, authentication flows, and API
integration correctness. All commands are tested manually with real Linear
workspaces to ensure proper functionality and performance characteristics.

## Test Types

### Manual Integration Testing

**Command Validation** - Real API testing approach used throughout development:

- Each command tested against live Linear workspace
- Authentication tested with all three methods (token flag, env var, file)
- Smart ID resolution tested with various identifier formats

**Performance Testing** - PERFORMANCE.md documents benchmarking approach:

- Real-world timing using `time` command with production API
- Performance regression testing for optimization validation

### Type Safety Testing

**Compile-time Validation** - TypeScript ensures type correctness:

- src/utils/linear-types.d.ts (lines 1-96) - Complete interface definitions
- All API responses validated against TypeScript interfaces
- Command parameter validation through Commander.js and TypeScript

## Running Tests

### Current Test Command

**Package.json Test Script** - package.json (line 9)

```bash
pnpm test
# Output: "Error: no test specified" && exit 1
```

**No automated test framework is currently configured**

### Manual Testing Commands

**Issue Operations Testing**

```bash
# Test issue listing
pnpm start issues list -l 5

# Test issue reading with ID resolution
pnpm start issues read ZCO-123

# Test issue creation
pnpm start issues create --title "Test Issue" --team ZCO

# Test issue search with filters
pnpm start issues search "bug" --team ZCO --project "Mobile App"
```

**Project Operations Testing**

```bash
# Test project listing
pnpm start projects list

# Test project reading with name resolution
pnpm start projects read "Mobile App"
```

**Authentication Testing**

```bash
# Test with API token flag
pnpm start --api-token <token> issues list

# Test with environment variable
LINEAR_API_TOKEN=<token> pnpm start issues list

# Test with token file
echo "<token>" > ~/.linear_api_token && pnpm start issues list
```

### Performance Testing

**Benchmark Commands** - From PERFORMANCE.md examples:

```bash
# Time command execution
time pnpm start issues list -l 10

# Monitor single issue performance
time pnpm start issues read ZCO-123

# Test search performance
time pnpm start issues search "test" --team ZCO
```

## Reference

### Test File Organization

**Current State** - No test files present:

- No test/ or **tests**/ directories
- No test configuration files (jest.config.js, etc.)
- No testing dependencies in package.json

**Testing Strategy** - Manual and performance-focused:

- Integration testing via real API calls
- Performance regression testing via benchmarking
- Type safety via TypeScript compilation

### Adding Automated Tests

**Recommended Test Framework Setup**:

1. Install Jest or Vitest for Node.js testing
2. Add test scripts to package.json
3. Create test files in test/ directory
4. Add CI/CD pipeline for automated testing

**Test Areas to Cover**:

- Authentication token resolution (src/utils/auth.ts)
- Smart ID resolution methods (src/utils/linear-service.ts lines 398-473)
- Command parsing and validation (src/commands/*.ts)
- Error handling and output formatting (src/utils/output.ts)
- Mock Linear API responses for unit testing

### Performance Testing Reference

**Current Benchmarks** - PERFORMANCE.md documented results:

- Single issue read: ~0.9-1.1 seconds (90%+ improvement)
- List 10 issues: ~0.9 seconds (95%+ improvement)
- Create issue: ~1.1 seconds (50%+ improvement)

**Monitoring Commands** - For performance regression testing:

```bash
# Create performance test script
echo 'time linear issues list -l 25' > perf-test.sh
chmod +x perf-test.sh && ./perf-test.sh
```
