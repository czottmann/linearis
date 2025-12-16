import { beforeAll, describe, expect, it } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Integration tests for initiatives CLI commands
 *
 * These tests verify the initiatives command works end-to-end with the compiled CLI.
 * They test:
 * - Help output for all subcommands
 * - JSON output structure and validity
 * - Filter options work correctly
 * - Error handling for invalid inputs
 *
 * Note: These tests require LINEAR_API_TOKEN to be set in environment.
 * If not set, tests will be skipped.
 *
 * Linear.app Setup Requirements:
 * - At least one initiative must exist in your workspace
 * - No specific naming or configuration required
 */

const CLI_PATH = "./dist/main.js";
const hasApiToken = !!process.env.LINEAR_API_TOKEN;

describe("Initiatives CLI Commands", () => {
  beforeAll(async () => {
    if (!hasApiToken) {
      console.warn(
        "\n⚠️  LINEAR_API_TOKEN not set - skipping integration tests\n" +
          "   To run these tests, set LINEAR_API_TOKEN in your environment\n" +
          "   Your Linear workspace must have at least one initiative\n",
      );
    }
  });

  describe("initiatives --help", () => {
    it("should display help text", async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} initiatives --help`);

      expect(stdout).toContain("Usage: linearis initiatives");
      expect(stdout).toContain("Initiative operations");
      expect(stdout).toContain("list");
      expect(stdout).toContain("read");
      expect(stdout).toContain("update");
    });
  });

  describe("initiatives list --help", () => {
    it("should display list help text", async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} initiatives list --help`,
      );

      expect(stdout).toContain("List initiatives");
      expect(stdout).toContain("--status");
      expect(stdout).toContain("--owner");
      expect(stdout).toContain("--limit");
    });
  });

  describe("initiatives read --help", () => {
    it("should display read help text", async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} initiatives read --help`,
      );

      expect(stdout).toContain("Get initiative details");
      expect(stdout).toContain("--projects-first");
    });
  });

  describe("initiatives update --help", () => {
    it("should display update help text", async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} initiatives update --help`,
      );

      expect(stdout).toContain("Update an initiative");
      expect(stdout).toContain("--name");
      expect(stdout).toContain("--description");
      expect(stdout).toContain("--content");
      expect(stdout).toContain("--status");
      expect(stdout).toContain("--owner");
      expect(stdout).toContain("--target-date");
    });
  });

  describe("initiatives list", () => {
    it.skipIf(!hasApiToken)("should list initiatives without error", async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} initiatives list --limit 5`,
      );

      // Should not have errors
      expect(stderr).not.toContain("error");

      // Should return valid JSON
      const initiatives = JSON.parse(stdout);
      expect(Array.isArray(initiatives)).toBe(true);
    });

    it.skipIf(!hasApiToken)(
      "should return valid initiative structure",
      async () => {
        const { stdout } = await execAsync(
          `node ${CLI_PATH} initiatives list --limit 1`,
        );
        const initiatives = JSON.parse(stdout);

        if (initiatives.length > 0) {
          const initiative = initiatives[0];

          // Verify initiative has expected fields
          expect(initiative).toHaveProperty("id");
          expect(initiative).toHaveProperty("name");
          expect(initiative).toHaveProperty("status");
          expect(initiative).toHaveProperty("createdAt");
          expect(initiative).toHaveProperty("updatedAt");

          // Verify status is one of the valid values
          expect(["Planned", "Active", "Completed"]).toContain(
            initiative.status,
          );
        }
      },
    );

    it.skipIf(!hasApiToken)(
      "should filter by status",
      async () => {
        // This test verifies the filter is applied - even if no results,
        // the query should succeed
        const { stdout } = await execAsync(
          `node ${CLI_PATH} initiatives list --status Active --limit 5`,
        );

        const initiatives = JSON.parse(stdout);
        expect(Array.isArray(initiatives)).toBe(true);

        // If there are results, verify they match the filter
        initiatives.forEach((init: any) => {
          expect(init.status).toBe("Active");
        });
      },
    );

    it.skipIf(!hasApiToken)(
      "should respect limit parameter",
      async () => {
        const { stdout } = await execAsync(
          `node ${CLI_PATH} initiatives list --limit 2`,
        );

        const initiatives = JSON.parse(stdout);
        expect(initiatives.length).toBeLessThanOrEqual(2);
      },
    );
  });

  describe("initiatives read", () => {
    it.skipIf(!hasApiToken)("should read initiative by ID", async () => {
      // First get an initiative ID
      const { stdout: listOutput } = await execAsync(
        `node ${CLI_PATH} initiatives list --limit 1`,
      );
      const initiatives = JSON.parse(listOutput);

      if (initiatives.length > 0) {
        const initiativeId = initiatives[0].id;

        const { stdout, stderr } = await execAsync(
          `node ${CLI_PATH} initiatives read ${initiativeId}`,
        );

        // Should not have errors
        expect(stderr).not.toContain("error");

        const initiative = JSON.parse(stdout);

        // Verify initiative details structure
        expect(initiative).toHaveProperty("id");
        expect(initiative).toHaveProperty("name");
        expect(initiative).toHaveProperty("status");
        expect(initiative.id).toBe(initiativeId);
      }
    });

    it.skipIf(!hasApiToken)("should read initiative by name", async () => {
      // First get an initiative name
      const { stdout: listOutput } = await execAsync(
        `node ${CLI_PATH} initiatives list --limit 1`,
      );
      const initiatives = JSON.parse(listOutput);

      if (initiatives.length > 0) {
        const initiativeName = initiatives[0].name;

        const { stdout } = await execAsync(
          `node ${CLI_PATH} initiatives read "${initiativeName}"`,
        );

        const initiative = JSON.parse(stdout);
        expect(initiative.name).toBe(initiativeName);
      }
    });

    it.skipIf(!hasApiToken)(
      "should include projects when present",
      async () => {
        const { stdout: listOutput } = await execAsync(
          `node ${CLI_PATH} initiatives list --limit 1`,
        );
        const initiatives = JSON.parse(listOutput);

        if (initiatives.length > 0) {
          const initiativeId = initiatives[0].id;

          const { stdout } = await execAsync(
            `node ${CLI_PATH} initiatives read ${initiativeId} --projects-first 5`,
          );

          const initiative = JSON.parse(stdout);

          // projects field should exist (may be undefined if none)
          // Just verify the command works with the flag
          expect(initiative).toHaveProperty("id");
        }
      },
    );
  });

  describe("initiatives update", () => {
    it.skipIf(!hasApiToken)(
      "should reject update with no options provided",
      async () => {
        // First get a real initiative name to test with
        const { stdout: listOutput } = await execAsync(
          `node ${CLI_PATH} initiatives list --limit 1`,
        );
        const initiatives = JSON.parse(listOutput);

        if (initiatives.length > 0) {
          const initiativeName = initiatives[0].name;

          try {
            await execAsync(
              `node ${CLI_PATH} initiatives update "${initiativeName}"`,
            );
            expect.fail("Should have thrown an error");
          } catch (error: any) {
            expect(error.stderr).toContain(
              "At least one update option is required",
            );
          }
        }
      },
    );

    // Note: We don't test actual updates in integration tests to avoid
    // modifying real data. The unit tests cover update functionality.
  });

  describe("initiatives - error handling", () => {
    it.skipIf(!hasApiToken)(
      "should return error for non-existent initiative",
      async () => {
        try {
          await execAsync(
            `node ${CLI_PATH} initiatives read "Nonexistent Initiative Name 12345"`,
          );
          expect.fail("Should have thrown an error");
        } catch (error: any) {
          expect(error.stderr).toContain("not found");
        }
      },
    );
  });
});
