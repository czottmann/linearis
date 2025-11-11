/**
 * Output successful data as formatted JSON
 * 
 * @param data - Data to output (will be JSON serialized)
 * 
 * @example
 * ```typescript
 * outputSuccess({ id: "123", title: "Issue title" });
 * // Outputs: { "id": "123", "title": "Issue title" }
 * ```
 */
export function outputSuccess(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output error as formatted JSON and exit with error code
 * 
 * @param error - Error to output (will be serialized to error.message)
 * 
 * @example
 * ```typescript
 * outputError(new Error("Something went wrong"));
 * // Outputs to stderr: { "error": "Something went wrong" }
 * // Process exits with code 1
 * ```
 */
export function outputError(error: Error): void {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
}

/**
 * Wrap an async command handler with error handling
 * 
 * This utility provides consistent error handling for all CLI commands.
 * It catches both thrown errors and rejected promises, formats them
 * as JSON, and exits with appropriate error codes.
 * 
 * @param asyncFn - Async function to wrap (typically a command handler)
 * @returns Wrapped function with error handling
 * 
 * @example
 * ```typescript
 * export const setupMyCommand = (program: Command) => {
 *   const cmd = program.command("my-command");
 *   cmd.action(handleAsyncCommand(async (command: Command) => {
 *     // Command logic here - errors will be caught and formatted
 *     const result = await someAsyncOperation();
 *     outputSuccess(result);
 *   }));
 * };
 * ```
 */
export function handleAsyncCommand(
  asyncFn: (...args: any[]) => Promise<void>,
): (...args: any[]) => Promise<void> {
  return async (...args: any[]) => {
    try {
      await asyncFn(...args);
    } catch (error) {
      outputError(error instanceof Error ? error : new Error(String(error)));
    }
  };
}
