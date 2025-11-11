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
export const ISSUE_CYCLE_FRAGMENT = `
  cycle {
    id
    name
    number
  }
`;
export const ISSUE_PROJECT_MILESTONE_FRAGMENT = `
  projectMilestone {
    id
    name
    targetDate
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
export const ISSUE_PARENT_FRAGMENT = `
  parent {
    id
    identifier
    title
  }
`;
export const ISSUE_CHILDREN_FRAGMENT = `
  children {
    nodes {
      id
      identifier
      title
    }
  }
`;
export const COMPLETE_ISSUE_FRAGMENT = `
  ${ISSUE_CORE_FIELDS}
  ${ISSUE_STATE_FRAGMENT}
  ${ISSUE_ASSIGNEE_FRAGMENT}
  ${ISSUE_TEAM_FRAGMENT}
  ${ISSUE_PROJECT_FRAGMENT}
  ${ISSUE_LABELS_FRAGMENT}
  ${ISSUE_CYCLE_FRAGMENT}
  ${ISSUE_PROJECT_MILESTONE_FRAGMENT}
  ${ISSUE_PARENT_FRAGMENT}
  ${ISSUE_CHILDREN_FRAGMENT}
`;
export const COMPLETE_ISSUE_WITH_COMMENTS_FRAGMENT = `
  ${COMPLETE_ISSUE_FRAGMENT}
  ${ISSUE_COMMENTS_FRAGMENT}
`;
