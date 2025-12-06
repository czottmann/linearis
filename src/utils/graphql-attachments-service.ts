import { GraphQLService, createGraphQLService } from "./graphql-service.js";
import { CommandOptions } from "./auth.js";
import {
  CREATE_ATTACHMENT_MUTATION,
  DELETE_ATTACHMENT_MUTATION,
  LIST_ATTACHMENTS_QUERY,
} from "../queries/attachments.js";
import { LinearAttachment, AttachmentCreateInput } from "./linear-types.js";

/**
 * Attachment entity returned from GraphQL queries
 * Re-exported from linear-types for convenience
 */
export type Attachment = LinearAttachment;

/**
 * GraphQL-optimized attachments service for single API call operations
 *
 * Attachments allow linking any URL to an issue. This is the mechanism
 * to associate documents (or any external resource) with issues, since
 * documents cannot be directly linked to issues in Linear's data model.
 *
 * Key behavior: Attachments are idempotent - creating an attachment with
 * the same url + issueId will update the existing attachment.
 */
export class GraphQLAttachmentsService {
  constructor(private graphqlService: GraphQLService) {}

  /**
   * Create an attachment on an issue
   *
   * If an attachment with the same url and issueId already exists,
   * the existing record is updated instead of creating a duplicate.
   *
   * @param input Attachment creation parameters
   * @returns Created or updated attachment
   */
  async createAttachment(input: AttachmentCreateInput): Promise<Attachment> {
    const result = await this.graphqlService.rawRequest<{
      attachmentCreate: { success: boolean; attachment: Attachment };
    }>(CREATE_ATTACHMENT_MUTATION, { input });

    if (!result.attachmentCreate.success) {
      throw new Error(
        `Failed to create attachment on issue ${input.issueId} for URL "${input.url}"`,
      );
    }

    return result.attachmentCreate.attachment;
  }

  /**
   * Delete an attachment
   *
   * @param id Attachment ID
   * @returns true if deletion was successful
   * @throws Error if deletion fails
   */
  async deleteAttachment(id: string): Promise<boolean> {
    const result = await this.graphqlService.rawRequest<{
      attachmentDelete: { success: boolean };
    }>(DELETE_ATTACHMENT_MUTATION, { id });

    if (!result.attachmentDelete.success) {
      throw new Error(`Failed to delete attachment: ${id}`);
    }

    return true;
  }

  /**
   * List attachments on an issue
   *
   * @param issueId Issue ID (UUID)
   * @returns Array of attachments
   * @throws Error if issue not found
   */
  async listAttachments(issueId: string): Promise<Attachment[]> {
    const result = await this.graphqlService.rawRequest<{
      issue: { attachments: { nodes: Attachment[] } } | null;
    }>(LIST_ATTACHMENTS_QUERY, { issueId });

    if (!result.issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    return result.issue.attachments.nodes;
  }
}

/**
 * Create GraphQLAttachmentsService instance with authentication
 */
export async function createGraphQLAttachmentsService(
  options: CommandOptions,
): Promise<GraphQLAttachmentsService> {
  const graphqlService = await createGraphQLService(options);
  return new GraphQLAttachmentsService(graphqlService);
}
