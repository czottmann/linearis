import { getApiToken } from "../utils/auth.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
import { FileService } from "../utils/file-service.js";
export function setupEmbedsCommands(program) {
    const embeds = program
        .command("embeds")
        .description("Download embedded files from Linear storage.");
    embeds.action(() => {
        embeds.help();
    });
    embeds
        .command("download <url>")
        .description("Download a file from Linear storage.")
        .option("--output <path>", "output file path")
        .option("--overwrite", "overwrite existing file", false)
        .action(handleAsyncCommand(async (url, options, command) => {
        const apiToken = await getApiToken(command.parent.parent.opts());
        const fileService = new FileService(apiToken);
        const result = await fileService.downloadFile(url, {
            output: options.output,
            overwrite: options.overwrite,
        });
        if (result.success) {
            outputSuccess({
                success: true,
                filePath: result.filePath,
                message: `File downloaded successfully to ${result.filePath}`,
            });
        }
        else {
            const error = {
                success: false,
                error: result.error,
            };
            if (result.statusCode) {
                error.statusCode = result.statusCode;
            }
            outputSuccess(error);
        }
    }));
}
