export function outputSuccess(data) {
    console.log(JSON.stringify(data, null, 2));
}
export function outputError(error) {
    console.error(JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
}
export function handleAsyncCommand(asyncFn) {
    return async (...args) => {
        try {
            await asyncFn(...args);
        }
        catch (error) {
            outputError(error instanceof Error ? error : new Error(String(error)));
        }
    };
}
