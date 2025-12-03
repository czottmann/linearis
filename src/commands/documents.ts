import { Command } from "commander";
import { createLinearService } from "../utils/linear-service.js";
import { createGraphQLDocumentsService } from "../utils/graphql-documents-service.js";
import {
  createGraphQLAttachmentsService,
} from "../utils/graphql-attachments-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";

/**
 * Options for document create command
 */
interface DocumentCreateOptions {
  title: string;
  content?: string;
  project?: string;
  team?: string;
  icon?: string;
  color?: string;
  attachTo?: string;
}

/**
 * Options for document update command
 */
interface DocumentUpdateOptions {
  title?: string;
  content?: string;
  project?: string;
  icon?: string;
  color?: string;
}

/**
 * Options for document list command
 */
interface DocumentListOptions {
  project?: string;
  limit?: string;
}

/**
 * Setup documents commands on the program
 *
 * Documents in Linear are standalone entities that can be associated with
 * projects, initiatives, or teams. They cannot be directly linked to issues.
 * To link a document to an issue, use the --attach-to option which creates
 * an attachment pointing to the document's URL.
 *
 * @param program - Commander.js program instance to register commands on
 */
export function setupDocumentsCommands(program: Command): void {
  const documents = program
    .command("documents")
    .description("Document operations (project-level documentation)");

  documents.action(() => documents.help());

  /**
   * Create a new document
   *
   * Command: `linearis documents create --title <title> [options]`
   */
  documents
    .command("create")
    .description("Create a new document")
    .requiredOption("--title <title>", "document title")
    .option("--content <content>", "document content (markdown)")
    .option("--project <project>", "project name or ID")
    .option("--team <team>", "team key or name")
    .option("--icon <icon>", "document icon")
    .option("--color <color>", "icon color")
    .option(
      "--attach-to <issue>",
      "also attach document to issue (e.g., ABC-123)",
    )
    .action(
      handleAsyncCommand(
        async (options: DocumentCreateOptions, command: Command) => {
          const rootOpts = command.parent!.parent!.opts();
          const [documentsService, linearService] = await Promise.all([
            createGraphQLDocumentsService(rootOpts),
            createLinearService(rootOpts),
          ]);

          // Resolve project ID if provided
          let projectId: string | undefined;
          if (options.project) {
            projectId = await linearService.resolveProjectId(options.project);
          }

          // Resolve team ID if provided
          let teamId: string | undefined;
          if (options.team) {
            teamId = await linearService.resolveTeamId(options.team);
          }

          // Create the document
          const document = await documentsService.createDocument({
            title: options.title,
            content: options.content,
            projectId,
            teamId,
            icon: options.icon,
            color: options.color,
          });

          // Optionally attach to issue
          if (options.attachTo) {
            const attachmentsService =
              await createGraphQLAttachmentsService(rootOpts);
            const issueId = await linearService.resolveIssueId(options.attachTo);

            try {
              await attachmentsService.createAttachment({
                issueId,
                url: document.url,
                title: document.title,
              });
            } catch (attachError) {
              // Document was created but attachment failed - provide actionable error
              const errorMessage =
                attachError instanceof Error
                  ? attachError.message
                  : String(attachError);
              throw new Error(
                `Document created (${document.id}) but failed to attach to issue "${options.attachTo}": ${errorMessage}. ` +
                  `To retry attachment: linearis attachments create --issue "${options.attachTo}" --url "${document.url}" --title "${document.title}"`,
              );
            }
          }

          outputSuccess(document);
        },
      ),
    );

  /**
   * Update an existing document
   *
   * Command: `linearis documents update <document-id> [options]`
   */
  documents
    .command("update <documentId>")
    .description("Update an existing document")
    .option("--title <title>", "new document title")
    .option("--content <content>", "new document content (markdown)")
    .option("--project <project>", "move to different project")
    .option("--icon <icon>", "document icon")
    .option("--color <color>", "icon color")
    .action(
      handleAsyncCommand(
        async (
          documentId: string,
          options: DocumentUpdateOptions,
          command: Command,
        ) => {
          const rootOpts = command.parent!.parent!.opts();
          const [documentsService, linearService] = await Promise.all([
            createGraphQLDocumentsService(rootOpts),
            createLinearService(rootOpts),
          ]);

          // Build input with only provided fields
          const input: Record<string, unknown> = {};
          if (options.title) input.title = options.title;
          if (options.content) input.content = options.content;
          if (options.project) {
            input.projectId = await linearService.resolveProjectId(
              options.project,
            );
          }
          if (options.icon) input.icon = options.icon;
          if (options.color) input.color = options.color;

          const document = await documentsService.updateDocument(
            documentId,
            input,
          );
          outputSuccess(document);
        },
      ),
    );

  /**
   * Read a document
   *
   * Command: `linearis documents read <document-id>`
   */
  documents
    .command("read <documentId>")
    .description("Read a document")
    .action(
      handleAsyncCommand(async (documentId: string, _options: any, command: Command) => {
        const rootOpts = command.parent!.parent!.opts();
        const documentsService = await createGraphQLDocumentsService(rootOpts);

        const document = await documentsService.getDocument(documentId);
        outputSuccess(document);
      }),
    );

  /**
   * List documents
   *
   * Command: `linearis documents list [options]`
   */
  documents
    .command("list")
    .description("List documents")
    .option("--project <project>", "filter by project name or ID")
    .option("-l, --limit <limit>", "maximum number of documents", "50")
    .action(
      handleAsyncCommand(
        async (options: DocumentListOptions, command: Command) => {
          const rootOpts = command.parent!.parent!.opts();
          const [documentsService, linearService] = await Promise.all([
            createGraphQLDocumentsService(rootOpts),
            createLinearService(rootOpts),
          ]);

          // Validate limit option
          const limit = parseInt(options.limit || "50", 10);
          if (isNaN(limit) || limit < 1) {
            throw new Error(
              `Invalid limit "${options.limit}": must be a positive number`,
            );
          }

          let projectId: string | undefined;
          if (options.project) {
            projectId = await linearService.resolveProjectId(options.project);
          }

          const documents = await documentsService.listDocuments({
            projectId,
            first: limit,
          });

          outputSuccess(documents);
        },
      ),
    );

  /**
   * Delete (trash) a document
   *
   * Command: `linearis documents delete <document-id>`
   *
   * This is a soft delete - the document is moved to trash.
   */
  documents
    .command("delete <documentId>")
    .description("Delete (trash) a document")
    .action(
      handleAsyncCommand(
        async (documentId: string, _options: any, command: Command) => {
          const rootOpts = command.parent!.parent!.opts();
          const documentsService = await createGraphQLDocumentsService(rootOpts);

          await documentsService.deleteDocument(documentId);
          outputSuccess({ success: true, message: "Document moved to trash" });
        },
      ),
    );
}
