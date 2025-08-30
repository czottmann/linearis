<!-- Generated: 2025-08-30T19:51:49+02:00 -->

# Files Catalog

The zco-linear-cli project follows a clean, modular structure with TypeScript
source files organized by function. The codebase separates concerns into command
handlers, service layer utilities, and type definitions, making it easy to
locate functionality and understand system relationships.

All source files use modern ES modules with TypeScript for type safety. The
project maintains clear boundaries between CLI interface logic, business
operations, and data access patterns. Configuration and documentation files
provide comprehensive project context and development guidance.

## Core Source Files

### Main Application Logic

**src/main.ts** - CLI entry point and program setup with Commander.js framework
**src/commands/issues.ts** - Complete issue management commands (list, search,
create, read, update) with parameter validation **src/commands/projects.ts** -
Project operations commands (list, read) with simplified interface

### Service Layer

**src/utils/linear-service.ts** - Core Linear API integration with smart ID
resolution, parallel query optimization, and comprehensive CRUD operations
**src/utils/auth.ts** - Multi-source authentication handling (API token flag,
environment variable, token file) **src/utils/output.ts** - JSON response
formatting and standardized error handling with async command wrapping

### Type System

**src/utils/linear-types.d.ts** - Complete TypeScript interfaces for Linear
entities (LinearIssue, LinearProject) and operation parameters (CreateIssueArgs,
UpdateIssueArgs, SearchIssuesArgs)

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

### API Integration Layer

**src/utils/linear-service.ts** - Linear GraphQL API service implementation:

- Lines 21-103: Optimized issue listing with single GraphQL query
- Lines 108-188: Advanced issue search with filtering and parallel data fetching
- Lines 193-290: Smart issue ID resolution supporting both UUIDs and
  human-readable identifiers
- Lines 295-349: Issue creation and update with parameter transformation
- Lines 354-393: Project operations with relationship fetching
- Lines 398-473: Smart ID resolution methods for projects, labels, and teams

## Build System

### Execution Environment

**TypeScript Execution** - No separate build step required:

- tsx handles TypeScript compilation at runtime
- ES modules support via package.json "type": "module"
- All imports use .js extensions for ES module compatibility

**Development Scripts** - package.json scripts section:

- `pnpm start` executes tsx src/main.ts for development
- No test framework configured (pnpm test returns error)

### Dependencies Structure

**Production Dependencies** (package.json lines 18-22):

- @linear/sdk ^58.1.0 - Official Linear GraphQL API client
- commander ^14.0.0 - CLI framework for command structure
- tsx ^4.20.5 - TypeScript execution engine

**Development Dependencies** (package.json lines 23-26):

- @types/node ^22.0.0 - Node.js type definitions
- typescript ^5.0.0 - TypeScript compiler and language support

## Reference

### File Relationships and Dependencies

**Command Flow**: src/main.ts → src/commands/*.ts → src/utils/linear-service.ts
→ @linear/sdk **Authentication Flow**: Command options → src/utils/auth.ts →
src/utils/linear-service.ts **Response Flow**: Service results →
src/utils/output.ts → JSON console output

### Key Entry Points for Development

**Adding Commands** - Start with src/commands/ files, follow existing patterns
**API Integration** - Extend src/utils/linear-service.ts methods
**Authentication** - Modify src/utils/auth.ts for new authentication methods
**Type Definitions** - Update src/utils/linear-types.d.ts for new data
structures

### File Size and Complexity

Most files are focused and maintainable:

- src/main.ts: 25 lines - Minimal CLI setup
- src/utils/auth.ts: 39 lines - Simple authentication logic
- src/utils/output.ts: 34 lines - Utility functions only
- src/commands/issues.ts: 211 lines - Comprehensive but focused
- src/utils/linear-service.ts: 485 lines - Main business logic (could be split
  if needed)

### Naming Conventions

**Files**: Kebab-case for multi-word names (linear-service.ts,
linear-types.d.ts) **Directories**: Lowercase single words (commands, utils)
**Exports**: PascalCase classes (LinearService), camelCase functions
(createLinearService)
