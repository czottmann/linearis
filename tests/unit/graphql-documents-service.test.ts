import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphQLDocumentsService } from "../../src/utils/graphql-documents-service.js";

/**
 * Unit tests for GraphQLDocumentsService
 *
 * These tests verify the documents service methods with mocked GraphQL responses.
 * For integration tests with real API, see tests/integration/documents-cli.test.ts
 */

describe("GraphQLDocumentsService", () => {
  let mockGraphQLService: any;
  let service: GraphQLDocumentsService;

  const mockDocument = {
    id: "doc-123",
    title: "Test Document",
    content: "Test content",
    slugId: "test-slug",
    url: "https://linear.app/test/document/test-slug",
    icon: null,
    color: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    creator: { id: "user-1", name: "Test User" },
    project: { id: "proj-1", name: "Test Project" },
    trashed: false,
  };

  beforeEach(() => {
    mockGraphQLService = {
      rawRequest: vi.fn(),
    };
    service = new GraphQLDocumentsService(mockGraphQLService);
  });

  describe("createDocument()", () => {
    it("should create a document successfully", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        documentCreate: { success: true, document: mockDocument },
      });

      const result = await service.createDocument({
        title: "Test Document",
        content: "Test content",
        projectId: "proj-1",
      });

      expect(mockGraphQLService.rawRequest).toHaveBeenCalledWith(
        expect.stringContaining("mutation DocumentCreate"),
        {
          input: {
            title: "Test Document",
            content: "Test content",
            projectId: "proj-1",
          },
        },
      );
      expect(result).toEqual(mockDocument);
    });

    it("should throw error with context when creation fails", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        documentCreate: { success: false, document: null },
      });

      await expect(
        service.createDocument({
          title: "Failed Doc",
          projectId: "proj-1",
          teamId: "team-1",
        }),
      ).rejects.toThrow(
        'Failed to create document "Failed Doc" in project proj-1 for team team-1',
      );
    });

    it("should throw error with title only when no project/team", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        documentCreate: { success: false, document: null },
      });

      await expect(
        service.createDocument({ title: "Orphan Doc" }),
      ).rejects.toThrow('Failed to create document "Orphan Doc"');
    });
  });

  describe("updateDocument()", () => {
    it("should update a document successfully", async () => {
      const updatedDoc = { ...mockDocument, title: "Updated Title" };
      mockGraphQLService.rawRequest.mockResolvedValue({
        documentUpdate: { success: true, document: updatedDoc },
      });

      const result = await service.updateDocument("doc-123", {
        title: "Updated Title",
      });

      expect(mockGraphQLService.rawRequest).toHaveBeenCalledWith(
        expect.stringContaining("mutation DocumentUpdate"),
        { id: "doc-123", input: { title: "Updated Title" } },
      );
      expect(result.title).toBe("Updated Title");
    });

    it("should throw error with document ID when update fails", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        documentUpdate: { success: false, document: null },
      });

      await expect(
        service.updateDocument("doc-123", { title: "New Title" }),
      ).rejects.toThrow("Failed to update document: doc-123");
    });
  });

  describe("getDocument()", () => {
    it("should get a document by ID", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        document: mockDocument,
      });

      const result = await service.getDocument("doc-123");

      expect(mockGraphQLService.rawRequest).toHaveBeenCalledWith(
        expect.stringContaining("query GetDocument"),
        { id: "doc-123" },
      );
      expect(result).toEqual(mockDocument);
    });

    it("should throw error when document not found", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        document: null,
      });

      await expect(service.getDocument("nonexistent")).rejects.toThrow(
        "Document not found: nonexistent",
      );
    });
  });

  describe("listDocuments()", () => {
    it("should list documents without filter", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        documents: { nodes: [mockDocument] },
      });

      const result = await service.listDocuments();

      expect(mockGraphQLService.rawRequest).toHaveBeenCalledWith(
        expect.stringContaining("query ListDocuments"),
        { first: 50, filter: undefined },
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockDocument);
    });

    it("should list documents with project filter", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        documents: { nodes: [mockDocument] },
      });

      const result = await service.listDocuments({
        projectId: "proj-1",
        first: 100,
      });

      expect(mockGraphQLService.rawRequest).toHaveBeenCalledWith(
        expect.stringContaining("query ListDocuments"),
        {
          first: 100,
          filter: { project: { id: { eq: "proj-1" } } },
        },
      );
      expect(result).toHaveLength(1);
    });

    it("should return empty array when no documents", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        documents: { nodes: [] },
      });

      const result = await service.listDocuments();

      expect(result).toEqual([]);
    });
  });

  describe("deleteDocument()", () => {
    it("should delete a document successfully", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        documentDelete: { success: true },
      });

      const result = await service.deleteDocument("doc-123");

      expect(mockGraphQLService.rawRequest).toHaveBeenCalledWith(
        expect.stringContaining("mutation DocumentDelete"),
        { id: "doc-123" },
      );
      expect(result).toBe(true);
    });

    it("should throw error with document ID when deletion fails", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        documentDelete: { success: false },
      });

      await expect(service.deleteDocument("doc-123")).rejects.toThrow(
        "Failed to delete document: doc-123",
      );
    });
  });
});
