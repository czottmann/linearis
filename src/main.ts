#!/usr/bin/env node

import { program } from "commander";
import { setupCommentsCommands } from "./commands/comments.js";
import { setupIssuesCommands } from "./commands/issues.js";
import { setupLabelsCommands } from "./commands/labels.js";
import { setupProjectsCommands } from "./commands/projects.js";
import { generateUsageInfo } from "./utils/usage.js";

// Setup main program
program
  .name("linear")
  .description("CLI for Linear.app with JSON output")
  .version("1.0.0")
  .option("--api-token <token>", "Linear API token");

// Default action - show help when no subcommand
program.action(() => {
  program.help();
});

// Setup all subcommand groups
setupCommentsCommands(program);
setupIssuesCommands(program);
setupLabelsCommands(program);
setupProjectsCommands(program);

// Add usage command
program.command("usage")
  .description("show usage info for *all* tools")
  .action(() => {
    console.log(generateUsageInfo(program));
  });

// Parse command line arguments
program.parse();
