import { createLinearService } from "../utils/linear-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
export function setupLabelsCommands(program) {
    const labels = program.command("labels")
        .description("Label operations");
    labels.action(() => {
        labels.help();
    });
    labels.command("list")
        .description("List all available labels")
        .option("--team <team>", "filter by team key, name, or ID")
        .action(handleAsyncCommand(async (options, command) => {
        const service = await createLinearService(command.parent.parent.opts());
        const result = await service.getLabels(options.team);
        outputSuccess(result);
    }));
}
