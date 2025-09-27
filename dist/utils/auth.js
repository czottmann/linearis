import fs from "fs";
import path from "path";
import os from "os";
export async function getApiToken(options) {
    if (options.apiToken) {
        return options.apiToken;
    }
    if (process.env.LINEAR_API_TOKEN) {
        return process.env.LINEAR_API_TOKEN;
    }
    const tokenFile = path.join(os.homedir(), ".linear_api_token");
    if (fs.existsSync(tokenFile)) {
        return fs.readFileSync(tokenFile, "utf8").trim();
    }
    throw new Error("No API token found. Use --api-token, LINEAR_API_TOKEN env var, or ~/.linear_api_token file");
}
