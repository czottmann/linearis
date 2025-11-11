# npm Publishing Setup for Linearis

**Date:** 2025-11-11 **Status:** Design Complete

## Overview

Set up automated npm publishing for `linearis` using GitHub Actions, triggered by version tags on the main branch. Includes an interactive fish script using gum for streamlined local release workflow.

## Goals

- Enable global installation via `npm install -g linearis`
- Automate build and publish process through GitHub Actions
- Maintain clean git history (no compiled artifacts)
- Provide interactive release workflow for version management
- Support date-based versioning scheme: `YYYY.MM.<number>`

## Package Configuration

### dist/ Strategy

**Decision:** Remove dist/ from git control, build on-demand.

**Rationale:**

- Git tracks source code, not build artifacts
- GitHub Actions builds fresh for each release
- Reduces merge conflicts and repo bloat
- npm package still contains dist/ via `files` array

### package.json Changes

```json
{
  "name": "linearis",
  "repository": {
    "type": "git",
    "url": "https://github.com/czottmann/linearis.git"
  },
  "bugs": {
    "url": "https://github.com/czottmann/linearis/issues"
  },
  "homepage": "https://github.com/czottmann/linearis#readme",
  "scripts": {
    "prepublishOnly": "pnpm build && pnpm test"
  }
}
```

**Changes:**

- Rename package to scoped name `linearis`
- Add repository, bugs, homepage for npm page
- Add `prepublishOnly` script as safety net

**Already correct:**

- `files` array includes `dist/`
- Keywords optimize for discoverability
- Author and license fields present

### .gitignore Changes

Add to .gitignore:

```
# Build output (published to npm but not tracked in git)
dist/
```

## GitHub Actions Workflow

### Workflow File

**Location:** `.github/workflows/publish.yml`

**Trigger:** Tags matching `v*.*.*` on main branch only

### Workflow Steps

1. **Tag Validation**
   - Extract version from tag (e.g., `v2025.11.3` → `2025.11.3`)
   - Validate format matches date-based versioning

2. **Version Sync Check**
   - Verify tag version matches `package.json` version
   - Fail if mismatch (prevents accidental publishes)

3. **Checkout & Setup**
   - Checkout repository
   - Setup Node.js 22.x
   - Install pnpm 10.20.0

4. **Install Dependencies**
   - Run `pnpm install --frozen-lockfile`

5. **Build**
   - Run `pnpm build` to compile TypeScript to dist/

6. **Test**
   - Run `pnpm test` to ensure all tests pass
   - Fail publish if any tests fail

7. **Publish to npm**
   - Run `npm publish --access public`
   - Use `NPM_TOKEN` secret for authentication
   - `--access public` required for scoped packages

### Required Secrets

**NPM_TOKEN:** npm access token with publish permissions

**Setup:**

1. Generate token at npmjs.com (Account Settings → Access Tokens)
2. Add to GitHub repository secrets (Settings → Secrets and variables → Actions)

### Safety Features

- Only runs on main branch
- Validates version consistency
- Runs full test suite before publish
- Clear error messages for each validation step

## Release Workflow

### Manual Steps (Developer)

1. **Update version** - Edit `package.json` version field
2. **Update changelog** - Add release notes to `CHANGELOG.md`
3. **Commit changes** - Commit version bump and changelog
4. **Create tag** - `git tag -a v2025.11.3 -m "Release 2025.11.3"`
5. **Push tag** - `git push origin v2025.11.3`
6. **Verify** - Check GitHub Actions and npmjs.com

### Automated Steps (GitHub Actions)

1. Build fresh dist/ from source
2. Run test suite
3. Validate versions match
4. Publish to npm registry
5. Create GitHub release (optional future enhancement)

## Interactive Release Script

### Script Details

**Location:** `scripts/release.fish`

**Dependencies:**

