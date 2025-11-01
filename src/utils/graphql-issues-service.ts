import { GraphQLService } from "./graphql-service.js";
import { LinearService } from "./linear-service.js";
import {
  BATCH_RESOLVE_FOR_CREATE_QUERY,
  BATCH_RESOLVE_FOR_SEARCH_QUERY,
  BATCH_RESOLVE_FOR_UPDATE_QUERY,
  CREATE_ISSUE_MUTATION,
  FILTERED_SEARCH_ISSUES_QUERY,
  GET_ISSUE_BY_ID_QUERY,
  GET_ISSUE_BY_IDENTIFIER_QUERY,
  GET_ISSUES_QUERY,
  SEARCH_ISSUES_QUERY,
  UPDATE_ISSUE_MUTATION,
} from "../queries/issues.js";
import type {
  CreateIssueArgs,
  LinearIssue,
  SearchIssuesArgs,
  UpdateIssueArgs,
} from "./linear-types.js";
import { isUuid } from "./uuid.js";

/**
 * GraphQL-optimized issues service for single API call operations
 */
export class GraphQLIssuesService {
  constructor(
    private graphQLService: GraphQLService,
    private linearService: LinearService,
  ) {}

  /**
   * Get issues list with all relationships in single query
   * Reduces from 1 + (5 × N issues) API calls to 1 API call
   */
  async getIssues(limit: number = 25): Promise<LinearIssue[]> {
    const result = await this.graphQLService.rawRequest(GET_ISSUES_QUERY, {
      first: limit,
      orderBy: "updatedAt" as any,
    });

    if (!result.issues?.nodes) {
      return [];
    }

    // Transform all issues using the same transformation logic
    return result.issues.nodes.map((issue: any) =>
      this.transformIssueData(issue)
    );
  }

  /**
   * Get issue by ID with all relationships and comments in single query
   * Reduces from 7 API calls to 1 API call
   */
  async getIssueById(issueId: string): Promise<LinearIssue> {
    let issueData;

    if (isUuid(issueId)) {
      // Direct UUID lookup
      const result = await this.graphQLService.rawRequest(
        GET_ISSUE_BY_ID_QUERY,
        {
          id: issueId,
        },
      );

      if (!result.issue) {
        throw new Error(`Issue with ID "${issueId}" not found`);
      }
      issueData = result.issue;
    } else {
      // Parse identifier (ABC-123 format)
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

      const result = await this.graphQLService.rawRequest(
        GET_ISSUE_BY_IDENTIFIER_QUERY,
        {
          teamKey,
          number: issueNumber,
        },
      );

      if (!result.issues.nodes.length) {
        throw new Error(`Issue with identifier "${issueId}" not found`);
      }
      issueData = result.issues.nodes[0];
    }

    // Transform GraphQL response to LinearIssue format
    return this.transformIssueData(issueData);
  }

