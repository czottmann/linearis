import { beforeAll, describe, expect, it } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Integration tests for cycles CLI commands
 *
 * These tests verify the cycles command works end-to-end with the compiled CLI.
 * They test the fixes from PR #4:
 * - No GraphQL complexity errors
 * - All command flags work correctly
 * - JSON output is valid and structured
 *
 * Note: These tests require LINEAR_API_TOKEN to be set in environment.
 * If not set, tests will be skipped.
 */

const CLI_PATH = "./dist/main.js";
const hasApiToken = !!process.env.LINEAR_API_TOKEN;

describe("Cycles CLI Commands", () => {
  beforeAll(async () => {
    if (!hasApiToken) {
      console.warn(
        "\n⚠️  LINEAR_API_TOKEN not set - skipping integration tests\n" +
          "   To run these tests, set LINEAR_API_TOKEN in your environment\n",
      );
    }
  });

  describe("cycles --help", () => {
    it("should display help text", async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} cycles --help`);

      expect(stdout).toContain("Usage: linearis cycles");
      expect(stdout).toContain("Cycle operations");
      expect(stdout).toContain("list");
      expect(stdout).toContain("read");
    });
  });

  describe("cycles list", () => {
    it.skipIf(!hasApiToken)("should list cycles without error", async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} cycles list`,
      );

      // Should not have complexity errors
      expect(stderr).not.toContain("query too complex");
      expect(stderr).not.toContain("complexity");

      // Should return valid JSON
      const cycles = JSON.parse(stdout);
      expect(Array.isArray(cycles)).toBe(true);
    });

    it.skipIf(!hasApiToken)("should return valid cycle structure", async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} cycles list`);
      const cycles = JSON.parse(stdout);

      if (cycles.length > 0) {
        const cycle = cycles[0];

        // Verify cycle has expected fields
        expect(cycle).toHaveProperty("id");
        expect(cycle).toHaveProperty("number");
        expect(cycle).toHaveProperty("isActive");
        expect(cycle).toHaveProperty("team");

        // Note: name field is optional - not all cycles have names

        // Verify team structure
        expect(cycle.team).toHaveProperty("id");
        expect(cycle.team).toHaveProperty("key");
        expect(cycle.team).toHaveProperty("name");
      }
    });

    it.skipIf(!hasApiToken)("should filter by active cycles", async () => {
      // First, get a team key
      const { stdout: listOutput } = await execAsync(
        `node ${CLI_PATH} cycles list`,
      );
      const allCycles = JSON.parse(listOutput);

      if (allCycles.length > 0 && allCycles[0].team) {
        const teamKey = allCycles[0].team.key;

        // Now test active filter
        const { stdout } = await execAsync(
          `node ${CLI_PATH} cycles list --active --team ${teamKey}`,
        );
        const activeCycles = JSON.parse(stdout);

        // All returned cycles should be active
        activeCycles.forEach((cycle: any) => {
          expect(cycle.isActive).toBe(true);
        });
      }
    });

    it.skipIf(!hasApiToken)(
      "should work with --around-active flag",
      async () => {
        // First, get a team key
        const { stdout: listOutput } = await execAsync(
          `node ${CLI_PATH} cycles list`,
        );
        const allCycles = JSON.parse(listOutput);

        if (allCycles.length > 0 && allCycles[0].team) {
          const teamKey = allCycles[0].team.key;

          // Test around-active (may fail if no active cycle, which is ok)
          try {
            const { stdout, stderr } = await execAsync(
              `node ${CLI_PATH} cycles list --around-active 3 --team ${teamKey}`,
            );

            // Should not have complexity errors
            expect(stderr).not.toContain("query too complex");

            const cycles = JSON.parse(stdout);
            expect(Array.isArray(cycles)).toBe(true);
          } catch (error: any) {
            // It's ok if there's no active cycle
            if (!error.stderr?.includes("No active cycle")) {
              throw error;
            }
          }
        }
      },
      { timeout: 30000 },
    );

    it("should require --team when using --around-active", async () => {
      try {
        await execAsync(`node ${CLI_PATH} cycles list --around-active 3`);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.stderr).toContain("--around-active requires --team");
      }
    });
  });

  describe("cycles read", () => {
    it.skipIf(!hasApiToken)("should read cycle by ID", async () => {
      // First get a cycle ID
      const { stdout: listOutput } = await execAsync(
        `node ${CLI_PATH} cycles list`,
      );
      const cycles = JSON.parse(listOutput);

      if (cycles.length > 0) {
        const cycleId = cycles[0].id;

        const { stdout, stderr } = await execAsync(
          `node ${CLI_PATH} cycles read ${cycleId}`,
        );

        // Should not have complexity errors
        expect(stderr).not.toContain("query too complex");

        const cycle = JSON.parse(stdout);

        // Verify cycle details structure
        expect(cycle).toHaveProperty("id");
        expect(cycle).toHaveProperty("issues");
        expect(Array.isArray(cycle.issues)).toBe(true);

        // Note: name field is optional - not all cycles have names
      }
    });

    it.skipIf(!hasApiToken)("should read cycle by name with team", async () => {
      // First get a cycle name and team
      const { stdout: listOutput } = await execAsync(
        `node ${CLI_PATH} cycles list`,
      );
      const cycles = JSON.parse(listOutput);

      // Find a cycle that has a name
      const cycleWithName = cycles.find((c: any) => c.name);

      if (cycleWithName && cycleWithName.team) {
        const cycleName = cycleWithName.name;
        const teamKey = cycleWithName.team.key;

        const { stdout, stderr } = await execAsync(
          `node ${CLI_PATH} cycles read "${cycleName}" --team ${teamKey}`,
        );

        // Should not have complexity errors
        expect(stderr).not.toContain("query too complex");

        const cycle = JSON.parse(stdout);
        expect(cycle.name).toBe(cycleName);
      } else {
        // Skip if no cycles have names - this is ok
        console.log("Skipping: No cycles with names found in workspace");
      }
    });
  });

  describe("Cycles CLI - Error Cases", () => {
    it("should reject --around-active without --team", async () => {
      if (!hasApiToken) return;

      await expect(
        execAsync(`node ${CLI_PATH} cycles list --around-active 3`),
      ).rejects.toThrow(/--around-active requires --team/);
    });

    it("should reject --around-active with non-numeric value", async () => {
      if (!hasApiToken) return;

      await expect(
        execAsync(
          `node ${CLI_PATH} cycles list --around-active abc --team Engineering`,
        ),
      ).rejects.toThrow(/--around-active requires a non-negative integer/);
    });

    it("should reject --around-active with negative value", async () => {
      if (!hasApiToken) return;

      await expect(
        execAsync(
          `node ${CLI_PATH} cycles list --around-active -5 --team Engineering`,
        ),
      ).rejects.toThrow(/--around-active requires a non-negative integer/);
    });
  });
});
