<!-- Generated: 2025-01-09T12:34:56+00:00 -->

# Files Catalog

Linearis project follows a clean, modular structure with TypeScript
source files organized by function. The codebase separates concerns into command
handlers, optimized GraphQL service layers, and type definitions, making it easy
to locate functionality and understand system relationships.

All source files use modern ES modules with TypeScript for type safety. The
project maintains clear boundaries between CLI interface logic, GraphQL
operations, SDK fallback operations, and data access patterns. Configuration and
documentation files provide comprehensive project context and development
guidance.

## Core Source Files

### Main Application Logic

**src/main.ts** - CLI entry point and program setup with Commander.js framework
**src/commands/issues.ts** - Complete issue management commands (list, search,
create, read, update) with enhanced label and parent relationship management
**src/commands/projects.ts** - Project operations commands (list, read) with
simplified interface **src/commands/comments.ts** - Comment operations (create)
with lightweight issue ID resolution

### Service Layer

**src/utils/graphql-service.ts** - GraphQL client wrapper with raw query
execution and batch operation support **src/utils/graphql-issues-service.ts**

- Optimized GraphQL operations for issues with single-query strategy and batch
  ID resolution **src/utils/linear-service.ts** - Legacy SDK-based Linear API
  integration with smart ID resolution and fallback operations
  **src/utils/auth.ts** - Multi-source authentication handling (API token flag,
  environment variable, token file) **src/utils/output.ts** - JSON response
  formatting and standardized error handling with async command wrapping

### Type System

**src/utils/linear-types.d.ts** - Complete TypeScript interfaces for Linear
entities (LinearIssue, LinearProject) and operation parameters (CreateIssueArgs,
UpdateIssueArgs, SearchIssuesArgs) **src/utils/uuid.ts** - UUID validation
utilities for smart ID resolution

### Query Definitions

**src/queries/common.ts** - Reusable GraphQL fragments for consistent data
fetching across operations **src/queries/issues.ts** - Optimized GraphQL queries
and mutations for issue operations (get, create, update, search)
**src/queries/index.ts** - Query exports and organization

## Configuration Files

### Package Management

**package.json** - Project configuration with dependencies (@linear/sdk,
commander, tsx), scripts, and Node.js >= 22.0.0 requirement **pnpm-lock.yaml** -
Dependency lock file ensuring reproducible builds with exact versions
**mise.toml** - Development environment configuration with Node.js 22 and Deno
2.2.8 tool versions

### Documentation and Specifications

**README.md** - User-facing documentation with installation instructions, usage
examples, and performance benchmarks **CLAUDE.md** - AI-specific project
instructions, architecture overview, and development guidelines for LLM agents
**PERFORMANCE.md** - Detailed performance optimization analysis with
before/after benchmarks and optimization techniques

## Platform Implementation

### Command Interface Layer

**src/main.ts (lines 3-25)** - Sets up Commander.js with global options and
subcommand registration

- Global `--api-token` option handling
- Default help action when no subcommand provided
- Modular command setup via imported functions

