<!-- Generated: 2025-08-30T19:51:49+02:00 -->

# Deployment

The zco-linear-cli is deployed as a Node.js application that can be distributed
through multiple channels including npm packages, direct git clones, and
standalone executables. The deployment strategy emphasizes simplicity with
minimal build requirements and cross-platform compatibility.

Current deployment is primarily through direct repository cloning and local
installation, with the flexibility to create npm packages or standalone binaries
as needed. The application requires only Node.js runtime and pnpm for package
management.

## Package Types

### Development Installation

**Direct Repository Clone** - Primary deployment method:

```bash
git clone <repository>
cd zco-linear-cli
pnpm install
```

**Global CLI Access** - package.json (line 5) specifies main entry point:

```bash
npm link  # Creates global 'linear' command
# Uses main: "src/main.ts" for entry point resolution
```

### Package Distribution Options

**NPM Package** - package.json configured for npm publishing:

- Name: "zco-linear-cli" (line 2)
- Version: "1.0.0" (line 3)
- Author: "Carlo Zottmann <carlo@zottmann.dev>" (line 15)
- License: "MIT" (line 16)

**Standalone Executable** - Potential using pkg or similar tools:

```bash
# Future option: Create standalone binary
npx pkg src/main.ts --targets node22-linux-x64,node22-macos-x64,node22-win-x64
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
pnpm --version  # Verify pnpm available
```

### Container Deployment

**Docker Option** - Potential Dockerfile pattern:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY src/ ./src/
ENTRYPOINT ["pnpm", "start"]
```

## Reference

### Deployment Scripts and Commands

**Installation Commands**:

| Command        | Purpose              | File Reference             |
| -------------- | -------------------- | -------------------------- |
| `pnpm install` | Install dependencies | package.json dependencies  |
| `npm link`     | Global CLI access    | package.json main field    |
| `pnpm start`   | Execute CLI          | package.json scripts.start |

### Distribution Formats

**Current Format** - Source distribution:

- TypeScript source files in src/ directory
- No compilation step required (uses tsx)
- Direct execution via `pnpm start`

**Future Formats** - Additional options:

- NPM package for `npm install -g zco-linear-cli`
- Standalone executables for systems without Node.js
- Container images for cloud deployment

### Configuration Files for Deployment

**Runtime Configuration**:

- **package.json** - Dependencies, scripts, and package metadata
- **pnpm-lock.yaml** - Exact dependency versions for reproducible builds
- **src/main.ts** - Entry point with shebang for Unix execution

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

**Runtime Performance** - PERFORMANCE.md benchmarks:

- Cold start time: ~0.6-0.9 seconds including Node.js startup
- Warm execution: Sub-second for most operations
- Memory usage: Minimal Node.js footprint

**Deployment Size**:

- Source code: ~50KB TypeScript files
- Dependencies: ~10-20MB node_modules (production only)
- Full installation: ~25MB including dev dependencies

### Troubleshooting Deployment

**Common Issues**:

- Node.js version incompatibility: Verify >= 22.0.0 requirement
- pnpm not available: Install with `npm install -g pnpm`
- ES modules errors: Ensure package.json has `"type": "module"`
- Authentication failures: Verify Linear API token is valid and has required
  permissions
