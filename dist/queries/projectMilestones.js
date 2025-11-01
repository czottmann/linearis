import { COMPLETE_ISSUE_FRAGMENT } from "./common.js";
export const LIST_PROJECT_MILESTONES_QUERY = `
  query ListProjectMilestones($projectId: String!, $first: Int!) {
    project(id: $projectId) {
      id
      name
      projectMilestones(first: $first) {
        nodes {
          id
          name
          description
          targetDate
          sortOrder
          createdAt
          updatedAt
        }
      }
    }
  }
`;
export const GET_PROJECT_MILESTONE_BY_ID_QUERY = `
  query GetProjectMilestone($id: String!, $issuesFirst: Int) {
    projectMilestone(id: $id) {
      id
      name
      description
      targetDate
      sortOrder
      createdAt
      updatedAt
      project {
        id
        name
      }
      issues(first: $issuesFirst) {
        nodes {
          ${COMPLETE_ISSUE_FRAGMENT}
        }
      }
    }
  }
`;
export const FIND_PROJECT_MILESTONE_BY_NAME_SCOPED = `
  query FindProjectMilestoneScoped($name: String!, $projectId: String!) {
    project(id: $projectId) {
      projectMilestones(filter: { name: { eq: $name } }, first: 10) {
        nodes {
          id
          name
          targetDate
          sortOrder
          project {
            id
            name
          }
        }
      }
    }
  }
`;
export const FIND_PROJECT_MILESTONE_BY_NAME_GLOBAL = `
  query FindProjectMilestoneGlobal($name: String!) {
    projectMilestones(filter: { name: { eq: $name } }, first: 10) {
      nodes {
        id
        name
        targetDate
        sortOrder
        project {
          id
          name
        }
      }
    }
  }
`;
export const CREATE_PROJECT_MILESTONE_MUTATION = `
  mutation CreateProjectMilestone($projectId: String!, $name: String!, $description: String, $targetDate: TimelessDate) {
    projectMilestoneCreate(input: {
      projectId: $projectId
      name: $name
      description: $description
      targetDate: $targetDate
    }) {
      success
      projectMilestone {
        id
        name
        description
        targetDate
        sortOrder
        createdAt
        updatedAt
        project {
          id
          name
        }
      }
    }
  }
`;
export const UPDATE_PROJECT_MILESTONE_MUTATION = `
  mutation UpdateProjectMilestone($id: String!, $name: String, $description: String, $targetDate: TimelessDate, $sortOrder: Float) {
    projectMilestoneUpdate(id: $id, input: {
      name: $name
      description: $description
      targetDate: $targetDate
      sortOrder: $sortOrder
    }) {
      success
      projectMilestone {
        id
        name
        description
        targetDate
        sortOrder
        updatedAt
        project {
          id
          name
        }
      }
    }
  }
`;
