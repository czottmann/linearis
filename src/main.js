#!/usr/bin/env node

import { program } from "commander";
import { setupProjectsCommands } from "./commands/projects.js";
import { setupIssuesCommands } from "./commands/issues.js";
import { setupCommentsCommands } from "./commands/comments.js";
import { setupUserCommands } from "./commands/user.js";

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
setupProjectsCommands(program);
setupIssuesCommands(program);
setupCommentsCommands(program);
setupUserCommands(program);

// Parse command line arguments
program.parse();
