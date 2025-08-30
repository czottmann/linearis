<!-- Generated: 2025-08-30T19:51:49+02:00 -->

# Architecture

The zco-linear-cli follows a modular, service-oriented architecture with clear
separation of concerns. The application uses a command-based structure with
Commander.js, a dedicated service layer for Linear API integration, and utility
modules for cross-cutting concerns like authentication and output formatting.

The architecture emphasizes performance through parallel API calls, smart ID
resolution for user convenience, and consistent JSON output formatting. All
components are fully typed with TypeScript interfaces, ensuring type safety
throughout the application.

## Component Map

### Command Layer - CLI Interface

- **src/main.ts** - Main program setup with Commander.js, command routing, and
  global options
- **src/commands/issues.ts** - Issue management commands (list, search, create,
  read, update)
- **src/commands/projects.ts** - Project operations commands (list, read)

### Service Layer - Business Logic

- **src/utils/linear-service.ts** - Complete Linear API service with smart ID
  resolution and parallel query optimization
- **src/utils/auth.ts** - Authentication handling with multiple token source
  support
- **src/utils/output.ts** - JSON output formatting and error handling utilities

### Type System - Data Contracts

- **src/utils/linear-types.d.ts** - TypeScript interfaces for Linear entities
  (LinearIssue, LinearProject, etc.)

## Key Files

### Core Architecture Components

**Main Entry Point**

- src/main.ts (lines 1-25) - Sets up Commander.js program with global options
  and subcommand registration

**Service Layer**

- src/utils/linear-service.ts (lines 11-484) - LinearService class with
  optimized API methods
- src/utils/auth.ts (lines 18-38) - getApiToken function with fallback
  authentication sources

**Command Handlers**

- src/commands/issues.ts (lines 10-210) - setupIssuesCommands with all issue
  operations
- src/commands/projects.ts (lines 9-30) - setupProjectsCommands with project
  operations

## Data Flow

### Command Execution Flow with File References

1. **Command Parsing** - src/main.ts (lines 23-24) parses CLI arguments via
   Commander.js
2. **Authentication** - src/utils/auth.ts (lines 18-38) resolves API token from
   multiple sources
3. **Service Creation** - src/utils/linear-service.ts (lines 479-484) creates
   authenticated LinearService
4. **API Operations** - Service methods execute optimized GraphQL queries with
   parallel fetching
5. **Response Formatting** - src/utils/output.ts (lines 5-7) outputs structured
   JSON responses

### Smart ID Resolution Process

Linear API uses UUIDs internally, but users prefer human-readable identifiers:

**Issue Resolution** (src/utils/linear-service.ts lines 193-290)

- Input: "ZCO-123" → Parse team key and issue number → Query by team.key +
  issue.number → Return UUID

**Project Resolution** (lines 398-415)

- Input: "Mobile App" → Query projects by name → Return project UUID

**Team Resolution** (lines 449-473)

- Input: "ZCO" → Try team key first, then team name → Return team UUID

### Performance Optimization Pattern

**Parallel Data Fetching** (src/utils/linear-service.ts lines 128-137)

```typescript
const [state, team, assignee, project, labels] = await Promise.all([
  issue.state,
  issue.team,
  issue.assignee,
  issue.project,
  issue.labels(),
]);
```

This eliminates N+1 query problems by fetching related data concurrently instead
of sequentially.
