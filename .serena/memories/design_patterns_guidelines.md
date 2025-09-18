# LegCo Search MCP Server - Design Patterns & Guidelines

## Core Design Principles

### MCP Protocol Compliance
- **Non-negotiable Requirement**: Full compliance with MCP 2025-06-18 specification
- **JSON-RPC 2.0**: Strict adherence to JSON-RPC protocol standards
- **Transport Agnostic**: Support for HTTP, SSE, and WebSocket transports
- **Capabilities Declaration**: Proper server capabilities in initialize response
- **Error Codes**: Standard JSON-RPC error codes (-32601, -32603, etc.)

### Security-First Design
- **Input Validation**: All inputs validated before processing
- **Sanitization**: Comprehensive string sanitization while preserving functionality
- **SQL Injection Prevention**: Parameterized queries and safe string building
- **Rate Limiting**: Fair usage enforcement with per-IP tracking
- **Error Safety**: No sensitive information in error responses

### Production-Ready Standards
- **Comprehensive Logging**: Structured JSON logging with request tracking
- **Error Recovery**: Graceful error handling with proper status codes
- **Performance Optimization**: Sub-100ms health checks, efficient resource usage
- **Global Deployment**: Edge-optimized for worldwide low latency
- **Monitoring**: Health endpoints and deployment verification

## Architectural Patterns

### Agent-Based Architecture
```typescript
// Main server extends McpAgent for enhanced capabilities
export class LegCoMcpServer extends McpAgent<Env, ServerState> {
  // State management with Durable Objects
  initialState: ServerState = {
    requestCount: 0,
    lastRequestTime: new Date().toISOString(),
    version: "2025-06-18"
  };
}
```

### Transport Handler Pattern
```typescript
// Separate handlers for each transport protocol
async function handleHTTPMCP(request: Request, requestId: string): Promise<Response>
async function handleSSE(request: Request, requestId: string): Promise<Response>
function handleWebSocket(request: Request, requestId: string): Response
```

### Tool Registration Pattern
```typescript
// Zod schema-based tool definitions
this.server.tool(
  "tool_name",
  "Description with enhanced context",
  {
    param: z.string().max(500).optional().describe("Parameter description")
  },
  async (params) => {
    // Implementation with error handling and annotations
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      annotations: {
        audience: ["user", "assistant"],
        priority: 0.8,
        lastModified: new Date().toISOString()
      }
    };
  }
);
```

## Error Handling Patterns

### Custom Error Classes
```typescript
class LegCoAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'LegCoAPIError';
  }
}
```

### Error Response Pattern
```typescript
function createErrorResponse(error: Error, requestId?: string): Response {
  // Determine appropriate status code and error type
  // Return structured error response with context
  // Include request ID for debugging
  // Add CORS headers for client compatibility
}
```

### Validation Pattern
```typescript
function validateSearchParams(params: Record<string, any>): void {
  // Early validation with specific error messages
  // Throw ValidationError for client errors
  // Include field names in error context
  // Use type guards for runtime safety
}
```

## State Management Patterns

### Durable Objects Integration
```typescript
interface ServerState {
  requestCount: number;
  lastRequestTime: string;
  version: string;
}

// State updates through McpAgent
this.setState({
  ...this.state,
  requestCount: this.state.requestCount + 1,
  lastRequestTime: now
});
```

### Request Context Pattern
```typescript
interface LogContext {
  endpoint?: string;
  requestId?: string;
  params?: Record<string, any>;
  error?: Error;
  // ... additional context
}

// Consistent context passing
logInfo('Operation started', { ...context, additionalInfo });
```

## API Integration Patterns

### OData Query Building
```typescript
function buildODataQuery(endpoint: string, params: Record<string, any>): Record<string, string> {
  // Endpoint-specific filter building
  // Multi-word search term parsing
  // Safe parameter encoding
  // Consistent query structure
}
```

### Multi-word Search Pattern
```typescript
// Transform "housing policy" into OData filter
const words = sanitizeString(keywords).split(/\s+/).filter(w => w.length > 0);
if (words.length === 1) {
  filters.push(`substringof('${words[0]}', FieldName)`);
} else {
  const wordFilters = words.map(word => `substringof('${word}', FieldName)`);
  filters.push(`(${wordFilters.join(' and ')})`);
}
```

### Retry Pattern
```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
  // Exponential backoff strategy
  // Don't retry client errors (4xx)
  // Comprehensive error logging
  // Timeout handling with AbortController
}
```

## Security Patterns

### Input Sanitization
```typescript
function sanitizeString(value?: string): string {
  if (!value) return '';
  
  // Preserve spaces and common punctuation
  // Remove potentially dangerous characters
  // Escape single quotes for OData
  // Apply length limits
  // Log sanitization for debugging
}
```

### Rate Limiting Pattern
```typescript
// Sliding window rate limiting
const rateLimitMap: Map<string, { window: number; count: number }> = new Map();

function checkRateLimit(ip: string): boolean {
  // Per-IP tracking with time windows
  // Automatic cleanup of old entries
  // Fail-open approach for errors
  // Comprehensive logging
}
```

## Response Patterns

### MCP Response Format
```typescript
// Standard MCP tool response
{
  jsonrpc: '2.0',
  id: requestId,
  result: {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2)
      }
    ],
    annotations: {
      audience: ["user", "assistant"],
      priority: 0.8,
      lastModified: new Date().toISOString()
    }
  }
}
```

### Error Response Format
```typescript
// Standard JSON-RPC error response
{
  jsonrpc: '2.0',
  id: requestId,
  error: {
    code: -32601,
    message: "Method not found: methodName"
  }
}
```

## Performance Patterns

### Lazy Loading
- **Tool Registration**: Register tools on-demand during initialization
- **State Loading**: Load state only when needed
- **Connection Management**: Efficient HTTP client with connection pooling

### Caching Strategy
- **No Client-Side Caching**: Fresh data on every request
- **Rate Limit Caching**: Cache rate limit counters for performance
- **Response Metadata**: Include performance metrics in responses

### Memory Optimization
- **Streaming Responses**: Use streaming for large datasets
- **Limited Result Sets**: Maximum 1000 records per request
- **Efficient Serialization**: Optimized JSON serialization

## Development Guidelines

### Code Organization
- **Single Responsibility**: Each function has one clear purpose
- **Dependency Injection**: Pass dependencies explicitly
- **Interface Segregation**: Small, focused interfaces
- **Composition over Inheritance**: Favor composition patterns

### Testing Patterns
- **Unit Tests**: Test individual functions in isolation
- **Contract Tests**: Verify MCP protocol compliance
- **Integration Tests**: Test API interactions
- **Performance Tests**: Validate response time requirements
- **E2E Tests**: Test complete request/response cycles

### Documentation Standards
- **Code Comments**: Explain why, not what
- **API Documentation**: Complete parameter and response documentation
- **Architecture Documentation**: High-level design decisions
- **Troubleshooting Guides**: Common issues and solutions

## Deployment Patterns

### Environment Management
- **Configuration**: Environment-specific settings
- **Feature Flags**: Gradual rollout capabilities
- **Health Checks**: Comprehensive health monitoring
- **Rollback Strategy**: Quick rollback for issues

### Monitoring Integration
- **Structured Logging**: Consistent log format
- **Request Tracking**: Unique identifiers for correlation
- **Performance Metrics**: Response time and error rate tracking
- **Alert Integration**: Proactive issue detection