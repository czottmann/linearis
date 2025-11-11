#!/usr/bin/env fish

# Interactive release script for Linearis
# Uses gum for interactive prompts: https://github.com/charmbracelet/gum

# Exit on error
set -e

# Color definitions
set -l COLOR_ERROR "9"
set -l COLOR_SUCCESS "10"
set -l COLOR_INFO "12"
set -l COLOR_WARNING "11"

function error
    gum style --foreground $COLOR_ERROR "✗ Error: $argv"
    exit 1
end

function success
    gum style --foreground $COLOR_SUCCESS "✓ $argv"
end

function info
    gum style --foreground $COLOR_INFO "ℹ $argv"
end

function warning
    gum style --foreground $COLOR_WARNING "⚠ $argv"
end

# Check prerequisites
info "Checking prerequisites..."

# Check if gum is installed
if not command -v gum >/dev/null 2>&1
    error "gum is not installed. Install it with: brew install gum"
end

# Check if we're on main branch
set current_branch (git branch --show-current)
if test "$current_branch" != "main"
    error "Must be on main branch (currently on: $current_branch)"
end

# Check if working tree is clean
if not git diff-index --quiet HEAD --
    error "Working tree is not clean. Commit or stash your changes first."
end

success "Prerequisites check passed"
echo

# Parse current version from package.json
set current_version (node -p "require('./package.json').version")
info "Current version: $current_version"

# Calculate suggested next version
set version_parts (string split "." $current_version)
set year $version_parts[1]
set month $version_parts[2]
set number $version_parts[3]

set current_year (date +%Y)
set current_month (date +%-m)

# Suggest next version based on current date
if test "$year" = "$current_year" -a "$month" = "$current_month"
    # Same month - increment number
    set next_number (math $number + 1)
    set suggested_version "$year.$month.$next_number"
else
    # New month - reset to 1
    set suggested_version "$current_year.$current_month.1"
end

info "Suggested next version: $suggested_version"
echo

# Interactive version input
gum style --border double --padding "1 2" --border-foreground $COLOR_INFO "Enter the new version number"
set new_version (gum input --placeholder "$suggested_version" --value "$suggested_version" --prompt "Version: ")

if test -z "$new_version"
    error "Version cannot be empty"
end

# Validate version format (YYYY.MM.N)
if not string match -qr '^\d{4}\.\d{1,2}\.\d+$' $new_version
    error "Version must match YYYY.MM.N format (got: $new_version)"
end

success "Version: $new_version"
echo

# Get changelog entry
gum style --border double --padding "1 2" --border-foreground $COLOR_INFO "Write release notes (Markdown supported)\nPress ESC to cancel, Ctrl+D when done"
set changelog_entry (gum write --placeholder "- Feature: Added X\n- Fix: Resolved Y\n- Change: Updated Z")

if test -z "$changelog_entry"
    error "Changelog entry cannot be empty"
end

success "Changelog entry captured"
echo

# Show summary
gum style --border double --padding "1 2" --border-foreground $COLOR_WARNING "Release Summary"
echo "Version: $current_version → $new_version"
echo
echo "Changelog:"
echo "$changelog_entry"
echo

# Confirm to proceed
if not gum confirm "Update files and create commit?"
    warning "Release cancelled by user"
    exit 0
end

# Update package.json
info "Updating package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
pkg.version = '$new_version';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"
success "package.json updated"

# Update CHANGELOG.md
info "Updating CHANGELOG.md..."
set release_date (date +%Y-%m-%d)
set changelog_header "## [$new_version] - $release_date"

# Create temp file with new entry
set temp_file (mktemp)
echo "$changelog_header" >$temp_file
echo >>$temp_file
echo "$changelog_entry" >>$temp_file
echo >>$temp_file

# Prepend to existing changelog (after the title)
if test -f CHANGELOG.md
    # Insert after the first line (assuming first line is "# Changelog")
    sed '1 r /dev/stdin' CHANGELOG.md <$temp_file >CHANGELOG.md.tmp
    mv CHANGELOG.md.tmp CHANGELOG.md
else
    # Create new changelog
    echo "# Changelog" >CHANGELOG.md
    echo >>CHANGELOG.md
    cat $temp_file >>CHANGELOG.md
end

rm $temp_file
success "CHANGELOG.md updated"

# Show git diff
echo
info "Changes to be committed:"
git diff package.json CHANGELOG.md

echo
if not gum confirm "Create commit and tag?"
    warning "Rolling back changes..."
    git restore package.json CHANGELOG.md
    error "Release cancelled"
end

# Create commit
info "Creating commit..."
git add package.json CHANGELOG.md
git commit -m "[CHORE] Release $new_version"
success "Commit created"

# Create annotated tag
info "Creating tag v$new_version..."
git tag -a "v$new_version" -m "Release $new_version"
success "Tag created"

# Final confirmation to push
echo
gum style --border double --padding "1 2" --border-foreground $COLOR_WARNING "Ready to Push"
echo "The following will be pushed to origin:"
echo "  • Commit: $(git log -1 --oneline)"
echo "  • Tag: v$new_version"
echo
echo "This will trigger the GitHub Actions workflow to:"
echo "  1. Build the project"
echo "  2. Run tests"
echo "  3. Publish to npm"

if not gum confirm "Push commit and tag to trigger publish?"
    warning "Commit and tag created locally but not pushed"
    info "To push manually later, run:"
    echo "  git push origin main && git push origin v$new_version"
    exit 0
end

# Push to origin
info "Pushing to origin..."
git push origin main
git push origin "v$new_version"

echo
gum style --border double --padding "1 2" --border-foreground $COLOR_SUCCESS "✅ Release Complete!"
echo "Version: $new_version"
echo "Tag: v$new_version"
echo
echo "Next steps:"
echo "  1. Monitor GitHub Actions: https://github.com/czottmann/linearis/actions"
echo "  2. Verify npm package: https://www.npmjs.com/package/@czottmann/linearis"
echo "  3. Test installation: npm install -g @czottmann/linearis"
