# LegCo Search MCP Server - Task Completion Checklist

## Pre-Development Checks
- [ ] Understand the MCP protocol requirements and compatibility
- [ ] Review existing code patterns and conventions
- [ ] Check current deployment status and health
- [ ] Identify which endpoints/tools will be affected

## Development Process

### Code Quality Checks
- [ ] **TypeScript Compilation**: Run `npx tsc --noEmit` to check for type errors
- [ ] **Code Style**: Follow existing patterns in `src/worker.ts`
- [ ] **Error Handling**: Implement proper error classes and logging
- [ ] **Input Validation**: Use Zod schemas for parameter validation
- [ ] **Security**: Apply input sanitization with `sanitizeString()`

### Testing Requirements
- [ ] **Local Testing**: Test with `npm run dev` and curl commands
- [ ] **Health Check**: Verify `/health` endpoint responds correctly
- [ ] **MCP Protocol**: Test `initialize`, `tools/list`, and `tools/call` methods
- [ ] **Multi-word Search**: Test complex search queries if search-related
- [ ] **Error Scenarios**: Test invalid inputs and error handling
- [ ] **Rate Limiting**: Verify rate limiting works correctly

### Unit & Integration Tests
- [ ] **Unit Tests**: Run `npx vitest` to execute all unit tests
- [ ] **Contract Tests**: Ensure MCP protocol compliance
- [ ] **Integration Tests**: Test API endpoints and data flows
- [ ] **Performance Tests**: Verify response times are acceptable
- [ ] **E2E Tests**: Test complete request/response cycles

## Deployment Process

### Staging Deployment
- [ ] **Deploy to Staging**: Run `npm run deploy:staging`
- [ ] **Staging Health Check**: Test staging endpoint health
- [ ] **Staging Functional Test**: Test all affected tools/endpoints
- [ ] **Error Log Review**: Check `wrangler tail` for any errors
- [ ] **Performance Verification**: Confirm sub-100ms health checks

### Production Deployment
- [ ] **Production Deploy**: Run `npm run deploy:production` only after staging verification
- [ ] **Production Health Check**: Verify production health endpoint
- [ ] **Production Functional Test**: Test critical paths
- [ ] **Monitor Logs**: Watch `wrangler tail` for initial issues
- [ ] **Performance Check**: Confirm production performance metrics

## Post-Deployment Verification

### MCP Client Testing
- [ ] **Claude Desktop Integration**: Test SSE endpoint integration
- [ ] **HTTP API**: Test direct HTTP API calls
- [ ] **WebSocket**: Test WebSocket transport if applicable
- [ ] **Tool Functionality**: Verify all 4 MCP tools work correctly
- [ ] **Multi-transport**: Test all transport methods (HTTP, SSE, WebSocket)

### Live Production Testing
```bash
# Health check
curl https://legco-search-mcp.herballemon.workers.dev/health

# MCP tools list
curl -X POST https://legco-search-mcp.herballemon.workers.dev/mcp-http \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list", "id": 1}'

# Test search functionality
curl -X POST https://legco-search-mcp.herballemon.workers.dev/mcp-http \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "search_voting_results", "arguments": {"top": 5}}, "id": 2}'
```

### Monitoring & Documentation
- [ ] **Log Monitoring**: Check for errors in first hour after deployment
- [ ] **Performance Metrics**: Verify response times and error rates
- [ ] **Documentation Updates**: Update CLAUDE.md or README.md if needed
- [ ] **Commit & Push**: Commit changes to git repository

## Rollback Plan
If issues are discovered:
- [ ] **Immediate Assessment**: Determine severity of issue
- [ ] **Rollback Decision**: Use `wrangler rollback` if critical issues
- [ ] **Issue Investigation**: Analyze logs and error patterns
- [ ] **Fix Development**: Develop fix in staging environment
- [ ] **Re-deployment**: Follow full checklist again for fix

## MCP-Specific Validation

### Protocol Compliance
- [ ] **MCP Version**: Ensure 2025-06-18 protocol compliance
- [ ] **JSON-RPC 2.0**: Verify proper request/response format
- [ ] **Error Codes**: Use correct JSON-RPC error codes
- [ ] **Transport Support**: All three transports (HTTP, SSE, WebSocket) working
- [ ] **Capabilities**: Proper capabilities declaration in initialize response

### Tool Validation
- [ ] **Tool Schemas**: All tools have valid Zod input schemas
- [ ] **Tool Responses**: Responses follow MCP content format
- [ ] **Annotations**: Proper annotations with audience, priority, lastModified
- [ ] **Error Handling**: Tools properly handle and report errors
- [ ] **Input Validation**: All tool parameters properly validated

## Security Checklist
- [ ] **Input Sanitization**: All user inputs properly sanitized
- [ ] **SQL Injection Prevention**: OData queries are safe
- [ ] **Rate Limiting**: 60 req/min rate limiting active
- [ ] **CORS Headers**: Proper CORS configuration
- [ ] **Error Information**: No sensitive data in error responses
- [ ] **Logging Security**: No sensitive data logged

## Performance Standards
- [ ] **Health Check**: < 100ms response time
- [ ] **API Timeout**: 60-second timeout for complex queries
- [ ] **Rate Limits**: Properly enforced and tested
- [ ] **Memory Usage**: Optimized for edge deployment
- [ ] **Global Latency**: Low latency from multiple geographic locations

## Final Verification
- [ ] **All Tests Pass**: Unit, integration, contract, performance, e2e
- [ ] **No Console Errors**: Clean console output in development
- [ ] **Production Stability**: Stable for at least 30 minutes post-deployment
- [ ] **Documentation Current**: All documentation reflects current state
- [ ] **Git Repository**: All changes committed and pushed
- [ ] **Deployment Records**: Record successful deployment in project notes