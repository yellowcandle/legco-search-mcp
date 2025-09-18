// ServerConfiguration entity model
// Represents the current server configuration and update status

export type UpdateStatus = 'stable' | 'updating' | 'rollback' | 'failed';

export interface ServerConfiguration {
  currentVersion: string; // Current MCP protocol version
  targetVersion?: string; // Version to update to (if update in progress)
  updateStatus: UpdateStatus;
  lastUpdateAttempt?: string; // ISO timestamp
  rollbackVersion?: string; // Version to rollback to if needed
  healthCheckEnabled: boolean;
}

// Validation functions
export function validateServerConfiguration(config: ServerConfiguration): boolean {
  // Validate version format
  const versionRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!versionRegex.test(config.currentVersion)) {
    return false;
  }

  if (config.targetVersion && !versionRegex.test(config.targetVersion)) {
    return false;
  }

  if (config.rollbackVersion && !versionRegex.test(config.rollbackVersion)) {
    return false;
  }

  // Validate update status
  const validStatuses: UpdateStatus[] = ['stable', 'updating', 'rollback', 'failed'];
  if (!validStatuses.includes(config.updateStatus)) {
    return false;
  }

  // Validate timestamp if present
  if (config.lastUpdateAttempt) {
    const timestamp = new Date(config.lastUpdateAttempt);
    if (isNaN(timestamp.getTime())) {
      return false;
    }
  }

  return true;
}

// Factory function for creating ServerConfiguration instances
export function createServerConfiguration(
  currentVersion: string,
  updateStatus: UpdateStatus = 'stable',
  targetVersion?: string,
  rollbackVersion?: string,
  lastUpdateAttempt?: string,
  healthCheckEnabled: boolean = true
): ServerConfiguration {
  const config: ServerConfiguration = {
    currentVersion,
    updateStatus,
    healthCheckEnabled,
    ...(targetVersion && { targetVersion }),
    ...(rollbackVersion && { rollbackVersion }),
    ...(lastUpdateAttempt && { lastUpdateAttempt })
  };

  if (!validateServerConfiguration(config)) {
    throw new Error('Invalid ServerConfiguration data');
  }

  return config;
}

// Default server configuration
export const DEFAULT_SERVER_CONFIG: ServerConfiguration = createServerConfiguration(
  '2025-06-18', // Latest version
  'stable',
  undefined,
  undefined,
  undefined,
  true
);

// Update status helpers
export function isServerUpdating(config: ServerConfiguration): boolean {
  return config.updateStatus === 'updating';
}

export function isServerStable(config: ServerConfiguration): boolean {
  return config.updateStatus === 'stable';
}

export function requiresRollback(config: ServerConfiguration): boolean {
  return config.updateStatus === 'failed' && config.rollbackVersion !== undefined;
}