#!/usr/bin/env node
import { program } from "commander";
import { setupCommentsCommands } from "./commands/comments.js";
import { setupIssuesCommands } from "./commands/issues.js";
import { setupLabelsCommands } from "./commands/labels.js";
import { setupProjectsCommands } from "./commands/projects.js";
import { outputUsageInfo } from "./utils/usage.js";
program
    .name("linear")
    .description("CLI for Linear.app with JSON output")
    .version("1.0.0")
    .option("--api-token <token>", "Linear API token");
program.action(() => {
    program.help();
});
setupIssuesCommands(program);
setupCommentsCommands(program);
setupLabelsCommands(program);
setupProjectsCommands(program);
program.command("usage")
    .description("show usage info for *all* tools")
    .action(() => outputUsageInfo(program));
program.parse();
