import { createLinearService } from "../utils/linear-client.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";

/**
 * Setup user commands on the program
 * @param {Command} program - Commander.js program instance
 */
export function setupUserCommands(program) {
  const user = program.command("user")
    .description("User operations");

  // Show user help when no subcommand
  user.action(() => {
    user.help();
  });

  user.command("info")
    .description("Get current user information")
    .action(handleAsyncCommand(async (options, command) => {
      const service = await createLinearService(command.parent.parent.opts());
      const result = await service.getUserInfo();
      outputSuccess(result);
    }));
}
