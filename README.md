<!-- Generated: 2025-09-02T10:42:29+02:00 -->

# Linearis: An opinionated Linear CLI client

CLI tool for [Linear.app](https://linear.app) with JSON output, smart ID resolution, and optimized GraphQL queries. Designed for LLM agents and humans who prefer structured data.

## Why?

There was no Linear CLI client I was happy with. Also I want my LLM agents to work with Linear, but the official Linear MCP (while working fine) eats up ~13k tokens (!!) just by being connected. In comparison, `linearis usage` tells the LLM everything it needs to know and comes in well under 1000 tokens.

**This project scratches my own itches,** and satisfies my own usage patterns of working with Linear: I **do** work with tickets/issues and comments on the command line; I **do not** manage projects or workspaces etc. there. YMMV.

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
linearis issues update ABC-123 --status "In Review" --priority 2

# Add labels to existing issue
linearis issues update DEV-789 --labels "Frontend,UX" --label-by adding

# Set parent-child relationships (output includes parentIssue and subIssues fields)
linearis issues update SUB-001 --parent-ticket EPIC-100

# Clear all labels from issue
linearis issues update ABC-123 --clear-labels
```

### Comments

```bash
# Add comment to issue
linearis comments create ABC-123 --body "Fixed in PR #456"
```

### File Downloads

```bash
# Get issue details including embedded files
linearis issues read ABC-123
# Returns JSON with embeds array containing file URLs and expiration timestamps

# Download a file from Linear storage
linearis embeds download "https://uploads.linear.app/.../file.png?signature=..." --output ./screenshot.png

# Overwrite existing file
linearis embeds download "https://uploads.linear.app/.../file.png?signature=..." --output ./screenshot.png --overwrite
```

### Projects & Labels

```bash
# List all projects
linearis projects list

# List labels for specific team
linearis labels list --team Backend
```

### Teams & Users

```bash
# List all teams in the workspace
linearis teams list

# List all users
linearis users list

# List only active users
linearis users list --active
```

### Cycles

You can list and read cycles (sprints) for teams. The CLI exposes simple helpers, but the GraphQL API provides a few cycle-related fields you can use to identify relatives (active, next, previous).

```bash
# List cycles (optionally scope to a team)
linearis cycles list --team Backend --limit 10

# Show only the active cycle(s) for a team
linearis cycles list --team Backend --active

# Read a cycle by ID or by name (optionally scope name lookup with --team)
linearis cycles read "Sprint 2025-10" --team Backend
```

Ordering and getting "active +/- 1"

- The cycles returned by the API include fields `isActive`, `isNext`, `isPrevious` and a numerical `number` field. The CLI will prefer an active/next/previous candidate when resolving ambiguous cycle names.
- To get the active and the next cycle programmatically, do two calls locally:
  1. `linearis cycles list --team Backend --active --limit 1` to get the active cycle and its `number`.
  2. `linearis cycles list --team Backend --limit 10` and pick the cycle with `number = (active.number + 1)` or check `isNext` on the returned nodes.
- If multiple cycles match a name and none is marked active/next/previous, the CLI will return an error listing the candidates so you can use a precise ID or scope with `--team`.

#### Flag Combinations

The `cycles list` command supports several flag combinations:

**Valid combinations:**

- `cycles list` - All cycles across all teams
- `cycles list --team Backend` - All Backend cycles
- `cycles list --active` - Active cycles from all teams
- `cycles list --team Backend --active` - Backend's active cycle only
- `cycles list --team Backend --around-active 3` - Backend's active cycle ± 3 cycles

**Invalid combinations:**

- `cycles list --around-active 3` - ❌ Error: requires `--team`

**Note:** Using `--active --around-active` together works but `--active` is redundant since `--around-active` always includes the active cycle.

### Advanced Usage

```bash
# Show all available commands and options (LLM agents love this!)
linearis usage

# Combine with other tools (pipe JSON output)
linearis issues list -l 5 | jq '.[] | .identifier + ": " + .title'
```

## Installation

### npm (recommended)

```bash
npm install -g linearis
```

### From source

```bash
git clone https://github.com/czottmann/linearis.git
cd linearis
npm install
npm run build
npm link
```

### Development setup

```bash
git clone https://github.com/czottmann/linearis.git
cd linearis
npm install
npm start  # Development mode using tsx (no compilation needed)
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

… OR by storing it in `~/.linear_api_token` once, and then forgetting about it because the tool will check that file automatically:

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

## Example rule for your LLM agent

```markdown
We track our tickets and projects in Linear (https://linear.app), a project management tool. We use the `linearis` CLI tool for communicating with Linear. Use your Bash tool to call the `linearis` executable. Run `linearis usage` to see usage information.

The ticket numbers follow the format "ABC-<number>". Always reference tickets by their number.

If you create a ticket, and it's not clear which project to assign it to, prompt the user. When creating subtasks, use the project of the parent ticket by default.

When the the status of a task in the ticket description has changed (task → task done), update the description accordingly. When updating a ticket with a progress report that is more than just a checkbox change, add that report as a ticket comment.

The `issues read` command returns an `embeds` array containing files uploaded to Linear (screenshots, documents, etc.) with signed download URLs and expiration timestamps. Use `embeds download` to download these files when needed.
```

## Author / Maintainer

Carlo Zottmann, <carlo@zottmann.dev>, https://c.zottmann.dev, https://github.com/czottmann.

This project is neither affiliated with nor endorsed by Linear. I'm just a very happy customer.

### Sponsoring this project

I don't accept sponsoring in the "GitHub sponsorship" sense[^1] but [next to my own apps, I also sell "Tokens of Appreciation"](https://actions.work/store/?ref=github). Any support is appreciated! 😉

[^1]: Apparently, the German revenue service is still having some fits over "money for nothing??".

> [!TIP]
> I make Shortcuts-related macOS & iOS productivity apps like [Actions For Obsidian](https://actions.work/actions-for-obsidian), [Browser Actions](https://actions.work/browser-actions) (which adds Shortcuts support for several major browsers), and [BarCuts](https://actions.work/barcuts) (a surprisingly useful contextual Shortcuts launcher). Check them out!

## Contributors 🤙🏼

- [Ryan Rozich](https://github.com/ryanrozich)
- [Chad Walters](https://github.com/chadrwalters)
- [Louis Mandelstam](https://github.com/man8)

## Documentation

- **[docs/project-overview.md](docs/project-overview.md)** - Project purpose, technology stack, and platform support
- **[docs/architecture.md](docs/architecture.md)** - Component organization, data flow, and performance patterns
- **[docs/build-system.md](docs/build-system.md)** - TypeScript compilation, automated builds
- **[docs/testing.md](docs/testing.md)** - Testing approach, manual validation, and performance benchmarks
- **[docs/development.md](docs/development.md)** - Code patterns, TypeScript standards, and common workflows
- **[docs/deployment.md](docs/deployment.md)** - Git-based npm install, automated compilation, and production deployment
- **[docs/files.md](docs/files.md)** - Complete file catalog with descriptions and relationships

## Key Entry Points

- **dist/main.js** - Compiled CLI entry point for production use
- **src/main.ts** - TypeScript source with Commander.js setup (development)
- **package.json** - Project configuration with automated build scripts and npm distribution
- **tsconfig.json** - TypeScript compilation targeting ES2023 with dist/ output
