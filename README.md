<!-- Generated: 2025-08-31T18:51:03+02:00 -->

# Linear CLI

High-performance CLI for Linear.app with JSON output, smart ID resolution, and optimized GraphQL queries. Features 4.2x faster execution with compiled TypeScript, automated builds, and git-based distribution. Designed for LLM agents and users who prefer structured data.

## Key Entry Points

- **dist/main.js** - Compiled CLI entry point for production use (4.2x faster startup)
- **src/main.ts** - TypeScript source with Commander.js setup (development)
- **package.json** - Project configuration with automated build scripts and npm distribution
- **tsconfig.json** - TypeScript compilation targeting ES2023 with dist/ output

## Installation & Usage

```bash
# Git-based install with automatic build (recommended)
npm install git+https://github.com/user/zco-linear-cli.git
linear issues list -l 10

# Development setup
git clone <repository> && cd zco-linear-cli
npm install  # Auto-builds via prepare script
pnpm start issues list -l 10  # Development mode (tsx)

# Production execution (4.2x faster)
node dist/main.js issues list -l 10
```

## Authentication

```bash
# Multiple authentication methods (choose one)
linear --api-token <token> issues list
LINEAR_API_TOKEN=<token> linear issues list  
echo "<token>" > ~/.linear_api_token && linear issues list
```

## Core Commands

```bash
# Issues: list, search, create, read, update
linear issues list -l 25
linear issues search "bug" --team ZCO --project "Mobile App"
linear issues create --title "Fix bug" --team ZCO --labels "Bug,High Priority"
linear issues read ZCO-123
linear issues update ZCO-123 --state "In Progress" --priority 1

# Projects: list, read
linear projects list
linear projects read "Mobile App"
```

## Documentation

- **[docs/project-overview.md](docs/project-overview.md)** - Project purpose, technology stack, and platform support
- **[docs/architecture.md](docs/architecture.md)** - Component organization, data flow, and performance patterns
- **[docs/build-system.md](docs/build-system.md)** - TypeScript compilation, automated builds, and 4.2x performance improvements
- **[docs/testing.md](docs/testing.md)** - Testing approach, manual validation, and performance benchmarks
- **[docs/development.md](docs/development.md)** - Code patterns, TypeScript standards, and common workflows
- **[docs/deployment.md](docs/deployment.md)** - Git-based npm install, automated compilation, and production deployment
- **[docs/files.md](docs/files.md)** - Complete file catalog with descriptions and relationships
