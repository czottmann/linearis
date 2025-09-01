/**
 * GraphQL queries for project operations
 */

import { COMPLETE_PROJECT_FRAGMENT } from "./common.js";

/**
 * Get all projects with relationships
 */
export const GET_PROJECTS_QUERY = `
  query GetProjects($first: Int!, $orderBy: PaginationOrderBy) {
    projects(
      first: $first
      orderBy: $orderBy
      filter: { 
        state: { neq: "completed" }
      }
    ) {
      nodes {
        ${COMPLETE_PROJECT_FRAGMENT}
      }
    }
  }
`;

/**
 * Resolve project ID by name
 */
export const RESOLVE_PROJECT_QUERY = `
  query ResolveProject($name: String!) {
    projects(filter: { name: { eq: $name } }, first: 1) {
      nodes {
        id
        name
      }
    }
  }
`;
