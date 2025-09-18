// ClientCompatibility entity model
// Tracks compatibility between server versions and MCP clients

export type CompatibilityStatus = 'compatible' | 'incompatible' | 'unknown' | 'deprecated';

export interface ClientCompatibility {
  clientType: string; // e.g., "claude-desktop", "custom-client"
  clientVersion: string;
  supportedProtocolVersions: string[]; // Array of supported MCP protocol versions
  lastTested: string; // ISO timestamp
  compatibilityStatus: CompatibilityStatus;
}

// Validation functions
export function validateClientCompatibility(compatibility: ClientCompatibility): boolean {
  // Client type cannot be empty
  if (!compatibility.clientType || compatibility.clientType.trim() === '') {
    return false;
  }

  // Supported versions must contain at least one version
  if (!Array.isArray(compatibility.supportedProtocolVersions) ||
      compatibility.supportedProtocolVersions.length === 0) {
    return false;
  }

  // Validate version format
  const versionRegex = /^\d{4}-\d{2}-\d{2}$/;
  for (const version of compatibility.supportedProtocolVersions) {
    if (!versionRegex.test(version)) {
      return false;
    }
  }

  // Validate compatibility status
  const validStatuses: CompatibilityStatus[] = ['compatible', 'incompatible', 'unknown', 'deprecated'];
  if (!validStatuses.includes(compatibility.compatibilityStatus)) {
    return false;
  }

  // Validate timestamp
  const timestamp = new Date(compatibility.lastTested);
  if (isNaN(timestamp.getTime())) {
    return false;
  }

  return true;
}

// Factory function for creating ClientCompatibility instances
export function createClientCompatibility(
  clientType: string,
  clientVersion: string,
  supportedProtocolVersions: string[],
  compatibilityStatus: CompatibilityStatus = 'unknown',
  lastTested: string = new Date().toISOString()
): ClientCompatibility {
  const compatibility: ClientCompatibility = {
    clientType,
    clientVersion,
    supportedProtocolVersions,
    compatibilityStatus,
    lastTested
  };

  if (!validateClientCompatibility(compatibility)) {
    throw new Error('Invalid ClientCompatibility data');
  }

  return compatibility;
}

// Known client compatibilities
export const KNOWN_CLIENT_COMPATIBILITIES: ClientCompatibility[] = [
  createClientCompatibility(
    'claude-desktop',
    '1.0.0',
    ['2024-11-05', '2025-06-18'],
    'compatible',
    '2025-01-15T00:00:00Z'
  ),
  createClientCompatibility(
    'custom-client',
    '1.0.0',
    ['2024-11-05'],
    'incompatible',
    '2025-01-15T00:00:00Z'
  )
];

// Compatibility checking functions
export function isClientCompatible(
  clientType: string,
  clientVersion: string,
  serverVersion: string
): boolean {
  const compatibility = KNOWN_CLIENT_COMPATIBILITIES.find(
    c => c.clientType === clientType && c.clientVersion === clientVersion
  );

  if (!compatibility) {
    return false;
  }

  return compatibility.compatibilityStatus === 'compatible' &&
         compatibility.supportedProtocolVersions.includes(serverVersion);
}

export function getClientCompatibilityStatus(
  clientType: string,
  clientVersion: string
): CompatibilityStatus {
  const compatibility = KNOWN_CLIENT_COMPATIBILITIES.find(
    c => c.clientType === clientType && c.clientVersion === clientVersion
  );

  return compatibility?.compatibilityStatus || 'unknown';
}

export function getSupportedVersionsForClient(
  clientType: string,
  clientVersion: string
): string[] {
  const compatibility = KNOWN_CLIENT_COMPATIBILITIES.find(
    c => c.clientType === clientType && c.clientVersion === clientVersion
  );

  return compatibility?.supportedProtocolVersions || [];
}