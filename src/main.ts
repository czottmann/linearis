#!/usr/bin/env node

import { program } from "commander";
import { setupIssuesCommands } from "./commands/issues.js";
import { setupProjectsCommands } from "./commands/projects.js";

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
setupIssuesCommands(program);
setupProjectsCommands(program);

// Parse command line arguments
program.parse();
