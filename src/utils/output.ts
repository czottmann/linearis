/**
 * Output successful data as formatted JSON
 * @param data - Data to output
 */
export function outputSuccess(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output error as formatted JSON and exit with error code
 * @param error - Error to output
 */
export function outputError(error: Error): void {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
}

/**
 * Wrap an async command handler with error handling
 * @param asyncFn - Async function to wrap
 * @returns Wrapped function with error handling
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