  /**
   * Update issue with all relationships in optimized GraphQL queries
   * Reduces from 5 API calls to 2 API calls (resolve + update)
   *
   * @param args Update arguments (supports label names and handles adding vs overwriting modes)
   * @param labelMode How to handle labels: 'adding' (merge with existing) or 'overwriting' (replace all)
   */
  async updateIssue(
    args: UpdateIssueArgs,
    labelMode: "adding" | "overwriting" = "overwriting",
  ): Promise<LinearIssue> {
    let resolvedIssueId = args.id;
    let currentIssueLabels: string[] = [];

    // Step 1: Batch resolve all IDs and get current issue data if needed
    const resolveVariables: any = {};

    // Parse issue ID if it's an identifier
    if (!isUuid(args.id)) {
      const parts = args.id.split("-");
      if (parts.length !== 2) {
        throw new Error(
          `Invalid issue identifier format: "${args.id}". Expected format: TEAM-123`,
        );
      }
      resolveVariables.teamKey = parts[0];
      resolveVariables.issueNumber = parseInt(parts[1]);

      if (isNaN(resolveVariables.issueNumber)) {
        throw new Error(`Invalid issue number in identifier: "${args.id}"`);
      }
    }

    // Add label names for resolution if provided
    if (args.labelIds && Array.isArray(args.labelIds)) {
      // Filter out UUIDs and collect label names for resolution
      const labelNames = args.labelIds.filter((id) => !isUuid(id));
      if (labelNames.length > 0) {
        resolveVariables.labelNames = labelNames;
      }
    }

    // Add project name for resolution if provided and not a UUID
    if (args.projectId && !isUuid(args.projectId)) {
      resolveVariables.projectName = args.projectId;
    }

    // Add milestone name for resolution if provided and not a UUID
    if (args.milestoneId && typeof args.milestoneId === 'string' && !isUuid(args.milestoneId)) {
      resolveVariables.milestoneName = args.milestoneId;
    }

    // Execute batch resolve query
    const resolveResult = await this.graphQLService.rawRequest(
      BATCH_RESOLVE_FOR_UPDATE_QUERY,
      resolveVariables,
    );

    // Process resolution results
    if (!isUuid(args.id)) {
      if (!resolveResult.issues.nodes.length) {
        throw new Error(`Issue with identifier "${args.id}" not found`);
      }
      resolvedIssueId = resolveResult.issues.nodes[0].id;
      currentIssueLabels = resolveResult.issues.nodes[0].labels.nodes.map((
        l: any,
      ) => l.id);
    }

    // Resolve label IDs
    let finalLabelIds = args.labelIds;
    if (args.labelIds && Array.isArray(args.labelIds)) {
      const resolvedLabels: string[] = [];

      // Process each label ID/name
      for (const labelIdOrName of args.labelIds) {
        if (isUuid(labelIdOrName)) {
          resolvedLabels.push(labelIdOrName);
        } else {
          // Find resolved label
          const label = resolveResult.labels.nodes.find((l: any) =>
            l.name === labelIdOrName
          );
          if (!label) {
            throw new Error(`Label "${labelIdOrName}" not found`);
          }
          resolvedLabels.push(label.id);
        }
      }

      // Handle adding vs overwriting modes
      if (labelMode === "adding") {
        // Merge with current labels (if we have them)
        finalLabelIds = [
          ...new Set([...currentIssueLabels, ...resolvedLabels]),
        ];
      } else {
        // Overwrite mode - replace all existing labels
        finalLabelIds = resolvedLabels;
      }
    }

    // Resolve project ID
    let finalProjectId = args.projectId;
    if (args.projectId && !isUuid(args.projectId)) {
      if (!resolveResult.projects.nodes.length) {
        throw new Error(`Project "${args.projectId}" not found`);
      }
      finalProjectId = resolveResult.projects.nodes[0].id;
    }

    // Resolve milestone ID if provided and not a UUID
    let finalMilestoneId = args.milestoneId;
    if (args.milestoneId && typeof args.milestoneId === 'string' && !isUuid(args.milestoneId)) {
      // First try to find milestone in project context if we have one
      if (resolveResult.projects?.nodes[0]?.projectMilestones?.nodes) {
        const projectMilestone = resolveResult.projects.nodes[0].projectMilestones.nodes
          .find((m: any) => m.name === args.milestoneId);
        if (projectMilestone) {
          finalMilestoneId = projectMilestone.id;
        }
      }

      // If not found in project, try global milestone lookup
      if (!finalMilestoneId && resolveResult.milestones?.nodes?.length) {
        finalMilestoneId = resolveResult.milestones.nodes[0].id;
      }

      if (!finalMilestoneId) {
        throw new Error(`Milestone "${args.milestoneId}" not found`);
      }
    }

    // Resolve cycle ID if provided (supports name resolution scoped to the issue's team)
    let finalCycleId = args.cycleId;
    if (args.cycleId !== undefined && args.cycleId !== null) {
      if (args.cycleId === null) {
        finalCycleId = null; // explicit clear
      } else if (typeof args.cycleId === 'string' && !isUuid(args.cycleId)) {
        // Try to get team context from resolved issue (if available)
        let teamIdForCycle: string | undefined = resolveResult.issues?.nodes?.[0]?.team?.id;

        // If we don't have team from batch result but we have resolvedIssueId, fetch issue team
        if (!teamIdForCycle && resolvedIssueId && isUuid(resolvedIssueId)) {
          const issueTeamRes = await this.graphQLService.rawRequest(
            `query GetIssueTeam($issueId: String!) { issue(id: $issueId) { team { id } } }`,
            { issueId: resolvedIssueId },
          );
          teamIdForCycle = issueTeamRes.issue?.team?.id;
        }

        // Try scoped lookup by team first
        if (teamIdForCycle) {
          const scopedRes = await this.graphQLService.rawRequest(
            `query FindCycleScoped($name: String!, $teamId: ID!) { cycles(filter: { and: [ { name: { eq: $name } }, { team: { id: { eq: $teamId } } } ] }, first: 10) { nodes { id name number startsAt isActive isNext isPrevious team { id key } } } }`,
            { name: args.cycleId, teamId: teamIdForCycle },
          );
          const scopedNodes = scopedRes.cycles?.nodes || [];
          if (scopedNodes.length === 1) {
            finalCycleId = scopedNodes[0].id;
          } else if (scopedNodes.length > 1) {
            // prefer active, next, previous
            let chosen = scopedNodes.find((n: any) => n.isActive) || scopedNodes.find((n: any) => n.isNext) || scopedNodes.find((n: any) => n.isPrevious);
            if (chosen) finalCycleId = chosen.id;
            else throw new Error(`Ambiguous cycle name "${args.cycleId}" for team ${teamIdForCycle}. Use ID or disambiguate.`);
          }
        }

        // Fallback to global lookup by name
        if (!finalCycleId) {
          const globalRes = await this.graphQLService.rawRequest(
            `query FindCycleGlobal($name: String!) { cycles(filter: { name: { eq: $name } }, first: 10) { nodes { id name number startsAt isActive isNext isPrevious team { id key } } } }`,
            { name: args.cycleId },
          );
          const globalNodes = globalRes.cycles?.nodes || [];
          if (globalNodes.length === 1) {
            finalCycleId = globalNodes[0].id;
          } else if (globalNodes.length > 1) {
            let chosen = globalNodes.find((n: any) => n.isActive) || globalNodes.find((n: any) => n.isNext) || globalNodes.find((n: any) => n.isPrevious);
            if (chosen) finalCycleId = chosen.id;
            else throw new Error(`Ambiguous cycle name "${args.cycleId}" — multiple matches found across teams. Use ID or scope with team.`);
          }
        }

        if (!finalCycleId) {
          throw new Error(`Cycle "${args.cycleId}" not found`);
        }
      }
    }

    // Resolve state ID if provided and not a UUID
    let resolvedStateId = args.stateId;
    if (args.stateId && !isUuid(args.stateId)) {
      // Get team ID from the issue for state context
      let teamId: string | undefined;
      if (resolvedIssueId && isUuid(resolvedIssueId)) {
        // We have the resolved issue ID, get the team context
        const issueResult = await this.graphQLService.rawRequest(
          `query GetIssueTeam($issueId: String!) {
            issue(id: $issueId) {
              team { id }
            }
          }`,
          { issueId: resolvedIssueId },
        );
        teamId = issueResult.issue?.team?.id;
      }
      resolvedStateId = await this.linearService.resolveStateId(
        args.stateId,
        teamId,
      );
    }

    // Step 2: Execute update mutation with resolved IDs
    const updateInput: any = {};

    if (args.title !== undefined) updateInput.title = args.title;
    if (args.description !== undefined) {
      updateInput.description = args.description;
    }
    if (resolvedStateId !== undefined) updateInput.stateId = resolvedStateId;
    if (args.priority !== undefined) updateInput.priority = args.priority;
    if (args.assigneeId !== undefined) {
      updateInput.assigneeId = args.assigneeId;
    }
    if (finalProjectId !== undefined) updateInput.projectId = finalProjectId;
  if (finalCycleId !== undefined) updateInput.cycleId = finalCycleId;
    if (args.estimate !== undefined) updateInput.estimate = args.estimate;
    if (args.parentId !== undefined) updateInput.parentId = args.parentId;
    if (finalMilestoneId !== undefined) updateInput.projectMilestoneId = finalMilestoneId;    if (finalLabelIds !== undefined) {
      updateInput.labelIds = finalLabelIds;
    }

    const updateResult = await this.graphQLService.rawRequest(
      UPDATE_ISSUE_MUTATION,
      {
        id: resolvedIssueId,
        input: updateInput,
      },
    );

    if (!updateResult.issueUpdate.success) {
      throw new Error("Failed to update issue");
    }

    if (!updateResult.issueUpdate.issue) {
      throw new Error("Failed to retrieve updated issue");
    }

    return this.transformIssueData(updateResult.issueUpdate.issue);
  }

