// MCPVersion entity model
// Represents MCP protocol version information and compatibility status

export interface MCPVersion {
  protocolVersion: string; // YYYY-MM-DD format
  isCurrent: boolean;
  isLatest: boolean;
  releaseDate: string; // ISO date string
  breakingChanges: string[];
  newFeatures: string[];
}

// Validation functions
export function validateMCPVersion(version: MCPVersion): boolean {
  // Validate protocol version format
  const versionRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!versionRegex.test(version.protocolVersion)) {
    return false;
  }

  // Validate release date
  const releaseDate = new Date(version.releaseDate);
  if (isNaN(releaseDate.getTime())) {
    return false;
  }

  // Arrays should not be null but can be empty
  if (!Array.isArray(version.breakingChanges) || !Array.isArray(version.newFeatures)) {
    return false;
  }

  return true;
}

// Factory function for creating MCPVersion instances
export function createMCPVersion(
  protocolVersion: string,
  isCurrent: boolean = false,
  isLatest: boolean = false,
  releaseDate: string = new Date().toISOString(),
  breakingChanges: string[] = [],
  newFeatures: string[] = []
): MCPVersion {
  const version: MCPVersion = {
    protocolVersion,
    isCurrent,
    isLatest,
    releaseDate,
    breakingChanges,
    newFeatures
  };

  if (!validateMCPVersion(version)) {
    throw new Error('Invalid MCPVersion data');
  }

  return version;
}

// Current supported versions
export const SUPPORTED_VERSIONS: MCPVersion[] = [
  createMCPVersion('2024-11-05', false, false, '2024-11-05T00:00:00Z', [], ['Initial MCP features']),
  createMCPVersion('2025-06-18', true, true, '2025-06-18T00:00:00Z', [], [
    'Resource subscriptions and notifications',
    'Enhanced capabilities (listChanged for tools/prompts/resources)',
    'Annotations system (audience, priority, lastModified)',
    'Progress notifications for long-running requests',
    'Ping requests for liveness checking',
    'Enhanced logging levels',
    'Audio content support'
  ])
];