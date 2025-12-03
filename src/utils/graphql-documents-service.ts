import { GraphQLService, createGraphQLService } from "./graphql-service.js";
import { CommandOptions } from "./auth.js";
import {
  CREATE_DOCUMENT_MUTATION,
  UPDATE_DOCUMENT_MUTATION,
  GET_DOCUMENT_QUERY,
  LIST_DOCUMENTS_QUERY,
  DELETE_DOCUMENT_MUTATION,
} from "../queries/documents.js";
import {
  LinearDocument,
  DocumentCreateInput,
  DocumentUpdateInput,
} from "./linear-types.js";

/**
 * Document entity returned from GraphQL queries
 * Re-exported from linear-types for convenience
 */
export type Document = LinearDocument;

/**
 * GraphQL-optimized documents service for single API call operations
 *
 * Documents in Linear are standalone entities that can be associated with
 * projects, initiatives, or teams. They cannot be directly linked to issues.
 * To link a document to an issue, use the attachments API.
 */
export class GraphQLDocumentsService {
  constructor(private graphqlService: GraphQLService) {}

  /**
   * Create a new document
   *
   * @param input Document creation parameters
   * @returns Created document with all fields
   */
  async createDocument(input: DocumentCreateInput): Promise<Document> {
    const result = await this.graphqlService.rawRequest<{
      documentCreate: { success: boolean; document: Document };
    }>(CREATE_DOCUMENT_MUTATION, { input });

    if (!result.documentCreate.success) {
      throw new Error(
        `Failed to create document "${input.title}"${input.projectId ? ` in project ${input.projectId}` : ""}${input.teamId ? ` for team ${input.teamId}` : ""}`,
      );
    }

    return result.documentCreate.document;
  }

  /**
   * Update an existing document
   *
   * @param id Document ID (UUID or slug)
   * @param input Update parameters (only provided fields are updated)
   * @returns Updated document with all fields
   */
  async updateDocument(
    id: string,
    input: DocumentUpdateInput,
  ): Promise<Document> {
    const result = await this.graphqlService.rawRequest<{
      documentUpdate: { success: boolean; document: Document };
    }>(UPDATE_DOCUMENT_MUTATION, { id, input });

    if (!result.documentUpdate.success) {
      throw new Error(`Failed to update document: ${id}`);
    }

    return result.documentUpdate.document;
  }

  /**
   * Get a single document by ID
   *
   * @param id Document ID (UUID or slug)
   * @returns Document with all fields
   * @throws Error if document not found
   */
  async getDocument(id: string): Promise<Document> {
    const result = await this.graphqlService.rawRequest<{
      document: Document | null;
    }>(GET_DOCUMENT_QUERY, { id });

    if (!result.document) {
      throw new Error(`Document not found: ${id}`);
    }

    return result.document;
  }

  /**
   * List documents with optional filtering
   *
   * @param options Filter and pagination options
   * @returns Array of documents
   */
  async listDocuments(options?: {
    projectId?: string;
    first?: number;
  }): Promise<Document[]> {
    const filter = options?.projectId
      ? { project: { id: { eq: options.projectId } } }
      : undefined;

    const result = await this.graphqlService.rawRequest<{
      documents: { nodes: Document[] };
    }>(LIST_DOCUMENTS_QUERY, {
      first: options?.first ?? 50,
      filter,
    });

    return result.documents.nodes;
  }

  /**
   * Delete (trash) a document
   *
   * This is a soft delete - the document is moved to trash.
   *
   * @param id Document ID
   * @returns true if deletion was successful
   * @throws Error if deletion fails
   */
  async deleteDocument(id: string): Promise<boolean> {
    const result = await this.graphqlService.rawRequest<{
      documentDelete: { success: boolean };
    }>(DELETE_DOCUMENT_MUTATION, { id });

    if (!result.documentDelete.success) {
      throw new Error(`Failed to delete document: ${id}`);
    }

    return true;
  }
}

/**
 * Create GraphQLDocumentsService instance with authentication
 */
export async function createGraphQLDocumentsService(
  options: CommandOptions,
): Promise<GraphQLDocumentsService> {
  const graphqlService = await createGraphQLService(options);
  return new GraphQLDocumentsService(graphqlService);
}
