# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2025.11.2] - 2025-11-11

### Added

- New `cycles` and `project-milestones` commands 🎉 – thanks, [Ryan](https://github.com/ryanrozich)! [PR#7](https://github.com/czottmann/linearis/pull/7)
- The `issues` commands now include parent and child issue relationships <!-- ZCO-1574, ZCO-1586 -->
  - `parentIssue` field with `{ id, identifier, title }` for parent issue (if exists)
  - `subIssues` array with `{ id, identifier, title }` for immediate child issues
  - Available in all issue commands: `read`, `list`, and `search`

### Fixed

- `issues` commands' embed parser now correctly ignores markdown URLs inside code blocks and inline code <!-- ZCO-1587 -->
  - Previously extracted URLs from code examples and documentation
  - Ensures only actual embedded files are detected, not code examples
- All date/time fields now output in ISO 8601 format (`2025-11-09T23:00:00.000Z`) instead of verbose JavaScript date strings <!-- ZCO-1577 -->
- Under-the-hood stability bug fixes.

## [2025.11.1] - 2025-11-06

### Added

- `issues` commands' results now include `embeds` array containing tickets' file embeds
  - Embed extraction from issue descriptions and comments
    - Parses markdown for Linear upload URLs (`![label](url)` and `[label](url)`)
    - Returns `embeds` array in `issues read` command output
    - Each embed includes `label`, `url`, and `expiresAt` (ISO 8601 timestamp)
- New `embeds` command group for downloading embedded files from Linear's cloud storage
  - `embeds download <url>` command to download files
    - `--output <path>` option for custom output location
    - `--overwrite` flag to replace existing files
    - Automatic directory creation for output paths

### Documentation

- Renamed CLAUDE.md to AGENTS.md, re-added CLAUDE.md as a symlink
- Updated AGENTS.md with file download features and signed URL documentation
- Added File Downloads section to README.md with usage examples
- Updated docs/files.md with new command and utility files
- Added embeds command flow and extraction flow diagrams to documentation

## [1.1.0] - 2025-10-21

### Fixes

- Updated CLI program name from "linear" to "linearis" for consistency with project name

### Documentation

- Added section "Example rule for your LLM agent of choice" to README

## [1.0.0] - 2025-10-21

### Added

- Initial release of Linearis CLI tool

[2025.11.1]: https://github.com/czottmann/linearis/compare/2025.11.1...2025.11.2
[2025.11.1]: https://github.com/czottmann/linearis/compare/1.1.0...2025.11.1
[1.1.0]: https://github.com/czottmann/linearis/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/czottmann/linearis/releases/tag/1.0.0
