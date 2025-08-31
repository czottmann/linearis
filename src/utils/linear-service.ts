import { LinearClient } from "@linear/sdk";
import { CommandOptions, getApiToken } from "./auth.js";
import {
  CreateIssueArgs,
  LinearIssue,
  LinearLabel,
  LinearProject,
  SearchIssuesArgs,
  UpdateIssueArgs,
} from "./linear-types.js";
import { isUuid } from "./uuid.js";

/**
 * Generic ID resolver that handles UUID validation and passthrough
 */
function resolveId(input: string): string {
  if (isUuid(input)) {
    return input;
  }
  // Return as-is for non-UUID inputs that need further resolution
  return input;
}

/**
 * Build common GraphQL filter for name/key equality searches
 */
function buildEqualityFilter(field: string, value: string): any {
  return {
    [field]: { eq: value },
  };
}

/**
 * Execute a Linear client query and handle "not found" errors consistently
 */
async function executeLinearQuery<T>(
  queryFn: () => Promise<{ nodes: T[] }>,
  entityName: string,
  identifier: string,
): Promise<T> {
  const result = await queryFn();
  if (result.nodes.length === 0) {
    throw new Error(`${entityName} "${identifier}" not found`);
  }
  return result.nodes[0];
}

/**
 * Transform raw Linear API issue data to standardized LinearIssue format
 */
function transformIssueData(
  issue: any,
  includeComments: boolean = false,
): LinearIssue {
  const transformed: LinearIssue = {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description || undefined,
    state: {
      id: issue.state.id,
      name: issue.state.name,
    },
    assignee: issue.assignee
      ? {
        id: issue.assignee.id,
        name: issue.assignee.name,
      }
      : undefined,
    team: {
      id: issue.team.id,
      key: issue.team.key,
      name: issue.team.name,
    },
    project: issue.project
      ? {
        id: issue.project.id,
        name: issue.project.name,
      }
      : undefined,
    priority: issue.priority,
    estimate: issue.estimate || undefined,
    labels: (issue.labels.nodes || issue.labels || []).map((label: any) => ({
      id: label.id,
      name: label.name,
    })),
    createdAt: issue.createdAt instanceof Date
      ? issue.createdAt.toISOString()
      : (issue.createdAt
        ? new Date(issue.createdAt).toISOString()
        : new Date().toISOString()),
    updatedAt: issue.updatedAt instanceof Date
      ? issue.updatedAt.toISOString()
      : (issue.updatedAt
        ? new Date(issue.updatedAt).toISOString()
        : new Date().toISOString()),
  };

  // Add comments if requested and available
  if (includeComments && issue.comments) {
    transformed.comments = issue.comments.map((comment: any) => ({
      id: comment.id,
      body: comment.body,
      user: {
        id: comment.user.id,
        name: comment.user.name,
      },
      createdAt: comment.createdAt instanceof Date
        ? comment.createdAt.toISOString()
        : (comment.createdAt
          ? new Date(comment.createdAt).toISOString()
          : new Date().toISOString()),
      updatedAt: comment.updatedAt instanceof Date
        ? comment.updatedAt.toISOString()
        : (comment.updatedAt
          ? new Date(comment.updatedAt).toISOString()
          : new Date().toISOString()),
    }));
  }

  return transformed;
}

export class LinearService {
  private client: LinearClient;

  constructor(apiToken: string) {
    this.client = new LinearClient({ apiKey: apiToken });
  }

  /**
   * Get issues with optional limit
   */
  async getIssues(limit: number = 25): Promise<LinearIssue[]> {
    const issues = await this.client.issues({
      first: limit,
      orderBy: "updatedAt" as any,
      includeArchived: false,
    });

    // Fetch relationships in parallel for all issues
    const issuePromises = issues.nodes.map(
      async (issue): Promise<LinearIssue | null> => {
        const [state, assignee, team, project, labels] = await Promise.all([
          issue.state,
          issue.assignee,
          issue.team,
          issue.project,
          issue.labels(),
        ]);

        // Skip issues without required data
        if (!state || !team) {
          return null;
        }

        return {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          estimate: issue.estimate,
          createdAt: issue.createdAt.toISOString(),
          updatedAt: issue.updatedAt.toISOString(),
          state: {
            id: state.id,
            name: state.name,
          },
          assignee: assignee
            ? {
              id: assignee.id,
              name: assignee.name,
            }
            : undefined,
          team: {
            id: team.id,
            key: team.key,
            name: team.name,
          },
          project: project
            ? {
              id: project.id,
              name: project.name,
            }
            : undefined,
          labels: labels.nodes.map((label) => ({
            id: label.id,
            name: label.name,
          })),
        } as LinearIssue;
      },
    );

    const results = await Promise.all(issuePromises);
    return results.filter((issue): issue is LinearIssue => issue !== null);
  }

