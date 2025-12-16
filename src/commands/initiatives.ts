import { Command } from "commander";
import { createLinearService } from "../utils/linear-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
import type {
  InitiativeListOptions,
  InitiativeReadOptions,
  InitiativeUpdateOptions,
} from "../utils/linear-types.js";

export function setupInitiativesCommands(program: Command): void {
  const initiatives = program
    .command("initiatives")
    .description("Initiative operations");

  initiatives.action(() => initiatives.help());

  initiatives
    .command("list")
    .description("List initiatives")
    .option("--status <status>", "filter by status (Planned/Active/Completed)")
    .option("--owner <ownerId>", "filter by owner ID")
    .option("-l, --limit <number>", "limit results", "50")
    .action(
      handleAsyncCommand(
        async (options: InitiativeListOptions, command: Command) => {
          const linearService = await createLinearService(
            command.parent!.parent!.opts(),
          );

          const initiatives = await linearService.getInitiatives(
            options.status,
            options.owner,
            parseInt(options.limit || "50"),
          );

          outputSuccess(initiatives);
        },
      ),
    );

  initiatives
    .command("read <initiativeIdOrName>")
    .description(
      "Get initiative details including projects and sub-initiatives. Accepts UUID or initiative name.",
    )
    .option(
      "--projects-first <n>",
      "how many projects to fetch (default 50)",
      "50",
    )
    .action(
      handleAsyncCommand(
        async (
          initiativeIdOrName: string,
          options: InitiativeReadOptions,
          command: Command,
        ) => {
          const linearService = await createLinearService(
            command.parent!.parent!.opts(),
          );

          // Resolve initiative ID (handles both UUID and name-based lookup)
          const initiativeId = await linearService.resolveInitiativeId(
            initiativeIdOrName,
          );

          // Fetch initiative with projects and sub-initiatives
          const initiative = await linearService.getInitiativeById(
            initiativeId,
            parseInt(options.projectsFirst || "50"),
          );

          outputSuccess(initiative);
        },
      ),
    );

  initiatives
    .command("update <initiativeIdOrName>")
    .description("Update an initiative. Accepts UUID or initiative name.")
    .option("-n, --name <name>", "new initiative name")
    .option("-d, --description <desc>", "new short description")
    .option("--content <content>", "new body content (markdown)")
    .option("--status <status>", "new status (Planned/Active/Completed)")
    .option("--owner <ownerId>", "new owner user ID")
    .option("--target-date <date>", "new target date (YYYY-MM-DD)")
    .action(
      handleAsyncCommand(
        async (
          initiativeIdOrName: string,
          options: InitiativeUpdateOptions,
          command: Command,
        ) => {
          const linearService = await createLinearService(
            command.parent!.parent!.opts(),
          );

          // Resolve initiative ID
          const initiativeId = await linearService.resolveInitiativeId(
            initiativeIdOrName,
          );

          // Build update object with only provided fields
          const updates: Record<string, any> = {};
          if (options.name !== undefined) updates.name = options.name;
          if (options.description !== undefined)
            updates.description = options.description;
          if (options.content !== undefined) updates.content = options.content;
          if (options.status !== undefined) updates.status = options.status;
          if (options.owner !== undefined) updates.ownerId = options.owner;
          if (options.targetDate !== undefined)
            updates.targetDate = options.targetDate;

          // Require at least one field to update
          if (Object.keys(updates).length === 0) {
            throw new Error(
              "At least one update option is required (--name, --description, --content, --status, --owner, or --target-date)",
            );
          }

          const updated = await linearService.updateInitiative(
            initiativeId,
            updates,
          );

          outputSuccess(updated);
        },
      ),
    );
}
