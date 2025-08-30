import { Command } from "commander";
import { createLinearService } from "../utils/linear-client.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";

/**
 * Setup projects commands on the program
 * @param program - Commander.js program instance
 */
export function setupProjectsCommands(program: Command): void {
  const projects = program.command("projects")
    .description("Project operations");

  // Show projects help when no subcommand
  projects.action(() => {
    projects.help();
  });

  projects.command("list")
    .description("List projects")
    .option(
      "-l, --limit <number>",
      "limit results (not implemented by Linear SDK, showing all)",
      "100",
    )
    .action(handleAsyncCommand(async (_options: any, command: Command) => {
      const service = await createLinearService(command.parent!.parent!.opts());
      const result = await service.getProjects();
      outputSuccess(result);
    }));
}
