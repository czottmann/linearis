<!-- Generated: 2025-08-30T19:51:49+02:00 -->

# Linear CLI

High-performance CLI for Linear.app with JSON output, smart ID resolution, and optimized GraphQL queries. Designed for LLM agents and users who prefer structured data over web interfaces.

## Key Entry Points

- **src/main.ts** - CLI entry point with Commander.js setup and command routing
- **package.json** - Project configuration with pnpm package manager (Node.js >= 22.0.0)
- **src/utils/linear-service.ts** - Core Linear API service with smart ID resolution and performance optimizations

## Quick Build Commands

```bash
# Install and run
pnpm install
pnpm start issues list -l 10

# Authentication (choose one)
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
- **[docs/build-system.md](docs/build-system.md)** - Development workflows, TypeScript execution, and package management
- **[docs/testing.md](docs/testing.md)** - Testing approach, manual validation, and performance benchmarks
- **[docs/development.md](docs/development.md)** - Code patterns, TypeScript standards, and common workflows
- **[docs/deployment.md](docs/deployment.md)** - Installation methods, platform deployment, and authentication setup
- **[docs/files.md](docs/files.md)** - Complete file catalog with descriptions and relationships

## Performance

- Single issue read: ~0.9-1.1 seconds (90%+ improvement via parallel API calls)
- List operations: ~0.9 seconds (95%+ improvement via Promise.all optimization)  
- Smart ID resolution: ZCO-123 ↔ UUID conversion for user-friendly CLI experience

Built with TypeScript, Commander.js, and the official Linear SDK.