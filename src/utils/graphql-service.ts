import { LinearClient } from "@linear/sdk";
import { CommandOptions, getApiToken } from "./auth.js";

/**
 * GraphQL service wrapper around LinearGraphQLClient
 * Provides optimized direct GraphQL queries with error handling matching LinearService
 */
export class GraphQLService {
  private graphQLClient: any;
  private client: LinearClient;

  constructor(apiToken: string) {
    this.client = new LinearClient({ apiKey: apiToken });
    this.graphQLClient = this.client.client;
  }

  /**
   * Execute a raw GraphQL query with error handling
   */
  async rawRequest<T = any>(query: string, variables?: any): Promise<T> {
    try {
      const response = await this.graphQLClient.rawRequest(query, variables);
      return response.data as T;
    } catch (error: any) {
      // Transform GraphQL errors to match LinearService error patterns
      if (error.response?.errors) {
        const graphQLError = error.response.errors[0];
        throw new Error(graphQLError.message || "GraphQL query failed");
      }
      throw new Error(`GraphQL request failed: ${error.message}`);
    }
  }

  /**
   * Execute multiple GraphQL queries in parallel (batching utility)
   */
  async batchRequest<T = any[]>(
    queries: Array<{ name: string; query: string; variables?: any }>,
  ): Promise<T[]> {
    const promises = queries.map(({ name, query, variables }) =>
      this.rawRequest<T>(query, variables)
    );
    return Promise.all(promises);
  }

  /**
   * Get the underlying Linear client for fallback operations
   */
  getLinearClient(): LinearClient {
    return this.client;
  }
}

/**
 * Create GraphQLService instance with authentication
 */
export async function createGraphQLService(
  options: CommandOptions,
): Promise<GraphQLService> {
  const apiToken = await getApiToken(options);
  return new GraphQLService(apiToken);
}
