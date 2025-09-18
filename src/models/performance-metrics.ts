// PerformanceMetrics entity model
// Tracks performance benchmarks and health status

export interface PerformanceMetrics {
  timestamp: string; // ISO timestamp
  healthCheckResponseTime: number; // milliseconds
  apiTimeoutCount: number; // number of timeouts
  averageLatency: number; // milliseconds
  errorRate: number; // percentage (0-100)
  activeConnections: number; // number of active connections
}

// Validation functions
export function validatePerformanceMetrics(metrics: PerformanceMetrics): boolean {
  // Validate timestamp
  const timestamp = new Date(metrics.timestamp);
  if (isNaN(timestamp.getTime())) {
    return false;
  }

  // Validate numeric fields
  if (metrics.healthCheckResponseTime < 0) {
    return false;
  }

  if (metrics.apiTimeoutCount < 0) {
    return false;
  }

  if (metrics.averageLatency < 0) {
    return false;
  }

  if (metrics.errorRate < 0 || metrics.errorRate > 100) {
    return false;
  }

  if (metrics.activeConnections < 0) {
    return false;
  }

  return true;
}

// Factory function for creating PerformanceMetrics instances
export function createPerformanceMetrics(
  healthCheckResponseTime: number,
  apiTimeoutCount: number = 0,
  averageLatency: number = 0,
  errorRate: number = 0,
  activeConnections: number = 0,
  timestamp: string = new Date().toISOString()
): PerformanceMetrics {
  const metrics: PerformanceMetrics = {
    timestamp,
    healthCheckResponseTime,
    apiTimeoutCount,
    averageLatency,
    errorRate,
    activeConnections
  };

  if (!validatePerformanceMetrics(metrics)) {
    throw new Error('Invalid PerformanceMetrics data');
  }

  return metrics;
}

// Performance threshold constants (constitution requirements)
export const PERFORMANCE_THRESHOLDS = {
  HEALTH_CHECK_MAX_TIME: 100, // ms
  API_TIMEOUT_MAX: 60, // seconds
  ERROR_RATE_MAX: 5, // percentage
  LATENCY_WARNING: 500, // ms
  CONNECTIONS_WARNING: 1000 // concurrent connections
} as const;

// Performance checking functions
export function isHealthCheckWithinLimits(metrics: PerformanceMetrics): boolean {
  return metrics.healthCheckResponseTime <= PERFORMANCE_THRESHOLDS.HEALTH_CHECK_MAX_TIME;
}

export function isErrorRateAcceptable(metrics: PerformanceMetrics): boolean {
  return metrics.errorRate <= PERFORMANCE_THRESHOLDS.ERROR_RATE_MAX;
}

export function hasPerformanceWarnings(metrics: PerformanceMetrics): boolean {
  return metrics.averageLatency > PERFORMANCE_THRESHOLDS.LATENCY_WARNING ||
         metrics.activeConnections > PERFORMANCE_THRESHOLDS.CONNECTIONS_WARNING;
}

export function calculateErrorRate(errors: number, totalRequests: number): number {
  if (totalRequests === 0) return 0;
  return Math.round((errors / totalRequests) * 100 * 100) / 100; // Round to 2 decimal places
}

export function calculateAverageLatency(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  const sum = latencies.reduce((acc, latency) => acc + latency, 0);
  return Math.round(sum / latencies.length);
}

// Performance monitoring helpers
export function createHealthCheckMetrics(responseTime: number): PerformanceMetrics {
  return createPerformanceMetrics(responseTime);
}

export function createApiMetrics(
  responseTimes: number[],
  timeoutCount: number,
  errorCount: number,
  totalRequests: number,
  activeConnections: number
): PerformanceMetrics {
  const averageLatency = calculateAverageLatency(responseTimes);
  const errorRate = calculateErrorRate(errorCount, totalRequests);

  return createPerformanceMetrics(
    0, // health check time not applicable
    timeoutCount,
    averageLatency,
    errorRate,
    activeConnections
  );
}