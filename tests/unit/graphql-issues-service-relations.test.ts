import { describe, expect, it, vi, beforeEach } from "vitest";
import { GraphQLIssuesService } from "../../src/utils/graphql-issues-service.js";
import { GraphQLService } from "../../src/utils/graphql-service.js";
import { LinearService } from "../../src/utils/linear-service.js";

/**
 * Unit tests for GraphQLIssuesService relation methods
 *
 * These tests verify the relation transformation and validation logic
 * using mocked GraphQL responses.
 */

// Mock the services
const mockGraphQLService = {
  rawRequest: vi.fn(),
} as unknown as GraphQLService;

const mockLinearService = {
  resolveStatusId: vi.fn(),
} as unknown as LinearService;

describe("GraphQLIssuesService - Relations", () => {
  let service: GraphQLIssuesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GraphQLIssuesService(mockGraphQLService, mockLinearService);
  });

  // Valid UUID format for testing
  const UUID_1 = "550e8400-e29b-12d3-a456-426614174000";
  const UUID_2 = "660e8400-e29b-12d3-a456-426614174001";
  const UUID_3 = "770e8400-e29b-12d3-a456-426614174002";
  const REL_UUID_1 = "880e8400-e29b-12d3-a456-426614174003";
  const REL_UUID_2 = "990e8400-e29b-12d3-a456-426614174004";

  describe("getIssueRelations", () => {
    it("should return empty relations array when issue has no relations", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issue: {
          id: UUID_1,
          identifier: "ABC-123",
          relations: { nodes: [] },
          inverseRelations: { nodes: [] },
        },
      });

      const result = await service.getIssueRelations(UUID_1);

      expect(result).toEqual({
        issueId: UUID_1,
        identifier: "ABC-123",
        relations: [],
      });
    });

    it("should transform outgoing relations correctly", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issue: {
          id: UUID_1,
          identifier: "ABC-123",
          relations: {
            nodes: [
              {
                id: REL_UUID_1,
                type: "blocks",
                createdAt: "2025-01-15T10:30:00.000Z",
                issue: {
                  id: UUID_1,
                  identifier: "ABC-123",
                  title: "Source Issue",
                },
                relatedIssue: {
                  id: UUID_2,
                  identifier: "DEF-456",
                  title: "Blocked Issue",
                },
              },
            ],
          },
          inverseRelations: { nodes: [] },
        },
      });

      const result = await service.getIssueRelations(UUID_1);

      expect(result.relations).toHaveLength(1);
      expect(result.relations[0]).toEqual({
        id: REL_UUID_1,
        type: "blocks",
        createdAt: "2025-01-15T10:30:00.000Z",
        issue: {
          id: UUID_1,
          identifier: "ABC-123",
          title: "Source Issue",
        },
        relatedIssue: {
          id: UUID_2,
          identifier: "DEF-456",
          title: "Blocked Issue",
        },
      });
    });

    it("should transform inverse relations correctly", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issue: {
          id: UUID_2,
          identifier: "DEF-456",
          relations: { nodes: [] },
          inverseRelations: {
            nodes: [
              {
                id: REL_UUID_1,
                type: "blocks",
                createdAt: "2025-01-15T10:30:00.000Z",
                issue: {
                  id: UUID_1,
                  identifier: "ABC-123",
                  title: "Blocking Issue",
                },
                relatedIssue: {
                  id: UUID_2,
                  identifier: "DEF-456",
                  title: "This Issue",
                },
              },
            ],
          },
        },
      });

      const result = await service.getIssueRelations(UUID_2);

      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].type).toBe("blocks");
    });

    it("should combine outgoing and inverse relations", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issue: {
          id: UUID_1,
          identifier: "ABC-123",
          relations: {
            nodes: [
              {
                id: REL_UUID_1,
                type: "blocks",
                createdAt: "2025-01-15T10:30:00.000Z",
                issue: { id: UUID_1, identifier: "ABC-123", title: "Issue 1" },
                relatedIssue: { id: UUID_2, identifier: "DEF-456", title: "Issue 2" },
              },
            ],
          },
          inverseRelations: {
            nodes: [
              {
                id: REL_UUID_2,
                type: "related",
                createdAt: "2025-01-16T10:30:00.000Z",
                issue: { id: UUID_3, identifier: "GHI-789", title: "Issue 3" },
                relatedIssue: { id: UUID_1, identifier: "ABC-123", title: "Issue 1" },
              },
            ],
          },
        },
      });

      const result = await service.getIssueRelations(UUID_1);

      expect(result.relations).toHaveLength(2);
      expect(result.relations[0].id).toBe(REL_UUID_1);
      expect(result.relations[1].id).toBe(REL_UUID_2);
    });

    it("should resolve TEAM-123 identifier to UUID", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issues: {
          nodes: [
            {
              id: UUID_1,
              identifier: "ABC-123",
              relations: { nodes: [] },
              inverseRelations: { nodes: [] },
            },
          ],
        },
      });

      const result = await service.getIssueRelations("ABC-123");

      expect(result.issueId).toBe(UUID_1);
      expect(result.identifier).toBe("ABC-123");
    });

    it("should throw error when issue not found by UUID", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issue: null,
      });

      await expect(
        service.getIssueRelations(UUID_1),
      ).rejects.toThrow(`Issue with ID "${UUID_1}" not found`);
    });

    it("should throw error when issue not found by identifier", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issues: { nodes: [] },
      });

      await expect(service.getIssueRelations("XYZ-999")).rejects.toThrow(
        'Issue with identifier "XYZ-999" not found',
      );
    });
  });

  describe("addIssueRelations", () => {
    it("should create single relation successfully", async () => {
      // First call resolves source issue ID
      mockGraphQLService.rawRequest = vi
        .fn()
        .mockResolvedValueOnce({
          issues: {
            nodes: [{ id: UUID_1 }],
          },
        })
        // Second call resolves target issue ID
        .mockResolvedValueOnce({
          issues: {
            nodes: [{ id: UUID_2 }],
          },
        })
        // Third call creates the relation
        .mockResolvedValueOnce({
          issueRelationCreate: {
            success: true,
            issueRelation: {
              id: REL_UUID_1,
              type: "blocks",
              createdAt: "2025-01-15T10:30:00.000Z",
              issue: { id: UUID_1, identifier: "ABC-123", title: "Source" },
              relatedIssue: { id: UUID_2, identifier: "DEF-456", title: "Target" },
            },
          },
        });

      const result = await service.addIssueRelations(
        "ABC-123",
        ["DEF-456"],
        "blocks",
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(REL_UUID_1);
      expect(result[0].type).toBe("blocks");
    });

    it("should create multiple relations sequentially", async () => {
      // Resolve source UUID
      mockGraphQLService.rawRequest = vi
        .fn()
        .mockResolvedValueOnce({ issues: { nodes: [{ id: UUID_1 }] } })
        // Resolve first target UUID
        .mockResolvedValueOnce({ issues: { nodes: [{ id: UUID_2 }] } })
        // Resolve second target UUID
        .mockResolvedValueOnce({ issues: { nodes: [{ id: UUID_3 }] } })
        // Create first relation
        .mockResolvedValueOnce({
          issueRelationCreate: {
            success: true,
            issueRelation: {
              id: REL_UUID_1,
              type: "related",
              createdAt: "2025-01-15T10:30:00.000Z",
              issue: { id: UUID_1, identifier: "ABC-123", title: "Source" },
              relatedIssue: { id: UUID_2, identifier: "DEF-456", title: "Target 1" },
            },
          },
        })
        // Create second relation
        .mockResolvedValueOnce({
          issueRelationCreate: {
            success: true,
            issueRelation: {
              id: REL_UUID_2,
              type: "related",
              createdAt: "2025-01-15T10:31:00.000Z",
              issue: { id: UUID_1, identifier: "ABC-123", title: "Source" },
              relatedIssue: { id: UUID_3, identifier: "GHI-789", title: "Target 2" },
            },
          },
        });

      const result = await service.addIssueRelations(
        "ABC-123",
        ["DEF-456", "GHI-789"],
        "related",
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(REL_UUID_1);
      expect(result[1].id).toBe(REL_UUID_2);
    });

    it("should pass through UUIDs without resolution", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValueOnce({
        issueRelationCreate: {
          success: true,
          issueRelation: {
            id: REL_UUID_1,
            type: "duplicate",
            createdAt: "2025-01-15T10:30:00.000Z",
            issue: { id: UUID_1, identifier: "ABC-123", title: "Source" },
            relatedIssue: { id: UUID_2, identifier: "DEF-456", title: "Target" },
          },
        },
      });

      const result = await service.addIssueRelations(
        UUID_1,
        [UUID_2],
        "duplicate",
      );

      expect(result).toHaveLength(1);
      // Verify that rawRequest was called only once (no resolution calls)
      expect(mockGraphQLService.rawRequest).toHaveBeenCalledTimes(1);
    });

    it("should throw error when relation creation fails", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValueOnce({
        issueRelationCreate: {
          success: false,
        },
      });

      await expect(
        service.addIssueRelations(UUID_1, [UUID_2], "blocks"),
      ).rejects.toThrow(`Failed to create relation to issue ${UUID_2}`);
    });

    it("should report partial success when some relations fail", async () => {
      const UUID_4 = "aa0e8400-e29b-12d3-a456-426614174005";

      mockGraphQLService.rawRequest = vi
        .fn()
        // First relation succeeds
        .mockResolvedValueOnce({
          issueRelationCreate: {
            success: true,
            issueRelation: {
              id: REL_UUID_1,
              type: "related",
              createdAt: "2025-01-15T10:30:00.000Z",
              issue: { id: UUID_1, identifier: "ABC-123", title: "Source" },
              relatedIssue: { id: UUID_2, identifier: "DEF-456", title: "Target 1" },
            },
          },
        })
        // Second relation succeeds
        .mockResolvedValueOnce({
          issueRelationCreate: {
            success: true,
            issueRelation: {
              id: REL_UUID_2,
              type: "related",
              createdAt: "2025-01-15T10:31:00.000Z",
              issue: { id: UUID_1, identifier: "ABC-123", title: "Source" },
              relatedIssue: { id: UUID_3, identifier: "GHI-789", title: "Target 2" },
            },
          },
        })
        // Third relation fails
        .mockResolvedValueOnce({
          issueRelationCreate: {
            success: false,
          },
        });

      await expect(
        service.addIssueRelations(UUID_1, [UUID_2, UUID_3, UUID_4], "related"),
      ).rejects.toThrow(
        `Failed to create relation to issue ${UUID_4} (2 relation(s) were created before this failure)`,
      );
    });
  });

  describe("removeIssueRelation", () => {
    it("should delete relation successfully", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issueRelationDelete: {
          success: true,
        },
      });

      const result = await service.removeIssueRelation(REL_UUID_1);

      expect(result).toEqual({ success: true });
    });

    it("should throw error when deletion fails", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issueRelationDelete: {
          success: false,
        },
      });

      await expect(
        service.removeIssueRelation(REL_UUID_1),
      ).rejects.toThrow(`Failed to delete relation ${REL_UUID_1}`);
    });

    it("should throw error when relationId is not a valid UUID", async () => {
      await expect(
        service.removeIssueRelation("not-a-uuid"),
      ).rejects.toThrow(
        `Invalid relation ID "not-a-uuid": must be a valid UUID. Use 'issues relations list' to find relation IDs.`,
      );

      // Verify rawRequest was never called
      expect(mockGraphQLService.rawRequest).not.toHaveBeenCalled();
    });

    it("should throw error when relationId looks like an issue identifier", async () => {
      await expect(
        service.removeIssueRelation("ABC-123"),
      ).rejects.toThrow(
        `Invalid relation ID "ABC-123": must be a valid UUID. Use 'issues relations list' to find relation IDs.`,
      );
    });
  });

  describe("relation type support", () => {
    it.each(["blocks", "duplicate", "related", "similar"] as const)(
      "should support %s relation type",
      async (type) => {
        mockGraphQLService.rawRequest = vi.fn().mockResolvedValueOnce({
          issueRelationCreate: {
            success: true,
            issueRelation: {
              id: REL_UUID_1,
              type: type,
              createdAt: "2025-01-15T10:30:00.000Z",
              issue: { id: UUID_1, identifier: "ABC-123", title: "Source" },
              relatedIssue: { id: UUID_2, identifier: "DEF-456", title: "Target" },
            },
          },
        });

        const result = await service.addIssueRelations(
          UUID_1,
          [UUID_2],
          type,
        );

        expect(result[0].type).toBe(type);
      },
    );
  });

  describe("relation data validation", () => {
    it("should throw error when relation.issue is null", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issue: {
          id: UUID_1,
          identifier: "ABC-123",
          relations: {
            nodes: [
              {
                id: REL_UUID_1,
                type: "blocks",
                createdAt: "2025-01-15T10:30:00.000Z",
                issue: null,
                relatedIssue: { id: UUID_2, identifier: "DEF-456", title: "Target" },
              },
            ],
          },
          inverseRelations: { nodes: [] },
        },
      });

      await expect(
        service.getIssueRelations(UUID_1),
      ).rejects.toThrow("Invalid relation data: missing issue field");
    });

    it("should throw error when relation.relatedIssue is null", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issue: {
          id: UUID_1,
          identifier: "ABC-123",
          relations: {
            nodes: [
              {
                id: REL_UUID_1,
                type: "blocks",
                createdAt: "2025-01-15T10:30:00.000Z",
                issue: { id: UUID_1, identifier: "ABC-123", title: "Source" },
                relatedIssue: null,
              },
            ],
          },
          inverseRelations: { nodes: [] },
        },
      });

      await expect(
        service.getIssueRelations(UUID_1),
      ).rejects.toThrow("Invalid relation data: missing relatedIssue field");
    });

    it("should throw error when relation.issue is undefined", async () => {
      mockGraphQLService.rawRequest = vi.fn().mockResolvedValue({
        issue: {
          id: UUID_1,
          identifier: "ABC-123",
          relations: {
            nodes: [
              {
                id: REL_UUID_1,
                type: "blocks",
                createdAt: "2025-01-15T10:30:00.000Z",
                // issue field is missing (undefined)
                relatedIssue: { id: UUID_2, identifier: "DEF-456", title: "Target" },
              },
            ],
          },
          inverseRelations: { nodes: [] },
        },
      });

      await expect(
        service.getIssueRelations(UUID_1),
      ).rejects.toThrow("Invalid relation data: missing issue field");
    });
  });
});
