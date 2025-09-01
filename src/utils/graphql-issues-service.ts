import { GraphQLService } from "./graphql-service.js";
import {
  GET_ISSUE_BY_ID_QUERY,
  GET_ISSUE_BY_IDENTIFIER_QUERY,
} from "../queries/issues.js";
import { LinearIssue } from "./linear-types.d.ts";
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
