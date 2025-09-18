# LegCo Search MCP Server - Tech Stack

## Primary Technologies
- **Language**: TypeScript with ES modules
- **Platform**: Cloudflare Workers (serverless edge computing)
- **Runtime**: Cloudflare Workers Runtime with Node.js compatibility
- **State Management**: Durable Objects with built-in SQL database

## Framework & SDK
- **MCP SDK**: @modelcontextprotocol/sdk for MCP protocol implementation
- **Agents SDK**: Cloudflare Agents SDK (agents package) with McpAgent class
- **Protocol Version**: MCP 2025-06-18 (latest specification)
- **JSON-RPC**: 2.0 implementation with proper error codes

## Dependencies
### Core Dependencies
- `@modelcontextprotocol/sdk`: ^1.18.0 - MCP protocol implementation
- `agents`: ^0.1.4 - Cloudflare Agents SDK for enhanced state management
- `wrangler`: ^4.37.1 - Cloudflare Workers CLI and development tools

### Development Dependencies
- `typescript`: ^5.9.2 - TypeScript compiler
- `@types/node`: ^20.0.0 - Node.js type definitions
- `vitest`: ^3.2.4 - Testing framework

## Build & Configuration
- **TypeScript Config**: ES2021 target, ESNext modules, bundler resolution
- **Wrangler Config**: Compatibility date 2024-09-23, Node.js compatibility enabled
- **Durable Objects**: Enabled for agent state persistence
- **SQLite**: For state storage in Durable Objects

## Data Integration
- **OData Protocol**: For accessing LegCo APIs
- **Transport Protocols**: HTTP, SSE (Server-Sent Events), WebSocket
- **Data Sources**: 4+ LegCo OData endpoints for different data types
- **Query Building**: Custom OData query construction with multi-word search support

## Performance & Security
- **Rate Limiting**: 60 requests per minute per IP
- **Input Validation**: Zod schemas for type-safe parameter validation
- **Error Handling**: Comprehensive error recovery and logging
- **CORS Support**: Full cross-origin resource sharing
- **Security**: Input sanitization, SQL injection prevention

## Deployment
- **Staging Environment**: legco-search-mcp-staging
- **Production Environment**: legco-search-mcp-prod
- **Global Distribution**: Cloudflare's edge network
- **Auto-scaling**: Serverless with hibernation support