<!-- Generated: 2025-09-02T10:42:29+02:00 -->

# Linearis: An opinionated Linear CLI client

CLI tool for [Linear.app](https://linear.app) with JSON output, smart ID
resolution, and optimized GraphQL queries. Designed for LLM agents and humans
who prefer structured data.

## Command Examples

### Issues Management

```bash
# List recent issues
linearis issues list -l 10

# Search for bugs in specific team/project
linearis issues search "authentication" --team Platform --project "Auth Service"

# Create new issue with labels and assignment
linearis issues create "Fix login timeout" --team Backend --assignee user123 \
  --labels "Bug,Critical" --priority 1 --description "Users can't stay logged in"

# Read issue details (supports ABC-123 format)  
linearis issues read DEV-456

# Update issue status and priority
linearis issues update ABC-123 --state "In Review" --priority 2

# Add labels to existing issue
linearis issues update DEV-789 --labels "Frontend,UX" --label-by adding

# Set parent-child relationships
linearis issues update SUB-001 --parent-ticket EPIC-100

# Clear all labels from issue
linearis issues update ABC-123 --clear-labels
```

### Comments

```bash
# Add comment to issue
linearis comments create ABC-123 --body "Fixed in PR #456"
```

### Projects & Labels

```bash
# List all projects
linearis projects list

# List labels for specific team
linearis labels list --team Backend
```

### Advanced Usage

```bash
# Show all available commands and options
linearis usage

# Combine with other tools (pipe JSON output)
linearis issues list -l 5 | jq '.data[0].title'
```

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
