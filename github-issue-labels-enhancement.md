# Enhance Labels Command - ProjectLabels, Scope Filtering, and CRUD Operations

## Summary

The `labels` command currently only supports **IssueLabels** (for categorizing issues) and is read-only. This limits LLM agents' ability to:
- See and use ProjectLabels for project categorization
- Filter labels by scope (workspace vs team)
- Programmatically manage label taxonomy

This issue requests three enhancements to ship together in a single PR:
1. Add ProjectLabel support
2. Add scope filtering
3. Add CRUD operations (create, update, delete)

## Background: Linear Label Types

Linear has two separate label systems:

| Label Type | Purpose | Scope Options | Current Support |
|------------|---------|---------------|-----------------|
| **IssueLabel** | Categorize issues | Team-level OR Workspace-level | ✅ Read-only |
| **ProjectLabel** | Categorize projects | Workspace-level only | ❌ Not supported |

Both types support hierarchical labels (groups with children) and have similar fields (id, name, color, description).

## Current State

**What works**:
- ✅ `labels list` - Lists all issue labels (workspace + team mixed)
- ✅ `labels list --team <team>` - Lists team-specific issue labels
- ✅ Hierarchical labels (groups with children)

**What's missing**:
- ❌ ProjectLabels not accessible
- ❌ No scope filtering (can't filter workspace-only or team-only)
- ❌ No label CRUD operations (create, update, delete)
- ❌ No label type distinction in output

## Requested Features

### Request 1: Add ProjectLabel Support

**Goal**: Enable LLM agents to see and use project labels for kanban boards and project categorization

**Add `--type` flag to `labels list`**:

```bash
# Show issue labels (current behavior, default)
linearis labels list --type issue

# Show project labels (NEW)
linearis labels list --type project

# Show both types together (NEW)
linearis labels list --type all
```

**Updated output format** (add `type` field):

```json
{
  "labels": [
    {
      "id": "abc-123",
      "name": "Bug",
      "color": "#FF0000",
      "type": "issue",
      "scope": "workspace"
    },
    {
      "id": "def-456",
      "name": "Q1-2025",
      "color": "#00FF00",
      "type": "project",
      "scope": "workspace"
    }
  ]
}
```

**Implementation**: Add `getProjectLabels()` method using `client.projectLabels()` SDK method

**Use case**: LLM can generate project kanban boards grouped by labels

### Request 2: Add Scope Filtering

**Goal**: Filter labels by scope (workspace vs team) for better label discovery and taxonomy understanding

**Add `--scope` flag to `labels list`**:

```bash
# Show only workspace-level labels (available to all teams)
linearis labels list --scope workspace

# Show only team-specific labels (requires --team flag)
linearis labels list --scope team --team Backend

# Show all labels (current behavior, default)
linearis labels list --scope all
```

**Use cases**:
- Understand workspace-wide label standards
- See team-specific label customizations
- Audit label taxonomy
- Filter out team labels when looking at workspace standards

### Request 3: Add Label CRUD Operations

**Goal**: Enable programmatic label management for automation and team setup

#### Create labels

```bash
# Create issue label (workspace-level)
linearis labels create "Bug" --type issue --color "#FF0000"

# Create issue label (team-level)
linearis labels create "Backend Task" --type issue --team Backend --color "#00FF00"

# Create project label (always workspace-level)
linearis labels create "Q1-2025" --type project --color "#0000FF"

# Create with description and parent group
linearis labels create "High" --type issue \
  --parent "Priority" \
  --color "#FF0000" \
  --description "High priority tasks"
```

#### Update labels

```bash
# Update label properties
linearis labels update "Bug" --type issue \
  --color "#CC0000" \
  --description "Bug fixes and issues"

# Update name
linearis labels update "Old Name" --type project \
  --name "New Name" \
  --color "#0066FF"
```

#### Delete labels

```bash
# Delete issue label
linearis labels delete "Old Label" --type issue

# Delete project label
linearis labels delete "Obsolete" --type project
```

**Implementation**: Use Linear SDK methods:
- `client.createIssueLabel()` / `client.createProjectLabel()`
- `client.updateIssueLabel()` / `client.updateProjectLabel()`
- `client.deleteIssueLabel()` / `client.deleteProjectLabel()`

## Combined Use Cases

### 1. LLM Project Kanban Board Generation

**Current limitation**: LLM can't see project labels

**With all enhancements**:

```bash
# 1. LLM sees project labels
linearis labels list --type project

# 2. LLM gets projects with labels
linearis projects list

# 3. LLM generates kanban board grouped by labels
linearis projects list | jq 'group_by(.labels[].name) |
  map({label: .[0].labels[0].name, projects: map(.name)})'
```

### 2. Automated Team Setup

**With CRUD + scope filtering**:

```bash
# LLM creates standard workspace labels
linearis labels create "Priority: Critical" --type issue --color "#FF0000"
linearis labels create "Priority: High" --type issue --color "#FF6B00"
linearis labels create "Priority: Medium" --type issue --color "#FFAA00"
linearis labels create "Priority: Low" --type issue --color "#00AA00"

# LLM creates team-specific labels
linearis labels create "Backend Review" --type issue --team Backend --color "#0066FF"

# LLM creates project labels for quarterly planning
linearis labels create "Q1-2025" --type project --color "#1E90FF"
linearis labels create "Q2-2025" --type project --color "#32CD32"
```

### 3. Label Taxonomy Audit

**With all enhancements**:

```bash
# See all labels across both types
linearis labels list --type all

# See only workspace standards
linearis labels list --type all --scope workspace

# Find team-specific customizations
linearis labels list --type issue --scope team --team Backend

# Clean up deprecated labels
linearis labels delete "Old Label" --type issue
```

### 4. Cross-Entity Label Analysis

**With type filtering**:

```bash
# Compare issue vs project label usage
linearis labels list --type all | jq 'group_by(.type)'

# Find naming conflicts between types
linearis labels list --type all | jq 'group_by(.name) |
  map(select(length > 1 and (map(.type) | unique | length > 1)))'
```

## Benefits

- **Complete label visibility**: Access to both IssueLabels and ProjectLabels
- **Better filtering**: Scope filtering for workspace vs team labels
- **Automation**: Programmatic label management for team setups and taxonomy
- **LLM Integration**: Agents can fully understand and manage label taxonomy
- **Project organization**: Enable label-based project kanban boards
- **Consistency**: Matches CRUD pattern of other commands (issues, projects)

## Technical Implementation

### Linear SDK Support

All operations are supported by the Linear SDK:

**IssueLabels** (partially used):
- `client.issueLabels()` ✅ Currently used
- `client.createIssueLabel(input)` ✅ Available
- `client.updateIssueLabel(id, input)` ✅ Available
- `client.deleteIssueLabel(id)` ✅ Available

**ProjectLabels** (ready to use):
- `client.projectLabels()` ✅ Available
- `client.createProjectLabel(input)` ✅ Available
- `client.updateProjectLabel(id, input)` ✅ Available
- `client.deleteProjectLabel(id)` ✅ Available

### Current Implementation

- **File**: `src/commands/labels.ts` + `src/utils/linear-service.ts:209-299`
- **Pattern**: Uses Linear SDK (`this.client.issueLabels()`)
- **Quality**: Properly handles hierarchical labels, follows existing patterns

### Estimated Changes

**Total effort**: ~280 LOC, single PR

1. **ProjectLabels**: ~50 LOC
   - Add `getProjectLabels()` method
   - Update `labels list` command to support `--type` flag
   - Add `type` field to output

2. **Scope filtering**: ~30 LOC
   - Add `--scope` flag logic
   - Filter labels based on team field (workspace vs team)

3. **CRUD operations**: ~200 LOC
   - Add `labels create` command
   - Add `labels update` command
   - Add `labels delete` command
   - Support both issue and project types

All changes follow existing SDK-first pattern and codebase conventions.

## Example Complete Output

### After all enhancements: `labels list --type all --scope all`

```json
{
  "labels": [
    {
      "id": "abc-123",
      "name": "Bug",
      "color": "#FF0000",
      "type": "issue",
      "scope": "workspace",
      "description": "Bug fixes and issues"
    },
    {
      "id": "def-456",
      "name": "Backend Task",
      "color": "#00FF00",
      "type": "issue",
      "scope": "team",
      "team": {
        "id": "team-1",
        "name": "Backend"
      }
    },
    {
      "id": "ghi-789",
      "name": "qa",
      "color": "#f7c8c1",
      "type": "issue",
      "scope": "team",
      "team": {
        "id": "team-1",
        "name": "Backend"
      },
      "group": {
        "id": "group-1",
        "name": "type"
      }
    },
    {
      "id": "jkl-012",
      "name": "Q1-2025",
      "color": "#0000FF",
      "type": "project",
      "scope": "workspace",
      "description": "First quarter 2025 initiatives"
    }
  ]
}
```

## References

- Linear GraphQL Schema: https://studio.apollographql.com/public/Linear-API/schema/reference
- Current implementation: `src/utils/linear-service.ts:209-299`
- IssueLabel documentation: https://linear.app/docs/labels
- Linear SDK: https://github.com/linear/linear/tree/master/packages/sdk
- Related: Project labels support request (separate issue)
