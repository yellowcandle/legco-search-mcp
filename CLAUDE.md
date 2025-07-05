# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **remote MCP server** deployed on Cloudflare Workers that provides access to Hong Kong Legislative Council (LegCo) open data APIs through the Model Context Protocol (MCP). The server enables AI assistants to search and retrieve information from:

- **Voting Results Database**: Council meetings, committees, and subcommittees since 2012
- **Bills Database**: Legislative bills since 1844
- **Questions Database**: Oral and written questions at Council meetings since 2012  
- **Hansard Database**: Official records of proceedings since 2012

### Remote MCP Server Features

- **Dual Protocol Support**: HTTP and WebSocket transports
- **MCP 2024-11-05 Specification**: Full compliance with latest MCP protocol
- **Global Edge Deployment**: Cloudflare Workers for low latency worldwide
- **No Authentication Required**: Authless API for easy integration
- **Production Ready**: Rate limiting, error handling, CORS support, comprehensive logging

## Development Commands

### Remote MCP Server (Cloudflare Workers)
```bash
# Start development server
npm run dev
# or
wrangler dev

# Deploy to staging
npm run deploy:staging

# Deploy to production  
npm run deploy:production

# View logs
npm run tail

# Test mode
npm run test
```

### Testing Remote MCP Server
```bash
# Test health endpoint
curl http://localhost:8787/health

# Test MCP initialization
curl -X POST http://localhost:8787/sse \
  -H "Content-Type: application/json" \
  -d '{"method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}}, "id": 1}'

# Test tools list
curl -X POST http://localhost:8787/sse \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list", "params": {}, "id": 2}'

# Test tool call
curl -X POST http://localhost:8787/sse \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "search_voting_results", "arguments": {"top": 5}}, "id": 3}'
```

## Architecture

### Core Components

**`src/worker.ts`** - Main Cloudflare Worker implementation:
- **Dual Transport Support**: HTTP (`/sse`) and WebSocket (`/mcp`) endpoints
- **MCP Protocol Handler**: Full JSON-RPC 2.0 implementation with proper error handling
- **Tool Registration**: 4 main MCP tools with comprehensive input validation
- **Security**: Input sanitization, rate limiting, CORS support, SQL injection prevention

**Remote MCP Server Endpoints:**
- **`/health`** - Health check endpoint
- **`/sse`** - HTTP-based MCP communication (JSON-RPC over HTTP)
- **`/mcp`** - WebSocket-based MCP communication (JSON-RPC over WebSocket)
- **`/`** - Service information and endpoint discovery

**MCP Tools Provided:**
1. `search_voting_results`: Search voting records with meeting type, date, member filters
2. `search_bills`: Search bills with title keywords, gazette dates
3. `search_questions`: Search oral/written questions with subject/member filters  
4. `search_hansard`: Search official proceedings by type (hansard/questions/bills/motions/voting)

### MCP Protocol Implementation

**WebSocket Transport (`/mcp`):**
- Persistent connection for real-time communication
- JSON-RPC 2.0 message handling
- Automatic connection management
- Error handling with proper JSON-RPC error codes

**HTTP Transport (`/sse`):**
- Request/response model for simple integration
- Full MCP protocol support over HTTP
- CORS-enabled for browser clients
- Rate limiting and request logging

### Security Features

**Input Validation:**
- Date format validation (YYYY-MM-DD)
- Enum validation for meeting types, question types, etc.
- Numeric bounds checking (top: 1-1000, skip: ≥0)
- String length limits (500 chars max)

**Injection Prevention:**
- `_sanitize_string()`: Removes dangerous characters, escapes single quotes
- All user inputs are sanitized before building OData filter strings
- URL encoding for query parameters

### API Integration

**OData Protocol Support:**
- Supports standard OData query options: `$filter`, `$top`, `$skip`, `$orderby`, `$select`
- Automatic `$inlinecount=allpages` for result counts
- JSON and XML output formats

**Endpoint Mapping:**
```python
BASE_URLS = {
    'voting': 'https://app.legco.gov.hk/vrdb/odata/vVotingResult',
    'bills': 'https://app.legco.gov.hk/BillsDB/odata/Vbills', 
    'questions_oral': 'https://app.legco.gov.hk/QuestionsDB/odata/ViewOralQuestionsEng',
    'questions_written': 'https://app.legco.gov.hk/QuestionsDB/odata/ViewWrittenQuestionsEng',
    'hansard': 'https://app.legco.gov.hk/OpenData/HansardDB/Hansard',
    # ... additional Hansard endpoints
}
```

### Error Handling

- Custom `LegCoAPIError` exception for API-specific errors
- Comprehensive HTTP error handling with safe error message extraction
- Request timeouts and retry logic (3 retries)
- Graceful handling of malformed responses

### Performance Optimizations

- HTTP connection pooling (max 10 connections, 5 keepalive)
- Request retries for reliability
- Response metadata injection for JSON responses
- XML count extraction for pagination

## Configuration

### Remote MCP Client Setup

**For Claude Desktop (Remote Server):**
Configure through Claude Desktop Settings UI:
1. Settings → Integrations → Add Integration
2. URL: `https://legco-search-mcp.herballemon.workers.dev/sse`
3. Transport: SSE

**For Other MCP Clients (SSE):**
```bash
# Direct SSE connection
curl -N -H "Accept: text/event-stream" \
  "https://legco-search-mcp.herballemon.workers.dev/sse"
```

**For HTTP-Only Clients:**
```bash
# Direct HTTP API calls
curl -X POST https://legco-search-mcp.herballemon.workers.dev/mcp-http \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list", "id": 1}'
```

**For Custom MCP Clients (WebSocket Transport):**
```javascript
// Connect to WebSocket endpoint
const ws = new WebSocket('wss://legco-search-mcp.herballemon.workers.dev/mcp');

// Send MCP initialize message
ws.send(JSON.stringify({
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {}
  },
  id: 1
}));
```

**Live Deployment:**
- **SSE Endpoint**: `https://legco-search-mcp.herballemon.workers.dev/sse` (Server-Sent Events)
- **HTTP Endpoint**: `https://legco-search-mcp.herballemon.workers.dev/mcp-http` (Pure HTTP)
- **WebSocket Endpoint**: `wss://legco-search-mcp.herballemon.workers.dev/mcp`
- **Health Check**: `https://legco-search-mcp.herballemon.workers.dev/health`

### Environment Requirements
- **Cloudflare Workers**: Deployment platform
- **Wrangler CLI**: For deployment and development
- **Node.js**: For local development
- **Network access**: To LegCo API endpoints

## Common Patterns

### Adding New Search Parameters
1. Add parameter to tool function signature with type hints
2. Add validation in tool function body
3. Add sanitization in `_search_odata_endpoint()` filter building
4. Update documentation and examples

### Security Considerations
- Always use `_sanitize_string()` for user-provided text filters
- Validate enum values against allowed lists
- Check numeric bounds for pagination parameters
- Test with malicious inputs during development

### Testing Changes
- Run `uv run python test_server.py` for core functionality
- Test with actual API calls (requires network access)
- Verify input validation catches edge cases
- Check error handling with invalid requests