<!-- Generated: 2025-01-09T12:34:56+00:00 -->

# Development

Linearis follows TypeScript-first development practices with strict typing, modular architecture, and GraphQL-optimized design patterns. Development emphasizes code clarity, maintainability, and efficient GraphQL operations for optimal Linear integration performance.

The codebase uses modern ES modules, async/await patterns throughout, and leverages TypeScript's type system for compile-time safety. All development follows the principle of smart defaults with explicit user control when needed. Recent optimization work focuses on replacing SDK-heavy operations with direct GraphQL queries.

## Code Style

### TypeScript Standards

**Strict Typing** - All files use comprehensive TypeScript interfaces:

```typescript
// From src/utils/linear-types.d.ts lines 1-41
export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: { id: string; name: string };
  // ... complete type definitions
}
```

**Interface-Driven Development** - src/utils/linear-types.d.ts (lines 63-96):

- CreateIssueArgs interface for issue creation parameters
- UpdateIssueArgs interface for issue updates
- SearchIssuesArgs interface for search operations

### Async/Await Patterns

**Consistent Promise Handling** - Throughout src/utils/linear-service.ts:

```typescript
// Example from lines 128-137 - Parallel API calls
const [state, team, assignee, project, labels] = await Promise.all([
  issue.state,
  issue.team,
  issue.assignee,
  issue.project,
  issue.labels(),
]);
```

**Error Handling Pattern** - src/utils/output.ts (lines 23-33):

```typescript
export function handleAsyncCommand(
  asyncFn: (...args: any[]) => Promise<void>,
): (...args: any[]) => Promise<void> {
  return async (...args: any[]) => {
    try {
      await asyncFn(...args);
    } catch (error) {
      outputError(error instanceof Error ? error : new Error(String(error)));
    }
  };
}
```

### ES Modules Convention

**Import/Export Style** - All files use ES module syntax:

- src/main.ts (lines 3-5) - Named imports with .js extensions
- src/utils/auth.ts (lines 18, 38) - Interface exports and async functions
- All imports use .js extensions for ES module compatibility

## Common Patterns

### Command Setup Pattern

**Commander.js Integration** - src/commands/issues.ts (lines 9-16):

```typescript
export function setupIssuesCommands(program: Command): void {
  const issues = program.command("issues")
    .description("Issue operations");

  // Show help when no subcommand
  issues.action(() => {
    issues.help();
  });
```

### Service Layer Pattern

**Authentication Integration** - src/utils/linear-service.ts (lines 479-484):

```typescript
export async function createLinearService(
  options: CommandOptions,
): Promise<LinearService> {
  const apiToken = await getApiToken(options);
  return new LinearService(apiToken);
}
```

### Smart ID Resolution Pattern

**UUID Validation Helper** - src/utils/uuid.ts:

```typescript
// Generic UUID validation using proper regex
export function isUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
```

**Flexible Identifier Handling** - src/utils/linear-service.ts (lines 196-227):

```typescript
// Check if UUID or identifier format using helper
if (isUuid(issueId)) {
  issue = await this.client.issue(issueId);
} else {
  // Parse team-number format like "ABC-123"
  const parts = issueId.split("-");
  // ... resolve to internal UUID
}
```

### GraphQL Optimization Pattern

**Single Query Strategy** - Used throughout GraphQL service layer:

```typescript
// From src/utils/graphql-issues-service.ts lines 32-46
async getIssues(limit: number = 25): Promise<LinearIssue[]> {
  const result = await this.graphQLService.rawRequest(GET_ISSUES_QUERY, {
    first: limit,
    orderBy: "updatedAt" as any,
  });
  // Complete data in single response - no N+1 queries
}
```

**Batch Resolution Pattern** - Resolve multiple IDs in single operation:

```typescript
// From src/utils/graphql-issues-service.ts lines 294-301
const resolveResult = await this.graphQLService.rawRequest(
  BATCH_RESOLVE_FOR_CREATE_QUERY,
  { teamName, projectName, labelNames },
);
// All IDs resolved in single query
```

**Enhanced Label Management** - Supporting both adding and overwriting modes:

```typescript
// From src/utils/graphql-issues-service.ts lines 188-196
if (labelMode === "adding") {
  // Merge with current labels
  finalLabelIds = [...new Set([...currentIssueLabels, ...resolvedLabels])];
} else {
  // Overwrite mode - replace all existing labels
  finalLabelIds = resolvedLabels;
}
```

## Workflows

### Adding New Commands

1. **Define Interfaces** - Add to src/utils/linear-types.d.ts
2. **Create GraphQL Queries** - Add optimized queries to src/queries/
3. **Implement GraphQL Service Methods** - Add to src/utils/graphql-issues-service.ts or create new GraphQL service
4. **Create Command Handler** - Add to appropriate src/commands/ file
5. **Register Command** - Import and setup in src/main.ts

