import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphQLAttachmentsService } from "../../src/utils/graphql-attachments-service.js";

/**
 * Unit tests for GraphQLAttachmentsService
 *
 * These tests verify the attachments service methods with mocked GraphQL responses.
 * For integration tests with real API, see tests/integration/attachments-cli.test.ts
 */

describe("GraphQLAttachmentsService", () => {
  let mockGraphQLService: any;
  let service: GraphQLAttachmentsService;

  const mockAttachment = {
    id: "attach-123",
    title: "Test Attachment",
    subtitle: "Test subtitle",
    url: "https://example.com/file.pdf",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    issue: {
      id: "issue-1",
      identifier: "TEST-123",
      title: "Test Issue",
    },
    creator: { id: "user-1", name: "Test User" },
  };

  beforeEach(() => {
    mockGraphQLService = {
      rawRequest: vi.fn(),
    };
    service = new GraphQLAttachmentsService(mockGraphQLService);
  });

  describe("createAttachment()", () => {
    it("should create an attachment successfully", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        attachmentCreate: { success: true, attachment: mockAttachment },
      });

      const result = await service.createAttachment({
        issueId: "issue-1",
        url: "https://example.com/file.pdf",
        title: "Test Attachment",
      });

      expect(mockGraphQLService.rawRequest).toHaveBeenCalledWith(
        expect.stringContaining("mutation AttachmentCreate"),
        {
          input: {
            issueId: "issue-1",
            url: "https://example.com/file.pdf",
            title: "Test Attachment",
          },
        },
      );
      expect(result).toEqual(mockAttachment);
    });

    it("should create attachment with all optional fields", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        attachmentCreate: { success: true, attachment: mockAttachment },
      });

      await service.createAttachment({
        issueId: "issue-1",
        url: "https://example.com/file.pdf",
        title: "Test Attachment",
        subtitle: "Test subtitle",
        commentBody: "Check out this file",
        iconUrl: "https://example.com/icon.png",
      });

      expect(mockGraphQLService.rawRequest).toHaveBeenCalledWith(
        expect.any(String),
        {
          input: {
            issueId: "issue-1",
            url: "https://example.com/file.pdf",
            title: "Test Attachment",
            subtitle: "Test subtitle",
            commentBody: "Check out this file",
            iconUrl: "https://example.com/icon.png",
          },
        },
      );
    });

    it("should throw error with context when creation fails", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        attachmentCreate: { success: false, attachment: null },
      });

      await expect(
        service.createAttachment({
          issueId: "issue-1",
          url: "https://example.com/file.pdf",
          title: "Test Attachment",
        }),
      ).rejects.toThrow(
        'Failed to create attachment on issue issue-1 for URL "https://example.com/file.pdf"',
      );
    });
  });

  describe("deleteAttachment()", () => {
    it("should delete an attachment successfully", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        attachmentDelete: { success: true },
      });

      const result = await service.deleteAttachment("attach-123");

      expect(mockGraphQLService.rawRequest).toHaveBeenCalledWith(
        expect.stringContaining("mutation AttachmentDelete"),
        { id: "attach-123" },
      );
      expect(result).toBe(true);
    });

    it("should throw error with attachment ID when deletion fails", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        attachmentDelete: { success: false },
      });

      await expect(service.deleteAttachment("attach-123")).rejects.toThrow(
        "Failed to delete attachment: attach-123",
      );
    });
  });

  describe("listAttachments()", () => {
    it("should list attachments for an issue", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        issue: { attachments: { nodes: [mockAttachment] } },
      });

      const result = await service.listAttachments("issue-1");

      expect(mockGraphQLService.rawRequest).toHaveBeenCalledWith(
        expect.stringContaining("query ListAttachments"),
        { issueId: "issue-1" },
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockAttachment);
    });

    it("should return empty array when issue has no attachments", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        issue: { attachments: { nodes: [] } },
      });

      const result = await service.listAttachments("issue-1");

      expect(result).toEqual([]);
    });

    it("should throw error when issue not found", async () => {
      mockGraphQLService.rawRequest.mockResolvedValue({
        issue: null,
      });

      await expect(service.listAttachments("nonexistent")).rejects.toThrow(
        "Issue not found: nonexistent",
      );
    });
  });
});
