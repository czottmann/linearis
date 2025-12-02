import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphQLIssuesService } from "../../src/utils/graphql-issues-service.js";
import type { GraphQLService } from "../../src/utils/graphql-service.js";

/**
 * Unit tests for team resolution validation in GraphQLIssuesService
 *
 * These tests verify the fix for issue #16:
 * - `--team` filter silently matches wrong team when using key/name
 *
 * Root cause: GraphQL `or` filter with undefined variables matches anything,
 * so when teamKey or teamName is undefined, `{ eq: undefined }` matches any team.
 *
 * The fix: After batch resolve, validate that the returned team actually
 * matches the requested identifier before using it.
 */

describe("GraphQLIssuesService - Team Resolution Validation", () => {
  let mockGraphQLService: {
    rawRequest: ReturnType<typeof vi.fn>;
  };
  let service: GraphQLIssuesService;

  beforeEach(() => {
    mockGraphQLService = {
      rawRequest: vi.fn(),
    };

    service = new GraphQLIssuesService(
      mockGraphQLService as unknown as GraphQLService,
    );
  });

  describe("searchIssues - team validation", () => {
    it("should not match wrong team when team key is not found", async () => {
      // Setup: batch resolve returns a DIFFERENT team (the bug behaviour)
      // This happens because the `or` filter with undefined matches anything
      mockGraphQLService.rawRequest.mockResolvedValue({
        teams: {
          nodes: [
            { id: "wrong-team-id", key: "OTHER", name: "Other Team" },
          ],
        },
        projects: { nodes: [] },
        users: { nodes: [] },
      });

      // Even though a team was returned, it doesn't match the requested key
      await expect(
        service.searchIssues({
          query: "test",
          teamId: "NONEXISTENT",
          limit: 10,
        }),
      ).rejects.toThrow('Team "NONEXISTENT" not found');
    });

    it("should not match wrong team when team name is not found", async () => {
      // Setup: batch resolve returns a DIFFERENT team
      mockGraphQLService.rawRequest.mockResolvedValue({
        teams: {
          nodes: [
            { id: "wrong-team-id", key: "OTHER", name: "Other Team" },
          ],
        },
        projects: { nodes: [] },
        users: { nodes: [] },
      });

      // Team name doesn't match what was requested
      await expect(
        service.searchIssues({
          query: "test",
          teamId: "Nonexistent Team",
          limit: 10,
        }),
      ).rejects.toThrow('Team "Nonexistent Team" not found');
    });

    it("should accept team when key matches exactly", async () => {
      // Setup: batch resolve returns the correct team
      mockGraphQLService.rawRequest
        .mockResolvedValueOnce({
          teams: {
            nodes: [
              { id: "correct-team-id", key: "ENG", name: "Engineering" },
            ],
          },
          projects: { nodes: [] },
          users: { nodes: [] },
        })
        .mockResolvedValueOnce({
          issues: { nodes: [] },
        });

      // Should not throw - team key matches
      const result = await service.searchIssues({
        query: "test",
        teamId: "ENG",
        limit: 10,
      });

      expect(result).toEqual([]);
    });

    it("should accept team when name matches exactly", async () => {
      // Setup: batch resolve returns the correct team
      mockGraphQLService.rawRequest
        .mockResolvedValueOnce({
          teams: {
            nodes: [
              { id: "correct-team-id", key: "ENG", name: "Engineering" },
            ],
          },
          projects: { nodes: [] },
          users: { nodes: [] },
        })
        .mockResolvedValueOnce({
          issues: { nodes: [] },
        });

      // Should not throw - team name matches
      const result = await service.searchIssues({
        query: "test",
        teamId: "Engineering",
        limit: 10,
      });

      expect(result).toEqual([]);
    });

    it("should accept team when name matches case-insensitively", async () => {
      // Setup: batch resolve returns team with different case
      mockGraphQLService.rawRequest
        .mockResolvedValueOnce({
          teams: {
            nodes: [
              { id: "correct-team-id", key: "ENG", name: "Engineering" },
            ],
          },
          projects: { nodes: [] },
          users: { nodes: [] },
        })
        .mockResolvedValueOnce({
          issues: { nodes: [] },
        });

      // Should not throw - team name matches case-insensitively
      const result = await service.searchIssues({
        query: "test",
        teamId: "engineering",
        limit: 10,
      });

      expect(result).toEqual([]);
    });

    it("should accept team key containing digits at end", async () => {
      // Bug: regex /^[A-Z]+$/ excludes digits, so "ABC1" is treated as team name
      // This causes lookup by name "ABC1" instead of key "ABC1"
      // The GraphQL query then uses teamName="ABC1", not teamKey="ABC1"
      // Since no team has name "ABC1", the `or` filter with undefined teamKey
      // matches any team, returning a wrong result.
      //
      // To test this properly, we need to verify the QUERY is built correctly.
      // We do this by checking which variables are passed to rawRequest.
      mockGraphQLService.rawRequest
        .mockResolvedValueOnce({
          teams: {
            nodes: [
              { id: "abc1-team-id", key: "ABC1", name: "Alpha Bravo Charlie" },
            ],
          },
          projects: { nodes: [] },
          users: { nodes: [] },
        })
        .mockResolvedValueOnce({
          issues: { nodes: [] },
        });

      await service.searchIssues({
        query: "test",
        teamId: "ABC1",
        limit: 10,
      });

      // The key assertion: teamKey should be set to the value, teamName to null
      // Bug: code sets teamName="ABC1" instead of teamKey="ABC1"
      // Fix: explicitly set both (one to value, one to null) for Linear's GraphQL or filter
      const batchResolveCall = mockGraphQLService.rawRequest.mock.calls[0];
      const variables = batchResolveCall[1];
      expect(variables.teamKey).toBe("ABC1");
      expect(variables.teamName).toBeNull();
    });

    it("should accept team key starting with digits", async () => {
      mockGraphQLService.rawRequest
        .mockResolvedValueOnce({
          teams: {
            nodes: [
              { id: "42x-team-id", key: "42X", name: "Forty Two X" },
            ],
          },
          projects: { nodes: [] },
          users: { nodes: [] },
        })
        .mockResolvedValueOnce({
          issues: { nodes: [] },
        });

      await service.searchIssues({
        query: "test",
        teamId: "42X",
        limit: 10,
      });

      // The key assertion: teamKey should be set to the value, teamName to null
      const batchResolveCall = mockGraphQLService.rawRequest.mock.calls[0];
      const variables = batchResolveCall[1];
      expect(variables.teamKey).toBe("42X");
      expect(variables.teamName).toBeNull();
    });

    it("should pass through UUID without validation", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";

      // Setup: no batch resolve needed for UUID
      mockGraphQLService.rawRequest.mockResolvedValue({
        issues: { nodes: [] },
      });

      // UUID should be used directly without batch resolve
      const result = await service.searchIssues({
        query: "test",
        teamId: uuid,
        limit: 10,
      });

      expect(result).toEqual([]);
      // Should only call once (the search query), not batch resolve
      expect(mockGraphQLService.rawRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe("createIssue - team validation", () => {
    it("should not match wrong team when team key is not found", async () => {
      // Setup: batch resolve returns a DIFFERENT team
      mockGraphQLService.rawRequest.mockResolvedValue({
        teams: {
          nodes: [
            { id: "wrong-team-id", key: "OTHER", name: "Other Team" },
          ],
        },
        projects: { nodes: [] },
        labels: { nodes: [] },
        parentIssues: { nodes: [] },
      });

      await expect(
        service.createIssue({
          title: "Test Issue",
          teamId: "NONEXISTENT",
        }),
      ).rejects.toThrow('Team "NONEXISTENT" not found');
    });

    it("should accept team when key matches exactly", async () => {
      // Setup: batch resolve returns correct team, then create succeeds
      mockGraphQLService.rawRequest
        .mockResolvedValueOnce({
          teams: {
            nodes: [
              { id: "correct-team-id", key: "ENG", name: "Engineering" },
            ],
          },
          projects: { nodes: [] },
          labels: { nodes: [] },
          parentIssues: { nodes: [] },
        })
        .mockResolvedValueOnce({
          issueCreate: {
            success: true,
            issue: {
              id: "new-issue-id",
              identifier: "ENG-123",
              title: "Test Issue",
              description: null,
              priority: 0,
              estimate: null,
              team: { id: "correct-team-id", key: "ENG", name: "Engineering" },
              state: { id: "state-1", name: "Backlog" },
              assignee: null,
              project: null,
              cycle: null,
              projectMilestone: null,
              labels: { nodes: [] },
              comments: { nodes: [] },
              parent: null,
              children: { nodes: [] },
              createdAt: "2025-01-01T00:00:00Z",
              updatedAt: "2025-01-01T00:00:00Z",
            },
          },
        });

      const result = await service.createIssue({
        title: "Test Issue",
        teamId: "ENG",
      });

      expect(result.identifier).toBe("ENG-123");
    });

    it("should accept team key containing digits", async () => {
      // Bug: regex /^[A-Z]+$/ excludes digits, so "DEV2" is treated as team name
      mockGraphQLService.rawRequest
        .mockResolvedValueOnce({
          teams: {
            nodes: [
              { id: "dev2-team-id", key: "DEV2", name: "Development Team 2" },
            ],
          },
          projects: { nodes: [] },
          labels: { nodes: [] },
          parentIssues: { nodes: [] },
        })
        .mockResolvedValueOnce({
          issueCreate: {
            success: true,
            issue: {
              id: "new-issue-id",
              identifier: "DEV2-456",
              title: "Test Issue",
              description: null,
              priority: 0,
              estimate: null,
              team: { id: "dev2-team-id", key: "DEV2", name: "Development Team 2" },
              state: { id: "state-1", name: "Triage" },
              assignee: null,
              project: null,
              cycle: null,
              projectMilestone: null,
              labels: { nodes: [] },
              comments: { nodes: [] },
              parent: null,
              children: { nodes: [] },
              createdAt: "2025-01-01T00:00:00Z",
              updatedAt: "2025-01-01T00:00:00Z",
            },
          },
        });

      await service.createIssue({
        title: "Test Issue",
        teamId: "DEV2",
      });

      // The key assertion: teamKey should be set to the value, teamName to null
      // Bug: code sets teamName="DEV2" instead of teamKey="DEV2"
      // Fix: explicitly set both (one to value, one to null) for Linear's GraphQL or filter
      const batchResolveCall = mockGraphQLService.rawRequest.mock.calls[0];
      const variables = batchResolveCall[1];
      expect(variables.teamKey).toBe("DEV2");
      expect(variables.teamName).toBeNull();
    });
  });
});
