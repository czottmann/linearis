import { Command } from "commander";
import { createLinearService } from "../utils/linear-service.js";
import { createGraphQLAttachmentsService } from "../utils/graphql-attachments-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";

/**
 * Options for attachment create command
 */
interface AttachmentCreateOptions {
  issue: string;
  url: string;
  title: string;
  subtitle?: string;
  comment?: string;
  iconUrl?: string;
}

/**
 * Options for attachment list command
 */
interface AttachmentListOptions {
  issue: string;
}

/**
 * Setup attachments commands on the program
 *
 * Attachments allow linking any URL to an issue. This is the mechanism
 * to associate documents (or any external resource) with issues, since
 * documents cannot be directly linked to issues in Linear's data model.
 *
 * Key behavior: Attachments are idempotent - creating an attachment with
 * the same url + issueId will update the existing attachment.
 *
 * @param program - Commander.js program instance to register commands on
 */
export function setupAttachmentsCommands(program: Command): void {
  const attachments = program
    .command("attachments")
    .description("Attachment operations (link URLs to issues)");

  attachments.action(() => attachments.help());

  /**
   * Create an attachment on an issue
   *
   * Command: `linearis attachments create --issue <issue> --url <url> --title <title> [options]`
   */
  attachments
    .command("create")
    .description("Create an attachment on an issue")
    .requiredOption("--issue <issue>", "issue identifier (e.g., ABC-123)")
    .requiredOption("--url <url>", "URL to attach")
    .requiredOption("--title <title>", "attachment title")
    .option("--subtitle <subtitle>", "attachment subtitle")
    .option(
      "--comment <comment>",
      "add a comment with the attachment (markdown)",
    )
    .option("--icon-url <iconUrl>", "icon URL (jpg/png, max 1MB)")
    .action(
      handleAsyncCommand(
        async (options: AttachmentCreateOptions, command: Command) => {
          const rootOpts = command.parent!.parent!.opts();
          const [attachmentsService, linearService] = await Promise.all([
            createGraphQLAttachmentsService(rootOpts),
            createLinearService(rootOpts),
          ]);

          const issueId = await linearService.resolveIssueId(options.issue);

          const attachment = await attachmentsService.createAttachment({
            issueId,
            url: options.url,
            title: options.title,
            subtitle: options.subtitle,
            commentBody: options.comment,
            iconUrl: options.iconUrl,
          });

          outputSuccess(attachment);
        },
      ),
    );

  /**
   * List attachments on an issue
   *
   * Command: `linearis attachments list --issue <issue>`
   */
  attachments
    .command("list")
    .description("List attachments on an issue")
    .requiredOption("--issue <issue>", "issue identifier (e.g., ABC-123)")
    .action(
      handleAsyncCommand(
        async (options: AttachmentListOptions, command: Command) => {
          const rootOpts = command.parent!.parent!.opts();
          const [attachmentsService, linearService] = await Promise.all([
            createGraphQLAttachmentsService(rootOpts),
            createLinearService(rootOpts),
          ]);

          const issueId = await linearService.resolveIssueId(options.issue);
          const attachmentsList =
            await attachmentsService.listAttachments(issueId);

          outputSuccess(attachmentsList);
        },
      ),
    );

  /**
   * Delete an attachment
   *
   * Command: `linearis attachments delete <attachment-id>`
   */
  attachments
    .command("delete <attachmentId>")
    .description("Delete an attachment")
    .action(
      handleAsyncCommand(
        async (attachmentId: string, _options: any, command: Command) => {
          const rootOpts = command.parent!.parent!.opts();
          const attachmentsService =
            await createGraphQLAttachmentsService(rootOpts);

          await attachmentsService.deleteAttachment(attachmentId);
          outputSuccess({ deleted: true, id: attachmentId });
        },
      ),
    );
}