  /**
   * Create issue with all relationships in optimized GraphQL queries
   * Reduces from 7+ API calls to 2 API calls (resolve + create)
   *
   * @param args Create arguments (supports team names, project names, label names, parent identifiers)
   */
  async createIssue(args: CreateIssueArgs): Promise<LinearIssue> {
    // Step 1: Batch resolve all IDs
    const resolveVariables: any = {};

    // Parse team if not a UUID
    if (args.teamId && !isUuid(args.teamId)) {
      // Check if it looks like a team key (short, usually 2-5 chars)
      if (args.teamId.length <= 5 && /^[A-Z]+$/.test(args.teamId)) {
        resolveVariables.teamKey = args.teamId;
      } else {
        resolveVariables.teamName = args.teamId;
      }
    }

    // Add project name for resolution if provided and not a UUID
    if (args.projectId && !isUuid(args.projectId)) {
      resolveVariables.projectName = args.projectId;
    }

    // Add milestone name for resolution if provided and not a UUID
    if (args.milestoneId && !isUuid(args.milestoneId)) {
      resolveVariables.milestoneName = args.milestoneId;
    }

    // Add label names for resolution if provided
    if (args.labelIds && Array.isArray(args.labelIds)) {
      // Filter out UUIDs and collect label names for resolution
      const labelNames = args.labelIds.filter((id) => !isUuid(id));
      if (labelNames.length > 0) {
        resolveVariables.labelNames = labelNames;
      }
    }

    // Parse parent issue identifier if provided
    if (args.parentId && !isUuid(args.parentId)) {
      const parts = args.parentId.split("-");
      if (parts.length === 2) {
        const teamKey = parts[0];
        const issueNumber = parseInt(parts[1]);
        if (!isNaN(issueNumber)) {
          resolveVariables.parentTeamKey = teamKey;
          resolveVariables.parentIssueNumber = issueNumber;
        }
      }
    }

    // Execute batch resolve query if we have anything to resolve
    let resolveResult: any = {};
    if (Object.keys(resolveVariables).length > 0) {
      resolveResult = await this.graphQLService.rawRequest(
        BATCH_RESOLVE_FOR_CREATE_QUERY,
        resolveVariables,
      );
    }

    // Resolve team ID
    let finalTeamId = args.teamId;
    if (args.teamId && !isUuid(args.teamId)) {
      if (!resolveResult.teams?.nodes?.length) {
        throw new Error(`Team "${args.teamId}" not found`);
      }
      finalTeamId = resolveResult.teams.nodes[0].id;
    } else if (!finalTeamId) {
      // If no team specified, we'll let Linear's default behavior handle it
      // or the API will return an error
    }

    // Resolve project ID
    let finalProjectId = args.projectId;
    if (args.projectId && !isUuid(args.projectId)) {
      if (!resolveResult.projects?.nodes?.length) {
        throw new Error(`Project "${args.projectId}" not found`);
      }
      finalProjectId = resolveResult.projects.nodes[0].id;
    }

    // Resolve label IDs
    let finalLabelIds = args.labelIds;
    if (args.labelIds && Array.isArray(args.labelIds)) {
      const resolvedLabels: string[] = [];

      for (const labelIdOrName of args.labelIds) {
        if (isUuid(labelIdOrName)) {
          resolvedLabels.push(labelIdOrName);
        } else {
          // Find resolved label
          const label = resolveResult.labels?.nodes?.find((l: any) =>
            l.name === labelIdOrName
          );
          if (!label) {
            throw new Error(`Label "${labelIdOrName}" not found`);
          }
          resolvedLabels.push(label.id);
        }
      }

      finalLabelIds = resolvedLabels;
    }

    // Resolve parent ID
    let finalParentId = args.parentId;
    if (args.parentId && !isUuid(args.parentId)) {
      if (!resolveResult.parentIssues?.nodes?.length) {
        throw new Error(`Parent issue "${args.parentId}" not found`);
      }
      finalParentId = resolveResult.parentIssues.nodes[0].id;
    }

    // Resolve milestone ID if provided and not a UUID
    let finalMilestoneId = args.milestoneId;
    if (args.milestoneId && !isUuid(args.milestoneId)) {
      // First try to find milestone in project context if we have one
      if (resolveResult.projects?.nodes[0]?.projectMilestones?.nodes) {
        const projectMilestone = resolveResult.projects.nodes[0].projectMilestones.nodes
          .find((m: any) => m.name === args.milestoneId);
        if (projectMilestone) {
          finalMilestoneId = projectMilestone.id;
        }
      }

      // If not found in project, try global milestone lookup
      if (!finalMilestoneId && resolveResult.milestones?.nodes?.length) {
        finalMilestoneId = resolveResult.milestones.nodes[0].id;
      }

      if (!finalMilestoneId) {
        throw new Error(`Milestone "${args.milestoneId}" not found`);
      }
    }

    // Resolve cycle ID if provided (supports name resolution scoped to team)
    let finalCycleId = args.cycleId;
    if (args.cycleId && typeof args.cycleId === 'string' && !isUuid(args.cycleId)) {
      // Try scoped lookup within finalTeamId first
      if (finalTeamId) {
        const scopedRes = await this.graphQLService.rawRequest(
          `query FindCycleScoped($name: String!, $teamId: ID!) { cycles(filter: { and: [ { name: { eq: $name } }, { team: { id: { eq: $teamId } } } ] }, first: 1) { nodes { id name } } }`,
          { name: args.cycleId, teamId: finalTeamId },
        );
        if (scopedRes.cycles?.nodes?.length) {
          finalCycleId = scopedRes.cycles.nodes[0].id;
        }
      }

      // Fallback to global lookup by name
      if (!finalCycleId) {
        const globalRes = await this.graphQLService.rawRequest(
          `query FindCycleGlobal($name: String!) { cycles(filter: { name: { eq: $name } }, first: 1) { nodes { id name } } }`,
          { name: args.cycleId },
        );
        if (globalRes.cycles?.nodes?.length) {
          finalCycleId = globalRes.cycles.nodes[0].id;
        }
      }

      if (!finalCycleId) {
        throw new Error(`Cycle "${args.cycleId}" not found`);
      }
    }

    // Resolve state ID if provided and not a UUID
    let resolvedStateId = args.stateId;
    if (args.stateId && !isUuid(args.stateId)) {
      resolvedStateId = await this.linearService.resolveStateId(
        args.stateId,
        finalTeamId,
      );
    }

    // Step 2: Execute create mutation with resolved IDs
    const createInput: any = {
      title: args.title,
    };

    if (finalTeamId) createInput.teamId = finalTeamId;
    if (args.description) createInput.description = args.description;
    if (args.assigneeId) createInput.assigneeId = args.assigneeId;
    if (args.priority !== undefined) createInput.priority = args.priority;
    if (finalProjectId) createInput.projectId = finalProjectId;
    if (resolvedStateId) createInput.stateId = resolvedStateId;
    if (finalLabelIds && finalLabelIds.length > 0) {
      createInput.labelIds = finalLabelIds;
    }
    if (args.estimate !== undefined) createInput.estimate = args.estimate;
    if (finalParentId) createInput.parentId = finalParentId;
    if (finalMilestoneId) createInput.projectMilestoneId = finalMilestoneId;
    if (finalCycleId) createInput.cycleId = finalCycleId;

    const createResult = await this.graphQLService.rawRequest(
      CREATE_ISSUE_MUTATION,
      {
        input: createInput,
      },
    );

    if (!createResult.issueCreate.success) {
      throw new Error("Failed to create issue");
    }

    if (!createResult.issueCreate.issue) {
      throw new Error("Failed to retrieve created issue");
    }

    return this.transformIssueData(createResult.issueCreate.issue);
  }

