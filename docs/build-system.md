<!-- Generated: 2025-08-31T18:51:03+02:00 -->

# Build System

Linearis uses a TypeScript compilation-based build system optimized for both development productivity and production performance. The project features automatic builds during installation, and cross-platform clean scripts.

The build system leverages TypeScript's compiler for production builds while maintaining tsx for development convenience. All builds output to the dist/ directory with automated preparation during npm install, ensuring consistent deployment across platforms.

## Build Workflows

### Production Build Process

**TypeScript Compilation** - tsconfig.json (lines 7-8) outputs to dist/:

```bash
npm run build
# Executes: tsc (compiles src/ → dist/)
```

**Automated Build During Install** - package.json (line 13):

```bash
npm install  # Automatically runs prepare script
# Executes: npm run clean && npm run build
```

**Cross-Platform Clean** - package.json (line 12):

```bash
npm run clean
# Executes: node -e "require('fs').rmSync('dist', {recursive: true, force: true})"
```

### Development Execution

**Development Command** - package.json (line 14):

```bash
npm start <command>
# Executes: tsx src/main.ts <command>
```

**Production Execution** - package.json (lines 5, 8):

```bash
node dist/main.js <command>
```

### Package Management Workflows

**Installation with Build**:

```bash
npm install  # Install dependencies and automatically build
npm update   # Update to latest versions within constraints
```

**Dependency Management**

- **Runtime dependencies** - package.json (lines 24-27) - @linear/sdk, commander
- **Development dependencies** - package.json (lines 28-32) - @types/node, tsx, typescript

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

**Build Configuration** - tsconfig.json (lines 2-16):

- Target: ES2023 with modern Node.js features
- Module: ESNext with ES modules output
- Output: dist/ directory with declaration files
- Optimization: Remove comments, no source maps for production

**Module System** - package.json (line 6):

- ES modules enabled with "type": "module"
- Binary points to compiled dist/main.js (line 8)
- All imports use .js extensions for ES module compatibility

### Package Manager Lock

**Reproducible Builds** - package-lock.json

- Exact dependency versions locked for consistent installations

## Reference

### Build Targets and Commands

| Command           | File Reference       | Purpose                                   |
| ----------------- | -------------------- | ----------------------------------------- |
| `npm run build`   | package.json line 11 | Compile TypeScript to JavaScript (tsc)    |
| `npm run clean`   | package.json line 12 | Remove dist/ directory (cross-platform)   |
| `npm run prepare` | package.json line 13 | Auto-build during install (clean + build) |
| `npm start`       | package.json line 14 | Development execution with tsx            |
| `npm test`        | package.json line 15 | Run test suite                            |

### Configuration Files

- **package.json** - Main project configuration with dependencies, scripts, and binary setup
- **tsconfig.json** - TypeScript compilation configuration targeting ES2023
- **package-lock.json** - Dependency lock file for reproducible builds
- **mise.toml** - Development environment tool versions

### Troubleshooting Build Issues

**Build Failures** - TypeScript compilation errors:

```bash
# Clean and rebuild
npm run clean
npm run build
```

**Performance Comparison** - Execution timing:

- Compiled JavaScript: ~0.15s startup (production)
- tsx TypeScript: ~0.64s startup (development only)

**Import Resolution** - All imports in TypeScript files use .js extensions:

- src/main.ts imports use .js extensions for ES modules compatibility
- TypeScript compiler resolves .js → .ts during compilation

**Missing dist/ Directory**:

- Run `npm run prepare` to build after fresh clone
- dist/ directory auto-created during npm install

**Node.js Version Issues**

- Verify Node.js >= 22.0.0 with `node --version`
- Use mise or nvm to manage Node.js versions
