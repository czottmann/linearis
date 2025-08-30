import { createLinearService } from "../utils/linear-client.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";

/**
 * Setup projects commands on the program
 * @param {Command} program - Commander.js program instance
 */
export function setupProjectsCommands(program) {
  const projects = program.command("projects")
    .description("Project operations");

  // Show projects help when no subcommand
  projects.action(() => {
    projects.help();
  });

  projects.command("list")
    .description("List all projects")
    .action(handleAsyncCommand(async (options, command) => {
      const service = await createLinearService(command.parent.parent.opts());
      const result = await service.getProjects();
      outputSuccess(result);
    }));
}
