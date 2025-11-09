import { LinearClient } from "@linear/sdk";
import { CommandOptions, getApiToken } from "./auth.js";

/**
 * GraphQL service wrapper around LinearGraphQLClient
 * 
 * Provides optimized direct GraphQL queries with error handling matching LinearService.
 * This service enables single-query operations with batch resolving to eliminate
 * the N+1 query problem common with the Linear SDK.
 * 
 * Features:
 * - Direct GraphQL query execution
 * - 1-hour signed URL generation for file downloads
 * - Consistent error handling patterns
 * - Batch query capabilities
 */
export class GraphQLService {
  private graphQLClient: any;
  private client: LinearClient;

  /**
   * Initialize GraphQL service with authentication
   * 
   * @param apiToken - Linear API token for authentication
   */
  constructor(apiToken: string) {
    this.client = new LinearClient({
      apiKey: apiToken,
      headers: {
        "public-file-urls-expire-in": "3600", // 1 hour expiry for signed URLs
      },
    });
    this.graphQLClient = this.client.client;
  }

  /**
   * Execute a raw GraphQL query with error handling
   * 
   * @param query - GraphQL query string
   * @param variables - Optional query variables
   * @returns Query response data
   * @throws Error with descriptive message for GraphQL errors
   * 
   * @example
   * ```typescript
   * const result = await graphqlService.rawRequest(
   *   GET_ISSUES_QUERY,
   *   { first: 10 }
   * );
   * ```
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
