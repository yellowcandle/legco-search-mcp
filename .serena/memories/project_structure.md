# LegCo Search MCP Server - Project Structure

## Root Directory Structure
```
legco-search-mcp/
├── .claude/                   # Claude Code configuration
├── .opencode/                 # OpenCode configuration  
├── .serena/                   # Serena AI agent configuration
├── .specify/                  # Project specification files
├── specs/                     # Feature specifications
├── src/                       # Source code
├── tests/                     # Test files
├── node_modules/              # NPM dependencies
├── package.json              # NPM configuration
├── package-lock.json         # NPM lock file
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Test configuration
├── wrangler.toml             # Cloudflare Workers configuration
├── README.md                 # Project documentation
├── CLAUDE.md                 # Claude Code guidance
├── AGENTS.md                 # Agent context information
└── CLOUDFLARE_DEPLOYMENT.md  # Deployment documentation
```

## Source Code Structure (`src/`)
```
src/
├── worker.ts                 # Main entry point - Cloudflare Worker fetch handler
├── auth/
│   └── oauth.ts             # OAuth integration (future use)
├── logging/
│   └── enhanced-logging.ts  # Structured logging utilities
├── models/
│   ├── client-compatibility.ts    # Client compatibility types
│   ├── mcp-version.ts             # MCP version management
│   ├── performance-metrics.ts     # Performance monitoring types
│   └── server-configuration.ts    # Server configuration types
├── state/
│   └── durable-objects.ts         # Durable Objects state management
└── tools/
    ├── progress-notifications.ts   # Progress notification tools
    ├── resource-subscriptions.ts   # Resource subscription tools
    └── tool-definitions.ts         # MCP tool definitions
```

## Test Structure (`tests/`)
```
tests/
├── unit/                          # Unit tests for individual components
│   ├── test-client-compatibility.ts
│   ├── test-mcp-version.ts
│   ├── test-performance-metrics.ts
│   └── test-server-configuration.ts
├── contract/                      # MCP protocol contract tests
│   ├── test-health-check.js
│   ├── test-mcp-initialize.js
│   └── test-version-info.js
├── integration/                   # API integration tests
│   ├── test-oauth-flow.js
│   ├── test-protocol-negotiation.js
│   └── test-transport-compatibility.js
├── performance/                   # Performance and load tests
│   └── test-health-check-performance.ts
└── e2e/                          # End-to-end transport tests
    └── test-mcp-protocol-compliance.ts
```

## Configuration Files

### Core Configuration
- **`package.json`**: NPM configuration with scripts and dependencies
- **`tsconfig.json`**: TypeScript compiler configuration (ES2021, ESNext)
- **`vitest.config.ts`**: Test framework configuration
- **`wrangler.toml`**: Cloudflare Workers deployment configuration

### Agent Configuration
- **`.claude/settings.local.json`**: Claude Code local settings
- **`.serena/project.yml`**: Serena agent project configuration
- **`.specify/`**: Project specification and planning files

## Key Architectural Files

### Main Worker (`src/worker.ts`)
- **Default Export**: Cloudflare Worker fetch handler
- **LegCoMcpServer Class**: Extends McpAgent for state management
- **Transport Handlers**: HTTP, SSE, WebSocket endpoint handlers
- **MCP Tool Implementations**: 4 main search tools
- **Error Handling**: Comprehensive error classes and logging
- **Rate Limiting**: IP-based request limiting
- **Health Endpoints**: Status and monitoring endpoints

### Core Functionality
- **Base URLs**: OData endpoint configuration for LegCo APIs
- **Query Building**: OData query construction with multi-word search
- **Validation**: Input validation with Zod schemas
- **Security**: Input sanitization and SQL injection prevention
- **HTTP Client**: Retry logic and timeout handling
- **CORS Support**: Cross-origin resource sharing

## Data Flow Architecture

### Request Flow
1. **Client Request** → Worker fetch handler
2. **Route Detection** → Transport-specific handler (HTTP/SSE/WebSocket)
3. **MCP Protocol** → JSON-RPC 2.0 message parsing
4. **Tool Execution** → Validation → API call → Response formatting
5. **Response** → Transport-specific response format

### State Management
1. **Durable Objects** → Per-agent instance state persistence
2. **SQL Database** → Built-in database for agent state
3. **McpAgent Class** → State management abstraction
4. **Hibernation Support** → Automatic scaling and resource management

## API Integration Architecture

### LegCo Data Sources
- **Voting Results**: `app.legco.gov.hk/vrdb/odata/vVotingResult`
- **Bills Database**: `app.legco.gov.hk/BillsDB/odata/Vbills`
- **Questions (Oral)**: `app.legco.gov.hk/QuestionsDB/odata/ViewOralQuestionsEng`
- **Questions (Written)**: `app.legco.gov.hk/QuestionsDB/odata/ViewWrittenQuestionsEng`
- **Hansard Records**: `app.legco.gov.hk/OpenData/HansardDB/*` (multiple endpoints)

### Query Processing
- **OData Protocol**: Standard query parameters ($filter, $top, $skip, etc.)
- **Multi-word Search**: Intelligent parsing of search terms into AND queries
- **Field Mapping**: Endpoint-specific field name mapping
- **Response Processing**: JSON/XML response handling with metadata injection

## Deployment Architecture

### Environments
- **Development**: Local wrangler dev server
- **Staging**: `legco-search-mcp-staging` worker
- **Production**: `legco-search-mcp-prod` worker

### Global Distribution
- **Edge Deployment**: Cloudflare's global edge network
- **Automatic Scaling**: Serverless scaling based on demand
- **Regional Optimization**: Low latency from multiple geographic regions
- **Hibernation**: Automatic resource management during low usage

## Security Architecture

### Input Security
- **Sanitization**: `sanitizeString()` for all user inputs
- **Validation**: Zod schemas for type-safe parameter validation
- **Length Limits**: Maximum string lengths and parameter bounds
- **Character Filtering**: Allow only safe characters while preserving functionality

### Network Security
- **Rate Limiting**: 60 requests per minute per IP address
- **CORS Policy**: Configurable cross-origin resource sharing
- **Request Tracking**: Unique request IDs for monitoring and debugging
- **Error Handling**: Safe error responses without sensitive information

## Development Workflow

### Local Development
1. **Setup**: `npm install` → Install dependencies
2. **Development**: `npm run dev` → Start local server
3. **Testing**: `npx vitest` → Run test suite
4. **Validation**: `npx tsc --noEmit` → Check TypeScript

### Deployment Workflow
1. **Staging**: `npm run deploy:staging` → Deploy to staging
2. **Testing**: Validate staging functionality
3. **Production**: `npm run deploy:production` → Deploy to production
4. **Monitoring**: `npm run tail` → Monitor logs