import { Command } from "commander";
import { createLinearService } from "../utils/linear-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";

/**
 * Setup labels commands on the program
 * @param program - Commander.js program instance
 */
export function setupLabelsCommands(program: Command): void {
  const labels = program.command("labels")
    .description("Label operations");

  // Show labels help when no subcommand
  labels.action(() => {
    labels.help();
  });

  labels.command("list")
    .description("List all available labels")
    .option("--team <team>", "filter by team key, name, or ID")
    .action(handleAsyncCommand(async (options: any, command: Command) => {
      const service = await createLinearService(command.parent!.parent!.opts());
      const result = await service.getLabels(options.team);
      outputSuccess(result);
    }));
}
