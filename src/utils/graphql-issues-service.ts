import { GraphQLService } from "./graphql-service.js";
import {
  BATCH_RESOLVE_FOR_UPDATE_QUERY,
  GET_ISSUE_BY_ID_QUERY,
  GET_ISSUE_BY_IDENTIFIER_QUERY,
  UPDATE_ISSUE_MUTATION,
} from "../queries/issues.js";
import { LinearIssue, UpdateIssueArgs } from "./linear-types.d.ts";
import { isUuid } from "./uuid.js";
import { timeOperation } from "./performance.js";

/**
 * GraphQL-optimized issues service for single API call operations
 */
export class GraphQLIssuesService {
  constructor(private graphQLService: GraphQLService) {}

  /**
   * Get issue by ID with all relationships and comments in single query
   * Reduces from 7 API calls to 1 API call
   */
  async getIssueById(issueId: string): Promise<LinearIssue> {
    return timeOperation("issues-read-graphql", "GraphQL", async () => {
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
        // Parse identifier (ZCO-123 format)
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
    });
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
    return timeOperation("issues-update-graphql", "GraphQL", async () => {
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

      // Step 2: Execute update mutation with resolved IDs
      const updateInput: any = {};

      if (args.title !== undefined) updateInput.title = args.title;
      if (args.description !== undefined) {
        updateInput.description = args.description;
      }
      if (args.stateId !== undefined) updateInput.stateId = args.stateId;
      if (args.priority !== undefined) updateInput.priority = args.priority;
      if (args.assigneeId !== undefined) {
        updateInput.assigneeId = args.assigneeId;
      }
      if (finalProjectId !== undefined) updateInput.projectId = finalProjectId;
      if (args.estimate !== undefined) updateInput.estimate = args.estimate;
      if (args.parentId !== undefined) updateInput.parentId = args.parentId;

      if (finalLabelIds !== undefined) {
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
    });
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
