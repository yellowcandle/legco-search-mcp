// Durable Objects state management for MCP server
// Provides SQL-based state persistence using Cloudflare Durable Objects

import { DEFAULT_SERVER_CONFIG, ServerConfiguration } from '../models/server-configuration';
import { createPerformanceMetrics, PerformanceMetrics } from '../models/performance-metrics';
import { DEFAULT_OAUTH_CONFIG, OAuthConfig } from '../auth/oauth';

// State interfaces for different components
export interface MCPState {
  serverConfig: ServerConfiguration;
  performanceMetrics: PerformanceMetrics[];
  oauthConfig: OAuthConfig;
  lastUpdated: string;
}

export interface ToolExecutionState {
  toolName: string;
  executionCount: number;
  lastExecuted: string;
  averageExecutionTime: number;
  errorCount: number;
}

export interface ClientSessionState {
  clientId: string;
  connectedAt: string;
  lastActivity: string;
  protocolVersion: string;
  capabilities: any;
}

// Durable Objects SQL schema
const SCHEMA_SQL = `
  -- Server configuration table
  CREATE TABLE IF NOT EXISTS server_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Performance metrics table
  CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    health_check_response_time INTEGER,
    api_timeout_count INTEGER DEFAULT 0,
    average_latency INTEGER DEFAULT 0,
    error_rate REAL DEFAULT 0.0,
    active_connections INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Tool execution metrics table
  CREATE TABLE IF NOT EXISTS tool_execution_metrics (
    tool_name TEXT PRIMARY KEY,
    execution_count INTEGER DEFAULT 0,
    last_executed TEXT,
    average_execution_time INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  -- Client sessions table
  CREATE TABLE IF NOT EXISTS client_sessions (
    client_id TEXT PRIMARY KEY,
    connected_at TEXT NOT NULL,
    last_activity TEXT NOT NULL,
    protocol_version TEXT NOT NULL,
    capabilities TEXT,
    updated_at TEXT NOT NULL
  );

  -- OAuth configuration table
  CREATE TABLE IF NOT EXISTS oauth_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export class MCPStateManager {
  private sql: SqlStorage;
  private initialized: boolean = false;

  constructor(sql: SqlStorage) {
    this.sql = sql;
  }

  /**
   * Initialize the database schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Execute schema creation
      this.sql.exec(SCHEMA_SQL);

      // Initialize default values if not present
      await this.initializeDefaults();

      this.initialized = true;
      console.log('MCP State Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MCP State Manager:', error);
      throw error;
    }
  }

  private async initializeDefaults(): Promise<void> {
    // Initialize server config
    const serverConfigCursor = this.sql.exec(
      'SELECT COUNT(*) as count FROM server_config WHERE key = ?',
      ['current_config']
    );

    const serverConfigResult = [...serverConfigCursor];
    if (serverConfigResult.length === 0 || serverConfigResult[0].count === 0) {
      this.sql.exec(
        'INSERT INTO server_config (key, value, updated_at) VALUES (?, ?, ?)',
        ['current_config', JSON.stringify(DEFAULT_SERVER_CONFIG), new Date().toISOString()]
      );
    }

    // Initialize OAuth config
    const oauthConfigCursor = this.sql.exec(
      'SELECT COUNT(*) as count FROM oauth_config WHERE key = ?',
      ['current_config']
    );

    const oauthConfigResult = [...oauthConfigCursor];
    if (oauthConfigResult.length === 0 || oauthConfigResult[0].count === 0) {
      this.sql.exec(
        'INSERT INTO oauth_config (key, value, updated_at) VALUES (?, ?, ?)',
        ['current_config', JSON.stringify(DEFAULT_OAUTH_CONFIG), new Date().toISOString()]
      );
    }
  }

  /**
   * Get server configuration
   */
  async getServerConfig(): Promise<ServerConfiguration> {
    await this.initialize();

    const cursor = this.sql.exec(
      'SELECT value FROM server_config WHERE key = ?',
      ['current_config']
    );

    const results = [...cursor];
    if (results.length === 0) {
      return DEFAULT_SERVER_CONFIG;
    }

    return JSON.parse(results[0].value as string);
  }

  /**
   * Update server configuration
   */
  async updateServerConfig(config: Partial<ServerConfiguration>): Promise<void> {
    await this.initialize();

    const currentConfig = await this.getServerConfig();
    const updatedConfig = { ...currentConfig, ...config };

    this.sql.exec(
      'UPDATE server_config SET value = ?, updated_at = ? WHERE key = ?',
      [JSON.stringify(updatedConfig), new Date().toISOString(), 'current_config']
    );
  }

  /**
   * Get OAuth configuration
   */
  async getOAuthConfig(): Promise<OAuthConfig> {
    await this.initialize();

    const cursor = this.sql.exec(
      'SELECT value FROM oauth_config WHERE key = ?',
      ['current_config']
    );

    const results = [...cursor];
    if (results.length === 0) {
      return DEFAULT_OAUTH_CONFIG;
    }

    return JSON.parse(results[0].value as string);
  }

  /**
   * Update OAuth configuration
   */
  async updateOAuthConfig(config: Partial<OAuthConfig>): Promise<void> {
    await this.initialize();

    const currentConfig = await this.getOAuthConfig();
    const updatedConfig = { ...currentConfig, ...config };

    this.sql.exec(
      'UPDATE oauth_config SET value = ?, updated_at = ? WHERE key = ?',
      [JSON.stringify(updatedConfig), new Date().toISOString(), 'current_config']
    );
  }

  /**
   * Record performance metrics
   */
  async recordPerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    await this.initialize();

    this.sql.exec(
      `INSERT INTO performance_metrics
       (timestamp, health_check_response_time, api_timeout_count, average_latency, error_rate, active_connections, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        metrics.timestamp,
        metrics.healthCheckResponseTime,
        metrics.apiTimeoutCount,
        metrics.averageLatency,
        metrics.errorRate,
        metrics.activeConnections,
        new Date().toISOString()
      ]
    );

    // Keep only last 1000 records to prevent unbounded growth
    this.sql.exec(
      `DELETE FROM performance_metrics
       WHERE id NOT IN (
         SELECT id FROM performance_metrics
         ORDER BY created_at DESC
         LIMIT 1000
       )`
    );
  }

  /**
   * Get recent performance metrics
   */
  async getRecentPerformanceMetrics(limit: number = 100): Promise<PerformanceMetrics[]> {
    await this.initialize();

    const cursor = this.sql.exec(
      `SELECT timestamp, health_check_response_time, api_timeout_count,
              average_latency, error_rate, active_connections
       FROM performance_metrics
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    const results = [...cursor];
    return results.map((row: any) => ({
      timestamp: row.timestamp,
      healthCheckResponseTime: row.health_check_response_time,
      apiTimeoutCount: row.api_timeout_count || 0,
      averageLatency: row.average_latency || 0,
      errorRate: row.error_rate || 0,
      activeConnections: row.active_connections || 0
    }));
  }

  /**
   * Record tool execution
   */
  async recordToolExecution(
    toolName: string,
    executionTime: number,
    success: boolean
  ): Promise<void> {
    await this.initialize();

    const now = new Date().toISOString();

    // Get current metrics
    const cursor = this.sql.exec(
      'SELECT execution_count, average_execution_time, error_count FROM tool_execution_metrics WHERE tool_name = ?',
      [toolName]
    );

    const current = [...cursor];
    let executionCount = 1;
    let averageExecutionTime = executionTime;
    let errorCount = success ? 0 : 1;

    if (current.length > 0) {
      const existing = current[0] as any;
      executionCount = existing.execution_count + 1;
      averageExecutionTime = ((existing.average_execution_time * existing.execution_count) + executionTime) / executionCount;
      errorCount = existing.error_count + (success ? 0 : 1);
    }

    this.sql.exec(
      `INSERT OR REPLACE INTO tool_execution_metrics
       (tool_name, execution_count, last_executed, average_execution_time, error_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [toolName, executionCount, now, Math.round(averageExecutionTime), errorCount, now]
    );
  }

  /**
   * Get tool execution metrics
   */
  async getToolExecutionMetrics(): Promise<ToolExecutionState[]> {
    await this.initialize();

    const cursor = this.sql.exec(
      'SELECT tool_name, execution_count, last_executed, average_execution_time, error_count FROM tool_execution_metrics'
    );

    const results = [...cursor];
    return results.map((row: any) => ({
      toolName: row.tool_name,
      executionCount: row.execution_count,
      lastExecuted: row.last_executed,
      averageExecutionTime: row.average_execution_time,
      errorCount: row.error_count
    }));
  }

  /**
   * Record client session
   */
  async recordClientSession(session: ClientSessionState): Promise<void> {
    await this.initialize();

    const now = new Date().toISOString();

    this.sql.exec(
      `INSERT OR REPLACE INTO client_sessions
       (client_id, connected_at, last_activity, protocol_version, capabilities, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        session.clientId,
        session.connectedAt,
        session.lastActivity,
        session.protocolVersion,
        JSON.stringify(session.capabilities),
        now
      ]
    );
  }

  /**
   * Get active client sessions
   */
  async getActiveClientSessions(): Promise<ClientSessionState[]> {
    await this.initialize();

    // Consider sessions active if last activity was within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const cursor = this.sql.exec(
      `SELECT client_id, connected_at, last_activity, protocol_version, capabilities
       FROM client_sessions
       WHERE last_activity > ?
       ORDER BY last_activity DESC`,
      [fiveMinutesAgo]
    );

    const results = [...cursor];
    return results.map((row: any) => ({
      clientId: row.client_id,
      connectedAt: row.connected_at,
      lastActivity: row.last_activity,
      protocolVersion: row.protocol_version,
      capabilities: JSON.parse(row.capabilities)
    }));
  }

  /**
   * Clean up old data
   */
  async cleanup(): Promise<void> {
    await this.initialize();

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Clean up old client sessions
    this.sql.exec(
      'DELETE FROM client_sessions WHERE last_activity < ?',
      [oneWeekAgo]
    );

    // Clean up old performance metrics (keep last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    this.sql.exec(
      'DELETE FROM performance_metrics WHERE created_at < ?',
      [thirtyDaysAgo]
    );

    console.log('MCP State Manager cleanup completed');
  }
}

// Global state manager instance
let stateManager: MCPStateManager | null = null;

/**
 * Initialize state manager with Durable Object SQL storage
 */
export function initializeStateManager(sql: SqlStorage): MCPStateManager {
  stateManager = new MCPStateManager(sql);
  return stateManager;
}

/**
 * Get state manager instance
 */
export function getStateManager(): MCPStateManager {
  if (!stateManager) {
    throw new Error('State manager not initialized. Call initializeStateManager() first.');
  }
  return stateManager;
}