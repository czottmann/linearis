<!-- Generated: 2025-08-30T19:51:49+02:00 -->

# Build System

The zco-linear-cli uses a minimal build system focused on TypeScript execution
and package management. Built with pnpm as the package manager and tsx for
TypeScript execution, the project emphasizes simplicity and developer experience
over complex build pipelines.

The build system leverages Node.js 22's modern ES modules support and
TypeScript's strong typing without requiring a separate compilation step during
development. All dependencies are managed through pnpm with exact version
locking for reproducible builds.

## Build Workflows

### Development Execution

**Primary Development Command** - package.json (lines 7-8)

```bash
pnpm start <command>
# Executes: tsx src/main.ts <command>
```

**Direct TypeScript Execution**

```bash
npx tsx src/main.ts issues list -l 5
# Runs TypeScript directly without compilation
```

**Manual Node.js Execution** (after understanding the import structure)

```bash
node src/main.ts  # Note: requires proper .js imports due to ES modules
```

### Package Management Workflows

**Installation** - Using pnpm 10.14.0 (package.json line 17)

```bash
pnpm install  # Install all dependencies
pnpm update   # Update to latest versions within constraints
```

**Dependency Management**

- **Production dependencies** - package.json (lines 18-22) - @linear/sdk,
  commander, tsx
- **Development dependencies** - package.json (lines 23-26) - @types/node,
  typescript

### Development Environment Setup

**Environment Tool Configuration** - mise.toml (lines 1-3)

```bash
mise install    # Install Node.js 22 and Deno 2.2.8
mise use         # Activate configured tool versions
```

## Platform Setup

### Node.js Requirements

**Version Constraint** - package.json (lines 11-13)

- Node.js >= 22.0.0 required for ES modules and modern features
- TypeScript 5.0.0 for latest language features

### TypeScript Configuration

**Module System** - package.json (line 6)

- ES modules enabled with "type": "module"
- All imports use .js extensions for ES module compatibility (see src/main.ts
  lines 4-5)

### Package Manager Lock

**Reproducible Builds** - pnpm-lock.yaml

- Exact dependency versions locked for consistent installations
- pnpm 10.14.0 specified as required package manager

## Reference

### Build Targets and Commands

| Command        | File Reference      | Purpose                                 |
| -------------- | ------------------- | --------------------------------------- |
| `pnpm start`   | package.json line 8 | Execute CLI with TypeScript compilation |
| `pnpm test`    | package.json line 9 | Test command (not implemented)          |
| `pnpm install` | pnpm configuration  | Install dependencies from package.json  |

### Configuration Files

- **package.json** - Main project configuration with dependencies and scripts
- **pnpm-lock.yaml** - Dependency lock file for reproducible builds
- **mise.toml** - Development environment tool versions
- **tsconfig.json** - Not present; TypeScript uses defaults with ES modules

### Troubleshooting Build Issues

**Import Resolution** - All imports in TypeScript files use .js extensions:

- src/main.ts (lines 4-5) - Uses ./commands/issues.js and ./commands/projects.js
- This is required for ES modules compatibility

**Node.js Version Issues**

- Verify Node.js >= 22.0.0 with `node --version`
- Use mise or nvm to manage Node.js versions

**Package Manager Issues**

- Use pnpm 10.14.0 specifically (package.json line 17)
- Delete node_modules and pnpm-lock.yaml, then run `pnpm install` if issues
  persist
