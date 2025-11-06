import { Command } from "commander";
import { getApiToken } from "../utils/auth.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
import { FileService } from "../utils/file-service.js";

/**
 * Setup embeds commands on the program
 * @param program - Commander.js program instance
 */
export function setupEmbedsCommands(program: Command): void {
  const embeds = program
    .command("embeds")
    .description("Download embedded files from Linear storage.");

  // Show embeds help when no subcommand
  embeds.action(() => {
    embeds.help();
  });

  embeds
    .command("download <url>")
    .description("Download a file from Linear storage.")
    .option("--output <path>", "output file path")
    .option("--overwrite", "overwrite existing file", false)
    .action(
      handleAsyncCommand(
        async (url: string, options: any, command: Command) => {
          // Get API token from parent command options
          const apiToken = await getApiToken(command.parent!.parent!.opts());

          // Create file service and download
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
          } else {
            // Include status code for debugging auth issues
            const error: any = {
              success: false,
              error: result.error,
            };
            if (result.statusCode) {
              error.statusCode = result.statusCode;
            }
            outputSuccess(error);
          }
        },
      ),
    );
}
