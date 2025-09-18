# LegCo Search MCP Server Constitution

## Core Principles

### I. MCP Protocol Compliance (NON-NEGOTIABLE)
Full compliance with MCP 2024-11-05 specification; All protocol messages must be validated against schema; JSON-RPC 2.0 implementation with proper error codes; Transport-agnostic design supporting HTTP, SSE, and WebSocket

### II. Multi-Transport Architecture
Support for HTTP, SSE, and WebSocket transports; Each transport must maintain full MCP protocol compatibility; Connection management with proper cleanup; Rate limiting and CORS support across all transports

### III. Security-First Design
Enhanced input sanitization preventing injection attacks; Multi-word search support with proper query building; Input validation for all parameters (dates, enums, numeric bounds); No authentication required but comprehensive security measures

### IV. Production-Ready Infrastructure
Global edge deployment on Cloudflare Workers; Comprehensive error handling and logging; Request timeouts and retry logic; Health check endpoints; Structured logging with request IDs

### V. API Integration Excellence
OData protocol support with intelligent query building; Multi-word search capabilities across all endpoints; Proper field mapping for different data sources; Response metadata injection and pagination support

## Technical Standards

### Technology Stack
Cloudflare Workers runtime; TypeScript with strict type checking; ES modules; No external dependencies beyond Cloudflare platform; WebSocket, SSE, and HTTP API support

### Performance Requirements
Sub-100ms response times for health checks; 60-second timeouts for API calls; Connection pooling (max 10 connections); Request retry logic (3 attempts); Global edge deployment for low latency

### Data Sources
LegCo Voting Results Database (since 2012); Bills Database (since 1844); Questions Database (since 2012); Hansard Database (since 2012); All endpoints must support multi-word search and proper OData filtering

## Development Workflow

### Code Review Requirements
All changes must maintain MCP protocol compliance; Security reviews for input validation changes; Performance impact assessment for query optimizations; Multi-transport testing required

### Testing Gates
Unit tests for all utility functions; Integration tests for MCP protocol handling; End-to-end tests for each transport type; API endpoint testing with mock responses; Multi-word search validation

### Deployment Process
Staging deployment for integration testing; Production deployment with rollback capability; Environment-specific configuration management; Health check validation before traffic switching

## Governance

### Constitution Authority
This constitution supersedes all other development practices; All code changes must demonstrate compliance with core principles; MCP protocol compliance is non-negotiable and cannot be bypassed

### Amendment Process
Amendments require documentation of rationale, impact assessment, and migration plan; Changes to core principles require consensus approval; Technical standards can be updated with proper testing validation

### Compliance Verification
All PRs must verify MCP protocol compliance; Security reviews mandatory for input handling changes; Performance benchmarks must be maintained; Use CLAUDE.md for runtime development guidance

**Version**: 1.0.0 | **Ratified**: 2025-01-15 | **Last Amended**: 2025-01-15