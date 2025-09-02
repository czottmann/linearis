<!-- Generated: 2025-08-31T18:51:03+02:00 -->

# Linearis: An opinionated Linear CLI client

CLI tool for [Linear.app](https://linear.app) with JSON output, smart ID
resolution, and optimized GraphQL queries. Designed for LLM agents and humans
who prefer structured data.

## Installation & Usage

```bash
# Git-based install with automatic build (recommended)
npm install -g git+https://github.com/czottmann/linearis.git
linearis

# Development setup
git clone <repository> && cd linearis
pnpm install  # Auto-builds via prepare script
pnpm start  # Development mode (tsx)

# Production execution
linearis
```

## Authentication

```bash
# Multiple authentication methods (choose one)
linearis --api-token <token> issues list
LINEAR_API_TOKEN=<token> linearis issues list  
echo "<token>" > ~/.linear_api_token && linearis issues list
```

## Core Commands

```bash
# Print out tools & usage
linearis

# Print out *all* usage (a.k.a. "teach your LLM")
linearis usage

# Issues: list, search, create, read, update
linearis issues list -l 25
linearis issues search "bug" --team ABC --project "Mobile App"
linearis issues create --title "Fix bug" --team ABC --labels "Bug,High Priority"
linearis issues read ABC-123
linearis issues update ABC-123 --state "In Progress" --priority 1

# Projects: list, read
linearis projects list
linearis projects read "Mobile App"
```

## Documentation

- **[docs/project-overview.md](docs/project-overview.md)** - Project purpose,
  technology stack, and platform support
- **[docs/architecture.md](docs/architecture.md)** - Component organization,
  data flow, and performance patterns
- **[docs/build-system.md](docs/build-system.md)** - TypeScript compilation,
  automated builds
- **[docs/testing.md](docs/testing.md)** - Testing approach, manual validation,
  and performance benchmarks
- **[docs/development.md](docs/development.md)** - Code patterns, TypeScript
  standards, and common workflows
- **[docs/deployment.md](docs/deployment.md)** - Git-based npm install,
  automated compilation, and production deployment
- **[docs/files.md](docs/files.md)** - Complete file catalog with descriptions
  and relationships

## Key Entry Points

- **dist/main.js** - Compiled CLI entry point for production use
- **src/main.ts** - TypeScript source with Commander.js setup (development)
- **package.json** - Project configuration with automated build scripts and npm
  distribution
- **tsconfig.json** - TypeScript compilation targeting ES2023 with dist/ output
