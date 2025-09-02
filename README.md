<!-- Generated: 2025-09-02T10:42:29+02:00 -->

# Linearis: An opinionated Linear CLI client

CLI tool for [Linear.app](https://linear.app) with JSON output, smart ID
resolution, and optimized GraphQL queries. Designed for LLM agents and humans
who prefer structured data.

## Why?

There was no Linear CLI client I was happy with. Also I want my LLM agents to
work with Linear, but the official Linear MCP (while working fine) eats up ~13k
tokens (!!) just by being connected. In comparison, `linearis usage` tells the
LLM everything it needs to know and comes in well under 1000 tokens.

**This project scratches my own itches,** and satisfies my own usage patterns of
working with Linear: I **do** work with tickets/issues and comments on the
command line; I **do not** manage projects or workspaces etc. there. YMMV.

## Command Examples

### Issues Management

```bash
# Show available tools
linearis

# Show available sub-tools
linearis issues
linearis labels

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
# Show all available commands and options (LLM agents love this!)
linearis usage

# Combine with other tools (pipe JSON output)
linearis issues list -l 5 | jq '.[] | .identifier + ": " + .title'
```

## Installation

```bash
# Default installation
npm install -g --install-links czottmann/linearis

# Development setup
git clone <repository> && cd linearis
pnpm install  # Auto-builds via prepare script
pnpm start  # Development mode (tsx)
```

## Authentication

You can authenticate by passing in your API token via `--api-token` flag:

```bash
linearis --api-token <token> issues list
```

… OR by storing it in an environment variable `LINEAR_API_TOKEN`:

```bash
LINEAR_API_TOKEN=<token> linearis issues list
```

… OR by storing it in `~/.linear_api_token` once, and then forgetting about it
because the tool will check that file automatically:

```bash
# Save token once:
echo "<token>" > ~/.linear_api_token

# Day-to-day, just use the tool
linearis issues list
```

### Getting a Linear API key/token

1. Log in to your Linear account
1. Go to _Settings_ → _Security & Access_ → _Personal API keys_
1. Create a new API key

## Author

Carlo Zottmann, <carlo@zottmann.dev>, https://c.zottmann.dev,
https://github.com/czottmann.

This project is neither affiliated with nor endorsed by Linear. I'm just a very
happy customer.

> [!TIP]
> I make Shortcuts-related macOS & iOS productivity apps like
> [Actions For Obsidian](https://actions.work/actions-for-obsidian),
> [Browser Actions](https://actions.work/browser-actions) (which adds Shortcuts
> support for several major browsers), and
> [BarCuts](https://actions.work/barcuts) (a surprisingly useful contextual
> Shortcuts launcher). Check them out!

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
