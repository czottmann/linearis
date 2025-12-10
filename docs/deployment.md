<!-- Generated: 2025-08-31T18:51:03+02:00 -->

# Deployment

Linearis deploys as a compiled Node.js application with automatic builds during installation. Distribution supports npm packages, git-based installation, and standalone executables with automated TypeScript compilation ensuring consistency across platforms.

The deployment strategy leverages npm's prepare script for automatic builds, compiled JavaScript for production performance, and cross-platform clean scripts for reliable distribution. All installations automatically compile TypeScript to optimized JavaScript in the dist/ directory.

## Package Types

### Git-Based Installation

**Direct Repository Install with Auto-Build** - Primary deployment method:

```bash
npm install git+https://github.com/czottmann/linearis.git
# Automatically runs prepare script: clean + build
# Creates dist/ with compiled JavaScript
```

**Development Clone** - For local development:

```bash
git clone <repository>
cd linearis
npm install  # Auto-builds via prepare script
```

**Global CLI Access** - package.json (lines 5, 8):

```bash
npm link  # Creates global 'linear' command
# Uses main: "dist/main.js" and bin: "dist/main.js"
```

### Package Distribution Options

**NPM Package** - package.json configured for npm publishing:

- Name: "linearis" (line 2)
- Version: "1.0.0" (line 3)
- Author: "Carlo Zottmann <carlo@zottmann.dev>" (line 15)
- License: "MIT" (line 16)

**Standalone Executable** - Using compiled JavaScript:

```bash
# Create standalone binary from compiled output
npx pkg dist/main.js --targets node22-linux-x64,node22-macos-x64,node22-win-x64
```

## Platform Deployment

### Cross-Platform Compatibility

**Node.js Runtime** - package.json (lines 11-13):

- Requires Node.js >= 22.0.0 on all platforms
- ES modules support ensures modern JavaScript compatibility

**File System Dependencies**:

- Authentication file: `$HOME/.linear_api_token` (src/utils/auth.ts line 30)
- Works on Windows (`%USERPROFILE%`), macOS/Linux (`$HOME`)

### Environment Setup

**Development Environment** - mise.toml configuration:

```bash
# Install development tools
mise install  # Installs Node.js 22 and Deno 2.2.8
```

**Production Environment**:

```bash
# Minimal production setup
node --version  # Verify >= 22.0.0
npm --version   # Verify npm available
```

### Container Deployment

**Docker Option** - Optimized Dockerfile with build:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY src/ ./src/
RUN npm install  # Auto-builds via prepare script
ENTRYPOINT ["node", "dist/main.js"]
```

## Reference

### Deployment Scripts and Commands

**Installation Commands**:

| Command             | Purpose                          | File Reference         |
| ------------------- | -------------------------------- | ---------------------- |
| `npm install`       | Install + auto-build via prepare | package.json scripts   |
| `npm run build`     | Manual TypeScript compilation    | package.json line 11   |
| `npm link`          | Global CLI access (compiled)     | package.json bin field |
| `node dist/main.js` | Direct production execution      | Compiled output        |

### Distribution Formats

**Current Format** - Compiled distribution:

- TypeScript source files in src/ directory
- Automated compilation to dist/ during install
- Production execution via `node dist/main.js`

**Distribution Methods**:

- Git install with auto-build: `npm install git+https://...`

### Configuration Files for Deployment

**Runtime Configuration**:

- **package.json** - Dependencies, scripts, binary configuration, and prepare script
- **tsconfig.json** - TypeScript compilation settings for production build
- **package-lock.json** - Exact dependency versions for reproducible builds
- **dist/main.js** - Compiled entry point for production execution

**Environment Configuration**:

- **mise.toml** - Development environment tools (not needed for production)
- **LINEAR_API_TOKEN** - Environment variable for authentication
- **~/.linear_api_token** - File-based authentication option

### Authentication in Deployment

**Production Authentication** - src/utils/auth.ts (lines 18-38):

1. **Container/CI**: Use `LINEAR_API_TOKEN` environment variable
2. **Server**: Place token in `/home/user/.linear_api_token` file
3. **Desktop**: Use `--api-token` flag for interactive use

### Performance Considerations

**Runtime Performance** - Compilation benchmarks:

- Compiled JavaScript startup: ~0.15s
- Development tsx startup: ~0.64s (development only)
- Production runtime: Sub-second for most operations
- Memory usage: Minimal Node.js footprint

**Deployment Size**:

- Source code: ~50KB TypeScript files
- Compiled output: ~40KB JavaScript files in dist/
- Dependencies: ~10-20MB node_modules (runtime only)
- Full installation: ~25MB including dev dependencies

### Troubleshooting Deployment

**Common Issues**:

- Missing dist/ directory: Run `npm install` to trigger prepare script
- Build failures: Check TypeScript compilation with `npm run build`
- Node.js version incompatibility: Verify >= 22.0.0 requirement
- Binary not found: Ensure package.json bin points to `dist/main.js`
- Authentication failures: Verify Linear API token is valid and has required permissions
- Performance issues: Use compiled `node dist/main.js` instead of `tsx src/main.ts`
