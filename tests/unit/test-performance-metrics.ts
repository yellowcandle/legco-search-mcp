// Unit Tests for PerformanceMetrics Entity
// Tests validation, factory functions, and performance checking logic

import { describe, it, expect } from 'vitest';
import {
  PerformanceMetrics,
  validatePerformanceMetrics,
  createPerformanceMetrics,
  PERFORMANCE_THRESHOLDS,
  isHealthCheckWithinLimits,
  isErrorRateAcceptable,
  hasPerformanceWarnings,
  calculateErrorRate,
  calculateAverageLatency,
  createHealthCheckMetrics,
  createApiMetrics
} from '../../src/models/performance-metrics';

describe('PerformanceMetrics Entity', () => {
  describe('validatePerformanceMetrics', () => {
    it('should validate correct PerformanceMetrics', () => {
      const metrics: PerformanceMetrics = {
        timestamp: '2025-01-15T00:00:00Z',
        healthCheckResponseTime: 50,
        apiTimeoutCount: 0,
        averageLatency: 200,
        errorRate: 2.5,
        activeConnections: 10
      };

      expect(validatePerformanceMetrics(metrics)).toBe(true);
    });

    it('should reject invalid timestamp', () => {
      const metrics: PerformanceMetrics = {
        timestamp: 'invalid-date',
        healthCheckResponseTime: 50,
        apiTimeoutCount: 0,
        averageLatency: 200,
        errorRate: 2.5,
        activeConnections: 10
      };

      expect(validatePerformanceMetrics(metrics)).toBe(false);
    });

    it('should reject negative health check response time', () => {
      const metrics: PerformanceMetrics = {
        timestamp: '2025-01-15T00:00:00Z',
        healthCheckResponseTime: -10,
        apiTimeoutCount: 0,
        averageLatency: 200,
        errorRate: 2.5,
        activeConnections: 10
      };

      expect(validatePerformanceMetrics(metrics)).toBe(false);
    });

    it('should reject negative API timeout count', () => {
      const metrics: PerformanceMetrics = {
        timestamp: '2025-01-15T00:00:00Z',
        healthCheckResponseTime: 50,
        apiTimeoutCount: -1,
        averageLatency: 200,
        errorRate: 2.5,
        activeConnections: 10
      };

      expect(validatePerformanceMetrics(metrics)).toBe(false);
    });

    it('should reject negative average latency', () => {
      const metrics: PerformanceMetrics = {
        timestamp: '2025-01-15T00:00:00Z',
        healthCheckResponseTime: 50,
        apiTimeoutCount: 0,
        averageLatency: -50,
        errorRate: 2.5,
        activeConnections: 10
      };

      expect(validatePerformanceMetrics(metrics)).toBe(false);
    });

    it('should reject error rate below 0', () => {
      const metrics: PerformanceMetrics = {
        timestamp: '2025-01-15T00:00:00Z',
        healthCheckResponseTime: 50,
        apiTimeoutCount: 0,
        averageLatency: 200,
        errorRate: -1,
        activeConnections: 10
      };

      expect(validatePerformanceMetrics(metrics)).toBe(false);
    });

    it('should reject error rate above 100', () => {
      const metrics: PerformanceMetrics = {
        timestamp: '2025-01-15T00:00:00Z',
        healthCheckResponseTime: 50,
        apiTimeoutCount: 0,
        averageLatency: 200,
        errorRate: 150,
        activeConnections: 10
      };

      expect(validatePerformanceMetrics(metrics)).toBe(false);
    });

    it('should reject negative active connections', () => {
      const metrics: PerformanceMetrics = {
        timestamp: '2025-01-15T00:00:00Z',
        healthCheckResponseTime: 50,
        apiTimeoutCount: 0,
        averageLatency: 200,
        errorRate: 2.5,
        activeConnections: -5
      };

      expect(validatePerformanceMetrics(metrics)).toBe(false);
    });

    it('should accept zero values for all numeric fields', () => {
      const metrics: PerformanceMetrics = {
        timestamp: '2025-01-15T00:00:00Z',
        healthCheckResponseTime: 0,
        apiTimeoutCount: 0,
        averageLatency: 0,
        errorRate: 0,
        activeConnections: 0
      };

      expect(validatePerformanceMetrics(metrics)).toBe(true);
    });

    it('should accept boundary values', () => {
      const metrics: PerformanceMetrics = {
        timestamp: '2025-01-15T00:00:00Z',
        healthCheckResponseTime: 0,
        apiTimeoutCount: 0,
        averageLatency: 0,
        errorRate: 100,
        activeConnections: 0
      };

      expect(validatePerformanceMetrics(metrics)).toBe(true);
    });
  });

  describe('createPerformanceMetrics', () => {
    it('should create a valid PerformanceMetrics with all parameters', () => {
      const metrics = createPerformanceMetrics(
        50,
        2,
        200,
        2.5,
        10,
        '2025-01-15T00:00:00Z'
      );

      expect(metrics.timestamp).toBe('2025-01-15T00:00:00Z');
      expect(metrics.healthCheckResponseTime).toBe(50);
      expect(metrics.apiTimeoutCount).toBe(2);
      expect(metrics.averageLatency).toBe(200);
      expect(metrics.errorRate).toBe(2.5);
      expect(metrics.activeConnections).toBe(10);
    });

    it('should create a valid PerformanceMetrics with defaults', () => {
      const metrics = createPerformanceMetrics(50);

      expect(metrics.healthCheckResponseTime).toBe(50);
      expect(metrics.apiTimeoutCount).toBe(0);
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO date
    });

    it('should throw error for invalid health check response time', () => {
      expect(() => createPerformanceMetrics(-10)).toThrow('Invalid PerformanceMetrics data');
    });

    it('should throw error for invalid error rate', () => {
      expect(() => createPerformanceMetrics(50, 0, 200, 150)).toThrow('Invalid PerformanceMetrics data');
    });
  });

  describe('PERFORMANCE_THRESHOLDS', () => {
    it('should define correct threshold values', () => {
      expect(PERFORMANCE_THRESHOLDS.HEALTH_CHECK_MAX_TIME).toBe(100);
      expect(PERFORMANCE_THRESHOLDS.API_TIMEOUT_MAX).toBe(60);
      expect(PERFORMANCE_THRESHOLDS.ERROR_RATE_MAX).toBe(5);
      expect(PERFORMANCE_THRESHOLDS.LATENCY_WARNING).toBe(500);
      expect(PERFORMANCE_THRESHOLDS.CONNECTIONS_WARNING).toBe(1000);
    });
  });

  describe('isHealthCheckWithinLimits', () => {
    it('should return true for response time within limits', () => {
      const metrics = createPerformanceMetrics(50);
      expect(isHealthCheckWithinLimits(metrics)).toBe(true);
    });

    it('should return true for response time at limit', () => {
      const metrics = createPerformanceMetrics(100);
      expect(isHealthCheckWithinLimits(metrics)).toBe(true);
    });

    it('should return false for response time over limit', () => {
      const metrics = createPerformanceMetrics(150);
      expect(isHealthCheckWithinLimits(metrics)).toBe(false);
    });
  });

  describe('isErrorRateAcceptable', () => {
    it('should return true for error rate within limits', () => {
      const metrics = createPerformanceMetrics(50, 0, 200, 3);
      expect(isErrorRateAcceptable(metrics)).toBe(true);
    });

    it('should return true for error rate at limit', () => {
      const metrics = createPerformanceMetrics(50, 0, 200, 5);
      expect(isErrorRateAcceptable(metrics)).toBe(true);
    });

    it('should return false for error rate over limit', () => {
      const metrics = createPerformanceMetrics(50, 0, 200, 10);
      expect(isErrorRateAcceptable(metrics)).toBe(false);
    });
  });

  describe('hasPerformanceWarnings', () => {
    it('should return false for good performance', () => {
      const metrics = createPerformanceMetrics(50, 0, 200, 2, 100);
      expect(hasPerformanceWarnings(metrics)).toBe(false);
    });

    it('should return true for high latency', () => {
      const metrics = createPerformanceMetrics(50, 0, 600, 2, 100);
      expect(hasPerformanceWarnings(metrics)).toBe(true);
    });

    it('should return true for high connections', () => {
      const metrics = createPerformanceMetrics(50, 0, 200, 2, 1500);
      expect(hasPerformanceWarnings(metrics)).toBe(true);
    });

    it('should return true for both warnings', () => {
      const metrics = createPerformanceMetrics(50, 0, 600, 2, 1500);
      expect(hasPerformanceWarnings(metrics)).toBe(true);
    });
  });

  describe('calculateErrorRate', () => {
    it('should calculate error rate correctly', () => {
      expect(calculateErrorRate(5, 100)).toBe(5);
      expect(calculateErrorRate(1, 10)).toBe(10);
      expect(calculateErrorRate(0, 100)).toBe(0);
    });

    it('should handle zero total requests', () => {
      expect(calculateErrorRate(5, 0)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateErrorRate(1, 3)).toBe(33.33);
      expect(calculateErrorRate(2, 7)).toBe(28.57);
    });
  });

  describe('calculateAverageLatency', () => {
    it('should calculate average latency correctly', () => {
      expect(calculateAverageLatency([100, 200, 300])).toBe(200);
      expect(calculateAverageLatency([50])).toBe(50);
      expect(calculateAverageLatency([10, 20, 30, 40, 50])).toBe(30);
    });

    it('should handle empty array', () => {
      expect(calculateAverageLatency([])).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(calculateAverageLatency([100, 101])).toBe(101); // (100+101)/2 = 100.5 -> 101 (rounds up)
      expect(calculateAverageLatency([100, 102])).toBe(101); // (100+102)/2 = 101
    });
  });

  describe('createHealthCheckMetrics', () => {
    it('should create metrics for health check', () => {
      const metrics = createHealthCheckMetrics(75);

      expect(metrics.healthCheckResponseTime).toBe(75);
      expect(metrics.apiTimeoutCount).toBe(0);
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('createApiMetrics', () => {
    it('should create metrics for API calls', () => {
      const metrics = createApiMetrics(
        [100, 200, 300], // response times
        2, // timeout count
        5, // error count
        100, // total requests
        25 // active connections
      );

      expect(metrics.healthCheckResponseTime).toBe(0);
      expect(metrics.apiTimeoutCount).toBe(2);
      expect(metrics.averageLatency).toBe(200); // (100+200+300)/3
      expect(metrics.errorRate).toBe(5); // (5/100)*100
      expect(metrics.activeConnections).toBe(25);
    });

    it('should handle empty response times array', () => {
      const metrics = createApiMetrics([], 0, 0, 10, 5);

      expect(metrics.averageLatency).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });
  });
});