// Unit Tests for ServerConfiguration Entity
// Tests validation, factory functions, and business logic

import { describe, it, expect } from 'vitest';
import {
  ServerConfiguration,
  UpdateStatus,
  validateServerConfiguration,
  createServerConfiguration,
  DEFAULT_SERVER_CONFIG,
  isServerUpdating,
  isServerStable,
  requiresRollback
} from '../../src/models/server-configuration';

describe('ServerConfiguration Entity', () => {
  describe('validateServerConfiguration', () => {
    it('should validate a correct ServerConfiguration', () => {
      const config: ServerConfiguration = {
        currentVersion: '2025-06-18',
        updateStatus: 'stable',
        healthCheckEnabled: true
      };

      expect(validateServerConfiguration(config)).toBe(true);
    });

    it('should reject invalid protocol version format', () => {
      const config: ServerConfiguration = {
        currentVersion: '2025.06.18', // Wrong format
        updateStatus: 'stable',
        healthCheckEnabled: true
      };

      expect(validateServerConfiguration(config)).toBe(false);
    });

    it('should reject invalid update status', () => {
      const config: ServerConfiguration = {
        currentVersion: '2025-06-18',
        updateStatus: 'invalid' as UpdateStatus, // Invalid status
        healthCheckEnabled: true
      };

      expect(validateServerConfiguration(config)).toBe(false);
    });

    it('should validate optional target version', () => {
      const config: ServerConfiguration = {
        currentVersion: '2025-06-18',
        updateStatus: 'updating',
        targetVersion: '2025-07-01',
        healthCheckEnabled: true
      };

      expect(validateServerConfiguration(config)).toBe(true);
    });

    it('should reject invalid target version format', () => {
      const config: ServerConfiguration = {
        currentVersion: '2025-06-18',
        updateStatus: 'updating',
        targetVersion: '2025.07.01', // Wrong format
        healthCheckEnabled: true
      };

      expect(validateServerConfiguration(config)).toBe(false);
    });

    it('should validate optional timestamp', () => {
      const config: ServerConfiguration = {
        currentVersion: '2025-06-18',
        updateStatus: 'updating',
        lastUpdateAttempt: '2025-01-15T10:30:00Z',
        healthCheckEnabled: true
      };

      expect(validateServerConfiguration(config)).toBe(true);
    });

    it('should reject invalid timestamp', () => {
      const config: ServerConfiguration = {
        currentVersion: '2025-06-18',
        updateStatus: 'updating',
        lastUpdateAttempt: 'invalid-timestamp',
        healthCheckEnabled: true
      };

      expect(validateServerConfiguration(config)).toBe(false);
    });
  });

  describe('createServerConfiguration', () => {
    it('should create a valid ServerConfiguration with all parameters', () => {
      const config = createServerConfiguration(
        '2025-06-18',
        'updating',
        '2025-07-01',
        '2025-06-01',
        '2025-01-15T10:30:00Z',
        false
      );

      expect(config.currentVersion).toBe('2025-06-18');
      expect(config.updateStatus).toBe('updating');
      expect(config.targetVersion).toBe('2025-07-01');
      expect(config.rollbackVersion).toBe('2025-06-01');
      expect(config.lastUpdateAttempt).toBe('2025-01-15T10:30:00Z');
      expect(config.healthCheckEnabled).toBe(false);
    });

    it('should create a valid ServerConfiguration with defaults', () => {
      const config = createServerConfiguration('2025-06-18');

      expect(config.currentVersion).toBe('2025-06-18');
      expect(config.updateStatus).toBe('stable');
      expect(config.healthCheckEnabled).toBe(true);
      expect(config.targetVersion).toBeUndefined();
      expect(config.rollbackVersion).toBeUndefined();
      expect(config.lastUpdateAttempt).toBeUndefined();
    });

    it('should throw error for invalid configuration', () => {
      expect(() => createServerConfiguration('invalid-version')).toThrow('Invalid ServerConfiguration data');
    });
  });

  describe('DEFAULT_SERVER_CONFIG', () => {
    it('should be a valid ServerConfiguration', () => {
      expect(validateServerConfiguration(DEFAULT_SERVER_CONFIG)).toBe(true);
    });

    it('should have correct default values', () => {
      expect(DEFAULT_SERVER_CONFIG.currentVersion).toBe('2025-06-18');
      expect(DEFAULT_SERVER_CONFIG.updateStatus).toBe('stable');
      expect(DEFAULT_SERVER_CONFIG.healthCheckEnabled).toBe(true);
    });
  });

  describe('Status helper functions', () => {
    it('isServerUpdating should return true for updating status', () => {
      const config = createServerConfiguration('2025-06-18', 'updating');
      expect(isServerUpdating(config)).toBe(true);
    });

    it('isServerUpdating should return false for other statuses', () => {
      const stableConfig = createServerConfiguration('2025-06-18', 'stable');
      const failedConfig = createServerConfiguration('2025-06-18', 'failed');

      expect(isServerUpdating(stableConfig)).toBe(false);
      expect(isServerUpdating(failedConfig)).toBe(false);
    });

    it('isServerStable should return true for stable status', () => {
      const config = createServerConfiguration('2025-06-18', 'stable');
      expect(isServerStable(config)).toBe(true);
    });

    it('isServerStable should return false for other statuses', () => {
      const updatingConfig = createServerConfiguration('2025-06-18', 'updating');
      const failedConfig = createServerConfiguration('2025-06-18', 'failed');

      expect(isServerStable(updatingConfig)).toBe(false);
      expect(isServerStable(failedConfig)).toBe(false);
    });

    it('requiresRollback should return true for failed status with rollback version', () => {
      const config = createServerConfiguration('2025-06-18', 'failed', undefined, '2025-06-01');
      expect(requiresRollback(config)).toBe(true);
    });

    it('requiresRollback should return false for failed status without rollback version', () => {
      const config = createServerConfiguration('2025-06-18', 'failed');
      expect(requiresRollback(config)).toBe(false);
    });

    it('requiresRollback should return false for non-failed statuses', () => {
      const stableConfig = createServerConfiguration('2025-06-18', 'stable');
      const updatingConfig = createServerConfiguration('2025-06-18', 'updating');

      expect(requiresRollback(stableConfig)).toBe(false);
      expect(requiresRollback(updatingConfig)).toBe(false);
    });
  });

  describe('Update status enum', () => {
    it('should accept all valid update statuses', () => {
      const validStatuses: UpdateStatus[] = ['stable', 'updating', 'rollback', 'failed'];

      validStatuses.forEach(status => {
        const config = createServerConfiguration('2025-06-18', status);
        expect(config.updateStatus).toBe(status);
      });
    });
  });
});