import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinearService } from "../../src/utils/linear-service.js";

/**
 * Unit tests for LinearService cycle methods
 *
 * These tests verify the new cycle-related methods added in PR #4:
 * - getCycles() - Fetch cycles with pagination
 * - getCycleById() - Fetch single cycle with issues
 * - resolveCycleId() - Resolve cycle by name or ID
 *
 * Note: These tests use mocks to avoid hitting the real Linear API.
 * For integration tests with real API, see tests/integration/
 */

describe("LinearService - Cycle Methods", () => {
  let mockClient: any;
  let service: LinearService;

  beforeEach(() => {
    // Create mock Linear client
    mockClient = {
      cycles: vi.fn(),
      cycle: vi.fn(),
      teams: vi.fn(),
    };

    // Create service with mock client
    service = new LinearService("fake-token");
    // @ts-ignore - Replace internal client with mock
    service.client = mockClient;
  });

  describe("getCycles()", () => {
    it("should fetch cycles without filters", async () => {
      const mockCycles = [
        {
          id: "cycle-1",
          name: "Sprint 1",
          number: 1,
          startsAt: new Date("2025-01-01"),
          endsAt: new Date("2025-01-15"),
          isActive: true,
          isPrevious: false,
          isNext: false,
          progress: 0.5,
          issueCountHistory: [],
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
      ];

      mockClient.cycles.mockResolvedValue({
        nodes: mockCycles,
      });

      const result = await service.getCycles();

      expect(mockClient.cycles).toHaveBeenCalledWith({
        filter: undefined,
        orderBy: "createdAt",
        first: 250,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("cycle-1");
      expect(result[0].name).toBe("Sprint 1");
      expect(result[0].team.key).toBe("ENG");
    });

    it("should fetch cycles with team filter", async () => {
      const mockTeam = {
        id: "team-1",
        key: "ENG",
        name: "Engineering",
      };

      // Mock resolveTeamId
      vi.spyOn(service, "resolveTeamId").mockResolvedValue("team-1");

      const mockCycles = [
        {
          id: "cycle-1",
          name: "Sprint 1",
          number: 1,
          startsAt: new Date("2025-01-01"),
          endsAt: new Date("2025-01-15"),
          isActive: true,
          isPrevious: false,
          isNext: false,
          progress: 0.5,
          issueCountHistory: [],
          team: Promise.resolve(mockTeam),
        },
      ];

      mockClient.cycles.mockResolvedValue({
        nodes: mockCycles,
      });

      const result = await service.getCycles("ENG");

      expect(service.resolveTeamId).toHaveBeenCalledWith("ENG");
      expect(mockClient.cycles).toHaveBeenCalledWith({
        filter: { team: { id: { eq: "team-1" } } },
        orderBy: "createdAt",
        first: 250,
      });
      expect(result).toHaveLength(1);
    });

    it("should fetch only active cycles when activeOnly is true", async () => {
      const mockCycles = [
        {
          id: "cycle-1",
          name: "Sprint 1",
          number: 1,
          startsAt: new Date("2025-01-01"),
          endsAt: new Date("2025-01-15"),
          isActive: true,
          isPrevious: false,
          isNext: false,
          progress: 0.5,
          issueCountHistory: [],
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
      ];

      mockClient.cycles.mockResolvedValue({
        nodes: mockCycles,
      });

      const result = await service.getCycles(undefined, true);

      expect(mockClient.cycles).toHaveBeenCalledWith({
        filter: { isActive: { eq: true } },
        orderBy: "createdAt",
        first: 250,
      });
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it("should convert dates to strings", async () => {
      const mockCycles = [
        {
          id: "cycle-1",
          name: "Sprint 1",
          number: 1,
          startsAt: new Date("2025-01-01T00:00:00Z"),
          endsAt: new Date("2025-01-15T23:59:59Z"),
          isActive: true,
          isPrevious: false,
          isNext: false,
          progress: 0.5,
          issueCountHistory: [],
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
      ];

      mockClient.cycles.mockResolvedValue({
        nodes: mockCycles,
      });

      const result = await service.getCycles();

      expect(typeof result[0].startsAt).toBe("string");
      expect(typeof result[0].endsAt).toBe("string");
    });
  });

  describe("getCycleById()", () => {
    it("should fetch cycle with issues by ID", async () => {
      const mockTeam = {
        id: "team-1",
        key: "ENG",
        name: "Engineering",
      };

      const mockIssue = {
        id: "issue-1",
        identifier: "ENG-123",
        title: "Test issue",
        description: "Test description",
        priority: 1,
        estimate: 3,
        state: Promise.resolve({ id: "state-1", name: "In Progress" }),
        assignee: Promise.resolve({ id: "user-1", name: "John Doe" }),
        team: Promise.resolve(mockTeam),
        project: Promise.resolve({ id: "proj-1", name: "Project 1" }),
        labels: () =>
          Promise.resolve({ nodes: [{ id: "label-1", name: "bug" }] }),
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
      };

      const mockCycle = {
        id: "cycle-1",
        name: "Sprint 1",
        number: 1,
        startsAt: new Date("2025-01-01"),
        endsAt: new Date("2025-01-15"),
        isActive: true,
        progress: 0.5,
        issueCountHistory: [],
        team: Promise.resolve(mockTeam),
        issues: vi.fn().mockResolvedValue({
          nodes: [mockIssue],
        }),
      };

      mockClient.cycle.mockResolvedValue(mockCycle);

      const result = await service.getCycleById("cycle-1", 50);

      expect(mockClient.cycle).toHaveBeenCalledWith("cycle-1");
      expect(mockCycle.issues).toHaveBeenCalledWith({ first: 50 });
      expect(result.id).toBe("cycle-1");
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].identifier).toBe("ENG-123");
      expect(result.issues[0].labels).toHaveLength(1);
    });

    it("should use default issues limit of 50", async () => {
      const mockCycle = {
        id: "cycle-1",
        name: "Sprint 1",
        number: 1,
        startsAt: new Date("2025-01-01"),
        endsAt: new Date("2025-01-15"),
        isActive: true,
        progress: 0.5,
        issueCountHistory: [],
        team: Promise.resolve({
          id: "team-1",
          key: "ENG",
          name: "Engineering",
        }),
        issues: vi.fn().mockResolvedValue({ nodes: [] }),
      };

      mockClient.cycle.mockResolvedValue(mockCycle);

      await service.getCycleById("cycle-1");

      expect(mockCycle.issues).toHaveBeenCalledWith({ first: 50 });
    });
  });

  describe("resolveCycleId()", () => {
    it("should return UUID as-is", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const result = await service.resolveCycleId(uuid);
      expect(result).toBe(uuid);
    });

    it("should resolve cycle by name", async () => {
      const mockCycles = [
        {
          id: "cycle-1",
          name: "Sprint 1",
          number: 1,
          startsAt: new Date("2025-01-01"),
          isActive: true,
          isNext: false,
          isPrevious: false,
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
      ];

      mockClient.cycles.mockResolvedValue({
        nodes: mockCycles,
      });

      const result = await service.resolveCycleId("Sprint 1");

      expect(mockClient.cycles).toHaveBeenCalledWith({
        filter: { name: { eq: "Sprint 1" } },
        first: 10,
      });
      expect(result).toBe("cycle-1");
    });

    it("should resolve cycle with team filter", async () => {
      vi.spyOn(service, "resolveTeamId").mockResolvedValue("team-1");

      const mockCycles = [
        {
          id: "cycle-1",
          name: "Sprint 1",
          number: 1,
          startsAt: new Date("2025-01-01"),
          isActive: true,
          isNext: false,
          isPrevious: false,
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
      ];

      mockClient.cycles.mockResolvedValue({
        nodes: mockCycles,
      });

      const result = await service.resolveCycleId("Sprint 1", "ENG");

      expect(service.resolveTeamId).toHaveBeenCalledWith("ENG");
      expect(mockClient.cycles).toHaveBeenCalledWith({
        filter: {
          name: { eq: "Sprint 1" },
          team: { id: { eq: "team-1" } },
        },
        first: 10,
      });
      expect(result).toBe("cycle-1");
    });

    it("should throw error when cycle not found", async () => {
      mockClient.cycles.mockResolvedValue({ nodes: [] });

      await expect(service.resolveCycleId("NonExistent")).rejects.toThrow(
        'Cycle "NonExistent" not found',
      );
    });

    it("should throw error when cycle not found for team", async () => {
      vi.spyOn(service, "resolveTeamId").mockResolvedValue("team-1");
      mockClient.cycles.mockResolvedValue({ nodes: [] });

      await expect(service.resolveCycleId("NonExistent", "ENG")).rejects
        .toThrow(
          'Cycle "NonExistent" for team ENG not found',
        );
    });

    it("should disambiguate by preferring active cycle", async () => {
      const mockCycles = [
        {
          id: "cycle-1",
          name: "Sprint 1",
          number: 1,
          startsAt: new Date("2025-01-01"),
          isActive: false,
          isNext: false,
          isPrevious: true,
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
        {
          id: "cycle-2",
          name: "Sprint 1",
          number: 2,
          startsAt: new Date("2025-01-15"),
          isActive: true,
          isNext: false,
          isPrevious: false,
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
      ];

      mockClient.cycles.mockResolvedValue({ nodes: mockCycles });

      const result = await service.resolveCycleId("Sprint 1");

      expect(result).toBe("cycle-2"); // Active cycle chosen
    });

    it("should disambiguate by preferring next cycle when no active", async () => {
      const mockCycles = [
        {
          id: "cycle-1",
          name: "Sprint 1",
          number: 1,
          startsAt: new Date("2025-01-01"),
          isActive: false,
          isNext: false,
          isPrevious: true,
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
        {
          id: "cycle-2",
          name: "Sprint 1",
          number: 2,
          startsAt: new Date("2025-01-15"),
          isActive: false,
          isNext: true,
          isPrevious: false,
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
      ];

      mockClient.cycles.mockResolvedValue({ nodes: mockCycles });

      const result = await service.resolveCycleId("Sprint 1");

      expect(result).toBe("cycle-2"); // Next cycle chosen
    });

    it("should throw error for ambiguous cycle name", async () => {
      const mockCycles = [
        {
          id: "cycle-1",
          name: "Sprint 1",
          number: 1,
          startsAt: new Date("2025-01-01"),
          isActive: false,
          isNext: false,
          isPrevious: false,
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
        {
          id: "cycle-2",
          name: "Sprint 1",
          number: 2,
          startsAt: new Date("2025-01-15"),
          isActive: false,
          isNext: false,
          isPrevious: false,
          team: Promise.resolve({ id: "team-2", key: "PROD", name: "Product" }),
        },
      ];

      mockClient.cycles.mockResolvedValue({ nodes: mockCycles });

      await expect(service.resolveCycleId("Sprint 1")).rejects.toThrow(
        /Ambiguous cycle name "Sprint 1"/,
      );
    });
  });

  describe("resolveCycleId - error cases", () => {
    it("should throw when cycle not found", async () => {
      mockClient.cycles.mockResolvedValue({
        nodes: [],
      });

      await expect(service.resolveCycleId("Nonexistent Cycle")).rejects.toThrow(
        'Cycle "Nonexistent Cycle" not found',
      );
    });

    it("should throw when multiple cycles match and none are active/next/previous", async () => {
      const mockCycles = [
        {
          id: "cycle-1",
          name: "Sprint 1",
          number: 1,
          startsAt: "2025-01-01",
          isActive: false,
          isNext: false,
          isPrevious: false,
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
        {
          id: "cycle-2",
          name: "Sprint 1",
          number: 2,
          startsAt: "2025-02-01",
          isActive: false,
          isNext: false,
          isPrevious: false,
          team: Promise.resolve({ id: "team-2", key: "PROD", name: "Product" }),
        },
      ];

      mockClient.cycles.mockResolvedValue({ nodes: mockCycles });

      await expect(service.resolveCycleId("Sprint 1")).rejects.toThrow(
        /Ambiguous cycle name.*multiple matches found/,
      );
    });

    it("should prefer active cycle when multiple matches exist", async () => {
      const mockCycles = [
        {
          id: "cycle-inactive",
          name: "Sprint 1",
          number: 1,
          startsAt: "2025-01-01",
          isActive: false,
          isNext: false,
          isPrevious: false,
          team: Promise.resolve({
            id: "team-1",
            key: "ENG",
            name: "Engineering",
          }),
        },
        {
          id: "cycle-active",
          name: "Sprint 1",
          number: 2,
          startsAt: "2025-02-01",
          isActive: true,
          isNext: false,
          isPrevious: false,
          team: Promise.resolve({ id: "team-2", key: "PROD", name: "Product" }),
        },
      ];

      mockClient.cycles.mockResolvedValue({ nodes: mockCycles });

      const result = await service.resolveCycleId("Sprint 1");
      expect(result).toBe("cycle-active");
    });
  });
});
