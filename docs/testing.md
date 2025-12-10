# Testing

Linearis uses [Vitest](https://vitest.dev/) for automated testing, combining unit tests with mocks and integration tests against the compiled CLI. The testing framework was introduced in PR #4 to establish automated testing practices.

## Overview

Testing approach combines multiple strategies:

- **Unit tests**: Test individual functions/methods in isolation with mocks
- **Integration tests**: Test CLI commands end-to-end with compiled binary
- **Type safety**: TypeScript compile-time validation
- **Performance testing**: Manual benchmarking against Linear API

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run with UI
npm test:ui

# Generate coverage report
npm test:coverage
```

## Test Structure

```
tests/
├── unit/                          # Unit tests (fast, use mocks)
│   └── linear-service-cycles.test.ts
└── integration/                   # Integration tests (slower, real CLI)
    ├── cycles-cli.test.ts
    └── project-milestones-cli.test.ts
```

## Running Tests

### All Tests

```bash
# Run all tests once
npm test

# Run in watch mode (re-runs on changes)
npm test:watch

# Run with interactive UI
npm test:ui
```

### Specific Test Suites

```bash
# Unit tests only
npx vitest run tests/unit

# Integration tests only
npx vitest run tests/integration

# Specific test file
npx vitest run tests/unit/linear-service-cycles.test.ts

# Run single test by name
npx vitest run -t "should fetch cycles without filters"
```

## Unit Tests

Unit tests verify individual functions and methods in isolation using mocks to avoid external dependencies.

### Example: Testing LinearService

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinearService } from "../../src/utils/linear-service.js";

describe("LinearService - getCycles()", () => {
  let mockClient: any;
  let service: LinearService;

  beforeEach(() => {
    mockClient = { cycles: vi.fn() };
    service = new LinearService("fake-token");
    service.client = mockClient;
  });

  it("should fetch cycles without filters", async () => {
    mockClient.cycles.mockResolvedValue({
      nodes: [{ id: "cycle-1", name: "Sprint 1" }],
    });

    const result = await service.getCycles();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Sprint 1");
  });
});
```

### Running Unit Tests

```bash
# Run all unit tests
npx vitest run tests/unit

# Watch mode for development
npx vitest tests/unit
```

**No API token required** - unit tests use mocks and run offline.

## Integration Tests

Integration tests verify CLI commands work end-to-end by executing the compiled binary and validating JSON output.

### Setup for Integration Tests

Integration tests require a Linear API token:

```bash
# Set your Linear API token
export LINEAR_API_TOKEN="lin_api_..."

# Build the CLI first
npm run build

# Run integration tests
npx vitest run tests/integration
```

If `LINEAR_API_TOKEN` is not set, integration tests are automatically skipped.

### Example: Testing CLI Commands

```typescript
import { describe, expect, it } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const hasApiToken = !!process.env.LINEAR_API_TOKEN;

describe("Cycles CLI", () => {
  it.skipIf(!hasApiToken)("should list cycles", async () => {
    const { stdout, stderr } = await execAsync(
      "node ./dist/main.js cycles list",
    );

    // Verify no complexity errors (PR #4 bug fix)
    expect(stderr).not.toContain("query too complex");

    // Verify valid JSON output
    const cycles = JSON.parse(stdout);
    expect(Array.isArray(cycles)).toBe(true);
  });
});
```

## Coverage Reports

### Code Coverage (Unit Tests)

Generate code coverage reports to track which source code lines are executed:

```bash
# Run tests with coverage
npm test:coverage
```

Coverage reports generated:

- `coverage/index.html` - Visual HTML report
- `coverage/coverage-final.json` - JSON data

View the report:

```bash
open coverage/index.html
```

**Note**: Code coverage only tracks unit tests. Integration tests run CLI in separate processes and don't show up in code coverage reports.

### Command Coverage (Integration Tests)

See which CLI commands have integration test coverage:

```bash
# Run command coverage report
npm test:commands
```

This shows:

- ✅ Which commands have integration tests
- ⚠️ Which commands need testing
- 📊 Overall % of commands covered
- 📋 List of untested commands

Example output:

```
📊 CLI Command Coverage Report

✅ cycles               (cycles.ts)
  ✅  ├─ list
  ✅  ├─ read

❌ issues               (issues.ts)
  ⚠️   ├─ create
  ⚠️   ├─ list
  ⚠️   ├─ read

📈 Summary
Commands:     3/6 tested (50.0%)
Subcommands:  4/14 tested (28.6%)
Overall:      7/20 tested (35.0%)
```

**This is the metric you care about for CLI tools!** It shows which commands users can actually run that are verified by tests.

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions.

### CI Workflow (`.github/workflows/ci.yml`)

**Test Job**:

1. Installs dependencies with npm
2. Builds the project
3. Runs all tests
4. Runs integration tests if `LINEAR_API_TOKEN` secret is configured

**Lint Job**:

1. Type checks with TypeScript
2. Verifies clean build

### Configuring CI Secrets

To enable integration tests in CI:

1. Go to: Repository Settings → Secrets and variables → Actions
2. Add: `LINEAR_API_TOKEN` with your Linear API token
3. Integration tests will run automatically on all PRs

**Note**: Be careful with API tokens in CI - they grant access to your Linear workspace.

## Test Examples from PR #4

### Unit Tests (linear-service-cycles.test.ts)

Tests for new cycle methods added in PR #4:

- ✅ `getCycles()` fetches cycles without filters
- ✅ `getCycles()` fetches cycles with team filter
- ✅ `getCycles()` fetches only active cycles
- ✅ `getCycles()` converts dates to strings
- ✅ `getCycleById()` fetches cycle with issues
- ✅ `getCycleById()` uses default issues limit
- ✅ `resolveCycleId()` returns UUID as-is
- ✅ `resolveCycleId()` resolves cycle by name
- ✅ `resolveCycleId()` resolves with team filter
- ✅ `resolveCycleId()` throws error when not found
- ✅ `resolveCycleId()` disambiguates by preferring active
- ✅ `resolveCycleId()` disambiguates by preferring next
- ✅ `resolveCycleId()` throws error for ambiguous names

### Integration Tests (cycles-cli.test.ts)

Tests for cycles command functionality:

- ✅ `cycles --help` displays help text
- ✅ `cycles list` works without complexity errors
- ✅ `cycles list` returns valid JSON structure
- ✅ `cycles list --active` filters active cycles
- ✅ `cycles list --around-active` works correctly
- ✅ `cycles list --around-active` requires --team flag
- ✅ `cycles read <id>` reads cycle by ID
- ✅ `cycles read <name>` reads cycle by name with team

### Integration Tests (project-milestones-cli.test.ts)

Tests for command naming fix:

- ✅ `project-milestones --help` displays help
- ✅ Command appears in main help as `project-milestones`
- ✅ Old camelCase `projectMilestones` fails appropriately
- ✅ `project-milestones list` requires --project flag
- ✅ `project-milestones list` works with valid project

## Writing New Tests

### When to Write Unit Tests

Write unit tests for:

- Complex business logic
- Data transformations
- Error handling
- Edge cases and boundary conditions

### When to Write Integration Tests

Write integration tests for:

- New CLI commands
- New command flags
- Critical user workflows
- Bug fixes (regression prevention)

### Test Naming Convention

```typescript
describe("ComponentName - methodName()", () => {
  it("should do something specific", async () => {
    // Arrange
    const input = { data: "test" };

    // Act
    const result = await methodName(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Testing Best Practices

1. **Descriptive names**: Test names should clearly describe behavior
2. **One concept per test**: Each test verifies one specific behavior
3. **Arrange-Act-Assert**: Structure tests in three clear phases
4. **Mock external dependencies**: Unit tests shouldn't call real APIs
5. **Test error cases**: Always test both success and failure paths
6. **Keep tests fast**: Unit tests should complete in milliseconds
7. **Make tests deterministic**: Avoid flaky tests with random data or timing

## Manual Testing

While automated tests are preferred, some scenarios still require manual testing:

### Issue Operations

```bash
# Test issue listing
npm start issues list -l 5

# Test issue reading with ID resolution
npm start issues read ABC-123

# Test issue creation
npm start issues create --title "Test Issue" --team ABC

# Test issue search with filters
npm start issues search "bug" --team ABC --project "Mobile App"
```

### Project Operations

```bash
# Test project listing
npm start projects list

# Test project reading with name resolution
npm start projects read "Mobile App"
```

### Authentication Testing

```bash
# Test with API token flag
npm start --api-token <token> issues list

# Test with environment variable
LINEAR_API_TOKEN=<token> npm start issues list

# Test with token file
echo "<token>" > ~/.linear_api_token && npm start issues list
```

## Performance Testing

### Benchmark Commands

Performance benchmarks from PERFORMANCE.md:

```bash
# Time command execution
time npm start issues list -l 10

# Monitor single issue performance
time npm start issues read ABC-123

# Test search performance
time npm start issues search "test" --team ABC

# Cycles performance test (PR #4 fix verification)
time npm start cycles list --team Backend
```

### Current Benchmarks

- Single issue read: ~0.9-1.1 seconds (90%+ improvement)
- List 10 issues: ~0.9 seconds (95%+ improvement)
- Create issue: ~1.1 seconds (50%+ improvement)

## Debugging Tests

### Run with Verbose Output

```bash
npx vitest run --reporter=verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npx",
  "runtimeArgs": ["vitest", "run", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

Set breakpoints in test files and press F5 to debug.

## Troubleshooting

### "Cannot find module" Errors

Ensure project is built:

```bash
npm run build
```

### Integration Tests Skipped

Set your Linear API token:

```bash
export LINEAR_API_TOKEN="lin_api_..."
```

### Tests Timeout

Integration tests have 30-second timeout. If timing out:

- Check internet connection
- Verify Linear API is accessible
- Confirm API token is valid

Increase timeout for specific test:

```typescript
it("slow test", async () => {
  // test code
}, { timeout: 60000 }); // 60 seconds
```

### Mock Not Working

Use Vitest's `vi.fn()`, not Jest's `jest.fn()`:

```typescript
import { vi } from "vitest";

const mockFn = vi.fn();
mockFn.mockResolvedValue({ data: "test" });
```

### Type Errors in Tests

Ensure you're importing from correct paths with `.js` extension:

```typescript
import { LinearService } from "../../src/utils/linear-service.js";
```

## Test Coverage Goals

Current coverage (as of PR #4):

- Unit tests: LinearService cycle methods
- Integration tests: Cycles and project-milestones commands

Future coverage goals:

- Authentication flows (src/utils/auth.ts)
- Smart ID resolution (src/utils/linear-service.ts)
- All command handlers (src/commands/*.ts)
- Error handling (src/utils/output.ts)
- GraphQL service methods (src/utils/graphql-service.ts)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Testing Best Practices](https://vitest.dev/guide/testing-patterns.html)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Configuration Files

- `vitest.config.ts` - Vitest configuration
- `.github/workflows/ci.yml` - CI/CD workflow
- `package.json` - Test scripts and dependencies
