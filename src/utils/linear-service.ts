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

    // Parse identifier (ABC-123 format) and resolve to UUID
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
      targetDate: project.targetDate ? String(project.targetDate) : undefined,
      createdAt: project.createdAt ? String(project.createdAt) : new Date().toISOString(),
      updatedAt: project.updatedAt ? String(project.updatedAt) : new Date().toISOString(),
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

    // Try to find by key first (like "ABC"), then by name
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
   * Resolve state name to state ID for a specific team
   */
  async resolveStateId(stateName: string, teamId?: string): Promise<string> {
    // Return UUID as-is
    if (isUuid(stateName)) {
      return stateName;
    }

    // Build filter for workflow states
    const filter: any = {
      name: { eqIgnoreCase: stateName },
    };

    // If teamId is provided, filter by team
    if (teamId) {
      filter.team = { id: { eq: teamId } };
    }

    const states = await this.client.workflowStates({
      filter,
      first: 1,
    });

    if (states.nodes.length === 0) {
      const context = teamId ? ` for team ${teamId}` : "";
      throw new Error(`State "${stateName}"${context} not found`);
    }

    return states.nodes[0].id;
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

  /**
   * Get all cycles with automatic pagination
   */
  async getCycles(teamFilter?: string, activeOnly?: boolean): Promise<any[]> {
    const filter: any = {};

    if (teamFilter) {
      const teamId = await this.resolveTeamId(teamFilter);
      filter.team = { id: { eq: teamId } };
    }

    if (activeOnly) {
      filter.isActive = { eq: true };
    }

    const cyclesConnection = await this.client.cycles({
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      orderBy: "createdAt" as any,
      first: 250,
    });

    // Fetch all relationships in parallel for all cycles
    const cyclesWithData = await Promise.all(
      cyclesConnection.nodes.map(async (cycle) => {
        const team = await cycle.team;
        return {
          id: cycle.id,
          name: cycle.name,
          number: cycle.number,
          startsAt: cycle.startsAt ? String(cycle.startsAt) : undefined,
          endsAt: cycle.endsAt ? String(cycle.endsAt) : undefined,
          isActive: cycle.isActive,
          isPrevious: cycle.isPrevious,
          isNext: cycle.isNext,
          progress: cycle.progress,
          issueCountHistory: cycle.issueCountHistory,
          team: team ? {
            id: team.id,
            key: team.key,
            name: team.name,
          } : undefined,
        };
      })
    );

    return cyclesWithData;
  }

  /**
   * Get single cycle by ID with issues
   */
  async getCycleById(cycleId: string, issuesLimit: number = 50): Promise<any> {
    const cycle = await this.client.cycle(cycleId);

    const [team, issuesConnection] = await Promise.all([
      cycle.team,
      cycle.issues({ first: issuesLimit }),
    ]);

    const issues = [];
    for (const issue of issuesConnection.nodes) {
      const [state, assignee, issueTeam, project, labels] = await Promise.all([
        issue.state,
        issue.assignee,
        issue.team,
        issue.project,
        issue.labels(),
      ]);

      issues.push({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description || undefined,
        priority: issue.priority,
        estimate: issue.estimate || undefined,
        state: state ? { id: state.id, name: state.name } : undefined,
        assignee: assignee ? { id: assignee.id, name: assignee.name } : undefined,
        team: issueTeam ? { id: issueTeam.id, key: issueTeam.key, name: issueTeam.name } : undefined,
        project: project ? { id: project.id, name: project.name } : undefined,
        labels: labels.nodes.map((label: any) => ({ id: label.id, name: label.name })),
        createdAt: issue.createdAt ? String(issue.createdAt) : new Date().toISOString(),
        updatedAt: issue.updatedAt ? String(issue.updatedAt) : new Date().toISOString(),
      });
    }

    return {
      id: cycle.id,
      name: cycle.name,
      number: cycle.number,
      startsAt: cycle.startsAt ? String(cycle.startsAt) : undefined,
      endsAt: cycle.endsAt ? String(cycle.endsAt) : undefined,
      isActive: cycle.isActive,
      progress: cycle.progress,
      issueCountHistory: cycle.issueCountHistory,
      team: team ? {
        id: team.id,
        key: team.key,
        name: team.name,
      } : undefined,
      issues,
    };
  }

  /**
   * Resolve cycle by name or ID
   */
  async resolveCycleId(cycleNameOrId: string, teamFilter?: string): Promise<string> {
    // Return UUID as-is
    if (isUuid(cycleNameOrId)) {
      return cycleNameOrId;
    }

    // Build filter for name-based lookup
    const filter: any = {
      name: { eq: cycleNameOrId },
    };

    // If teamId is provided, filter by team
    if (teamFilter) {
      const teamId = await this.resolveTeamId(teamFilter);
      filter.team = { id: { eq: teamId } };
    }

    const cyclesConnection = await this.client.cycles({
      filter,
      first: 10,
    });

    const cyclesData = cyclesConnection.nodes;

    const nodes = [];
    for (const cycle of cyclesData) {
      const team = await cycle.team;
      nodes.push({
        id: cycle.id,
        name: cycle.name,
        number: cycle.number,
        startsAt: cycle.startsAt,
        isActive: cycle.isActive,
        isNext: cycle.isNext,
        isPrevious: cycle.isPrevious,
        team: team ? { id: team.id, key: team.key, name: team.name } : undefined,
      });
    }

    if (nodes.length === 0) {
      const context = teamFilter ? ` for team ${teamFilter}` : "";
      throw new Error(`Cycle "${cycleNameOrId}"${context} not found`);
    }

    // Disambiguate: prefer active, then next, then previous
    let chosen = nodes.find((n: any) => n.isActive);
    if (!chosen) chosen = nodes.find((n: any) => n.isNext);
    if (!chosen) chosen = nodes.find((n: any) => n.isPrevious);
    if (!chosen && nodes.length === 1) chosen = nodes[0];

    if (!chosen) {
      const list = nodes.map((n: any) =>
        `${n.id} (${n.team?.key || "?"} / #${n.number} / ${n.startsAt})`
      ).join("; ");
      throw new Error(
        `Ambiguous cycle name "${cycleNameOrId}" — multiple matches found: ${list}. Please use an ID or scope with --team.`
      );
    }

    return chosen.id;
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
