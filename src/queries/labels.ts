/**
 * GraphQL queries for label operations
 */

import { COMPLETE_LABEL_FRAGMENT } from "./common.js";

/**
 * Get all labels with relationships
 */
export const GET_LABELS_QUERY = `
  query GetLabels($first: Int!, $teamId: String) {
    issueLabels(
      first: $first
      filter: {
        and: [
          { isGroup: { eq: false } }
          $teamId ? { team: { id: { eq: $teamId } } } : {}
        ]
      }
    ) {
      nodes {
        ${COMPLETE_LABEL_FRAGMENT}
      }
    }
  }
`;

/**
 * Resolve label IDs by names (supports group/label syntax)
 */
export const RESOLVE_LABEL_IDS_QUERY = `
  query ResolveLabelIds($names: [String!]) {
    issueLabels(filter: { name: { in: $names } }) {
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
  }
`;
