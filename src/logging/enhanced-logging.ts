// Enhanced Logging for MCP 2025-06-18
// Implements structured logging with annotations and enhanced log levels

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogContext {
  endpoint?: string;
  ip?: string;
  method?: string;
  params?: Record<string, any>;
  error?: Error;
  timestamp?: string;
  requestId?: string;
  dateStr?: string;
  value?: any;
  attempt?: number;
  maxRetries?: number;
  url?: string;
  count?: number;
  limit?: number;
  toolName?: string;
  headers?: Record<string, string>;
  allowed?: any[];
  min?: number;
  max?: number;
  original?: string;
  sanitized?: string;
  keywords?: string;
  speaker?: string;
  fullUrl?: string;
  status?: number;
  statusText?: string;
  errorText?: string;
  data?: any;

  // MCP 2025-06-18 specific fields
  annotations?: {
    audience?: string[];
    priority?: number;
    lastModified?: string;
  };
  progressToken?: string;
  clientId?: string;
  sessionId?: string;
  operation?: string;
  duration?: number;
  userAgent?: string;
  correlationId?: string;

  // Additional fields for enhanced logging
  event?: string;
  action?: string;
  message?: string;
  minLevel?: string;
  protocolVersion?: string;
  requestedVersion?: string;
  negotiatedVersion?: string;
  severity?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  sessionId?: string;
  clientId?: string;
  correlationId?: string;
  context?: LogContext;
}

// Enhanced logger class
export class EnhancedLogger {
  private minLevel: LogLevel = 'INFO';
  private logLevels: Record<LogLevel, number> = {
    'DEBUG': 0,
    'INFO': 1,
    'WARNING': 2,
    'ERROR': 3,
    'CRITICAL': 4
  };

  constructor(minLevel: LogLevel = 'INFO') {
    this.minLevel = minLevel;
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Check if a log level should be logged
   */
  shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.minLevel];
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context: LogContext = {}
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: context.timestamp || new Date().toISOString(),
      requestId: context.requestId || crypto.randomUUID(),
      sessionId: context.sessionId,
      clientId: context.clientId,
      correlationId: context.correlationId,
      context: { ...context }
    };

    // Remove timestamp from context to avoid duplication
    if (entry.context) {
      delete entry.context.timestamp;
    }

    return entry;
  }

  /**
   * Log a message with structured context
   */
  private log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, context);

    // Output structured JSON log
    const output = JSON.stringify(entry, this.jsonReplacer, 0);

    // Use appropriate console method
    switch (level) {
      case 'DEBUG':
        console.debug(output);
        break;
      case 'INFO':
        console.log(output);
        break;
      case 'WARNING':
        console.warn(output);
        break;
      case 'ERROR':
      case 'CRITICAL':
        console.error(output);
        break;
    }
  }

  /**
   * Custom JSON replacer to handle special values
   */
  private jsonReplacer(key: string, value: any): any {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      };
    }
    return value;
  }

  // Convenience logging methods
  debug(message: string, context: LogContext = {}): void {
    this.log('DEBUG', message, context);
  }

  info(message: string, context: LogContext = {}): void {
    this.log('INFO', message, context);
  }

  warning(message: string, context: LogContext = {}): void {
    this.log('WARNING', message, context);
  }

  error(message: string, context: LogContext = {}): void {
    this.log('ERROR', message, context);
  }

  critical(message: string, context: LogContext = {}): void {
    this.log('CRITICAL', message, context);
  }

  /**
   * Log MCP-specific events
   */
  logMcpRequest(method: string, params: any, context: LogContext = {}): void {
    this.info(`MCP Request: ${method}`, {
      ...context,
      method,
      params,
      annotations: {
        audience: ['system', 'debug'],
        priority: 0.3
      }
    });
  }

  logMcpResponse(method: string, success: boolean, duration?: number, context: LogContext = {}): void {
    const level = success ? 'INFO' : 'WARNING';
    const status = success ? 'success' : 'failed';

    this.log(level, `MCP Response: ${method} (${status})`, {
      ...context,
      method,
      duration,
      annotations: {
        audience: ['system', 'debug'],
        priority: success ? 0.3 : 0.7
      }
    });
  }

  logToolExecution(toolName: string, success: boolean, duration: number, context: LogContext = {}): void {
    const level = success ? 'INFO' : 'WARNING';
    const status = success ? 'completed' : 'failed';

    this.log(level, `Tool Execution: ${toolName} (${status})`, {
      ...context,
      toolName,
      duration,
      operation: 'tool_execution',
      annotations: {
        audience: ['system', 'monitoring'],
        priority: success ? 0.5 : 0.8,
        lastModified: new Date().toISOString()
      }
    });
  }

  logPerformanceMetrics(metrics: any, context: LogContext = {}): void {
    this.info('Performance Metrics Recorded', {
      ...context,
      data: metrics,
      annotations: {
        audience: ['system', 'monitoring'],
        priority: 0.4
      }
    });
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', context: LogContext = {}): void {
    const level = severity === 'high' ? 'CRITICAL' : severity === 'medium' ? 'ERROR' : 'WARNING';

    this.log(level, `Security Event: ${event}`, {
      ...context,
      event,
      severity,
      annotations: {
        audience: ['security', 'system'],
        priority: severity === 'high' ? 0.9 : severity === 'medium' ? 0.7 : 0.5
      }
    });
  }

  logClientConnection(clientId: string, connected: boolean, context: LogContext = {}): void {
    const action = connected ? 'connected' : 'disconnected';

    this.info(`Client ${action}`, {
      ...context,
      clientId,
      action,
      annotations: {
        audience: ['system', 'monitoring'],
        priority: 0.4
      }
    });
  }

  logProgressUpdate(token: string, progress: number, message?: string, context: LogContext = {}): void {
    this.debug(`Progress Update: ${token}`, {
      ...context,
      progressToken: token,
      value: progress,
      message,
      annotations: {
        audience: ['system', 'progress'],
        priority: 0.2
      }
    });
  }

  logResourceSubscription(clientId: string, uri: string, action: 'subscribe' | 'unsubscribe', context: LogContext = {}): void {
    this.info(`Resource ${action}`, {
      ...context,
      clientId,
      url: uri,
      action,
      annotations: {
        audience: ['system', 'resources'],
        priority: 0.3
      }
    });
  }
}

