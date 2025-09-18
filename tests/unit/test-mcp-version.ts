// Unit Tests for MCPVersion Entity
// Tests validation, factory functions, and business logic

import { describe, it, expect } from 'vitest';
import {
  MCPVersion,
  validateMCPVersion,
  createMCPVersion,
  SUPPORTED_VERSIONS
} from '../../src/models/mcp-version';

describe('MCPVersion Entity', () => {
  describe('validateMCPVersion', () => {
    it('should validate a correct MCPVersion', () => {
      const version: MCPVersion = {
        protocolVersion: '2025-06-18',
        isCurrent: true,
        isLatest: true,
        releaseDate: '2025-06-18T00:00:00Z',
        breakingChanges: [],
        newFeatures: ['New feature']
      };

      expect(validateMCPVersion(version)).toBe(true);
    });

    it('should reject invalid protocol version format', () => {
      const version: MCPVersion = {
        protocolVersion: '2025.06.18', // Wrong format
        isCurrent: true,
        isLatest: true,
        releaseDate: '2025-06-18T00:00:00Z',
        breakingChanges: [],
        newFeatures: []
      };

      expect(validateMCPVersion(version)).toBe(false);
    });

    it('should reject invalid release date', () => {
      const version: MCPVersion = {
        protocolVersion: '2025-06-18',
        isCurrent: true,
        isLatest: true,
        releaseDate: 'invalid-date',
        breakingChanges: [],
        newFeatures: []
      };

      expect(validateMCPVersion(version)).toBe(false);
    });

    it('should accept empty arrays', () => {
      const version: MCPVersion = {
        protocolVersion: '2025-06-18',
        isCurrent: true,
        isLatest: true,
        releaseDate: '2025-06-18T00:00:00Z',
        breakingChanges: [],
        newFeatures: []
      };

      expect(validateMCPVersion(version)).toBe(true);
    });
  });

  describe('createMCPVersion', () => {
    it('should create a valid MCPVersion with all parameters', () => {
      const version = createMCPVersion(
        '2025-06-18',
        true,
        true,
        '2025-06-18T00:00:00Z',
        ['Breaking change'],
        ['New feature']
      );

      expect(version.protocolVersion).toBe('2025-06-18');
      expect(version.isCurrent).toBe(true);
      expect(version.isLatest).toBe(true);
      expect(version.releaseDate).toBe('2025-06-18T00:00:00Z');
      expect(version.breakingChanges).toEqual(['Breaking change']);
      expect(version.newFeatures).toEqual(['New feature']);
    });

    it('should create a valid MCPVersion with defaults', () => {
      const version = createMCPVersion('2025-06-18');

      expect(version.protocolVersion).toBe('2025-06-18');
      expect(version.isCurrent).toBe(false);
      expect(version.isLatest).toBe(false);
      expect(version.breakingChanges).toEqual([]);
      expect(version.newFeatures).toEqual([]);
      expect(version.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO date
    });

    it('should throw error for invalid version', () => {
      expect(() => createMCPVersion('invalid-version')).toThrow('Invalid MCPVersion data');
    });
  });

  describe('SUPPORTED_VERSIONS', () => {
    it('should contain valid MCP versions', () => {
      SUPPORTED_VERSIONS.forEach(version => {
        expect(validateMCPVersion(version)).toBe(true);
      });
    });

    it('should include current supported versions', () => {
      const versionStrings = SUPPORTED_VERSIONS.map(v => v.protocolVersion);
      expect(versionStrings).toContain('2024-11-05');
      expect(versionStrings).toContain('2025-06-18');
    });

    it('should have exactly one current version', () => {
      const currentVersions = SUPPORTED_VERSIONS.filter(v => v.isCurrent);
      expect(currentVersions).toHaveLength(1);
      expect(currentVersions[0].protocolVersion).toBe('2025-06-18');
    });

    it('should have exactly one latest version', () => {
      const latestVersions = SUPPORTED_VERSIONS.filter(v => v.isLatest);
      expect(latestVersions).toHaveLength(1);
      expect(latestVersions[0].protocolVersion).toBe('2025-06-18');
    });
  });

  describe('Version Features', () => {
    it('should include new features for 2025-06-18', () => {
      const v2025 = SUPPORTED_VERSIONS.find(v => v.protocolVersion === '2025-06-18');
      expect(v2025).toBeDefined();
      expect(v2025!.newFeatures).toContain('Resource subscriptions and notifications');
      expect(v2025!.newFeatures).toContain('Enhanced capabilities (listChanged for tools/prompts/resources)');
      expect(v2025!.newFeatures).toContain('Annotations system (audience, priority, lastModified)');
    });

    it('should have no breaking changes for current version', () => {
      const currentVersion = SUPPORTED_VERSIONS.find(v => v.isCurrent);
      expect(currentVersion!.breakingChanges).toHaveLength(0);
    });
  });
});