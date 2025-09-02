# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a CLI tool for Linear.app that outputs structured JSON data, designed
for LLM agents and users who prefer structured output. Written in Typescript,
built with Node.js using Commander.js for CLI structure and the Linear GraphQL
API.

## Key Commands

### Development Commands

- `node src/main.ts` - Run the CLI application
- `pnpm test` - Run tests (currently not implemented)

### Package Management

- Uses `pnpm` (version 10.14.0) as the package manager
- `pnpm install` - Install dependencies
- `pnpm update` - Update dependencies

## Architecture & Structure

### Core Components

- **src/main.ts** - Main entry point and CLI command structure using
  Commander.js
- **src/utils/linear-client.ts** - Complete Linear API service layer with smart
  ID resolution
- **src/utils/auth.ts** - Authentication handling for API tokens
- **src/utils/output.ts** - JSON output utilities and error handling
- **src/commands/issues.ts** - Issues command implementation with full SPEC
  compliance
- **src/commands/projects.ts** - Projects command implementation
- **package.json** - Node.js project configuration with pnpm package manager

### Authentication Flow

The CLI supports three authentication methods (in order of preference):

1. `--api-token` command flag
2. `LINEAR_API_TOKEN` environment variable
3. Plain text file at `$HOME/.linear_api_token`

### Dependencies

- **@linear/sdk** (^58.1.0) - Official Linear TypeScript SDK
- **commander** (^14.0.0) - CLI framework for command structure
- **tsx** (^4.20.5) - TypeScript execution for Node.js

### Technical Requirements

- Node.js >= 22.0.0
- Uses ES modules (implied by .ts and modern Node version)
- All CLI output should be JSON format (except usage examples)

### Development Notes

- All TypeScript files are fully implemented with proper typing
- LinearService provides smart ID resolution (ABC-123 → UUID, label names → IDs,
  etc.)
- Issue creation supports both `--project` and `--project-id` flags as specified
- Smart parameter conversion allows using human-friendly names instead of UUIDs
- No testing framework currently configured

### Smart ID Resolution Features

The CLI automatically handles conversions between user-friendly and internal
identifiers:

- **Issue IDs**: `ABC-123` ↔ internal UUID
- **Project names**: `"My Project"` → project UUID
- **Label names**: `"Bug", "Enhancement"` → label UUIDs
- **Team keys/names**: `"ABC"` or `"My Team"` → team UUID