// Global logger instance
let globalLogger: EnhancedLogger | null = null;

/**
 * Initialize global logger
 */
export function initializeLogger(minLevel: LogLevel = 'INFO'): EnhancedLogger {
  globalLogger = new EnhancedLogger(minLevel);
  globalLogger.info('Enhanced logging initialized', {
    minLevel,
    annotations: {
      audience: ['system'],
      priority: 0.1
    }
  });
  return globalLogger;
}

/**
 * Get global logger instance
 */
export function getLogger(): EnhancedLogger {
  if (!globalLogger) {
    // Initialize with default settings if not already done
    return initializeLogger();
  }
  return globalLogger;
}

// Legacy compatibility functions (for gradual migration)
export function logError(message: string, context: LogContext = {}): void {
  getLogger().error(message, context);
}

export function logWarning(message: string, context: LogContext = {}): void {
  getLogger().warning(message, context);
}

export function logInfo(message: string, context: LogContext = {}): void {
  getLogger().info(message, context);
}

// MCP 2025-06-18 specific logging helpers
export function logMcpProtocolEvent(
  event: string,
  protocolVersion: string,
  context: LogContext = {}
): void {
  getLogger().info(`MCP Protocol Event: ${event}`, {
    ...context,
    protocolVersion,
    event,
    annotations: {
      audience: ['protocol', 'system'],
      priority: 0.6,
      lastModified: new Date().toISOString()
    }
  });
}

export function logVersionNegotiation(
  requestedVersion: string,
  negotiatedVersion: string,
  context: LogContext = {}
): void {
  const success = requestedVersion === negotiatedVersion;

  getLogger().logMcpResponse(
    'initialize',
    success,
    undefined,
    {
      ...context,
      requestedVersion,
      negotiatedVersion,
      annotations: {
        audience: ['protocol', 'system'],
        priority: success ? 0.5 : 0.8
      }
    }
  );
}