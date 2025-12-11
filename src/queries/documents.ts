/**
 * GraphQL queries and mutations for Linear documents
 *
 * Documents are standalone entities that can be associated with projects,
 * initiatives, or teams. To link a document to an issue, use the
 * attachments API (see attachments.ts).
 */

export const DOCUMENT_FRAGMENT = `
  id
  title
  content
  slugId
  url
  icon
  color
  createdAt
  updatedAt
  creator {
    id
    name
  }
  project {
    id
    name
  }
  trashed
`;

/**
 * Create a new document
 */
export const CREATE_DOCUMENT_MUTATION = `
  mutation DocumentCreate($input: DocumentCreateInput!) {
    documentCreate(input: $input) {
      success
      document {
        ${DOCUMENT_FRAGMENT}
      }
    }
  }
`;

/**
 * Update an existing document
 */
export const UPDATE_DOCUMENT_MUTATION = `
  mutation DocumentUpdate($id: String!, $input: DocumentUpdateInput!) {
    documentUpdate(id: $id, input: $input) {
      success
      document {
        ${DOCUMENT_FRAGMENT}
      }
    }
  }
`;

/**
 * Get a single document by ID
 */
export const GET_DOCUMENT_QUERY = `
  query GetDocument($id: String!) {
    document(id: $id) {
      ${DOCUMENT_FRAGMENT}
    }
  }
`;

/**
 * List documents with optional filtering
 */
export const LIST_DOCUMENTS_QUERY = `
  query ListDocuments($first: Int!, $filter: DocumentFilter) {
    documents(first: $first, filter: $filter) {
      nodes {
        ${DOCUMENT_FRAGMENT}
      }
    }
  }
`;

/**
 * Delete (trash) a document
 *
 * Note: This is a soft delete - the document is moved to trash.
 * Use documentUnarchive to restore.
 */
export const DELETE_DOCUMENT_MUTATION = `
  mutation DocumentDelete($id: String!) {
    documentDelete(id: $id) {
      success
    }
  }
`;
