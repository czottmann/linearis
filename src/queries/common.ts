/**
 * Common GraphQL fragments for reuse across queries
 * 
 * These fragments define reusable field selections for Linear entities,
 * ensuring consistent data structure and reducing duplication in query definitions.
 * Each fragment focuses on specific entity relationships for optimal querying.
 */

/**
 * Core issue fields that are always needed
 * Includes basic metadata and timestamps
 */
export const ISSUE_CORE_FIELDS = `
  id
  identifier
  title
  description
  priority
  estimate
  createdAt
  updatedAt
`;

/**
 * Issue workflow state relationship
 * Provides current status information for the issue
 */
export const ISSUE_STATE_FRAGMENT = `
  state {
    id
    name
  }
`;

/**
 * Issue assignee relationship
 * Provides user information for the assigned person
 */
export const ISSUE_ASSIGNEE_FRAGMENT = `
  assignee {
    id
    name
  }
`;

/**
 * Issue team relationship
 * Provides team information including key and name
 */
export const ISSUE_TEAM_FRAGMENT = `
  team {
    id
    key
    name
  }
`;

/**
 * Issue project relationship
 * Provides project information for issue association
 */
export const ISSUE_PROJECT_FRAGMENT = `
  project {
    id
    name
  }
`;

/**
 * Issue labels relationship
 * Provides all label nodes associated with the issue
 */
export const ISSUE_LABELS_FRAGMENT = `
  labels {
    nodes {
      id
      name
    }
  }
`;

/**
 * Issue comments relationship
 * Provides comment content and user information
 */
export const ISSUE_COMMENTS_FRAGMENT = `
  comments {
    nodes {
      id
      body
      createdAt
      updatedAt
      user {
        id
        name
      }
    }
  }
`;

/**
 * Complete issue fragment with all relationships
 * 
 * Combines all issue fragments into a comprehensive field selection.
 * This is used when full issue details are needed including all
 * relationships (state, assignee, team, project, labels, comments).
 */
export const COMPLETE_ISSUE_FRAGMENT = `
  ${ISSUE_CORE_FIELDS}
  ${ISSUE_STATE_FRAGMENT}
  ${ISSUE_ASSIGNEE_FRAGMENT}
  ${ISSUE_TEAM_FRAGMENT}
  ${ISSUE_PROJECT_FRAGMENT}
  ${ISSUE_LABELS_FRAGMENT}
`;

/**
 * Complete issue fragment including comments
 */
export const COMPLETE_ISSUE_WITH_COMMENTS_FRAGMENT = `
  ${COMPLETE_ISSUE_FRAGMENT}
  ${ISSUE_COMMENTS_FRAGMENT}
`;
