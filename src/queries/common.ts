/**
 * Common GraphQL fragments for reuse across queries
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

export const ISSUE_STATE_FRAGMENT = `
  state {
    id
    name
  }
`;

export const ISSUE_ASSIGNEE_FRAGMENT = `
  assignee {
    id
    name
  }
`;

export const ISSUE_TEAM_FRAGMENT = `
  team {
    id
    key
    name
  }
`;

export const ISSUE_PROJECT_FRAGMENT = `
  project {
    id
    name
  }
`;

export const ISSUE_LABELS_FRAGMENT = `
  labels {
    nodes {
      id
      name
    }
  }
`;

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

/**
 * Project fragments
 */
export const PROJECT_CORE_FIELDS = `
  id
  name
  description
  state
  progress
  targetDate
  createdAt
  updatedAt
`;

export const PROJECT_TEAMS_FRAGMENT = `
  teams {
    nodes {
      id
      key
      name
    }
  }
`;

export const PROJECT_LEAD_FRAGMENT = `
  lead {
    id
    name
  }
`;

export const COMPLETE_PROJECT_FRAGMENT = `
  ${PROJECT_CORE_FIELDS}
  ${PROJECT_TEAMS_FRAGMENT}
  ${PROJECT_LEAD_FRAGMENT}
`;

/**
 * Label fragments
 */
export const LABEL_CORE_FIELDS = `
  id
  name
  color
  isGroup
`;

export const LABEL_TEAM_FRAGMENT = `
  team {
    id
    name
  }
`;

export const LABEL_PARENT_FRAGMENT = `
  parent {
    id
    name
  }
`;

export const COMPLETE_LABEL_FRAGMENT = `
  ${LABEL_CORE_FIELDS}
  ${LABEL_TEAM_FRAGMENT}
  ${LABEL_PARENT_FRAGMENT}
`;
