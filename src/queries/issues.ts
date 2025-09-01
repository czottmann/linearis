/**
 * Optimized GraphQL queries for issue operations
 */

import {
  COMPLETE_ISSUE_FRAGMENT,
  COMPLETE_ISSUE_WITH_COMMENTS_FRAGMENT,
} from "./common.js";

/**
 * Get issues list with all relationships in single query
 */
export const GET_ISSUES_QUERY = `
  query GetIssues($first: Int!, $orderBy: PaginationOrderBy) {
    issues(
      first: $first
      orderBy: $orderBy
      filter: { 
        state: { type: { neq: "completed" } }
      }
    ) {
      nodes {
        ${COMPLETE_ISSUE_FRAGMENT}
      }
    }
  }
`;

/**
 * Search issues with all relationships in single query
 */
export const SEARCH_ISSUES_QUERY = `
  query SearchIssues($query: String!, $first: Int!) {
    searchIssues(query: $query, first: $first, includeArchived: false) {
      nodes {
        ${COMPLETE_ISSUE_FRAGMENT}
      }
    }
  }
`;

/**
 * Get single issue with comments and all relationships
 */
export const GET_ISSUE_BY_ID_QUERY = `
  query GetIssue($id: String!) {
    issue(id: $id) {
      ${COMPLETE_ISSUE_WITH_COMMENTS_FRAGMENT}
    }
  }
`;

/**
 * Get issue by identifier (team key + number)
 */
export const GET_ISSUE_BY_IDENTIFIER_QUERY = `
  query GetIssueByIdentifier($teamKey: String!, $number: Float!) {
    issues(
      filter: {
        team: { key: { eq: $teamKey } }
        number: { eq: $number }
      }
      first: 1
    ) {
      nodes {
        ${COMPLETE_ISSUE_WITH_COMMENTS_FRAGMENT}
      }
    }
  }
`;

/**
 * Batch resolve IDs for issue operations
 */
export const BATCH_RESOLVE_IDS_QUERY = `
  query BatchResolveIds(
    $teamKeys: [String!]
    $teamNames: [String!]
    $projectNames: [String!]
    $labelNames: [String!]
  ) {
    teams(filter: { 
      or: [
        { key: { in: $teamKeys } }
        { name: { in: $teamNames } }
      ]
    }) {
      nodes {
        id
        key
        name
      }
    }
    projects(filter: { name: { in: $projectNames } }) {
      nodes {
        id
        name
      }
    }
    issueLabels(filter: { name: { in: $labelNames } }) {
      nodes {
        id
        name
      }
    }
  }
`;

/**
 * Batch resolve labels by name (including group/label syntax)
 */
export const RESOLVE_LABELS_QUERY = `
  query ResolveLabels($labelNames: [String!], $groupNames: [String!]) {
    issueLabels(filter: { 
      or: [
        { name: { in: $labelNames } }
        { and: [
            { name: { in: $groupNames } }
            { isGroup: { eq: true } }
          ]
        }
      ]
    }) {
      nodes {
        id
        name
        isGroup
        children {
          nodes {
            id
            name
          }
        }
      }
    }
  }
`;

/**
 * Create issue mutation with complete response
 */
export const CREATE_ISSUE_MUTATION = `
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        ${COMPLETE_ISSUE_WITH_COMMENTS_FRAGMENT}
      }
    }
  }
`;

/**
 * Update issue mutation with complete response
 */
export const UPDATE_ISSUE_MUTATION = `
  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        ${COMPLETE_ISSUE_WITH_COMMENTS_FRAGMENT}
      }
    }
  }
`;
