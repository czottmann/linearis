import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinearService } from "../../src/utils/linear-service.js";

/**
 * Unit tests for LinearService initiative methods
 *
 * These tests verify the initiative-related methods:
 * - getInitiatives() - Fetch initiatives with filters
 * - getInitiativeById() - Fetch single initiative with projects/sub-initiatives
 * - resolveInitiativeId() - Resolve initiative by name or ID
 * - updateInitiative() - Update initiative fields
 *
 * Note: These tests use mocks to avoid hitting the real Linear API.
 * For integration tests with real API, see tests/integration/
 */

describe("LinearService - Initiative Methods", () => {
  let mockClient: any;
  let service: LinearService;

  beforeEach(() => {
    // Create mock Linear client
    mockClient = {
      initiatives: vi.fn(),
      initiative: vi.fn(),
      updateInitiative: vi.fn(),
    };

    // Create service with mock client
    service = new LinearService("fake-token");
    // @ts-ignore - Replace internal client with mock
    service.client = mockClient;
  });

  describe("getInitiatives()", () => {
    it("should fetch initiatives without filters", async () => {
      const mockInitiatives = [
        {
          id: "init-1",
          name: "Q1 Goals",
          description: "First quarter objectives",
          status: "Active",
          health: "onTrack",
          targetDate: new Date("2025-03-31"),
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-15"),
          owner: Promise.resolve({
            id: "user-1",
            name: "John Doe",
          }),
        },
      ];

      mockClient.initiatives.mockResolvedValue({
        nodes: mockInitiatives,
      });

      const result = await service.getInitiatives();

      expect(mockClient.initiatives).toHaveBeenCalledWith({
        filter: undefined,
        first: 50,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("init-1");
      expect(result[0].name).toBe("Q1 Goals");
      expect(result[0].status).toBe("Active");
      expect(result[0].owner?.name).toBe("John Doe");
    });

    it("should fetch initiatives with status filter", async () => {
      mockClient.initiatives.mockResolvedValue({ nodes: [] });

      await service.getInitiatives("Active");

      expect(mockClient.initiatives).toHaveBeenCalledWith({
        filter: { status: { eq: "Active" } },
        first: 50,
      });
    });

    it("should fetch initiatives with owner filter", async () => {
      mockClient.initiatives.mockResolvedValue({ nodes: [] });

      await service.getInitiatives(undefined, "user-123");

      expect(mockClient.initiatives).toHaveBeenCalledWith({
        filter: { owner: { id: { eq: "user-123" } } },
        first: 50,
      });
    });

    it("should respect limit parameter", async () => {
      mockClient.initiatives.mockResolvedValue({ nodes: [] });

      await service.getInitiatives(undefined, undefined, 10);

      expect(mockClient.initiatives).toHaveBeenCalledWith({
        filter: undefined,
        first: 10,
      });
    });

    it("should convert dates to ISO 8601 strings", async () => {
      const mockInitiatives = [
        {
          id: "init-1",
          name: "Test",
          status: "Planned",
          targetDate: new Date("2025-06-30T00:00:00Z"),
          createdAt: new Date("2025-01-01T00:00:00Z"),
          updatedAt: new Date("2025-01-15T12:00:00Z"),
          owner: Promise.resolve(null),
        },
      ];

      mockClient.initiatives.mockResolvedValue({ nodes: mockInitiatives });

      const result = await service.getInitiatives();

      expect(typeof result[0].targetDate).toBe("string");
      expect(typeof result[0].createdAt).toBe("string");
      expect(typeof result[0].updatedAt).toBe("string");
      expect(result[0].targetDate).toBe("2025-06-30T00:00:00.000Z");
    });
  });

  describe("getInitiativeById()", () => {
    it("should fetch initiative with projects and sub-initiatives", async () => {
      const mockOwner = { id: "user-1", name: "Jane Doe" };
      const mockProjects = [
        { id: "proj-1", name: "Project A", state: "started", progress: 0.5 },
      ];
      const mockSubInitiatives = [
        { id: "sub-1", name: "Sub Initiative", status: "Planned" },
      ];
      const mockParent = { id: "parent-1", name: "Parent Initiative" };

      const mockInitiative = {
        id: "init-1",
        name: "Main Initiative",
        description: "Description here",
        status: "Active",
        health: "atRisk",
        targetDate: new Date("2025-12-31"),
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-15"),
        owner: Promise.resolve(mockOwner),
        projects: vi.fn().mockResolvedValue({ nodes: mockProjects }),
        parentInitiative: Promise.resolve(mockParent),
        subInitiatives: vi.fn().mockResolvedValue({ nodes: mockSubInitiatives }),
      };

      mockClient.initiative.mockResolvedValue(mockInitiative);

      const result = await service.getInitiativeById("init-1", 25);

      expect(mockClient.initiative).toHaveBeenCalledWith("init-1");
      expect(mockInitiative.projects).toHaveBeenCalledWith({ first: 25 });
      expect(mockInitiative.subInitiatives).toHaveBeenCalledWith({ first: 50 });
      expect(result.id).toBe("init-1");
      expect(result.owner?.name).toBe("Jane Doe");
      expect(result.projects).toHaveLength(1);
      expect(result.projects![0].name).toBe("Project A");
      expect(result.subInitiatives).toHaveLength(1);
      expect(result.parentInitiative?.name).toBe("Parent Initiative");
    });

    it("should use default projects limit of 50", async () => {
      const mockInitiative = {
        id: "init-1",
        name: "Test",
        status: "Planned",
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: Promise.resolve(null),
        projects: vi.fn().mockResolvedValue({ nodes: [] }),
        parentInitiative: Promise.resolve(null),
        subInitiatives: vi.fn().mockResolvedValue({ nodes: [] }),
      };

      mockClient.initiative.mockResolvedValue(mockInitiative);

      await service.getInitiativeById("init-1");

      expect(mockInitiative.projects).toHaveBeenCalledWith({ first: 50 });
    });
  });

  describe("resolveInitiativeId()", () => {
    it("should return UUID as-is", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const result = await service.resolveInitiativeId(uuid);
      expect(result).toBe(uuid);
    });

    it("should resolve initiative by name", async () => {
      const mockInitiatives = [
        { id: "init-1", name: "Q1 Goals", status: "Active" },
      ];

      mockClient.initiatives.mockResolvedValue({ nodes: mockInitiatives });

      const result = await service.resolveInitiativeId("Q1 Goals");

      expect(mockClient.initiatives).toHaveBeenCalledWith({
        filter: { name: { eqIgnoreCase: "Q1 Goals" } },
        first: 10,
      });
      expect(result).toBe("init-1");
    });

    it("should throw error when initiative not found", async () => {
      mockClient.initiatives.mockResolvedValue({ nodes: [] });

      await expect(service.resolveInitiativeId("Nonexistent")).rejects.toThrow(
        'Initiative "Nonexistent" not found',
      );
    });

    it("should disambiguate by preferring Active status", async () => {
      const mockInitiatives = [
        { id: "init-planned", name: "Q1 Goals", status: "Planned" },
        { id: "init-active", name: "Q1 Goals", status: "Active" },
        { id: "init-completed", name: "Q1 Goals", status: "Completed" },
      ];

      mockClient.initiatives.mockResolvedValue({ nodes: mockInitiatives });

      const result = await service.resolveInitiativeId("Q1 Goals");

      expect(result).toBe("init-active");
    });

    it("should prefer Planned when no Active exists", async () => {
      const mockInitiatives = [
        { id: "init-completed", name: "Q1 Goals", status: "Completed" },
        { id: "init-planned", name: "Q1 Goals", status: "Planned" },
      ];

      mockClient.initiatives.mockResolvedValue({ nodes: mockInitiatives });

      const result = await service.resolveInitiativeId("Q1 Goals");

      expect(result).toBe("init-planned");
    });
  });

  describe("updateInitiative()", () => {
    it("should update initiative and return updated data", async () => {
      mockClient.updateInitiative.mockResolvedValue({ success: true });

      // Mock getInitiativeById for the re-fetch
      const mockInitiative = {
        id: "init-1",
        name: "Updated Name",
        description: "New description",
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: Promise.resolve(null),
        projects: vi.fn().mockResolvedValue({ nodes: [] }),
        parentInitiative: Promise.resolve(null),
        subInitiatives: vi.fn().mockResolvedValue({ nodes: [] }),
      };
      mockClient.initiative.mockResolvedValue(mockInitiative);

      const result = await service.updateInitiative("init-1", {
        name: "Updated Name",
        description: "New description",
      });

      expect(mockClient.updateInitiative).toHaveBeenCalledWith("init-1", {
        name: "Updated Name",
        description: "New description",
      });
      expect(result.name).toBe("Updated Name");
    });

    it("should throw error when update fails", async () => {
      mockClient.updateInitiative.mockResolvedValue({ success: false });

      await expect(
        service.updateInitiative("init-1", { name: "New Name" }),
      ).rejects.toThrow("Failed to update initiative");
    });

    it("should only include provided fields in update", async () => {
      mockClient.updateInitiative.mockResolvedValue({ success: true });
      const mockInitiative = {
        id: "init-1",
        name: "Test",
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: Promise.resolve(null),
        projects: vi.fn().mockResolvedValue({ nodes: [] }),
        parentInitiative: Promise.resolve(null),
        subInitiatives: vi.fn().mockResolvedValue({ nodes: [] }),
      };
      mockClient.initiative.mockResolvedValue(mockInitiative);

      await service.updateInitiative("init-1", { status: "Completed" });

      expect(mockClient.updateInitiative).toHaveBeenCalledWith("init-1", {
        status: "Completed",
      });
    });
  });
});