  /**
   * Search issues with filters
   */
  async searchIssues(args: SearchIssuesArgs): Promise<LinearIssue[]> {
    const filter: any = {};

    if (args.teamId) filter.team = { id: { eq: args.teamId } };
    if (args.assigneeId) filter.assignee = { id: { eq: args.assigneeId } };
    if (args.projectId) filter.project = { id: { eq: args.projectId } };
    if (args.states && args.states.length > 0) {
      filter.state = { name: { in: args.states } };
    }

    const issues = await this.client.issues({
      first: args.limit || 10,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      orderBy: "updatedAt" as any,
      includeArchived: false,
    });

    // Fetch all relationships in parallel for all issues
    const issuesWithData = await Promise.all(
      issues.nodes.map(async (issue) => {
        const [state, team, assignee, project, labels] = await Promise.all([
          issue.state,
          issue.team,
          issue.assignee,
          issue.project,
          issue.labels(),
        ]);
        return { issue, state, team, assignee, project, labels };
      }),
    );

    let results = issuesWithData.map((
      { issue, state, team, assignee, project, labels },
    ) =>
      transformIssueData({
        ...issue,
        state,
        team,
        assignee,
        project,
        labels,
      })
    );

    // Apply text search if query is provided
    if (args.query) {
      const queryLower = args.query.toLowerCase();
      results = results.filter((issue) =>
        issue.title.toLowerCase().includes(queryLower) ||
        (issue.description &&
          issue.description.toLowerCase().includes(queryLower))
      );
    }

    return results;
  }

  /**
   * Get issue by ID (supports both UUID and identifier like ZCO-123)
   */
  async getIssueById(issueId: string): Promise<LinearIssue> {
    let issue;

    // Check if it's a UUID (36 chars with dashes) or identifier (like ZCO-123)
    if (isUuid(issueId)) {
      issue = await this.client.issue(issueId);
    } else {
      // Try to find by identifier - parse team key and issue number
      const parts = issueId.split("-");
      if (parts.length !== 2) {
        throw new Error(
          `Invalid issue identifier format: "${issueId}". Expected format: TEAM-123`,
        );
      }

      const teamKey = parts[0];
      const issueNumber = parseInt(parts[1]);

      if (isNaN(issueNumber)) {
        throw new Error(`Invalid issue number in identifier: "${issueId}"`);
      }

      const issues = await this.client.issues({
        filter: {
          number: { eq: issueNumber },
          team: { key: { eq: teamKey } },
        },
        first: 1,
      });

      if (issues.nodes.length === 0) {
        throw new Error(`Issue with identifier "${issueId}" not found`);
      }
      issue = issues.nodes[0];
    }

    // Fetch all relationships in parallel
    const [state, team, assignee, project, labels, comments] = await Promise
      .all([
        issue.state,
        issue.team,
        issue.assignee,
        issue.project,
        issue.labels(),
        issue.comments(),
      ]);

    // Process comments for inclusion
    const processedComments = await Promise.all(
      comments.nodes.map(async (comment: any) => {
        const user = await comment.user;
        return {
          id: comment.id,
          body: comment.body,
          user: {
            id: user.id,
            name: user.name,
          },
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        };
      }),
    );

    return transformIssueData({
      ...issue,
      state,
      team,
      assignee,
      project,
      labels,
      comments: processedComments,
    }, true);
  }

  /**
   * Create new issue
   */
  async createIssue(args: CreateIssueArgs): Promise<LinearIssue> {
    // If teamId is not provided, try to get user's first team
    let teamId = args.teamId;
    if (!teamId) {
      const me = await this.client.viewer;
      const teams = await me.teams();
      if (teams.nodes.length === 0) {
        throw new Error("No teams found. Please specify a team ID.");
      }
      teamId = teams.nodes[0].id;
    }

    const payload = await this.client.createIssue({
      title: args.title,
      teamId: teamId,
      description: args.description,
      assigneeId: args.assigneeId,
      priority: args.priority,
      projectId: args.projectId,
      stateId: args.stateId,
      labelIds: args.labelIds,
      estimate: args.estimate,
      parentId: args.parentId,
      projectMilestoneId: args.milestoneId,
    });

    if (!payload.success) {
      throw new Error("Failed to create issue");
    }

    // Fetch the created issue to return full data
    const issue = await payload.issue;
    if (!issue) {
      throw new Error("Failed to retrieve created issue");
    }

    return this.getIssueById(issue.id);
  }

