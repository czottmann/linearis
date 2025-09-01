import { LinearClient } from "@linear/sdk";
import { CommandOptions, getApiToken } from "./auth.js";
import {
  CreateCommentArgs,
  LinearComment,
  LinearIssue,
  LinearLabel,
  LinearProject,
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

export class LinearService {
  private client: LinearClient;

  constructor(apiToken: string) {
    this.client = new LinearClient({ apiKey: apiToken });
  }

  /**
   * Resolve issue identifier to UUID (lightweight version for ID-only resolution)
   */
  async resolveIssueId(issueId: string): Promise<string> {
    // Return UUID as-is
    if (isUuid(issueId)) {
      return issueId;
    }

    // Parse identifier (ZCO-123 format) and resolve to UUID
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

    return issues.nodes[0].id;
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

  /**
   * Create comment on issue
   */
  async createComment(args: CreateCommentArgs): Promise<LinearComment> {
    const payload = await this.client.createComment({
      issueId: args.issueId,
      body: args.body,
    });

    if (!payload.success) {
      throw new Error("Failed to create comment");
    }

    // Fetch the created comment to return full data
    const comment = await payload.comment;
    if (!comment) {
      throw new Error("Failed to retrieve created comment");
    }

    const user = await comment.user;
    if (!user) {
      throw new Error("Failed to retrieve comment user information");
    }

    return {
      id: comment.id,
      body: comment.body,
      user: {
        id: user.id,
        name: user.name,
      },
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
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
