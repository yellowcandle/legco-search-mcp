// Unit Tests for ClientCompatibility Entity
// Tests validation, factory functions, and compatibility checking logic

import { describe, it, expect } from 'vitest';
import {
  ClientCompatibility,
  CompatibilityStatus,
  validateClientCompatibility,
  createClientCompatibility,
  KNOWN_CLIENT_COMPATIBILITIES,
  isClientCompatible,
  getClientCompatibilityStatus,
  getSupportedVersionsForClient
} from '../../src/models/client-compatibility';

describe('ClientCompatibility Entity', () => {
  describe('validateClientCompatibility', () => {
    it('should validate a correct ClientCompatibility', () => {
      const compatibility: ClientCompatibility = {
        clientType: 'claude-desktop',
        clientVersion: '1.0.0',
        supportedProtocolVersions: ['2024-11-05', '2025-06-18'],
        lastTested: '2025-01-15T00:00:00Z',
        compatibilityStatus: 'compatible'
      };

      expect(validateClientCompatibility(compatibility)).toBe(true);
    });

    it('should reject empty client type', () => {
      const compatibility: ClientCompatibility = {
        clientType: '',
        clientVersion: '1.0.0',
        supportedProtocolVersions: ['2024-11-05'],
        lastTested: '2025-01-15T00:00:00Z',
        compatibilityStatus: 'compatible'
      };

      expect(validateClientCompatibility(compatibility)).toBe(false);
    });

    it('should reject whitespace-only client type', () => {
      const compatibility: ClientCompatibility = {
        clientType: '   ',
        clientVersion: '1.0.0',
        supportedProtocolVersions: ['2024-11-05'],
        lastTested: '2025-01-15T00:00:00Z',
        compatibilityStatus: 'compatible'
      };

      expect(validateClientCompatibility(compatibility)).toBe(false);
    });

    it('should reject empty supported protocol versions array', () => {
      const compatibility: ClientCompatibility = {
        clientType: 'claude-desktop',
        clientVersion: '1.0.0',
        supportedProtocolVersions: [],
        lastTested: '2025-01-15T00:00:00Z',
        compatibilityStatus: 'compatible'
      };

      expect(validateClientCompatibility(compatibility)).toBe(false);
    });

    it('should reject invalid protocol version format', () => {
      const compatibility: ClientCompatibility = {
        clientType: 'claude-desktop',
        clientVersion: '1.0.0',
        supportedProtocolVersions: ['2024.11.05'], // Wrong format
        lastTested: '2025-01-15T00:00:00Z',
        compatibilityStatus: 'compatible'
      };

      expect(validateClientCompatibility(compatibility)).toBe(false);
    });

    it('should reject invalid compatibility status', () => {
      const compatibility: ClientCompatibility = {
        clientType: 'claude-desktop',
        clientVersion: '1.0.0',
        supportedProtocolVersions: ['2024-11-05'],
        lastTested: '2025-01-15T00:00:00Z',
        compatibilityStatus: 'invalid-status' as CompatibilityStatus
      };

      expect(validateClientCompatibility(compatibility)).toBe(false);
    });

    it('should reject invalid timestamp', () => {
      const compatibility: ClientCompatibility = {
        clientType: 'claude-desktop',
        clientVersion: '1.0.0',
        supportedProtocolVersions: ['2024-11-05'],
        lastTested: 'invalid-date',
        compatibilityStatus: 'compatible'
      };

      expect(validateClientCompatibility(compatibility)).toBe(false);
    });

    it('should accept all valid compatibility statuses', () => {
      const validStatuses: CompatibilityStatus[] = ['compatible', 'incompatible', 'unknown', 'deprecated'];

      validStatuses.forEach(status => {
        const compatibility: ClientCompatibility = {
          clientType: 'claude-desktop',
          clientVersion: '1.0.0',
          supportedProtocolVersions: ['2024-11-05'],
          lastTested: '2025-01-15T00:00:00Z',
          compatibilityStatus: status
        };

        expect(validateClientCompatibility(compatibility)).toBe(true);
      });
    });
  });

  describe('createClientCompatibility', () => {
    it('should create a valid ClientCompatibility with all parameters', () => {
      const compatibility = createClientCompatibility(
        'claude-desktop',
        '1.0.0',
        ['2024-11-05', '2025-06-18'],
        'compatible',
        '2025-01-15T00:00:00Z'
      );

      expect(compatibility.clientType).toBe('claude-desktop');
      expect(compatibility.clientVersion).toBe('1.0.0');
      expect(compatibility.supportedProtocolVersions).toEqual(['2024-11-05', '2025-06-18']);
      expect(compatibility.compatibilityStatus).toBe('compatible');
      expect(compatibility.lastTested).toBe('2025-01-15T00:00:00Z');
    });

    it('should create a valid ClientCompatibility with defaults', () => {
      const compatibility = createClientCompatibility(
        'claude-desktop',
        '1.0.0',
        ['2024-11-05']
      );

      expect(compatibility.clientType).toBe('claude-desktop');
      expect(compatibility.clientVersion).toBe('1.0.0');
      expect(compatibility.supportedProtocolVersions).toEqual(['2024-11-05']);
      expect(compatibility.compatibilityStatus).toBe('unknown');
      expect(compatibility.lastTested).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO date
    });

    it('should throw error for invalid client type', () => {
      expect(() => createClientCompatibility('', '1.0.0', ['2024-11-05'])).toThrow('Invalid ClientCompatibility data');
    });

    it('should throw error for empty supported versions', () => {
      expect(() => createClientCompatibility('claude-desktop', '1.0.0', [])).toThrow('Invalid ClientCompatibility data');
    });

    it('should throw error for invalid protocol version', () => {
      expect(() => createClientCompatibility('claude-desktop', '1.0.0', ['invalid-version'])).toThrow('Invalid ClientCompatibility data');
    });
  });

  describe('KNOWN_CLIENT_COMPATIBILITIES', () => {
    it('should contain valid ClientCompatibility entries', () => {
      KNOWN_CLIENT_COMPATIBILITIES.forEach(compatibility => {
        expect(validateClientCompatibility(compatibility)).toBe(true);
      });
    });

    it('should include known client types', () => {
      const clientTypes = KNOWN_CLIENT_COMPATIBILITIES.map(c => c.clientType);
      expect(clientTypes).toContain('claude-desktop');
      expect(clientTypes).toContain('custom-client');
    });

    it('should have compatible status for claude-desktop', () => {
      const claudeDesktop = KNOWN_CLIENT_COMPATIBILITIES.find(c => c.clientType === 'claude-desktop');
      expect(claudeDesktop).toBeDefined();
      expect(claudeDesktop!.compatibilityStatus).toBe('compatible');
      expect(claudeDesktop!.supportedProtocolVersions).toContain('2025-06-18');
    });

    it('should have incompatible status for custom-client', () => {
      const customClient = KNOWN_CLIENT_COMPATIBILITIES.find(c => c.clientType === 'custom-client');
      expect(customClient).toBeDefined();
      expect(customClient!.compatibilityStatus).toBe('incompatible');
      expect(customClient!.supportedProtocolVersions).not.toContain('2025-06-18');
    });
  });

  describe('isClientCompatible', () => {
    it('should return true for compatible client and supported version', () => {
      expect(isClientCompatible('claude-desktop', '1.0.0', '2025-06-18')).toBe(true);
      expect(isClientCompatible('claude-desktop', '1.0.0', '2024-11-05')).toBe(true);
    });

    it('should return false for incompatible client', () => {
      expect(isClientCompatible('custom-client', '1.0.0', '2025-06-18')).toBe(false);
    });

    it('should return false for unknown client', () => {
      expect(isClientCompatible('unknown-client', '1.0.0', '2025-06-18')).toBe(false);
    });

    it('should return false for unsupported version', () => {
      expect(isClientCompatible('claude-desktop', '1.0.0', '2023-01-01')).toBe(false);
    });
  });

  describe('getClientCompatibilityStatus', () => {
    it('should return compatibility status for known clients', () => {
      expect(getClientCompatibilityStatus('claude-desktop', '1.0.0')).toBe('compatible');
      expect(getClientCompatibilityStatus('custom-client', '1.0.0')).toBe('incompatible');
    });

    it('should return unknown for unknown clients', () => {
      expect(getClientCompatibilityStatus('unknown-client', '1.0.0')).toBe('unknown');
    });
  });

  describe('getSupportedVersionsForClient', () => {
    it('should return supported versions for known clients', () => {
      expect(getSupportedVersionsForClient('claude-desktop', '1.0.0')).toEqual(['2024-11-05', '2025-06-18']);
      expect(getSupportedVersionsForClient('custom-client', '1.0.0')).toEqual(['2024-11-05']);
    });

    it('should return empty array for unknown clients', () => {
      expect(getSupportedVersionsForClient('unknown-client', '1.0.0')).toEqual([]);
    });
  });
});