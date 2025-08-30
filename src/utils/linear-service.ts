import { LinearClient } from "@linear/sdk";
import { CommandOptions, getApiToken } from "./auth.js";
import { LinearIssue, SearchIssuesArgs, CreateIssueArgs, UpdateIssueArgs, LinearProject } from "./linear-types.js";

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

    return result.issues.nodes.map((issue: any) => ({
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
      labels: {
        nodes: issue.labels.nodes.map((label: any) => ({
          id: label.id,
          name: label.name,
        })),
      },
      createdAt: new Date(issue.createdAt).toISOString(),
      updatedAt: new Date(issue.updatedAt).toISOString(),
    }));
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
    ) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description || undefined,
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
      priority: issue.priority,
      estimate: issue.estimate || undefined,
      labels: {
        nodes: labels.nodes.map((label: any) => ({
          id: label.id,
          name: label.name,
        })),
      },
      createdAt: issue.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: issue.updatedAt?.toISOString() || new Date().toISOString(),
    }));

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
    if (issueId.length === 36 && issueId.includes("-")) {
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
    const [state, team, assignee, project, labels] = await Promise.all([
      issue.state,
      issue.team,
      issue.assignee,
      issue.project,
      issue.labels(),
    ]);

    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description || undefined,
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
      priority: issue.priority,
      estimate: issue.estimate || undefined,
      labels: {
        nodes: labels.nodes.map((label: any) => ({
          id: label.id,
          name: label.name,
        })),
      },
      createdAt: issue.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: issue.updatedAt?.toISOString() || new Date().toISOString(),
    };
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
    });

    if (!payload.success) {
      throw new Error("Failed to create issue");
    }

    // Fetch the created issue to return full data
    return this.getIssueById(payload.issue.id);
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
      teams: {
        nodes: teams.nodes.map((team: any) => ({
          id: team.id,
          key: team.key,
          name: team.name,
        })),
      },
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
    if (projectNameOrId.length === 36 && projectNameOrId.includes("-")) {
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
   */
  async resolveLabelIds(labelNamesOrIds: string[]): Promise<string[]> {
    const results: string[] = [];

    for (const label of labelNamesOrIds) {
      // If it looks like a UUID, add as-is
      if (label.length === 36 && label.includes("-")) {
        results.push(label);
        continue;
      }

      // Search for label by name
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
    if (teamKeyOrNameOrId.length === 36 && teamKeyOrNameOrId.includes("-")) {
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
