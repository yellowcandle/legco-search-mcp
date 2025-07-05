# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **remote MCP server** deployed on Cloudflare Workers that provides access to Hong Kong Legislative Council (LegCo) open data APIs through the Model Context Protocol (MCP). The server enables AI assistants to search and retrieve information from:

- **Voting Results Database**: Council meetings, committees, and subcommittees since 2012
- **Bills Database**: Legislative bills since 1844
- **Questions Database**: Oral and written questions at Council meetings since 2012  
- **Hansard Database**: Official records of proceedings since 2012

### Remote MCP Server Features

- **Multi-Protocol Support**: HTTP, SSE, and WebSocket transports
- **MCP 2024-11-05 Specification**: Full compliance with latest MCP protocol
- **Global Edge Deployment**: Cloudflare Workers for low latency worldwide
- **No Authentication Required**: Authless API for easy integration
- **Production Ready**: Rate limiting, error handling, CORS support, comprehensive logging
- **Enhanced Search**: Multi-word query support with intelligent OData parsing
- **Robust Error Handling**: Connection timeout fixes and comprehensive retry logic

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
- **Multi-Transport Support**: HTTP (`/mcp-http`), SSE (`/sse`), and WebSocket (`/mcp`) endpoints
- **Enhanced MCP Protocol Handler**: Full JSON-RPC 2.0 implementation with robust error handling
- **Advanced Tool Registration**: 4 main MCP tools with comprehensive input validation and multi-word search
- **Enhanced Security**: Improved input sanitization, rate limiting, CORS support, SQL injection prevention
- **Smart Query Building**: Intelligent OData query construction with multi-word term parsing

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

**Enhanced Injection Prevention:**
- `sanitizeString()`: Enhanced function that preserves spaces while removing dangerous characters
- **Multi-word Support**: Properly handles search terms like "housing policy" or "transport infrastructure"
- **OData Query Building**: Smart parsing that splits multi-word terms into AND-filtered substring searches
- **Input Validation**: Comprehensive validation before OData filter string construction
- **URL Encoding**: Proper encoding for all query parameters and special characters

**Multi-word Search Logic:**
```typescript
// Input: "housing policy"
// Output: (substringof('housing', SubjectName) and substringof('policy', SubjectName))

function buildMultiWordFilter(keywords: string, fieldName: string): string {
  const words = sanitizeString(keywords).split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) {
    return `substringof('${words[0]}', ${fieldName})`;
  } else {
    const wordFilters = words.map(word => `substringof('${word}', ${fieldName})`);
    return `(${wordFilters.join(' and ')})`;
  }
}
```

### API Integration

**OData Protocol Support:**
- Supports standard OData query options: `$filter`, `$top`, `$skip`, `$orderby`, `$select`
- Automatic `$inlinecount=allpages` for result counts
- JSON and XML output formats

**Endpoint Mapping:**
```typescript
BASE_URLS = {
    'voting': 'https://app.legco.gov.hk/vrdb/odata/vVotingResult',
    'bills': 'https://app.legco.gov.hk/BillsDB/odata/Vbills', 
    'questions_oral': 'https://app.legco.gov.hk/QuestionsDB/odata/ViewOralQuestionsEng',
    'questions_written': 'https://app.legco.gov.hk/QuestionsDB/odata/ViewWrittenQuestionsEng',
    'hansard': 'https://app.legco.gov.hk/OpenData/HansardDB/Hansard',
    'hansard_questions': 'https://app.legco.gov.hk/OpenData/HansardDB/Questions',
    'hansard_bills': 'https://app.legco.gov.hk/OpenData/HansardDB/Bills',
    'hansard_motions': 'https://app.legco.gov.hk/OpenData/HansardDB/Motions',
    'hansard_voting': 'https://app.legco.gov.hk/OpenData/HansardDB/VotingResults',
    'hansard_speeches': 'https://app.legco.gov.hk/OpenData/HansardDB/Speeches',
    'hansard_rundown': 'https://app.legco.gov.hk/OpenData/HansardDB/Rundown'
}
```

### **Field Mapping & Search Capabilities**

**Voting Results Endpoint (`voting`):**
```typescript
// Available search fields:
- meeting_type: 'type' (exact match)
- member_name: 'name_en' (substring search)
- motion_keywords: 'motion_en' (multi-word AND search)
- start_date/end_date: 'start_date' (datetime range)
- term_no: 'term_no' (exact match)
```

