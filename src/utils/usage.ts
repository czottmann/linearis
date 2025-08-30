import { Command } from "commander";

/**
 * Generate usage information for all individual subcommands
 * @param program - Commander.js program instance
 * @returns Formatted usage string with all subcommand help blocks
 */
export function generateUsageInfo(program: Command): string {
  const subcommands: { name: string; command: Command }[] = [];

  // Collect all leaf subcommands (not parent commands)
  function collectSubcommands(cmd: Command, prefix: string = "") {
    const currentName = prefix ? `${prefix} ${cmd.name()}` : cmd.name();

    // Get all subcommands
    const commands = cmd.commands;

    if (commands.length === 0) {
      // This is a leaf command (actual subcommand)
      if (prefix) { // Only include commands with a prefix (exclude root)
        subcommands.push({ name: currentName, command: cmd });
      }
    } else {
      // This is a parent command, recurse into its subcommands
      commands.forEach((subcmd) => {
        collectSubcommands(subcmd, currentName);
      });
    }
  }

  // Start collection from root program
  collectSubcommands(program);

  // Sort subcommands alphabetically by full name
  subcommands.sort((a, b) => a.name.localeCompare(b.name));

  // Generate help text for each subcommand
  const helpBlocks = subcommands.map(({ command }) => {
    return command.helpInformation();
  });

  // Join with separator
  return helpBlocks.join("\n---\n\n");
}
