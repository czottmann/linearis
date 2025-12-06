import { beforeAll, describe, expect, it } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Integration tests for attachments CLI commands
 *
 * These tests verify the attachments command works end-to-end with the compiled CLI.
 *
 * Note: These tests require LINEAR_API_TOKEN to be set in environment.
 * If not set, tests will be skipped.
 */

const CLI_PATH = "./dist/main.js";
const hasApiToken = !!process.env.LINEAR_API_TOKEN;

describe("Attachments CLI Commands", () => {
  beforeAll(async () => {
    if (!hasApiToken) {
      console.warn(
        "\n⚠️  LINEAR_API_TOKEN not set - skipping integration tests\n" +
          "   To run these tests, set LINEAR_API_TOKEN in your environment\n",
      );
    }
  });

  describe("attachments --help", () => {
    it("should display help text", async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} attachments --help`);

      expect(stdout).toContain("Usage: linearis attachments");
      expect(stdout).toContain("Attachment operations");
      expect(stdout).toContain("create");
      expect(stdout).toContain("list");
      expect(stdout).toContain("delete");
    });
  });

  describe("attachments error cases", () => {
    it.skipIf(!hasApiToken)(
      "should return error for invalid issue identifier",
      async () => {
        try {
          await execAsync(
            `node ${CLI_PATH} attachments list --issue "INVALID-ISSUE-ID"`,
          );
          expect.fail("Should have thrown an error");
        } catch (error: any) {
          const output = JSON.parse(error.stdout || error.stderr);
          expect(output.error).toBeDefined();
        }
      },
    );

    it.skipIf(!hasApiToken)(
      "should return error for non-existent attachment delete",
      async () => {
        try {
          await execAsync(
            `node ${CLI_PATH} attachments delete nonexistent-uuid-12345`,
          );
          expect.fail("Should have thrown an error");
        } catch (error: any) {
          const output = JSON.parse(error.stdout || error.stderr);
          expect(output.error).toBeDefined();
        }
      },
    );
  });

  describe("attachments CRUD operations", () => {
    it.skipIf(!hasApiToken)(
      "should create, list, and delete an attachment",
      async () => {
        // First, get an issue to attach to
        const { stdout: issuesOutput } = await execAsync(
          `node ${CLI_PATH} issues list --limit 1`,
        );
        const issues = JSON.parse(issuesOutput);

        if (issues.length === 0) {
          console.warn("No issues found to test attachments - skipping");
          return;
        }

        const issueIdentifier = issues[0].identifier;

        // CREATE attachment
        const testUrl = "https://example.com/test-attachment";
        const { stdout: createOutput } = await execAsync(
          `node ${CLI_PATH} attachments create --issue "${issueIdentifier}" --url "${testUrl}" --title "Test Attachment from Vitest"`,
        );
        const createdAttachment = JSON.parse(createOutput);

        expect(createdAttachment).toHaveProperty("id");
        expect(createdAttachment.title).toBe("Test Attachment from Vitest");
        expect(createdAttachment.url).toBe(testUrl);
        expect(createdAttachment.issue).toHaveProperty("identifier");

        const attachmentId = createdAttachment.id;

        // LIST attachments for the issue
        const { stdout: listOutput } = await execAsync(
          `node ${CLI_PATH} attachments list --issue "${issueIdentifier}"`,
        );
        const attachments = JSON.parse(listOutput);

        expect(Array.isArray(attachments)).toBe(true);
        const foundAttachment = attachments.find(
          (a: { id: string }) => a.id === attachmentId,
        );
        expect(foundAttachment).toBeDefined();

        // DELETE attachment
        const { stdout: deleteOutput } = await execAsync(
          `node ${CLI_PATH} attachments delete ${attachmentId}`,
        );
        const deleteResult = JSON.parse(deleteOutput);

        expect(deleteResult.deleted).toBe(true);
        expect(deleteResult.id).toBe(attachmentId);

        // Verify attachment is deleted (should not appear in list)
        const { stdout: verifyOutput } = await execAsync(
          `node ${CLI_PATH} attachments list --issue "${issueIdentifier}"`,
        );
        const remainingAttachments = JSON.parse(verifyOutput);
        const deletedAttachment = remainingAttachments.find(
          (a: { id: string }) => a.id === attachmentId,
        );
        expect(deletedAttachment).toBeUndefined();
      },
    );
  });

  describe("attachments with document flow", () => {
    it.skipIf(!hasApiToken)(
      "should create document and attach to issue in one command",
      async () => {
        // Get an issue and team
        const [{ stdout: issuesOutput }, { stdout: teamsOutput }] =
          await Promise.all([
            execAsync(`node ${CLI_PATH} issues list --limit 1`),
            execAsync(`node ${CLI_PATH} teams list`),
          ]);

        const issues = JSON.parse(issuesOutput);
        const teams = JSON.parse(teamsOutput);

        if (issues.length === 0 || teams.length === 0) {
          console.warn(
            "No issues or teams found to test document+attachment flow - skipping",
          );
          return;
        }

        const issueIdentifier = issues[0].identifier;
        const teamKey = teams[0].key;

        // Create document with --attach-to flag
        const { stdout: createOutput } = await execAsync(
          `node ${CLI_PATH} documents create --title "Test Doc with Attachment" --team "${teamKey}" --attach-to "${issueIdentifier}"`,
        );
        const createdDoc = JSON.parse(createOutput);

        expect(createdDoc).toHaveProperty("id");
        expect(createdDoc).toHaveProperty("url");

        // Verify attachment was created
        const { stdout: listOutput } = await execAsync(
          `node ${CLI_PATH} attachments list --issue "${issueIdentifier}"`,
        );
        const attachments = JSON.parse(listOutput);

        const docAttachment = attachments.find(
          (a: { url: string }) => a.url === createdDoc.url,
        );
        expect(docAttachment).toBeDefined();
        expect(docAttachment.title).toBe("Test Doc with Attachment");

        // Cleanup: delete attachment and document
        if (docAttachment) {
          await execAsync(
            `node ${CLI_PATH} attachments delete ${docAttachment.id}`,
          );
        }
        await execAsync(`node ${CLI_PATH} documents delete ${createdDoc.id}`);
      },
    );
  });
});
