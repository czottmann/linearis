/**
 * GraphQL queries and mutations for Linear attachments
 *
 * Attachments allow linking any URL to an issue. This is the mechanism
 * to associate documents (or any external resource) with issues, since
 * documents cannot be directly linked to issues in Linear's data model.
 *
 * Key behavior: Attachments are idempotent - creating an attachment with
 * the same url + issueId will update the existing attachment.
 */

export const ATTACHMENT_FRAGMENT = `
  id
  title
  subtitle
  url
  createdAt
  updatedAt
  issue {
    id
    identifier
    title
  }
  creator {
    id
    name
  }
`;

/**
 * Create an attachment on an issue
 *
 * If an attachment with the same url and issueId already exists,
 * the existing record is updated instead of creating a duplicate.
 */
export const CREATE_ATTACHMENT_MUTATION = `
  mutation AttachmentCreate($input: AttachmentCreateInput!) {
    attachmentCreate(input: $input) {
      success
      attachment {
        ${ATTACHMENT_FRAGMENT}
      }
    }
  }
`;

/**
 * Delete an attachment
 */
export const DELETE_ATTACHMENT_MUTATION = `
  mutation AttachmentDelete($id: String!) {
    attachmentDelete(id: $id) {
      success
    }
  }
`;

/**
 * List attachments on an issue
 */
export const LIST_ATTACHMENTS_QUERY = `
  query ListAttachments($issueId: String!) {
    issue(id: $issueId) {
      attachments {
        nodes {
          ${ATTACHMENT_FRAGMENT}
        }
      }
    }
  }
`;
