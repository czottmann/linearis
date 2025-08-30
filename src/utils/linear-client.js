import { LinearClient } from "@linear/sdk";
import { LinearService } from "../services/linear-service.ts";
import { getApiToken } from "./auth.js";

/**
 * Create a LinearService instance with authentication
 * @param {Object} options - Command options containing potential apiToken
 * @returns {Promise<LinearService>} Configured LinearService instance
 * @throws {Error} If authentication fails
 */
export async function createLinearService(options) {
  const apiKey = await getApiToken(options);
  const client = new LinearClient({ apiKey });
  return new LinearService(client);
}
