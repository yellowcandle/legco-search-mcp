# LegCo Search MCP Server - Project Overview

## Purpose
This is a **remote Model Context Protocol (MCP) server** deployed on Cloudflare Workers that provides AI assistants with access to Hong Kong Legislative Council (LegCo) open data APIs. 

The server enables searching and retrieving information from:
- **Voting Results Database**: Council meetings, committees, and subcommittees since 2012
- **Bills Database**: Legislative bills since 1844
- **Questions Database**: Oral and written questions at Council meetings since 2012  
- **Hansard Database**: Official records of proceedings since 2012

## Key Features
- **Multi-Protocol Support**: HTTP, SSE, and WebSocket transports
- **MCP 2025-06-18 Specification**: Full compliance with latest MCP protocol using Cloudflare Agents SDK
- **Global Edge Deployment**: Cloudflare Workers for low latency worldwide
- **No Authentication Required**: Authless API for easy integration
- **Enhanced Search**: Multi-word query support with intelligent OData parsing
- **Robust Error Handling**: Connection timeout fixes and comprehensive retry logic

## Architecture
- **Platform**: Cloudflare Workers + Durable Objects
- **Runtime**: Serverless edge computing with global deployment
- **State Management**: Built-in SQL database per agent instance
- **Protocol Compliance**: MCP 2025-06-18 with JSON-RPC 2.0
- **Transport Support**: HTTP, SSE, WebSocket with full MCP compliance
- **Performance**: Sub-100ms health checks, 60s API timeouts

## Live Deployment
- **Production URL**: https://legco-search-mcp.herballemon.workers.dev
- **SSE Endpoint**: /sse (for Claude Desktop integration)
- **HTTP Endpoint**: /mcp-http (for direct API calls)
- **WebSocket**: /mcp (for persistent connections)
- **Health Check**: /health

## Project Type
Single remote MCP server application providing 4 main tools for searching LegCo data sources.