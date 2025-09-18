# LegCo Search MCP Server - Code Style & Conventions

## TypeScript Configuration
- **Target**: ES2021 with ES2021 lib
- **Module System**: ESNext with bundler resolution
- **Strict Mode**: Enabled with full type checking
- **Import Style**: ESM imports with synthetic default imports allowed

## Code Organization

### File Structure
```
src/
├── worker.ts              # Main worker entry point with fetch handler
├── auth/                  # OAuth integration (future use)
├── logging/               # Enhanced logging utilities
├── models/                # TypeScript interfaces and types
├── state/                 # Durable Objects state management
└── tools/                 # MCP tool definitions and implementations
```

### Class Structure
- **McpAgent Extension**: Main server extends `McpAgent<Env, ServerState>`
- **Error Classes**: Custom error types (LegCoAPIError, ValidationError, RateLimitError)
- **State Management**: Interface-driven with ServerState type
- **Tool Registration**: Zod schemas for type-safe parameter validation

## Naming Conventions

### Functions
- **camelCase**: `searchVotingResults`, `validateSearchParams`, `buildODataQuery`
- **Async Functions**: Clearly marked with async/await pattern
- **Validation Functions**: Prefixed with `validate` (e.g., `validateDateFormat`)
- **Utility Functions**: Descriptive names (e.g., `sanitizeString`, `fetchWithRetry`)

### Variables & Constants
- **camelCase**: For variables and function parameters
- **SCREAMING_SNAKE_CASE**: For constants (e.g., `BASE_URLS`, `RATE_LIMIT`)
- **Descriptive Names**: Full words over abbreviations (e.g., `requestId` not `reqId`)

### Types & Interfaces
- **PascalCase**: For interfaces, types, and classes (e.g., `ServerState`, `LogContext`)
- **Descriptive Suffixes**: `Error` for error classes, `Context` for context types

## Documentation Standards

### Function Documentation
- **JSDoc Comments**: For public functions and complex logic
- **Parameter Descriptions**: Clear descriptions for all function parameters
- **Return Type Documentation**: Describe what functions return
- **Error Documentation**: Document thrown errors and error conditions

### Code Comments
- **Inline Comments**: For complex business logic and OData query building
- **Section Comments**: Using `// ---` separators for major sections
- **TODO Comments**: For future improvements and known issues

## Error Handling Patterns

### Error Classes
```typescript
class LegCoAPIError extends Error {
  constructor(message: string, public statusCode?: number, public endpoint?: string, public originalError?: Error)
}
```

### Validation Pattern
- **Input Validation**: Dedicated validation functions for each tool
- **Early Return**: Validate inputs early and return meaningful errors
- **Type Guards**: Use TypeScript type guards for runtime validation

## Logging Standards

### Structured Logging
- **JSON Format**: All logs in structured JSON format
- **Log Levels**: ERROR, WARNING, INFO with appropriate usage
- **Context Objects**: Rich context with requestId, endpoint, params
- **Request Tracking**: Unique request IDs for debugging

### Log Context Interface
```typescript
interface LogContext {
  endpoint?: string;
  requestId?: string;
  params?: Record<string, any>;
  error?: Error;
  // ... additional context fields
}
```

## Security Conventions

### Input Sanitization
- **String Sanitization**: `sanitizeString()` function for all user inputs
- **SQL Injection Prevention**: Parameterized OData queries
- **Length Limits**: Maximum string lengths (500 chars for search terms)
- **Character Filtering**: Allow only safe characters while preserving functionality

### Validation Patterns
- **Enum Validation**: Use predefined enums for restricted values
- **Date Validation**: Strict YYYY-MM-DD format validation
- **Integer Validation**: Range checking with min/max bounds
- **Type Safety**: Zod schemas for runtime type validation

## Performance Conventions

### Async/Await Patterns
- **Promise Handling**: Consistent async/await usage
- **Error Propagation**: Proper error handling in async functions
- **Timeout Handling**: 60-second timeouts for external API calls
- **Retry Logic**: Exponential backoff for failed requests

### Resource Management
- **Connection Pooling**: Efficient HTTP client usage
- **Memory Usage**: Minimize memory footprint for edge deployment
- **Request Limits**: Pagination with max 1000 records per request
- **Rate Limiting**: Per-IP request limiting for fair usage

## Testing Conventions

### Test Structure
- **Unit Tests**: Individual function testing in `tests/unit/`
- **Integration Tests**: API integration testing in `tests/integration/`
- **Contract Tests**: MCP protocol compliance in `tests/contract/`
- **Performance Tests**: Response time validation in `tests/performance/`
- **E2E Tests**: Full transport testing in `tests/e2e/`

### Test Naming
- **Descriptive Names**: Clear test descriptions (e.g., `test-mcp-version.ts`)
- **Test Categories**: Organized by type (unit, integration, contract, etc.)
- **File Naming**: `test-` prefix for all test files