**Bills Endpoint (`bills`):**
```typescript
// Available search fields:
- title_keywords: 'bill_title_eng' (multi-word AND search)
- gazette_year: 'bill_gazette_date' (year function)
- gazette_start_date/end_date: 'bill_gazette_date' (datetime range)
```

**Questions Endpoints (`questions_oral`, `questions_written`):**
```typescript
// Available search fields:
- subject_keywords: 'SubjectName' (multi-word AND search)
- member_name: 'MemberName' (substring search)
- meeting_date: 'MeetingDate' (exact datetime)
- year: 'MeetingDate' (year function)
```

**Hansard Endpoints:**
```typescript
// Main hansard endpoint ('hansard'):
- meeting_date: 'MeetingDate' (exact datetime)
- year: 'MeetingDate' (year function)
// Note: No subject_keywords support

// Specialized hansard endpoints ('hansard_questions', 'hansard_bills', etc.):
- subject_keywords: 'Subject' (multi-word AND search)
- speaker: 'Speaker' (substring search, questions/speeches only)
- meeting_date: 'MeetingDate' (exact datetime) 
- year: 'MeetingDate' (year function)
- question_type: 'QuestionType' (exact match, questions only)
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

**Local Development Testing:**
```bash
# Start development server
npm run dev

# Test basic functionality
curl http://localhost:8787/health

# Test multi-word search (recent fix)
curl -X POST http://localhost:8787/mcp-http \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "search_questions",
      "arguments": {
        "subject_keywords": "housing policy",
        "top": 5
      }
    },
    "id": 1
  }'

# Test hansard endpoint types
curl -X POST http://localhost:8787/mcp-http \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call", 
    "params": {
      "name": "search_hansard",
      "arguments": {
        "hansard_type": "bills",
        "subject_keywords": "climate change",
        "year": 2024
      }
    },
    "id": 2
  }'
```

**Production Testing:**
- Test with actual API calls (requires network access)
- Verify multi-word search functionality across all endpoints
- Check input validation catches edge cases and malformed queries
- Validate error handling with invalid requests and malformed parameters
- Test connection resilience with complex queries (60-second timeout)

**Common Test Cases:**
- Single word searches: `"housing"`
- Multi-word searches: `"housing policy"`, `"transport infrastructure"`
- Complex phrases: `"public health measures"`, `"economic development policy"`
- Edge cases: Empty strings, special characters, very long queries
- Endpoint-specific tests: hansard types, question types, date ranges

## Common Issues & Troubleshooting

### **Search Endpoint Issues**

**"Connection closed" errors (FIXED in v0.2.0):**
```typescript
// Problem: Multi-word search terms caused OData query failures
// Root cause: Inadequate sanitization and query building
// Solution: Enhanced sanitizeString() and multi-word query logic

// Before (broken):
filters.push(`substringof('housing policy', SubjectName)`);

// After (working):
const words = ['housing', 'policy'];
const wordFilters = words.map(word => `substringof('${word}', SubjectName)`);
filters.push(`(${wordFilters.join(' and ')})`);
```

**Hansard endpoint "Bad Request" errors:**
```typescript
// Problem: Using subject_keywords with main hansard endpoint
// Main hansard endpoint has no Subject field

// Wrong:
{ "name": "search_hansard", "arguments": { "subject_keywords": "housing" } }

// Right:
{ "name": "search_hansard", "arguments": { 
    "hansard_type": "bills", 
    "subject_keywords": "housing" 
  }
}
```

**Field name mismatches:**
```typescript
// Questions endpoints use different field names than expected
// Correct field mappings:
- Questions: 'SubjectName', 'MemberName', 'MeetingDate'
- Hansard specialized: 'Subject', 'Speaker', 'MeetingDate'
- Bills: 'bill_title_eng', 'bill_gazette_date'
- Voting: 'motion_en', 'name_en', 'start_date'
```

### **Development Debugging**

**Enable comprehensive logging:**
```typescript
// The server logs detailed information about:
- Request URLs and parameters
- OData query construction
- API response details
- Error contexts with request IDs

// Check logs for:
logInfo('Final request URL', { fullUrl, context });
logError('OData query building failed', { error, endpoint, params });
```

**Testing specific scenarios:**
```bash
# Test field name validation
curl -X POST http://localhost:8787/mcp-http \
  -d '{"method": "tools/call", "params": {"name": "search_questions", "arguments": {"subject_keywords": "test"}}}'

# Verify multi-word parsing
curl -X POST http://localhost:8787/mcp-http \
  -d '{"method": "tools/call", "params": {"name": "search_hansard", "arguments": {"hansard_type": "bills", "subject_keywords": "housing development policy"}}}'
```