  /**
   * Search issues with all relationships in optimized GraphQL queries
   * Reduces from 1 + (6 × N) API calls to 1-2 API calls total
   *
   * @param args Search arguments with optional filters
   */
  async searchIssues(args: SearchIssuesArgs): Promise<LinearIssue[]> {
    // Step 1: Resolve filter IDs if needed
    const resolveVariables: any = {};
    let needsResolve = false;

    // Parse team if not a UUID
    if (args.teamId && !isUuid(args.teamId)) {
      needsResolve = true;
      // Check if it looks like a team key (short, usually 2-5 chars)
      if (args.teamId.length <= 5 && /^[A-Z]+$/.test(args.teamId)) {
        resolveVariables.teamKey = args.teamId;
      } else {
        resolveVariables.teamName = args.teamId;
      }
    }

    // Add project name for resolution if provided and not a UUID
    if (args.projectId && !isUuid(args.projectId)) {
      needsResolve = true;
      resolveVariables.projectName = args.projectId;
    }

    // Add assignee email for resolution if provided and not a UUID
    if (args.assigneeId && !isUuid(args.assigneeId)) {
      needsResolve = true;
      // Assume it's an email if it contains @
      if (args.assigneeId.includes("@")) {
        resolveVariables.assigneeEmail = args.assigneeId;
      }
    }

    // Execute batch resolve query if we have anything to resolve
    let resolveResult: any = {};
    if (needsResolve) {
      resolveResult = await this.graphQLService.rawRequest(
        BATCH_RESOLVE_FOR_SEARCH_QUERY,
        resolveVariables,
      );
    }

    // Resolve filter IDs
    let finalTeamId = args.teamId;
    if (args.teamId && !isUuid(args.teamId)) {
      if (!resolveResult.teams?.nodes?.length) {
        throw new Error(`Team "${args.teamId}" not found`);
      }
      finalTeamId = resolveResult.teams.nodes[0].id;
    }

    let finalProjectId = args.projectId;
    if (args.projectId && !isUuid(args.projectId)) {
      if (!resolveResult.projects?.nodes?.length) {
        throw new Error(`Project "${args.projectId}" not found`);
      }
      finalProjectId = resolveResult.projects.nodes[0].id;
    }

    let finalAssigneeId = args.assigneeId;
    if (
      args.assigneeId && !isUuid(args.assigneeId) &&
      args.assigneeId.includes("@")
    ) {
      if (!resolveResult.users?.nodes?.length) {
        throw new Error(`User "${args.assigneeId}" not found`);
      }
      finalAssigneeId = resolveResult.users.nodes[0].id;
    }

    // Step 2: Execute search query
    if (args.query) {
      // Use text search
      const searchResult = await this.graphQLService.rawRequest(
        SEARCH_ISSUES_QUERY,
        {
          term: args.query,
          first: args.limit || 10,
        },
      );

      if (!searchResult.searchIssues?.nodes) {
        return [];
      }

      let results = searchResult.searchIssues.nodes.map((issue: any) =>
        this.transformIssueData(issue)
      );

      // Apply additional filters if provided
      if (finalTeamId) {
        results = results.filter((issue: LinearIssue) =>
          issue.team.id === finalTeamId
        );
      }
      if (finalAssigneeId) {
        results = results.filter((issue: LinearIssue) =>
          issue.assignee?.id === finalAssigneeId
        );
      }
      if (finalProjectId) {
        results = results.filter((issue: LinearIssue) =>
          issue.project?.id === finalProjectId
        );
      }
      if (args.states && args.states.length > 0) {
        results = results.filter((issue: LinearIssue) =>
          args.states!.includes(issue.state.name)
        );
      }

      return results;
    } else {
      // Use filtered search
      const filter: any = {};

      if (finalTeamId) filter.team = { id: { eq: finalTeamId } };
      if (finalAssigneeId) filter.assignee = { id: { eq: finalAssigneeId } };
      if (finalProjectId) filter.project = { id: { eq: finalProjectId } };
      if (args.states && args.states.length > 0) {
        filter.state = { name: { in: args.states } };
      }

      const searchResult = await this.graphQLService.rawRequest(
        FILTERED_SEARCH_ISSUES_QUERY,
        {
          first: args.limit || 10,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          orderBy: "updatedAt" as any,
        },
      );

      if (!searchResult.issues?.nodes) {
        return [];
      }

      return searchResult.issues.nodes.map((issue: any) =>
        this.transformIssueData(issue)
      );
    }
  }

  /**
   * Transform GraphQL issue response to LinearIssue format
   */
  private transformIssueData(issue: any): LinearIssue {
    return {
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
      cycle: issue.cycle
        ? {
          id: issue.cycle.id,
          name: issue.cycle.name,
          number: issue.cycle.number,
        }
        : undefined,
      projectMilestone: issue.projectMilestone
        ? {
          id: issue.projectMilestone.id,
          name: issue.projectMilestone.name,
          targetDate: issue.projectMilestone.targetDate || undefined,
        }
        : undefined,
      priority: issue.priority,
      estimate: issue.estimate || undefined,
      labels: issue.labels.nodes.map((label: any) => ({
        id: label.id,
        name: label.name,
      })),
      comments: issue.comments?.nodes.map((comment: any) => ({
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
      })) || [],
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
  }
}
