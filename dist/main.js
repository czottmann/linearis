#!/usr/bin/env node
import { program } from "commander";
import { setupCommentsCommands } from "./commands/comments.js";
import { setupEmbedsCommands } from "./commands/embeds.js";
import { setupIssuesCommands } from "./commands/issues.js";
import { setupLabelsCommands } from "./commands/labels.js";
import { setupProjectsCommands } from "./commands/projects.js";
import { setupCyclesCommands } from "./commands/cycles.js";
import { setupProjectMilestonesCommands } from "./commands/project-milestones.js";
import { outputUsageInfo } from "./utils/usage.js";
program
    .name("linearis")
    .description("CLI for Linear.app with JSON output")
    .version("2025.11.2")
    .option("--api-token <token>", "Linear API token");
program.action(() => {
    program.help();
});
setupIssuesCommands(program);
setupCommentsCommands(program);
setupLabelsCommands(program);
setupProjectsCommands(program);
setupCyclesCommands(program);
setupProjectMilestonesCommands(program);
setupEmbedsCommands(program);
program.command("usage")
    .description("show usage info for *all* tools")
    .action(() => outputUsageInfo(program));
program.parse();
