/**
 * Performance measurement utilities for comparing SDK vs GraphQL implementations
 */

export interface PerformanceMetrics {
  operation: string;
  method: "SDK" | "GraphQL";
  duration: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * Performance tracker for comparing implementations
 */
export class PerformanceTracker {
  private metrics: PerformanceMetrics[] = [];

  /**
   * Record a performance measurement
   */
  record(
    operation: string,
    method: "SDK" | "GraphQL",
    duration: number,
    success: boolean = true,
    error?: string,
  ): void {
    this.metrics.push({
      operation,
      method,
      duration,
      timestamp: new Date().toISOString(),
      success,
      error,
    });
  }

  /**
   * Compare performance between SDK and GraphQL for an operation
   */
  compare(
    operation: string,
  ): {
    sdk?: PerformanceMetrics;
    graphql?: PerformanceMetrics;
    improvement?: string;
  } {
    const sdkMetrics = this.metrics.filter((m) =>
      m.operation === operation && m.method === "SDK" && m.success
    );
    const graphqlMetrics = this.metrics.filter((m) =>
      m.operation === operation && m.method === "GraphQL" && m.success
    );

    const sdk = sdkMetrics.length > 0
      ? sdkMetrics[sdkMetrics.length - 1]
      : undefined;
    const graphql = graphqlMetrics.length > 0
      ? graphqlMetrics[graphqlMetrics.length - 1]
      : undefined;

    let improvement: string | undefined;
    if (sdk && graphql) {
      const speedup = sdk.duration / graphql.duration;
      const percentImprovement = (sdk.duration - graphql.duration) /
        sdk.duration * 100;
      improvement = `${speedup.toFixed(1)}x faster (${
        percentImprovement.toFixed(0)
      }% improvement)`;
    }

    return { sdk, graphql, improvement };
  }

  /**
   * Get all metrics for an operation
   */
  getMetrics(operation?: string): PerformanceMetrics[] {
    return operation
      ? this.metrics.filter((m) => m.operation === operation)
      : this.metrics;
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const operations = [...new Set(this.metrics.map((m) => m.operation))];
    let report = "\n=== Performance Comparison Report ===\n\n";

    for (const operation of operations) {
      const comparison = this.compare(operation);
      report += `${operation}:\n`;

      if (comparison.sdk) {
        report += `  SDK:     ${comparison.sdk.duration.toFixed(0)}ms\n`;
      }
      if (comparison.graphql) {
        report += `  GraphQL: ${comparison.graphql.duration.toFixed(0)}ms\n`;
      }
      if (comparison.improvement) {
        report += `  Improvement: ${comparison.improvement}\n`;
      }
      report += "\n";
    }

    return report;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

/**
 * Global performance tracker instance
 */
export const performanceTracker = new PerformanceTracker();

/**
 * Utility function to time an async operation
 */
export async function timeOperation<T>(
  operation: string,
  method: "SDK" | "GraphQL",
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    performanceTracker.record(operation, method, duration, true);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceTracker.record(
      operation,
      method,
      duration,
      false,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
