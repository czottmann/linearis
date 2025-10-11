import { createLinearService } from "../utils/linear-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
export function setupProjectsCommands(program) {
    const projects = program.command("projects")
        .description("Project operations");
    projects.action(() => {
        projects.help();
    });
    projects.command("list")
        .description("List projects")
        .option("-l, --limit <number>", "limit results (not implemented by Linear SDK, showing all)", "100")
        .action(handleAsyncCommand(async (_options, command) => {
        const service = await createLinearService(command.parent.parent.opts());
        const result = await service.getProjects();
        outputSuccess(result);
    }));
}
