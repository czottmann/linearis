# Linear Labels Research - Current Support vs Gaps

## Executive Summary

Linear has **TWO distinct label systems**:
1. **IssueLabel** - For categorizing issues (supports team-scoped AND workspace-scoped)
2. **ProjectLabel** - For categorizing projects (workspace-scoped only)

**Current linearis support**: Only IssueLabels ❌ ProjectLabels not supported

## Current Implementation Analysis

### What `labels list` Currently Does

**File**: `src/commands/labels.ts` + `src/utils/linear-service.ts:209-299`

**Command**:
```bash
linearis labels list [--team <team>]
```

**What it returns**:
- ✅ **IssueLabels only** (via `this.client.issueLabels()`)
- ✅ Team-scoped labels (`scope: "team"`)
- ✅ Workspace-scoped labels (`scope: "workspace"`)
- ✅ Label hierarchies (parent/group)
- ❌ **ProjectLabels NOT included**

**Fields returned**:
```typescript
{
  id: string,
  name: string,
  color: string,
  scope: "team" | "workspace",
  team?: { id, name },
  group?: { id, name }
}
```

### How Current Implementation Works

**Without `--team` flag** (`src/utils/linear-service.ts:253-296`):
```typescript
const allLabels = await this.client.issueLabels({ first: 100 });

// Determines scope based on team field:
scope: team ? "team" : "workspace"
```

**With `--team` flag** (`src/utils/linear-service.ts:212-251`):
```typescript
const teamId = await this.resolveTeamId(teamFilter);
const teamLabels = await this.client.issueLabels({
  filter: { team: { id: { eq: teamId } } }
});
```

**Key implementation details**:
- Uses Linear SDK: `this.client.issueLabels()` ✅
- Filters group labels: `if (label.isGroup) continue` ✅
- Fetches parent/group info: `await label.parent` ✅
- Properly scopes: team vs workspace ✅

## Linear API Label Types

### IssueLabel Type

**Purpose**: Categorize issues

**Scope levels**:
- **Workspace-level**: `team` field is null (available to all teams)
- **Team-level**: `team` field has value (specific to one team)

**Key fields** (from `docs/Linear-API@current.graphql`):
```graphql
type IssueLabel {
  id: ID!
  name: String!
  color: String!
  description: String
  isGroup: Boolean!
  team: Team              # ⬅️ Nullable - null = workspace label
  parent: IssueLabel      # For hierarchical labels
  children: [IssueLabel]
  organization: Organization! @deprecated
  createdAt: DateTime!
  archivedAt: DateTime
  lastAppliedAt: DateTime
  issues(filter: IssueFilter): IssueConnection!
}
```

**Access via API**:
```typescript
// Workspace + team labels
client.issueLabels()

// Team-specific labels only
client.issueLabels({ filter: { team: { id: { eq: teamId } } } })
```

### ProjectLabel Type

**Purpose**: Categorize projects

**Scope levels**:
- **Workspace-level ONLY** (no team field)

**Key fields** (from `docs/Linear-API@current.graphql`):
```graphql
type ProjectLabel {
  id: ID!
  name: String!
  color: String!
  description: String
  isGroup: Boolean!
  parent: ProjectLabel      # For hierarchical labels
  children: [ProjectLabel]
  organization: Organization!  # ⬅️ No team field - workspace only
  createdAt: DateTime!
  archivedAt: DateTime
  lastAppliedAt: DateTime
  projects(filter: ProjectFilter): ProjectConnection!
}
```

**Access via API**:
```typescript
// All project labels (workspace-scoped)
client.projectLabels()
```

## Gap Analysis

### What's Missing

| Feature | IssueLabels | ProjectLabels | Status |
|---------|-------------|---------------|--------|
| **List all workspace labels** | ✅ Supported | ❌ **Missing** | Gap |
| **List team-scoped labels** | ✅ Supported | N/A (no team scope) | N/A |
| **Filter by type** | N/A | N/A | ❌ **Missing** |
| **Create labels** | ❌ Missing | ❌ **Missing** | Gap |
| **Update labels** | ❌ Missing | ❌ **Missing** | Gap |
| **Delete labels** | ❌ Missing | ❌ **Missing** | Gap |

### Current Limitations

1. **No ProjectLabel support**
   - Can't see project labels via CLI
   - Can't filter projects by labels programmatically
   - LLM can't understand project categorization

2. **Read-only for IssueLabels**
   - Can list but not create/update/delete
   - Can't programmatically manage label taxonomy

3. **No unified label view**
   - Can't see both issue and project labels together
   - Can't distinguish label types in output

4. **No label type filtering**
   - `labels list` returns ALL issue labels
   - No way to filter: "show me only workspace labels" or "show me only team labels"

## Requested Features

### 1. Add ProjectLabels Support

**New command**: `labels list-project-labels`

Or better: Add `--type` flag to existing command:
```bash
linearis labels list --type issue    # Current behavior (default)
linearis labels list --type project  # New: show project labels
linearis labels list --type all      # New: show both types
```

