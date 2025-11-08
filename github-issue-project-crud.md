# Add Project CRUD Operations

## Summary

Request support for `projects read`, `projects create`, and `projects update` commands to match the functionality available for other resources (issues, cycles, project-milestones).

## Current State

The `projects` command currently only supports:
- `projects list` - Lists all projects with basic fields (id, name, description, state, progress, teams, lead, dates)
- **Missing**: Labels are not included in list output

## Requested Features

### 1. Add Labels to `projects list`

**Enhancement to existing command**: Include project labels in list output

Currently `projects list` returns basic fields but omits labels. Adding labels would enable:
- **Kanban board generation**: Group projects by labels for visualization
- **Filtering by label**: LLM agents can categorize and filter projects
- **Label-based workflows**: Automation based on project categorization

**Implementation**: Add `labels` field to `LinearProject` interface and fetch in `getProjects()` method using Linear SDK (same pattern as teams/lead at `src/utils/linear-service.ts:106-109`).

**Use case**: "Show me all projects with the 'Q1-2025' label" or "Group my projects by priority label for a kanban view"

### 2. `projects read <projectId|name>`

Get detailed information about a specific project, including:
- **Labels** - Project labels with full metadata (color, description, hierarchy)
- Members (beyond just lead)
- Project milestones (summary/count)
- Associated issues (count or recent)
- Project updates/status reports
- Health status (on track, at risk, off track)
- Additional metadata not shown in list view

**Use case**: View full project details without parsing entire project list

### 3. `projects create <name>`

Create a new project with options:
- `--description` - Project description
- `--lead <userId>` - Project lead
- `--teams <teamIds>` - Comma-separated team IDs
- `--target-date <date>` - Target completion date (ISO format)
- `--state <state>` - Project state (planned, started, paused, completed, canceled)

**Use case**: Programmatically create projects for automation/templates

### 4. `projects update <projectId|name>`

Update existing project properties:
- `--name <name>` - Rename project
- `--description <description>` - Update description
- `--lead <userId>` - Change project lead
- `--target-date <date>` - Update target date
- `--state <state>` - Change project state
- `--health <status>` - Set health status (on-track, at-risk, off-track)

**Use case**: Update project metadata via CLI/automation

## Benefits

- **Label-based organization**: Group and filter projects by labels (kanban boards, reports)
- **Consistency**: Matches pattern of issues, cycles, and project-milestones commands
- **Automation**: Enables project management workflows via CLI
- **LLM Integration**: Allows agents to create/update/categorize projects programmatically
- **Completeness**: Full CRUD support for projects

## Example Use Cases

**With labels in `projects list`**:
```bash
# LLM agent can generate kanban board grouped by labels
linearis projects list | jq 'group_by(.labels[].name)'

# Filter projects by specific label
linearis projects list | jq '.[] | select(.labels[].name == "Q1-2025")'
```

**With `projects create`**:
```bash
# Create project with labels
linearis projects create "New Initiative" \
  --labels "Q1-2025,High-Priority" \
  --team BRAVO \
  --target-date 2025-03-31
```

## Additional Context

According to Linear API documentation and GraphQL schema (`docs/Linear-API@current.graphql`):

**Project Labels (ProjectLabel type)**:
- Projects have both `labelIds: [String!]!` and `labels()` connection
- ProjectLabel fields: `id`, `name`, `color`, `description`, `isGroup`, `parent`, `children`
- Supports hierarchical label structure (groups with children)
- Can be fetched alongside other project data in list queries

**Additional fields available via API**:
- Members list
- Project updates/status reports
- Health indicators
- Milestone associations
- Comments, documents, and external links

A `read` command would provide access to this richer data for a single project without fetching all projects.

## References

- Linear API GraphQL schema: https://studio.apollographql.com/public/Linear-API/schema/reference
- Project fields: https://linear.app/docs/projects
