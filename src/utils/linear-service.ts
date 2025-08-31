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
    // Use raw GraphQL to fetch everything in one query
    const query = `
      query GetIssues($first: Int!, $orderBy: PaginationOrderBy) {
        issues(first: $first, orderBy: $orderBy, includeArchived: false) {
          nodes {
            id
            identifier
            title
            description
            priority
            estimate
            createdAt
            updatedAt
            state {
              id
              name
            }
            assignee {
              id
              name
            }
            team {
              id
              key
              name
            }
            project {
              id
              name
            }
            labels {
              nodes {
                id
                name
              }
            }
          }
        }
      }
    `;

    const result = await this.client._request<any>(query, {
      first: limit,
      orderBy: "updatedAt",
    });

    return result.issues.nodes.map((issue: any) => transformIssueData(issue));
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
      orderBy: "updatedAt",
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

    if (!payload.success || !payload._issue) {
      throw new Error("Failed to create issue");
    }

    // Fetch the created issue to return full data
    return this.getIssueById(payload._issue.id);
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
      orderBy: "updatedAt",
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
    // If it looks like a UUID, return as-is
    if (isUuid(projectNameOrId)) {
      return projectNameOrId;
    }

    // Search for project by name
    const projects = await this.client.projects({
      filter: { name: { eq: projectNameOrId } },
      first: 1,
    });

    if (projects.nodes.length === 0) {
      throw new Error(`Project "${projectNameOrId}" not found`);
    }

    return projects.nodes[0].id;
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
      // If it looks like a UUID, add as-is
      if (isUuid(label)) {
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
        const groupLabels = await this.client.issueLabels({
          filter: {
            name: { eq: groupName },
            isGroup: { eq: true },
          },
          first: 1,
        });

        if (groupLabels.nodes.length === 0) {
          throw new Error(`Label group "${groupName}" not found`);
        }

        const groupId = groupLabels.nodes[0].id;

        // Now find the child label within that group
        const childLabels = await this.client.issueLabels({
          filter: {
            name: { eq: labelName },
            parent: { id: { eq: groupId } },
          },
          first: 1,
        });

        if (childLabels.nodes.length === 0) {
          throw new Error(
            `Label "${labelName}" not found in group "${groupName}"`,
          );
        }

        results.push(childLabels.nodes[0].id);
        continue;
      }

      // Search for label by name (direct match)
      const labels = await this.client.issueLabels({
        filter: { name: { eq: label } },
        first: 1,
      });

      if (labels.nodes.length === 0) {
        throw new Error(`Label "${label}" not found`);
      }

      results.push(labels.nodes[0].id);
    }

    return results;
  }

  /**
   * Resolve team key or name to team ID
   */
  async resolveTeamId(teamKeyOrNameOrId: string): Promise<string> {
    // If it looks like a UUID, return as-is
    if (isUuid(teamKeyOrNameOrId)) {
      return teamKeyOrNameOrId;
    }

    // Try to find by key first (like "ZCO"), then by name
    let teams = await this.client.teams({
      filter: { key: { eq: teamKeyOrNameOrId } },
      first: 1,
    });

    if (teams.nodes.length === 0) {
      teams = await this.client.teams({
        filter: { name: { eq: teamKeyOrNameOrId } },
        first: 1,
      });
    }

    if (teams.nodes.length === 0) {
      throw new Error(`Team "${teamKeyOrNameOrId}" not found`);
    }

    return teams.nodes[0].id;
  }

  /**
   * Resolve milestone name to milestone ID within a project
   */
  async resolveMilestoneId(
    milestoneNameOrId: string,
    projectId: string,
  ): Promise<string> {
    // If it looks like a UUID, return as-is
    if (isUuid(milestoneNameOrId)) {
      return milestoneNameOrId;
    }

    // Search for milestone by name within the specified project
    const project = await this.client.project(projectId);
    const milestones = await project.projectMilestones({
      filter: { name: { eq: milestoneNameOrId } },
      first: 1,
    });

    if (milestones.nodes.length === 0) {
      throw new Error(`Milestone "${milestoneNameOrId}" not found in project`);
    }

    return milestones.nodes[0].id;
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

        const parent = await label._parent;

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
          label._parent,
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
