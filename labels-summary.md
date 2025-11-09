# Labels Research Summary

## Quick Answer

**Linear has TWO separate label types**:

1. **IssueLabel** - For issues
   - ✅ Currently supported by `linearis labels list`
   - Scope: Team-level OR Workspace-level

2. **ProjectLabel** - For projects
   - ❌ **NOT currently supported**
   - Scope: Workspace-level only

## Current Support Matrix

| Feature | IssueLabels | ProjectLabels |
|---------|-------------|---------------|
| **List all** | ✅ `labels list` | ❌ Not supported |
| **List team-specific** | ✅ `labels list --team X` | N/A (no team scope) |
| **List workspace-only** | ❌ No filter | ❌ Not supported |
| **Create** | ❌ Not supported | ❌ Not supported |
| **Update** | ❌ Not supported | ❌ Not supported |
| **Delete** | ❌ Not supported | ❌ Not supported |

## The Gap

### What's Missing for Your Kanban Use Case

**You asked**: "LLM to look at workspace issue labels or workspace project labels"

**Current state**:
- ✅ Can see workspace + team issue labels mixed together
- ❌ **Cannot see project labels at all**
- ❌ Cannot filter to workspace-only labels

**Impact**:
- LLM can't generate project kanban boards grouped by labels
- LLM can't understand project categorization
- LLM sees mix of workspace and team labels without clear distinction

## Recommended Enhancement

### Phase 1: Add ProjectLabel Support (Solves Your Use Case)

```bash
# See project labels
linearis labels list --type project

# See all labels (issues + projects)
linearis labels list --type all
```

**Output**:
```json
{
  "labels": [
    {
      "id": "abc",
      "name": "Bug",
      "type": "issue",      // ⬅️ NEW: distinguish types
      "scope": "workspace"
    },
    {
      "id": "def",
      "name": "Q1-2025",
      "type": "project",    // ⬅️ NEW: project labels!
      "scope": "workspace"
    }
  ]
}
```

### Phase 2: Add Scope Filtering (Nice to Have)

```bash
# Only workspace-level issue labels
linearis labels list --type issue --scope workspace

# Only team-specific issue labels
linearis labels list --type issue --scope team --team Backend
```

## Implementation Notes

**Good news**: Linear SDK already supports everything!

```typescript
// Already works (currently used):
await client.issueLabels()

// Ready to use (just need to wire up):
await client.projectLabels()
```

**Estimated effort**: ~50 lines of code, ~1-2 hours

## Files Created

1. **`labels-research.md`** - Detailed technical analysis
2. **`github-issue-labels-enhancement.md`** - GitHub issue ready to post
3. **`labels-summary.md`** - This quick reference

## Next Steps

1. Review `github-issue-labels-enhancement.md`
2. Post as GitHub issue if approved
3. Optionally implement Phase 1 yourself (simple addition!)

## Quick Example

### Current Behavior

```bash
$ linearis labels list
{
  "labels": [
    {"id": "1", "name": "Bug", "scope": "workspace"},
    {"id": "2", "name": "Backend Task", "scope": "team", "team": {"name": "Backend"}}
  ]
}
```

### With Enhancement

```bash
$ linearis labels list --type all
{
  "labels": [
    {"id": "1", "name": "Bug", "type": "issue", "scope": "workspace"},
    {"id": "2", "name": "Backend Task", "type": "issue", "scope": "team", "team": {"name": "Backend"}},
    {"id": "3", "name": "Q1-2025", "type": "project", "scope": "workspace"}
  ]
}
```

Now LLM can:
- See project labels ✅
- Distinguish issue vs project labels ✅
- Group projects by labels for kanban ✅
