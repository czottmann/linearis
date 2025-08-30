<!-- Generated: 2025-08-30T19:51:49+02:00 -->

# Development

The zco-linear-cli follows TypeScript-first development practices with strict
typing, modular architecture, and performance-oriented design patterns.
Development emphasizes code clarity, maintainability, and efficient API usage
patterns for optimal Linear integration.

The codebase uses modern ES modules, async/await patterns throughout, and
leverages TypeScript's type system for compile-time safety. All development
follows the principle of smart defaults with explicit user control when needed.

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

**Flexible Identifier Handling** - src/utils/linear-service.ts (lines 196-227):

```typescript
// Check if UUID or identifier format
if (issueId.length === 36 && issueId.includes("-")) {
  issue = await this.client.issue(issueId);
} else {
  // Parse team-number format like "ZCO-123"
  const parts = issueId.split("-");
  // ... resolve to internal UUID
}
```

### Performance Optimization Pattern

**Parallel Processing** - Used throughout service layer:

```typescript
// From src/utils/linear-service.ts lines 362-370
const projectsWithData = await Promise.all(
  projects.nodes.map(async (project) => {
    const [teams, lead] = await Promise.all([
      project.teams(),
      project.lead,
    ]);
    return { project, teams, lead };
  }),
);
```

## Workflows

### Adding New Commands

1. **Define Interfaces** - Add to src/utils/linear-types.d.ts
2. **Implement Service Methods** - Add to src/utils/linear-service.ts
3. **Create Command Handler** - Add to appropriate src/commands/ file
4. **Register Command** - Import and setup in src/main.ts

**Example Command Addition Pattern** - src/commands/issues.ts (lines 138-152):

```typescript
issues.command("read <issueId>")
  .description(
    "Get issue details (supports both UUID and identifier like ZCO-123)",
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

**Local Development** - package.json (line 8):

```bash
# Run with hot reloading via tsx
pnpm start issues list -l 5

# Direct execution for debugging
npx tsx src/main.ts --api-token <token> issues read ZCO-123
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

- linear-service.ts - Core business logic and API integration
- auth.ts - Authentication handling
- output.ts - Response formatting
- linear-types.d.ts - Type definitions

**Command Layer** - `src/commands/` directory:

- issues.ts - Issue-related commands
- projects.ts - Project-related commands
- Pattern: Each domain gets its own command file

### Naming Conventions

**Functions** - camelCase with descriptive names:

- `getApiToken()`, `createLinearService()`, `handleAsyncCommand()`
- Service methods: `getIssues()`, `searchIssues()`, `createIssue()`

**Interfaces** - PascalCase with descriptive prefixes:

- `LinearIssue`, `LinearProject` for data models
- `CreateIssueArgs`, `UpdateIssueArgs` for operation parameters

### Development Best Practices

**Type Safety** - Every function parameter and return type explicitly typed
**Error Boundaries** - All async operations wrapped with error handling
**Performance First** - All API calls optimized for parallel execution **User
Experience** - Smart defaults with explicit override options

### Common Development Issues

**ES Module Imports** - Always use .js extensions in imports, even for .ts files
**Authentication Testing** - Use token file method for local development **API
Rate Limits** - Linear API has reasonable limits, but batch operations help
**TypeScript Compilation** - Use tsx for development, avoid separate build step