**src/commands/*.ts** - Command-specific implementations with consistent
patterns:

- Parameter validation and smart ID resolution
- Service layer integration via createLinearService
- Standardized error handling and JSON output

### GraphQL Service Layer

**src/utils/graphql-issues-service.ts** - Optimized GraphQL issue operations:

- Lines 32-46: Single-query issue listing (reduces N+1 queries to 1 query)
- Lines 52-100: Issue retrieval by ID with comprehensive data fetching
- Lines 109-245: Enhanced issue updates with batch resolution and label modes
- Lines 253-390: Optimized issue creation with batch ID resolution
- Lines 398-536: Advanced search with filtering and GraphQL optimization

**src/utils/graphql-service.ts** - GraphQL client wrapper:

- Lines 8-32: Raw GraphQL query execution with error handling
- Lines 37-44: Batch query operations for parallel execution

### Legacy API Integration Layer

**src/utils/linear-service.ts** - SDK-based Linear API service (fallback
operations):

- Lines 193-290: Smart issue ID resolution supporting both UUIDs and
  human-readable identifiers
- Lines 354-393: Project operations with relationship fetching
- Lines 398-473: Smart ID resolution methods for projects, labels, and teams

**docs/Linear-API@current.graphql** - Linear GraphQL API schema, downloaded from
https://studio.apollographql.com/public/Linear-API/variant/current/schema/sdl?selectedSchema=%23%40%21api%21%40%23

## Build System

### Execution Environment

**Development Execution** - TypeScript execution via tsx:

- tsx handles TypeScript compilation at runtime for development
- ES modules support via package.json "type": "module"
- All imports use .js extensions for ES module compatibility

**Production Build** - Compiled JavaScript execution:

- `npm run build` creates executable dist/main.js (chmod +x automatically
  applied)
- Significantly faster execution than tsx for production use
- Clean build process removes previous dist/ directory

**Development Scripts** - package.json scripts section:

- `pnpm start` executes tsx src/main.ts for development
- `npm run build` compiles to executable dist/main.js
- `npm run clean` removes compiled dist/ directory
- No test framework configured (pnpm test returns error)

### Dependencies Structure

**Production Dependencies** (package.json lines 18-22):

- @linear/sdk ^58.1.0 - Official Linear GraphQL API client (used for GraphQL
  client and fallback operations)
- commander ^14.0.0 - CLI framework for command structure

**Development Dependencies** (package.json lines 23-26):

- @types/node ^22.0.0 - Node.js type definitions
- tsx ^4.20.5 - TypeScript execution engine for development
- typescript ^5.0.0 - TypeScript compiler and language support

## Reference

### File Relationships and Dependencies

**Modern Command Flow**: src/main.ts → src/commands/*.ts →
src/utils/graphql-issues-service.ts → src/utils/graphql-service.ts → @linear/sdk
GraphQL client

**Legacy Command Flow**: src/main.ts → src/commands/*.ts →
src/utils/linear-service.ts → @linear/sdk

**Authentication Flow**: Command options → src/utils/auth.ts → service layer

**Response Flow**: GraphQL/Service results → src/utils/output.ts → JSON console
output

**Query Organization**: src/queries/issues.ts → src/queries/common.ts fragments
→ GraphQL execution

### Key Entry Points for Development

**Adding Commands** - Start with src/commands/ files, follow existing patterns\
**GraphQL Integration** - Add queries to src/queries/ and extend
src/utils/graphql-issues-service.ts\
**Legacy API Integration** - Extend src/utils/linear-service.ts methods for
fallback operations\
**Authentication** - Modify src/utils/auth.ts for new authentication methods\
**Type Definitions** - Update src/utils/linear-types.d.ts for new data
structures

### File Size and Complexity

Most files are focused and maintainable:

- src/main.ts: 25 lines - Minimal CLI setup
- src/utils/auth.ts: 39 lines - Simple authentication logic
- src/utils/output.ts: 34 lines - Utility functions only
- src/utils/graphql-service.ts: 62 lines - GraphQL client wrapper
- src/commands/issues.ts: 211 lines - Comprehensive but focused
- src/commands/comments.ts: 46 lines - Simple comment operations
- src/queries/issues.ts: 301 lines - GraphQL queries and mutations
- src/utils/graphql-issues-service.ts: 604 lines - Optimized GraphQL operations
- src/utils/linear-service.ts: 485 lines - Legacy SDK operations (could be
  reduced as GraphQL operations replace them)

### Naming Conventions

**Files**: Kebab-case for multi-word names (linear-service.ts,
graphql-issues-service.ts, linear-types.d.ts)\
**Directories**: Lowercase single words (commands, utils, queries)\
**Exports**: PascalCase classes (LinearService, GraphQLIssuesService), camelCase
functions (createLinearService, createGraphQLService)