**Implementation**:
```typescript
async getProjectLabels(): Promise<{ labels: LinearProjectLabel[] }> {
  const labels = await this.client.projectLabels({ first: 100 });

  return {
    labels: labels.nodes.map(label => ({
      id: label.id,
      name: label.name,
      color: label.color,
      scope: "workspace",  // ProjectLabels are always workspace-scoped
      type: "project",     // Distinguish from issue labels
      description: label.description || undefined,
      isGroup: label.isGroup,
      parent: label.parent ? { id: label.parent.id, name: label.parent.name } : undefined,
    }))
  };
}
```

### 2. Add Scope Filtering for IssueLabels

**New flag**: `--scope workspace|team|all`

```bash
linearis labels list --scope workspace  # Only workspace-level issue labels
linearis labels list --scope team       # Only team-scoped issue labels (requires --team)
linearis labels list --scope all        # Current behavior (default)
```

### 3. Unified Label View

**New flag**: `--type all`

```bash
linearis labels list --type all
```

**Output**:
```json
{
  "labels": [
    {
      "id": "abc-123",
      "name": "Bug",
      "color": "#FF0000",
      "type": "issue",      // ⬅️ New field
      "scope": "workspace"
    },
    {
      "id": "def-456",
      "name": "Q1-2025",
      "color": "#00FF00",
      "type": "project",    // ⬅️ New field
      "scope": "workspace"
    }
  ]
}
```

### 4. Label CRUD Operations

**Create**:
```bash
linearis labels create "New Label" --type issue --color "#FF0000" [--team TEAM]
linearis labels create "Q2-2025" --type project --color "#00FF00"
```

**Update**:
```bash
linearis labels update "Bug" --type issue --color "#FF0000" --description "Bug fixes"
```

**Delete**:
```bash
linearis labels delete "Old Label" --type issue
```

## Use Cases Enabled

### 1. LLM Project Kanban Generation

**Current**: ❌ Can't group projects by labels (no project labels accessible)

**With ProjectLabels**:
```bash
# LLM can now see project labels
linearis labels list --type project

# LLM can group projects by labels
linearis projects list | jq 'group_by(.labels[].name)'
```

### 2. Label Taxonomy Management

**Current**: ❌ Can't create/update labels via CLI

**With CRUD**:
```bash
# LLM creates standard label set
linearis labels create "Priority: High" --type issue --team Backend
linearis labels create "Priority: Medium" --type issue --team Backend
linearis labels create "Priority: Low" --type issue --team Backend
```

### 3. Cross-Entity Label Analysis

**Current**: ❌ Can't see relationship between issue labels and project labels

**With unified view**:
```bash
# See all labels in workspace
linearis labels list --type all

# Understand full taxonomy
linearis labels list --type all | jq 'group_by(.type)'
```

### 4. Workspace vs Team Label Filtering

**Current**: ❌ Mix of workspace and team labels, can't filter

**With scope filtering**:
```bash
# See only workspace-wide standards
linearis labels list --scope workspace

# See team-specific customizations
linearis labels list --scope team --team Backend
```

## Implementation Recommendations

### Phase 1: Read-Only ProjectLabels (Minimal)

**Priority**: High
**Effort**: Low (~50 LOC)
**Value**: Enables LLM project kanban use case

1. Add `getProjectLabels()` method to `LinearService`
2. Add `--type project|issue|all` flag to `labels list`
3. Add `type` field to output schema

### Phase 2: Scope Filtering (Enhancement)

**Priority**: Medium
**Effort**: Low (~30 LOC)
**Value**: Better label discovery and filtering

1. Add `--scope workspace|team|all` flag
2. Update filter logic in `getLabels()`

### Phase 3: Label CRUD (Complete)

**Priority**: Medium
**Effort**: Medium (~200 LOC)
**Value**: Full label management automation

1. Add `labels create` command
2. Add `labels update` command
3. Add `labels delete` command
4. Support both issue and project label types

## Technical Notes

### Linear SDK Support

Both label types are supported by SDK:

```typescript
// IssueLabels
await client.issueLabels({ ... })
await client.issueLabel(id)
await client.createIssueLabel({ ... })
await client.updateIssueLabel(id, { ... })
await client.deleteIssueLabel(id)

// ProjectLabels
await client.projectLabels({ ... })
await client.projectLabel(id)
await client.createProjectLabel({ ... })
await client.updateProjectLabel(id, { ... })
await client.deleteProjectLabel(id)
```

All methods available - just need to wire up CLI commands! ✅

### GraphQL Complexity

Adding project labels to queries:
- Current: ~100-200 complexity
- With project labels: ~200-400 complexity
- Still well under 10,000 limit ✅

## References

- Linear GraphQL Schema: `docs/Linear-API@current.graphql`
- IssueLabel type: Line ~5000+
- ProjectLabel type: Line ~5300+
- Current implementation: `src/utils/linear-service.ts:209-299`
- Current commands: `src/commands/labels.ts`
