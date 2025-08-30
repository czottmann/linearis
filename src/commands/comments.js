import { createLinearService } from "../utils/linear-client.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";

/**
 * Setup comments commands on the program
 * @param {Command} program - Commander.js program instance
 */
export function setupCommentsCommands(program) {
  const comments = program.command("comments")
    .description("Comment operations");

  // Show comments help when no subcommand
  comments.action(() => {
    comments.help();
  });

  comments.command("list <issueId>")
    .description("List comments for issue")
    .option("-l, --limit <number>", "limit results", "25")
    .action(handleAsyncCommand(async (issueId, options, command) => {
      const service = await createLinearService(command.parent.parent.opts());
      const result = await service.getComments(
        issueId,
        parseInt(options.limit),
      );
      outputSuccess(result);
    }));

  comments.command("create <issueId> <body>")
    .description("Create comment on issue")
    .action(handleAsyncCommand(async (issueId, body, options, command) => {
      const service = await createLinearService(command.parent.parent.opts());
      const result = await service.createComment({ issueId, body });
      outputSuccess(result);
    }));
}
