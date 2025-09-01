<!-- Generated: 2025-01-09T12:34:56+00:00 -->

# Project Overview

The zco-linear-cli is a high-performance Command Line Interface (CLI) tool for
Linear.app that outputs structured JSON data. It's specifically designed for LLM
agents and users who prefer structured output over web interfaces. Built with
TypeScript and Node.js, the tool provides complete Linear API coverage with
smart ID resolution and optimized performance.

The CLI eliminates common performance bottlenecks found in API integrations,
achieving 90%+ speed improvements over parallel direct Linear SDK calls through
optimized GraphQL batch operations and single-query strategies. All commands
return JSON-formatted responses, making it ideal for automation, scripting, and
integration with other tools.

The tool supports comprehensive issue management (create, read, update, list,
search), project operations, comment handling, and enhanced label management
with intelligent conversion between user-friendly identifiers (like ZCO-123) and
internal UUIDs.

## Key Files

### Main Entry Points

- **src/main.ts** - CLI entry point with Commander.js setup and command routing
- **package.json** - Project configuration with pnpm package manager and Node.js
  > =22.0.0 requirement

### Core Configuration Files

- **CLAUDE.md** - AI-specific project instructions and development guidelines
- **README.md** - User-facing documentation with usage examples and setup
  instructions

## Technology Stack

### Core Technologies with File Examples

- **TypeScript** - Full type safety implementation (all .ts files in src/)
- **Node.js >= 22.0.0** - Modern runtime with ES modules support (package.json
  engines field)
- **Commander.js v14.0.0** - CLI framework used in src/main.ts for command
  structure
- **Linear SDK v58.1.0** - GraphQL API integration with optimized service layer
  in src/utils/graphql-service.ts and src/utils/linear-service.ts
- **tsx v4.20.5** - TypeScript execution engine for development (package.json
  scripts.start)

### Package Management

- **pnpm 10.14.0** - Package manager specified in package.json packageManager
  field
- **pnpm-lock.yaml** - Lock file ensuring reproducible builds

## Platform Support

### Development Environment Requirements

- **Node.js >= 22.0.0** - Required runtime version specified in package.json
  engines
- **mise.toml** - Development environment tool configuration with Node.js 22 and
  Deno 2.2.8
- **TypeScript 5.0.0** - Type system and compilation support (devDependencies)

### Operating System Support

- **Cross-platform compatibility** - Node.js application runs on Windows, macOS,
  and Linux
- **Authentication file support** - `$HOME/.linear_api_token` works across all
  platforms

### Build and Execution

- **Direct execution** - `pnpm start <command>` for development (package.json
  scripts)
- **Production build** - `npm run build` creates executable dist/main.js with
  optimized performance
- **TypeScript compilation** - `npx tsx src/main.ts <command>` for manual
  execution
- **ES modules** - Modern module system enabled via package.json type: "module"
