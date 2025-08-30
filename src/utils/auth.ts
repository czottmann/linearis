import fs from "fs";
import path from "path";
import os from "os";

export interface CommandOptions {
  apiToken?: string;
}

/**
 * Get Linear API token from multiple sources in priority order:
 * 1. --api-token command flag
 * 2. LINEAR_API_TOKEN environment variable
 * 3. ~/.linear_api_token file
 * @param options - Command options containing potential apiToken
 * @returns API token
 * @throws Error if no token is found
 */
export async function getApiToken(options: CommandOptions): Promise<string> {
  // Priority 1: Check --api-token flag
  if (options.apiToken) {
    return options.apiToken;
  }

  // Priority 2: Check LINEAR_API_TOKEN environment variable
  if (process.env.LINEAR_API_TOKEN) {
    return process.env.LINEAR_API_TOKEN;
  }

  // Priority 3: Read from ~/.linear_api_token file
  const tokenFile = path.join(os.homedir(), ".linear_api_token");
  if (fs.existsSync(tokenFile)) {
    return fs.readFileSync(tokenFile, "utf8").trim();
  }

  throw new Error(
    "No API token found. Use --api-token, LINEAR_API_TOKEN env var, or ~/.linear_api_token file",
  );
}
