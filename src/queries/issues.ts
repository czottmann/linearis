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
  query SearchIssues($term: String!, $first: Int!) {
    searchIssues(term: $term, first: $first, includeArchived: false) {
      nodes {
        ${COMPLETE_ISSUE_FRAGMENT}
      }
    }
  }
`;

/**
 * Search issues with filters and all relationships in single query
 */
export const FILTERED_SEARCH_ISSUES_QUERY = `
  query FilteredSearchIssues(
    $first: Int!
    $filter: IssueFilter
    $orderBy: PaginationOrderBy
  ) {
    issues(
      first: $first
      filter: $filter
      orderBy: $orderBy
      includeArchived: false
    ) {
      nodes {
        ${COMPLETE_ISSUE_FRAGMENT}
      }
    }
  }
`;

/**
 * Batch resolve for search filters
 */
export const BATCH_RESOLVE_FOR_SEARCH_QUERY = `
  query BatchResolveForSearch(
    $teamKey: String
    $teamName: String
    $projectName: String
    $assigneeEmail: String
  ) {
    # Resolve team if provided
    teams(
      filter: { 
        or: [
          { key: { eq: $teamKey } }
          { name: { eq: $teamName } }
        ]
      }
      first: 1
    ) {
      nodes {
        id
        key
        name
      }
    }
    
    # Resolve project if provided
    projects(filter: { name: { eq: $projectName } }, first: 1) {
      nodes {
        id
        name
      }
    }
    
    # Resolve user by email if provided
    users(filter: { email: { eq: $assigneeEmail } }, first: 1) {
      nodes {
        id
        name
        email
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
 * Batch resolve project by name
 */
export const RESOLVE_PROJECT_BY_NAME_QUERY = `
  query ResolveProjectByName($name: String!) {
    projects(filter: { name: { eq: $name } }, first: 1) {
      nodes {
        id
        name
      }
    }
  }
`;

/**
 * Comprehensive batch resolve for update operations
 */
export const BATCH_RESOLVE_FOR_UPDATE_QUERY = `
  query BatchResolveForUpdate(
    $labelNames: [String!]
    $projectName: String
    $teamKey: String
    $issueNumber: Float
  ) {
    # Resolve labels if provided
    labels: issueLabels(filter: { name: { in: $labelNames } }) {
      nodes {
        id
        name
        isGroup
        parent {
          id
          name
        }
        children {
          nodes {
            id
            name
          }
        }
      }
    }
    
    # Resolve project if provided
    projects(filter: { name: { eq: $projectName } }, first: 1) {
      nodes {
        id
        name
      }
    }
    
    # Resolve issue by identifier if needed
    issues(
      filter: {
        and: [
          { team: { key: { eq: $teamKey } } }
          { number: { eq: $issueNumber } }
        ]
      }
      first: 1
    ) {
      nodes {
        id
        identifier
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

/**
 * Comprehensive batch resolve for create operations
 */
export const BATCH_RESOLVE_FOR_CREATE_QUERY = `
  query BatchResolveForCreate(
    $teamKey: String
    $teamName: String
    $projectName: String
    $labelNames: [String!]
    $parentTeamKey: String
    $parentIssueNumber: Float
  ) {
    # Resolve team if provided
    teams(
      filter: { 
        or: [
          { key: { eq: $teamKey } }
          { name: { eq: $teamName } }
        ]
      }
      first: 1
    ) {
      nodes {
        id
        key
        name
      }
    }
    
    # Resolve project if provided
    projects(filter: { name: { eq: $projectName } }, first: 1) {
      nodes {
        id
        name
      }
    }
    
    # Resolve labels if provided
    labels: issueLabels(filter: { name: { in: $labelNames } }) {
      nodes {
        id
        name
        isGroup
        parent {
          id
          name
        }
        children {
          nodes {
            id
            name
          }
        }
      }
    }
    
    # Resolve parent issue if provided
    parentIssues: issues(
      filter: {
        and: [
          { team: { key: { eq: $parentTeamKey } } }
          { number: { eq: $parentIssueNumber } }
        ]
      }
      first: 1
    ) {
      nodes {
        id
        identifier
      }
    }
  }
`;
