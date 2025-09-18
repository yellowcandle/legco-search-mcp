# Quickstart: Update MCP Server to Latest Version

## Overview
This quickstart validates that the MCP server has been successfully updated to the latest version while maintaining all existing functionality and performance standards.

## Prerequisites
- MCP server deployed and accessible
- MCP client capable of connecting to the server
- Network access to server endpoints

## Test Scenarios

### Scenario 1: Protocol Version Update Validation
**Given** the MCP server has been updated to the latest version
**When** a client initializes connection with protocol version negotiation
**Then** the server should accept the latest protocol version and respond with server capabilities

```bash
# Test MCP initialization with latest protocol version
curl -X POST http://localhost:8787/sse \
  -H "Content-Type: application/json" \
  -d '{
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {}
    },
    "id": 1
  }'
```

**Expected Response:**
```json
{
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "tools": {"listChanged": true},
      "logging": {}
    },
    "serverInfo": {
      "name": "legco-search-mcp",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

### Scenario 2: Backward Compatibility Check
**Given** the server supports the latest protocol version
**When** a client connects with an older supported protocol version
**Then** the server should maintain backward compatibility

```bash
# Test backward compatibility with previous version
curl -X POST http://localhost:8787/sse \
  -H "Content-Type: application/json" \
  -d '{
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {}
    },
    "id": 2
  }'
```

**Expected:** Successful initialization with negotiated protocol version

### Scenario 3: Health Check Performance Validation
**Given** the server is running the updated version
**When** health checks are performed
**Then** response times should remain under 100ms

```bash
# Test health check performance
time curl -s http://localhost:8787/health
```

**Expected:**
- HTTP status 200
- Response time < 100ms
- JSON response with status "healthy"

### Scenario 4: Tool Functionality Preservation
**Given** the server has been updated
**When** existing MCP tools are invoked
**Then** all tools should function as before the update

```bash
# Test existing tool functionality
curl -X POST http://localhost:8787/sse \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "search_voting_results",
      "arguments": {"top": 1}
    },
    "id": 3
  }'
```

**Expected:** Successful tool execution with voting results data

### Scenario 5: Multi-Transport Support
**Given** the server supports multiple transport protocols
**When** connections are made via HTTP, SSE, and WebSocket
**Then** all transports should work correctly

```bash
# Test HTTP transport
curl -X POST http://localhost:8787/mcp-http \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list", "params": {}, "id": 4}'

# Test WebSocket connection (requires WebSocket client)
# ws://localhost:8787/mcp
```

**Expected:** All transports return valid MCP responses

## Validation Checklist

- [ ] MCP initialization succeeds with latest protocol version
- [ ] Backward compatibility maintained for older clients
- [ ] Health checks respond within 100ms
- [ ] All existing tools function correctly
- [ ] Multi-transport support (HTTP, SSE, WebSocket) works
- [ ] Error handling remains robust
- [ ] Performance benchmarks maintained
- [ ] No breaking changes in API responses

## Troubleshooting

### Connection Failures
- Verify server is running and accessible
- Check protocol version format (YYYY-MM-DD)
- Ensure client capabilities are properly specified

### Performance Issues
- Monitor health check response times
- Check server logs for performance warnings
- Verify network latency is within acceptable ranges

### Tool Execution Errors
- Confirm tool names and parameters match specification
- Check for authentication or authorization issues
- Validate input data formats

## Success Criteria
All test scenarios pass and validation checklist is complete. The server demonstrates full compatibility with the latest MCP protocol version while preserving all existing functionality and performance characteristics.