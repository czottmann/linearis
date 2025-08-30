/**
 * Output successful data as formatted JSON
 * @param {*} data - Data to output
 */
export function outputSuccess(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output error as formatted JSON and exit with error code
 * @param {Error} error - Error to output
 */
export function outputError(error) {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
}

/**
 * Wrap an async command handler with error handling
 * @param {Function} asyncFn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
export function handleAsyncCommand(asyncFn) {
  return async (...args) => {
    try {
      await asyncFn(...args);
    } catch (error) {
      outputError(error);
    }
  };
}
