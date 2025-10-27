import { COMPLETE_ISSUE_FRAGMENT, COMPLETE_ISSUE_WITH_COMMENTS_FRAGMENT, } from "./common.js";
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
export const SEARCH_ISSUES_QUERY = `
  query SearchIssues($term: String!, $first: Int!) {
    searchIssues(term: $term, first: $first, includeArchived: false) {
      nodes {
        ${COMPLETE_ISSUE_FRAGMENT}
      }
    }
  }
`;
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
export const GET_ISSUE_BY_ID_QUERY = `
  query GetIssue($id: String!) {
    issue(id: $id) {
      ${COMPLETE_ISSUE_WITH_COMMENTS_FRAGMENT}
    }
  }
`;
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
export const BATCH_RESOLVE_FOR_UPDATE_QUERY = `
  query BatchResolveForUpdate(
    $labelNames: [String!]
    $projectName: String
    $teamKey: String
    $issueNumber: Float
    $milestoneName: String
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
        projectMilestones {
          nodes {
            id
            name
          }
        }
      }
    }

    # Resolve milestone if provided (standalone query in case no project context)
    milestones: projectMilestones(
      filter: { name: { eq: $milestoneName } }
      first: 1
    ) {
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
        projectMilestones {
          nodes { id name }
        }
        # Projects don't own cycles directly, but include teams for context if needed
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

    # Resolve cycles by name (team-scoped lookup is preferred but we also provide global fallback)
    
  }
`;