- fish shell
- gum (https://github.com/charmbracelet/gum)

### Script Flow

1. **Prerequisites Validation**
   - Check on main branch
   - Verify working tree is clean
   - Confirm gum is installed
   - Exit with clear error if any check fails

2. **Version Calculation**
   - Parse current version from package.json
   - Calculate next version suggestion:
     - Same month: increment last number (2025.11.2 → 2025.11.3)
     - New month: reset to .1 (2025.11.3 → 2025.12.1)

3. **Interactive Version Input**
   - Display current version
   - Show suggested next version
   - Use `gum input` with default value
   - Validate format matches YYYY.MM.N

4. **Changelog Entry**
   - Use `gum write` for multi-line release notes
   - Support markdown formatting
   - ESC to cancel, Ctrl+D to finish

5. **File Updates**
   - Update package.json version field
   - Prepend changelog entry with date and version
   - Show summary of changes

6. **Preview Changes**
   - Display git diff of modified files
   - Use `gum confirm` "Proceed with commit and tag?"
   - Cancel option available

7. **Commit & Tag**
   - Commit with message: `[CHORE] Release YYYY.MM.N`
   - Create annotated tag: `git tag -a vYYYY.MM.N -m "Release YYYY.MM.N"`

8. **Push Confirmation**
   - Use `gum confirm` "Push tag to trigger publish?"
   - Shows what will happen (commit + tag push)

9. **Push to Origin**
   - Push commit to main
   - Push tag (triggers GitHub Actions)
   - Display success message with next steps

### Error Handling

- Exit gracefully at any step
- Clear error messages for validation failures
- Rollback option if user cancels after commit but before push

### Visual Polish

- Use gum styling for consistent UX
- Spinners for long operations
- Color coding for errors/success
- Formatted output sections

## Testing Strategy

### Pre-Publish Testing

1. **Local Package Test**
   ```bash
   npm pack
   npm install -g ./czottmann-linearis-2025.11.2.tgz
   linearis --help
   ```

2. **Dry-Run Publish**
   ```bash
   npm publish --dry-run
   ```
   - Verify files list includes dist/
   - Check package size is reasonable
   - Confirm no sensitive files included

3. **Test Release Script**
   - Create test branch
   - Run `scripts/release.fish`
   - Verify all prompts work correctly
   - Test cancellation at various stages

### Post-Publish Verification

1. **npm Registry**
   - Visit https://www.npmjs.com/package/linearis
   - Verify version, description, keywords
   - Check repository links work

2. **Installation Test**
   ```bash
   npm install -g linearis
   linearis --help
   linearis usage
   ```

3. **GitHub Actions**
   - Review workflow run logs
   - Confirm all steps passed
   - Verify timing is reasonable

## Documentation Updates

### README.md

Add installation section:

````markdown
## Installation

### npm (recommended)

```bash
npm install -g linearis
```
````

### From source

```bash
git clone https://github.com/czottmann/linearis.git
cd linearis
pnpm install
pnpm build
npm link
```

````
### Release Process Documentation

Add to CONTRIBUTING.md or README:

```markdown
## Releasing

Use the interactive release script:

```bash
./scripts/release.fish
````

The script will:

1. Suggest the next version number
2. Prompt for changelog entry
3. Update package.json and CHANGELOG.md
4. Create commit and tag
5. Push to trigger automated npm publish

### Manual release process

1. Update version in `package.json`
2. Add entry to `CHANGELOG.md`
3. Commit: `git commit -m "[CHORE] Release YYYY.MM.N"`
4. Tag: `git tag -a vYYYY.MM.N -m "Release YYYY.MM.N"`
5. Push: `git push origin main && git push origin vYYYY.MM.N`

```
## Implementation Checklist

### Initial Setup

- [ ] Add `dist/` to .gitignore
- [ ] Remove dist/ from git: `git rm -r --cached dist/`
- [ ] Update package.json (name, repository, bugs, homepage, prepublishOnly)
- [ ] Create `.github/workflows/publish.yml`
- [ ] Generate npm access token
- [ ] Add `NPM_TOKEN` to GitHub repository secrets
- [ ] Create `scripts/release.fish`
- [ ] Update README.md with installation instructions
- [ ] Document release process

### Pre-First-Publish Testing

- [ ] Run `npm pack` and test local installation
- [ ] Run `npm publish --dry-run`
- [ ] Test release script on test branch
- [ ] Verify GitHub Actions workflow syntax

### First Publish

- [ ] Run release script for real
- [ ] Monitor GitHub Actions workflow
- [ ] Verify package on npmjs.com
- [ ] Test global installation
- [ ] Verify binary works correctly

### Post-Publish

- [ ] Update CHANGELOG.md with publish date
- [ ] Create GitHub release (optional)
- [ ] Announce to users (optional)

## Version Scheme Reference

**Format:** `YYYY.MM.<number>`

**Rules:**
- Year and month are calendar-based
- Number starts at 1 each month
- Number increments for each release in the month
- Number resets to 1 on new month

**Examples:**
- `2025.11.1` - First release in November 2025
- `2025.11.2` - Second release in November 2025
- `2025.12.1` - First release in December 2025

**Git tags:** Prefix with `v` (e.g., `v2025.11.1`)

## Future Enhancements

Potential improvements for later:

- Automated GitHub release creation with changelog
- npm provenance statements (SLSA attestation)
- Automated version bump detection from commits
- Pre-release/beta publishing workflow
- Automated changelog generation from commits
- Package size monitoring and alerts
```
