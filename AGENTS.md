# Agent Context: LegCo Search MCP Server

## Current Feature: Update MCP Server to Latest Version (001-update-this-mcp)

### Technical Context
**Language/Version**: TypeScript with ES modules
**Primary Dependencies**: Cloudflare Agents SDK (`agents`), Cloudflare Workers runtime
**Storage**: Built-in SQL database per agent instance (Durable Objects), OData proxy to LegCo endpoints
**Testing**: Unit tests for agent methods, integration tests for MCP protocol, end-to-end tests for transports
**Target Platform**: Cloudflare Workers + Durable Objects (global edge deployment)
**Project Type**: single (AI agent/MCP server)
**Performance Goals**: Sub-100ms health checks, 60s API timeouts, global low latency, hibernation support
**Constraints**: MCP protocol compliance (non-negotiable), security-first design, multi-transport support, OAuth integration
**Scale/Scope**: 4 MCP tools, 3 transport types, OData integration with 4+ data sources, multi-word search, stateful agent instances

### Recent Changes (Last 3)
1. **2025-01-18**: Successfully migrated to Cloudflare Agents SDK with McpAgent class
2. **2025-01-18**: Implemented MCP 2025-06-18 features (resource subscriptions, progress notifications, annotations)
3. **2025-01-18**: Added Durable Objects state management and OAuth infrastructure

### Key Architecture Decisions
- Cloudflare Agents SDK with McpAgent class for enhanced state management
- Built-in SQL database per agent instance with Durable Objects scaling
- OAuth authentication integration using Workers OAuth Provider
- Multi-transport support: HTTP, SSE, WebSocket (handled by McpAgent)
- OData integration with LegCo databases and multi-word search
- Security-first design with input sanitization and enhanced logging
- Global edge deployment on Cloudflare Workers with hibernation support

### Development Guidelines
- Follow constitution: MCP compliance non-negotiable, security-first, production-ready
- Testing: Unit, integration, end-to-end across all transports
- Performance: <100ms health checks, 60s timeouts
- Deployment: Staging → production with rollback capability
- State Management: Use Durable Objects SQL for persistence
- Authentication: OAuth integration ready for future use

### Current Focus
MCP server successfully updated to 2025-06-18 with Agents SDK architecture. All tools functional with enhanced features and performance.