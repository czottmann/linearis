import { createLinearService } from "../utils/linear-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
export function setupCommentsCommands(program) {
    const comments = program.command("comments")
        .description("Comment operations");
    comments.action(() => {
        comments.help();
    });
    comments.command("create <issueId>")
        .description("Create new comment on issue.")
        .addHelpText('after', `\nWhen passing issue IDs, both UUID and identifiers like ABC-123 are supported.`)
        .option("--body <body>", "comment body (required)")
        .action(handleAsyncCommand(async (issueId, options, command) => {
        const service = await createLinearService(command.parent.parent.opts());
        if (!options.body) {
            throw new Error("--body is required");
        }
        const resolvedIssueId = await service.resolveIssueId(issueId);
        const result = await service.createComment({
            issueId: resolvedIssueId,
            body: options.body,
        });
        outputSuccess(result);
    }));
}
