import { LinearClient } from "@linear/sdk";
import { CommandOptions, getApiToken } from "./auth.js";

/**
 * Performance timing utility for GraphQL operations
 */
export class GraphQLTimer {
  private startTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  end(): number {
    return performance.now() - this.startTime;
  }

  static async time<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const timer = new GraphQLTimer();
    timer.start();
    try {
      const result = await fn();
      const duration = timer.end();
      return { result, duration };
    } catch (error) {
      const duration = timer.end();
      console.error(
        `GraphQL operation "${operation}" failed after ${
          duration.toFixed(2)
        }ms:`,
        error,
      );
      throw error;
    }
  }
}

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
   * Execute a timed GraphQL query for performance measurement
   */
  async timedRequest<T = any>(
    operationName: string,
    query: string,
    variables?: any,
  ): Promise<{ result: T; duration: number }> {
    return GraphQLTimer.time(
      operationName,
      () => this.rawRequest<T>(query, variables),
    );
  }

  /**
   * Execute multiple GraphQL queries in parallel (batching utility)
   */
  async batchRequest<T = any[]>(
    queries: Array<{ name: string; query: string; variables?: any }>,
  ): Promise<T[]> {
    const promises = queries.map(({ name, query, variables }) =>
      this.timedRequest(name, query, variables).then(({ result }) => result)
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