### GraphQL Development Workflow

1. **Design Query Strategy** - Single query vs batch resolution approach
2. **Create Query Fragments** - Reuse existing fragments from src/queries/common.ts
3. **Implement Service Method** - Use GraphQLService for raw execution
4. **Add Error Handling** - Transform GraphQL errors to user-friendly messages
5. **Test Performance** - Compare against SDK-based approach for improvements

**Example Command Addition Pattern** - src/commands/issues.ts (lines 138-152):

```typescript
issues.command("read <issueId>")
  .description(
    "Get issue details (supports both UUID and identifier like ABC-123)",
  )
  .action(
    handleAsyncCommand(
      async (issueId: string, options: any, command: Command) => {
        const service = await createLinearService(
          command.parent!.parent!.opts(),
        );
        const result = await service.getIssueById(issueId);
        outputSuccess(result);
      },
    ),
  );
```

### Development Server Setup

**Development Mode** - package.json (line 14):

```bash
# Run with TypeScript execution via tsx (development only)
pnpm start issues list -l 5

# Direct execution for debugging
npx tsx src/main.ts --api-token <token> issues read ABC-123
```

**Production Build Workflow**:

```bash
# Clean and compile for production
npm run clean && npm run build

# Test compiled output (creates executable dist/main.js)
chmod +x dist/main.js
./dist/main.js issues list -l 5

# Time comparison (compiled is significantly faster)
time ./dist/main.js --help
time npx tsx src/main.ts --help
```

### Authentication Development

**Multiple Token Sources** - src/utils/auth.ts (lines 18-38):

1. Command flag: `--api-token <token>`
2. Environment: `LINEAR_API_TOKEN=<token>`
3. File: `echo "<token>" > ~/.linear_api_token`

### Error Handling Development

**Consistent Error Response** - src/utils/output.ts (lines 13-16):

```typescript
export function outputError(error: Error): void {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
}
```

## Reference

### File Organization Patterns

**Service Layer** - `src/utils/` directory:

- graphql-service.ts - GraphQL client wrapper with batch operations
- graphql-issues-service.ts - Optimized GraphQL issue operations
- linear-service.ts - Legacy SDK-based business logic and fallback operations
- auth.ts - Authentication handling
- output.ts - Response formatting
- linear-types.d.ts - Type definitions
- uuid.ts - UUID validation utilities

**Command Layer** - `src/commands/` directory:

- issues.ts - Issue-related commands with enhanced label and parent management
- projects.ts - Project-related commands
- comments.ts - Comment operations with lightweight ID resolution
- teams.ts - Team operations (list) with workspace team discovery
- users.ts - User operations (list) with active user filtering
- Pattern: Each domain gets its own command file

**Query Layer** - `src/queries/` directory:

- common.ts - Reusable GraphQL fragments
- issues.ts - Optimized issue-specific GraphQL queries and mutations
- index.ts - Query exports and organization

### Naming Conventions

**Functions** - camelCase with descriptive names:

- `getApiToken()`, `createLinearService()`, `handleAsyncCommand()`
- Service methods: `getIssues()`, `searchIssues()`, `createIssue()`

**Interfaces** - PascalCase with descriptive prefixes:

- `LinearIssue`, `LinearProject` for data models
- `CreateIssueArgs`, `UpdateIssueArgs` for operation parameters

### Development Best Practices

**Type Safety** - Every function parameter and return type explicitly typed **Error Boundaries** - All async operations wrapped with error handling\
**GraphQL First** - New operations use GraphQL service for optimal performance **User Experience** - Smart defaults with explicit override options **Build Automation** - npm prepare script ensures consistent builds

### Build System Integration

**Automated Building** - package.json (line 13):

```bash
# prepare script runs automatically during install
npm install  # Triggers: npm run clean && npm run build
```

**TypeScript Configuration** - tsconfig.json optimizations:

- Target: ES2023 for modern Node.js features
- Output: dist/ directory with declaration files
- Remove comments and source maps for production
- Strict mode enabled for type safety

### Common Development Issues

**ES Module Imports** - Always use .js extensions in imports, even for .ts files **Authentication Testing** - Use token file method for local development **GraphQL vs SDK** - Prefer GraphQL service for new operations, use SDK for fallbacks\
**API Rate Limits** - Linear API has reasonable limits, but GraphQL batch operations help **Development vs Production** - Use tsx for development, compiled JS for production (significantly faster) **Missing dist/** - Run `npm install` or `npm run build` to create executable compiled output\
**Build creates executable** - npm run build automatically makes dist/main.js executable