  /**
   * Update existing issue
   */
  async updateIssue(args: UpdateIssueArgs): Promise<LinearIssue> {
    const payload = await this.client.updateIssue(args.id, {
      title: args.title,
      description: args.description,
      stateId: args.stateId,
      priority: args.priority,
      assigneeId: args.assigneeId,
      projectId: args.projectId,
      labelIds: args.labelIds,
      estimate: args.estimate,
    });

    if (!payload.success) {
      throw new Error("Failed to update issue");
    }

    // Fetch the updated issue to return full data
    return this.getIssueById(args.id);
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<LinearProject[]> {
    const projects = await this.client.projects({
      first: 100,
      orderBy: "updatedAt" as any,
      includeArchived: false,
    });

    // Fetch all relationships in parallel for all projects
    const projectsWithData = await Promise.all(
      projects.nodes.map(async (project) => {
        const [teams, lead] = await Promise.all([
          project.teams(),
          project.lead,
        ]);
        return { project, teams, lead };
      }),
    );

    return projectsWithData.map(({ project, teams, lead }) => ({
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      state: project.state,
      progress: project.progress,
      teams: teams.nodes.map((team: any) => ({
        id: team.id,
        key: team.key,
        name: team.name,
      })),
      lead: lead
        ? {
          id: lead.id,
          name: lead.name,
        }
        : undefined,
      targetDate: project.targetDate?.toISOString(),
      createdAt: project.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: project.updatedAt?.toISOString() || new Date().toISOString(),
    }));
  }

  /**
   * Resolve project name to project ID
   */
  async resolveProjectId(projectNameOrId: string): Promise<string> {
    // Use generic ID resolver
    const resolved = resolveId(projectNameOrId);
    if (resolved === projectNameOrId && isUuid(projectNameOrId)) {
      return projectNameOrId;
    }

    // Search for project by name
    const project = await executeLinearQuery(
      () =>
        this.client.projects({
          filter: buildEqualityFilter("name", projectNameOrId),
          first: 1,
        }),
      "Project",
      projectNameOrId,
    );

    return project.id;
  }

  /**
   * Resolve label names to label IDs
   * Supports:
   * - Direct label names: "Bug"
   * - Group/label syntax: "Plumbing/Tooling"
   * - UUIDs: "uuid-string"
   */
  async resolveLabelIds(labelNamesOrIds: string[]): Promise<string[]> {
    const results: string[] = [];

    for (const label of labelNamesOrIds) {
      // Use generic ID resolver
      const resolved = resolveId(label);
      if (resolved === label && isUuid(label)) {
        results.push(label);
        continue;
      }

      // Check if this is a group/label syntax (e.g., "Plumbing/Tooling")
      if (label.includes("/")) {
        const [groupName, labelName] = label.split("/", 2);

        if (!groupName || !labelName) {
          throw new Error(
            `Invalid group/label syntax: "${label}". Expected format: "GroupName/LabelName"`,
          );
        }

        // First find the group label
        const groupLabel = await executeLinearQuery(
          () =>
            this.client.issueLabels({
              filter: {
                ...buildEqualityFilter("name", groupName),
                isGroup: { eq: true },
              },
              first: 1,
            }),
          "Label group",
          groupName,
        );

        // Now find the child label within that group
        const childLabel = await executeLinearQuery(
          () =>
            this.client.issueLabels({
              filter: {
                ...buildEqualityFilter("name", labelName),
                parent: { id: { eq: groupLabel.id } },
              },
              first: 1,
            }),
          "Label",
          `${labelName} in group ${groupName}`,
        );

        results.push(childLabel.id);
        continue;
      }

      // Search for label by name (direct match)
      const labelResult = await executeLinearQuery(
        () =>
          this.client.issueLabels({
            filter: buildEqualityFilter("name", label),
            first: 1,
          }),
        "Label",
        label,
      );

      results.push(labelResult.id);
    }

    return results;
  }

  /**
   * Resolve team key or name to team ID
   */
  async resolveTeamId(teamKeyOrNameOrId: string): Promise<string> {
    // Use generic ID resolver
    const resolved = resolveId(teamKeyOrNameOrId);
    if (resolved === teamKeyOrNameOrId && isUuid(teamKeyOrNameOrId)) {
      return teamKeyOrNameOrId;
    }

    // Try to find by key first (like "ZCO"), then by name
    try {
      const team = await executeLinearQuery(
        () =>
          this.client.teams({
            filter: buildEqualityFilter("key", teamKeyOrNameOrId),
            first: 1,
          }),
        "Team",
        teamKeyOrNameOrId,
      );
      return team.id;
    } catch {
      // If not found by key, try by name
      const team = await executeLinearQuery(
        () =>
          this.client.teams({
            filter: buildEqualityFilter("name", teamKeyOrNameOrId),
            first: 1,
          }),
        "Team",
        teamKeyOrNameOrId,
      );
      return team.id;
    }
  }

  /**
   * Resolve milestone name to milestone ID within a project
   */
  async resolveMilestoneId(
    milestoneNameOrId: string,
    projectId: string,
  ): Promise<string> {
    // Use generic ID resolver
    const resolved = resolveId(milestoneNameOrId);
    if (resolved === milestoneNameOrId && isUuid(milestoneNameOrId)) {
      return milestoneNameOrId;
    }

    // Search for milestone by name within the specified project
    const project = await this.client.project(projectId);
    const milestone = await executeLinearQuery(
      () =>
        project.projectMilestones({
          filter: buildEqualityFilter("name", milestoneNameOrId),
          first: 1,
        }),
      "Milestone",
      `${milestoneNameOrId} in project`,
    );

    return milestone.id;
  }

  /**
   * Get all labels (workspace and team-specific)
   */
  async getLabels(teamFilter?: string): Promise<{ labels: LinearLabel[] }> {
    const labels: LinearLabel[] = [];

    if (teamFilter) {
      // Get labels for specific team only
      const teamId = await this.resolveTeamId(teamFilter);
      const team = await this.client.team(teamId);
      const teamLabels = await this.client.issueLabels({
        filter: { team: { id: { eq: teamId } } },
        first: 100,
      });

      for (const label of teamLabels.nodes) {
        // Skip group labels (isGroup: true) as they're containers, not actual labels
        if (label.isGroup) {
          continue;
        }

        const parent = await label.parent;

        const labelData: LinearLabel = {
          id: label.id,
          name: label.name,
          color: label.color,
          scope: "team",
          team: {
            id: team.id,
            name: team.name,
          },
        };

        // Add group info if this label has a parent group
        if (parent) {
          // Fetch the parent label details to get the name
          const parentLabel = await this.client.issueLabel(parent.id);
          labelData.group = {
            id: parent.id,
            name: parentLabel.name,
          };
        }

        labels.push(labelData);
      }
    } else {
      // Get all labels (workspace + team labels)
      const allLabels = await this.client.issueLabels({
        first: 100,
      });

      // Get all teams to determine which labels are team-specific
      const teams = await this.client.teams({ first: 50 });
      const teamMap = new Map(teams.nodes.map((team) => [team.id, team]));

      for (const label of allLabels.nodes) {
        // Skip group labels (isGroup: true) as they're containers, not actual labels
        if (label.isGroup) {
          continue;
        }

        const [team, parent] = await Promise.all([
          label.team,
          label.parent,
        ]);

        const labelData: LinearLabel = {
          id: label.id,
          name: label.name,
          color: label.color,
          scope: team ? "team" : "workspace",
        };

        // Add team info if this is a team-specific label
        if (team) {
          labelData.team = {
            id: team.id,
            name: team.name,
          };
        }

        // Add group info if this label has a parent group
        if (parent) {
          // Fetch the parent label details to get the name
          const parentLabel = await this.client.issueLabel(parent.id);
          labelData.group = {
            id: parent.id,
            name: parentLabel.name,
          };
        }

        labels.push(labelData);
      }
    }

    return { labels };
  }
}

/**
 * Create LinearService instance with authentication
 */
export async function createLinearService(
  options: CommandOptions,
): Promise<LinearService> {
  const apiToken = await getApiToken(options);
  return new LinearService(apiToken);
}
