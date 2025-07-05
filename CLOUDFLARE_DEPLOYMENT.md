# Deploying LegCo Search MCP Server to Cloudflare Workers

This guide shows how to deploy your LegCo Search MCP server to Cloudflare Workers using Python runtime.

## Prerequisites

1. **Node.js and npm** installed on your system
2. **Cloudflare account** (free tier works fine)
3. **Wrangler CLI** installed globally

## Setup Instructions

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### 3. Install Project Dependencies

```bash
npm install
```

### 4. Configure Your Worker

The `wrangler.toml` file is already configured for Python runtime. You can customize:

- **Worker name**: Change `name = "legco-search-mcp"` to your preferred name
- **Environment**: Modify the `[env.production]` and `[env.staging]` sections
- **Variables**: Add any environment variables in the `[vars]` section

### 5. Local Development

Test your worker locally:

```bash
npm run dev
# or
wrangler dev
```

Your worker will be available at `http://localhost:8787`

#### Test Endpoints

- **Health check**: `http://localhost:8787/health`
- **MCP endpoint**: `http://localhost:8787/sse` (POST requests)

### 6. Deploy to Cloudflare

#### Deploy to Staging

```bash
npm run deploy:staging
# or
wrangler deploy --env staging
```

#### Deploy to Production

```bash
npm run deploy:production
# or
wrangler deploy --env production
```

#### Quick Deploy (default environment)

```bash
npm run deploy
# or
wrangler deploy
```

## Testing Your Deployment

### 1. Health Check

```bash
curl https://your-worker-name.your-account.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "LegCo Search MCP Server",
  "version": "0.1.0"
}
```

### 2. MCP Tools List

```bash
curl -X POST https://your-worker-name.your-account.workers.dev/sse \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

### 3. Search Voting Results

```bash
curl -X POST https://your-worker-name.your-account.workers.dev/sse \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "search_voting_results",
      "arguments": {
        "meeting_type": "Council Meeting",
        "top": 10
      }
    }
  }'
```

### 4. Using MCP Inspector

Install and run the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

Then open `http://localhost:5173` and connect to your deployed worker:
```
https://your-worker-name.your-account.workers.dev/sse
```

## Connecting to Claude Desktop

### Option 1: Using mcp-remote Proxy

Update your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "legco-search": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker-name.your-account.workers.dev/sse"
      ]
    }
  }
}
```

### Option 2: Direct Connection (Future)

When Claude Desktop supports remote MCP servers directly:

```json
{
  "mcpServers": {
    "legco-search": {
      "url": "https://your-worker-name.your-account.workers.dev/sse",
      "transport": "sse"
    }
  }
}
```

## Available Tools

Your deployed MCP server provides these tools:

1. **search_voting_results** - Search voting results from LegCo meetings
2. **search_bills** - Search bills from LegCo database
3. **search_questions** - Search oral and written questions
4. **search_hansard** - Search Hansard records (official proceedings)

## Monitoring and Logs

### View Real-time Logs

```bash
npm run tail
# or
wrangler tail
```

### View Deployment Status

```bash
wrangler deployments list
```

### Check Worker Analytics

Visit the Cloudflare Dashboard → Workers & Pages → Your Worker → Analytics

## Troubleshooting

### Common Issues

1. **Python Runtime Not Available**
   - Ensure `compatibility_flags = ["python_workers"]` is in your `wrangler.toml`
   - Python Workers is still in beta, make sure your account has access

2. **CORS Issues**
   - The worker includes CORS headers, but if you have issues, check the browser console
   - Ensure you're making POST requests to the `/sse` endpoint

3. **API Timeouts**
   - LegCo APIs can be slow, increase timeout if needed
   - Consider implementing caching for frequently accessed data

4. **Rate Limiting**
   - Cloudflare Workers have request limits on free tier
   - Consider implementing request caching or upgrading to paid plan

### Debug Mode

Add debug logging by setting environment variables:

```toml
[vars]
ENVIRONMENT = "development"
DEBUG = "true"
```

## Performance Optimization

### Caching Strategy

Consider implementing caching for frequently accessed data:

```python
# Example: Cache responses for 5 minutes
cache_ttl = 300  # 5 minutes
```

### Request Optimization

- Use `$top` parameter to limit response size
- Implement pagination for large datasets
- Filter results server-side when possible

## Security Considerations

1. **Input Validation**: All inputs are sanitized to prevent injection attacks
2. **Rate Limiting**: Consider implementing rate limiting for production use
3. **HTTPS**: All requests are automatically served over HTTPS
4. **CORS**: Configured to allow cross-origin requests

## Cost Considerations

### Cloudflare Workers Pricing

- **Free Tier**: 100,000 requests/day
- **Paid Tier**: $5/month for 10M requests + $0.50/million additional

### LegCo API Usage

- LegCo APIs are free but may have rate limits
- Consider caching responses to reduce API calls

## Next Steps

1. **Add Authentication**: Implement OAuth for user-specific access
2. **Add Caching**: Use Cloudflare KV or R2 for response caching
3. **Add Analytics**: Track usage patterns and popular queries
4. **Add More Tools**: Extend with additional LegCo data sources

## Support

For issues with:
- **Cloudflare Workers**: Check [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- **MCP Protocol**: Check [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- **LegCo APIs**: Check [LegCo Open Data Portal](https://www.legco.gov.hk/odata/english/index.html)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 