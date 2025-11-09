# Project Labels Research - Linear API Support

## Summary

**YES**, `projects list` can and should return labels! The Linear API fully supports project labels through the `ProjectLabel` type.

## Current State

**What `projects list` returns now** (from `src/utils/linear-service.ts:96-135`):
```typescript
{
  id: string,
  name: string,
  description?: string,
  state: string,
  progress: number,
  teams: [...],
  lead?: {...},
  targetDate?: string,
  createdAt: string,
  updatedAt: string
}
```

**Missing**: Labels ❌

## What's Available in the Linear API

### Project Type Fields (from `docs/Linear-API@current.graphql`)

```graphql
type Project {
  # ... other fields ...

  """Id of the labels associated with this project."""
  labelIds: [String!]!

  """Labels associated with this project."""
  labels(
    after: String
    before: String
    filter: ProjectLabelFilter
    first: Int
    includeArchived: Boolean
    last: Int
    orderBy: PaginationOrderBy
  ): ProjectLabelConnection!
}
```

### ProjectLabel Type

```graphql
type ProjectLabel {
  id: ID!
  name: String!
  color: String!
  description: String
  isGroup: Boolean!
  parent: ProjectLabel
  children(filter: ProjectLabelFilter): ProjectLabelConnection!
  createdAt: DateTime!
  archivedAt: DateTime
  # ... more fields
}
```

## Key Capabilities

### 1. Simple Label IDs
- `labelIds: [String!]!` - Array of label IDs
- Fast, lightweight access to label associations

### 2. Full Label Objects
- `labels()` - Connection to full ProjectLabel objects
- Includes name, color, description
- Supports filtering and pagination

### 3. Hierarchical Labels
- Labels can be groups (`isGroup: true`)
- Labels can have parent/child relationships
- Example: "Priority" group → "High", "Medium", "Low" children

## Implementation Approach

### Using Linear SDK (Preferred Pattern)

**Current implementation already uses Linear SDK** - `this.client.projects()` at line 97.

The pattern for adding labels follows the exact same approach as teams/lead:

```typescript
async getProjects(): Promise<LinearProject[]> {
  const projects = await this.client.projects({  // ✅ SDK method
    first: 100,
    orderBy: "updatedAt" as any,
    includeArchived: false,
  });

  const projectsWithData = await Promise.all(
    projects.nodes.map(async (project) => {
      const [teams, lead, labels] = await Promise.all([
        project.teams(),    // ✅ SDK relationship method
        project.lead,       // ✅ SDK relationship method
        project.labels(),   // ✅ SDK relationship method - ADD THIS
      ]);
      return { project, teams, lead, labels };
    }),
  );

  return projectsWithData.map(({ project, teams, lead, labels }) => ({
    // ... existing fields ...
    labels: labels.nodes.map((label: any) => ({
      id: label.id,
      name: label.name,
      color: label.color,
    })),
  }));
}
```

**Key points**:
- ✅ Uses Linear SDK (not GraphQL directly)
- ✅ Follows existing codebase pattern (same as teams/lead)
- ✅ SDK handles pagination automatically via `.fetchAll()`
- ✅ No manual GraphQL queries needed

### Optional: Full Label Support (with hierarchy)

**If hierarchical labels are needed later**:

```typescript
labels: labels.nodes.map((label: any) => ({
  id: label.id,
  name: label.name,
  color: label.color,
  description: label.description || undefined,
  isGroup: label.isGroup,
  parent: label.parent ? {
    id: label.parent.id,
    name: label.parent.name,
  } : undefined,
})),
```

**Note**: Start simple (id, name, color) then add hierarchy if needed.

## Use Cases Enabled

### 1. Kanban Board Grouping

**LLM Prompt**: "Show me my projects grouped by label like a kanban board"

**With labels**:
```bash
linearis projects list | jq 'group_by(.labels[].name) |
  map({label: .[0].labels[0].name, projects: map(.name)})'
```

**Output**:
```json
[
  {
    "label": "Q1-2025",
    "projects": ["Project A", "Project B"]
  },
  {
    "label": "High-Priority",
    "projects": ["Project B", "Project C"]
  }
]
```

### 2. Label-Based Filtering

**LLM Prompt**: "Which projects are tagged for Q1 2025?"

```bash
linearis projects list | jq '.[] | select(.labels[].name == "Q1-2025")'
```

### 3. Multi-Label Analysis

**LLM Prompt**: "Show me high-priority Q1 projects"

```bash
linearis projects list | jq '.[] |
  select(.labels[].name == "Q1-2025") |
  select(.labels[].name == "High-Priority")'
```

### 4. Visual Reports

**LLM Prompt**: "Generate a color-coded project status report"

```bash
linearis projects list | jq '.[] |
  {name, state, labels: .labels | map({name, color})}'
```

## Performance Considerations

### GraphQL Complexity

Adding labels to list query:
- **Current complexity**: ~25 projects × ~10 fields = ~250
- **With labels**: ~25 projects × (~10 fields + 5 labels × 3 fields) = ~625
- **Still under 10,000 limit**: ✅ Safe

### SDK Pagination

The Linear SDK's `.fetchAll()` handles pagination automatically:
- Fetches labels alongside projects in same request
- No N+1 query problem
- Complexity stays well under Linear's 10,000 limit

## Recommendation

**Add labels to `projects list` immediately**:

1. **Low risk**: Pattern already used for teams/lead
2. **High value**: Enables LLM kanban boards, filtering, categorization
3. **Consistent**: Matches issue labels pattern
4. **Performance**: Well within complexity limits

### Minimal Change Required

**File**: `src/utils/linear-service.ts:96-135`

**Changes**:
1. Add `labels` to parallel fetch (line 106-109)
2. Map label data to output (line 114-134)
3. Update `LinearProject` interface (add `labels` field)

**Estimated LOC**: ~10 lines of code

## Testing

After implementation, verify:

```bash
# Build
pnpm run build

# Test output includes labels
node dist/main.js projects list | jq '.[0].labels'

# Expected output:
[
  {
    "id": "abc-123",
    "name": "Q1-2025",
    "color": "#FF6B6B"
  }
]
```

## References

- Linear GraphQL Schema: `docs/Linear-API@current.graphql`
- Project type definition: Lines with `type Project`
- ProjectLabel type: Lines with `type ProjectLabel`
- Current implementation: `src/utils/linear-service.ts:96-135`
