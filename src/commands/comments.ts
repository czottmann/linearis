import { Command } from "commander";
import { createLinearService } from "../utils/linear-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
import { isUuid } from "../utils/uuid.js";

/**
 * Setup comments commands on the program
 * @param program - Commander.js program instance
 */
export function setupCommentsCommands(program: Command): void {
  const comments = program.command("comments")
    .description("Comment operations");

  // Show comments help when no subcommand
  comments.action(() => {
    comments.help();
  });

  comments.command("create <issueId>")
    .description(
      "Create new comment on issue (supports both UUID and identifier like ZCO-123)",
    )
    .option("--body <body>", "comment body (required)")
    .action(
      handleAsyncCommand(
        async (issueId: string, options: any, command: Command) => {
          const service = await createLinearService(
            command.parent!.parent!.opts(),
          );

          // Validate required body flag
          if (!options.body) {
            throw new Error("--body is required");
          }

          // Resolve issue ID if it's an identifier
          let resolvedIssueId = issueId;
          if (!isUuid(issueId)) {
            const issue = await service.getIssueById(issueId);
            resolvedIssueId = issue.id;
          }

          const result = await service.createComment({
            issueId: resolvedIssueId,
            body: options.body,
          });

          outputSuccess(result);
        },
      ),
    );
}
