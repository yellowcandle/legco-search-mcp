# LegCo Search MCP Server

A **remote Model Context Protocol (MCP) server** deployed on Cloudflare Workers for accessing Hong Kong Legislative Council (LegCo) open data APIs. This server provides AI assistants with comprehensive access to Hong Kong's legislative data through multiple transport protocols.

## 🌟 Features

### **Real-time Access to LegCo Databases**
- **Voting Results Database**: Council meetings, committees, and subcommittees since 2012
- **Bills Database**: Legislative bills since 1844  
- **Questions Database**: Oral and written questions at Council meetings since 2012
- **Hansard Database**: Official records of proceedings since 2012

### **Multiple Transport Protocols**
- **🔗 HTTP Transport**: Simple request/response integration
- **📡 Server-Sent Events (SSE)**: Real-time streaming connections  
- **⚡ WebSocket**: Bidirectional persistent connections

### **Production-Ready Features**
- **🌍 Global Edge Deployment**: Cloudflare Workers for low latency worldwide
- **🛡️ Rate Limiting**: 60 requests per minute per IP
- **🔒 Security**: Input validation, sanitization, CORS support
- **📊 Comprehensive Logging**: Request tracking with unique IDs
- **🚫 No Authentication Required**: Authless API for easy integration

## 🚀 Live Remote MCP Server

The server is **already deployed and ready to use**:

### **Production Endpoints**
- **🔗 HTTP**: `https://legco-search-mcp.herballemon.workers.dev/mcp-http`
- **📡 SSE**: `https://legco-search-mcp.herballemon.workers.dev/sse`
- **⚡ WebSocket**: `wss://legco-search-mcp.herballemon.workers.dev/mcp`
- **💚 Health Check**: `https://legco-search-mcp.herballemon.workers.dev/health`

### **Quick Start - No Installation Required!**

**For Claude Desktop Users:**
1. Open Claude Desktop → **Settings** → **Integrations**
2. Click **"Add Integration"**
3. Enter URL: `https://legco-search-mcp.herballemon.workers.dev/sse`
4. Select **SSE** transport
5. Start using the 4 LegCo search tools immediately!

**For Developers:**
```bash
# Test the API directly
curl -X POST https://legco-search-mcp.herballemon.workers.dev/mcp-http \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list", "id": 1}'
```

## 🛠️ Local Development (Optional)

If you want to run your own instance:

```bash
# Clone and install dependencies
git clone https://github.com/your-repo/legco-search-mcp
cd legco-search-mcp
npm install

# Start development server
npm run dev

# Deploy your own instance
npm run deploy
```

## 🔧 MCP Tools & Functions

The server provides **4 powerful tools** for accessing Hong Kong Legislative Council data:

### **🗳️ 1. `search_voting_results`**
Search voting results from LegCo meetings with detailed vote breakdowns.

**📋 Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `meeting_type` | string | Meeting type | `"Council Meeting"`, `"House Committee"`, `"Finance Committee"` |
| `start_date` | string | Start date (YYYY-MM-DD) | `"2025-06-01"` |
| `end_date` | string | End date (YYYY-MM-DD) | `"2025-06-30"` |
| `member_name` | string | Member name (partial match) | `"Chan"` |
| `motion_keywords` | string | Keywords in motion text | `"healthcare"`, `"budget"` |
| `term_no` | integer | LC term number | `7` (current term) |
| `top` | integer | Max records (1-1000) | `50` |
| `skip` | integer | Records to skip | `0` |
| `format` | string | Response format | `"json"` or `"xml"` |

**🎯 Example Usage:**
```json
{
  "meeting_type": "Council Meeting",
  "start_date": "2025-06-01",
  "end_date": "2025-06-30",
  "motion_keywords": "healthcare financing",
  "top": 10
}
```

**📊 Returns:** Detailed voting records with member votes, vote counts, and results.

### **📜 2. `search_bills`**
Search legislative bills with comprehensive bill information and tracking.

**📋 Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `title_keywords` | string | Keywords in bill titles | `"housing"`, `"tax amendment"` |
| `gazette_year` | integer | Gazette year (1800-2100) | `2025` |
| `gazette_start_date` | string | Start date (YYYY-MM-DD) | `"2025-01-01"` |
| `gazette_end_date` | string | End date (YYYY-MM-DD) | `"2025-12-31"` |
| `top` | integer | Max records (1-1000) | `20` |
| `skip` | integer | Records to skip | `0` |
| `format` | string | Response format | `"json"` or `"xml"` |

**🎯 Example Usage:**
```json
{
  "title_keywords": "Basic Housing Units",
  "gazette_start_date": "2025-06-01",
  "gazette_end_date": "2025-06-30",
  "top": 5
}
```

**📊 Returns:** Bill details, gazette dates, readings, committee information, and current status.

### **❓ 3. `search_questions`**
Search parliamentary questions raised by Members at Council meetings.

**📋 Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `question_type` | string | Question type | `"oral"` or `"written"` |
| `subject_keywords` | string | Keywords in question subjects | `"transport"`, `"education policy"` |
| `member_name` | string | Member who asked question | `"Lee"`, `"Wong"` |
| `meeting_date` | string | Specific meeting date (YYYY-MM-DD) | `"2025-06-12"` |
| `year` | integer | Meeting year (2000-2100) | `2025` |
| `top` | integer | Max records (1-1000) | `30` |
| `skip` | integer | Records to skip | `0` |
| `format` | string | Response format | `"json"` or `"xml"` |

**🎯 Example Usage:**
```json
{
  "question_type": "oral",
  "subject_keywords": "housing policy",
  "year": 2025,
  "top": 20
}
```

**📊 Returns:** Question details, member information, meeting dates, and subject classifications.

### **📰 4. `search_hansard`**
Search official Hansard records of parliamentary proceedings and debates.

**📋 Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `hansard_type` | string | Record type | `"hansard"`, `"questions"`, `"bills"`, `"motions"`, `"voting"` |
| `subject_keywords` | string | Keywords in subjects | `"climate change"`, `"economic policy"` |
| `speaker` | string | Speaker name | `"Secretary for Transport"` |
| `meeting_date` | string | Meeting date (YYYY-MM-DD) | `"2025-06-12"` |
| `year` | integer | Meeting year (2000-2100) | `2025` |
| `question_type` | string | Question type (for questions) | `"Oral"`, `"Written"`, `"Urgent"` |
| `top` | integer | Max records (1-1000) | `100` |
| `skip` | integer | Records to skip | `0` |
| `format` | string | Response format | `"json"` or `"xml"` |

**🎯 Example Usage:**
```json
{
  "hansard_type": "bills",
  "subject_keywords": "Basic Housing Units",
  "year": 2025,
  "top": 10
}
```

**📊 Returns:** Official proceedings, speaker information, debate content, and document links.

## 🔌 MCP Client Integration Guide

### **📱 Claude Desktop**

**⚠️ Important:** For remote MCP servers, Claude Desktop now uses a different configuration method.

**Method 1: Settings UI (Recommended for Remote Servers)**
1. Open Claude Desktop
2. Go to **Settings** > **Integrations**
3. Click **"Add Integration"**
4. Enter the server URL: `https://legco-search-mcp.herballemon.workers.dev/sse`
5. Select **SSE** transport method
6. Save the configuration

**Method 2: Local Configuration (claude_desktop_config.json)**
For local development only:

```json
{
  "mcpServers": {
    "legco-search": {
      "command": "node",
      "args": ["path/to/your/local/server.js"]
    }
  }
}
```

**Note:** Remote MCP servers should be configured through the Claude Desktop Settings UI, not the JSON config file.

### **🌐 Browser-Based MCP Clients**

For web applications, connect directly via SSE or WebSocket:

**Server-Sent Events (SSE):**
```javascript
const eventSource = new EventSource('https://legco-search-mcp.herballemon.workers.dev/sse');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle MCP messages
};
```

**WebSocket Connection:**
```javascript
const ws = new WebSocket('wss://legco-search-mcp.herballemon.workers.dev/mcp');
ws.onopen = () => {
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
};
```

### **⚙️ Custom MCP Clients**

**HTTP Transport (Simple):**
```bash
curl -X POST https://legco-search-mcp.herballemon.workers.dev/mcp-http \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "search_voting_results",
      "arguments": {"top": 5}
    },
    "id": 1
  }'
```

**Python Example:**
```python
import requests

# Initialize connection
response = requests.post(
    'https://legco-search-mcp.herballemon.workers.dev/mcp-http',
    json={
        "method": "initialize",
        "params": {"protocolVersion": "2024-11-05", "capabilities": {}},
        "id": 1
    }
)

# Search voting results
response = requests.post(
    'https://legco-search-mcp.herballemon.workers.dev/mcp-http',
    json={
        "method": "tools/call",
        "params": {
            "name": "search_voting_results",
            "arguments": {
                "start_date": "2025-06-01",
                "end_date": "2025-06-30",
                "top": 10
            }
        },
        "id": 2
    }
)
print(response.json())
```

### **🎯 AI Assistant Integration**

**For ChatGPT/OpenAI:**
Use the HTTP endpoints directly in your application or via function calling.

**For Anthropic Claude:**
Configure the MCP server in your Claude Desktop client or use the API directly.

**For Local AI:**
Connect via any supported MCP transport protocol.

## 📊 Data Coverage & Sources

### **🗓️ Historical Coverage**
- **📜 Bills Database**: **Since 1844** - Complete legislative history
- **🗳️ Voting Results**: **2012-present** - 5th Legislative Council onwards  
- **❓ Questions Database**: **2012-present** - 5th Legislative Council onwards
- **📰 Hansard Records**: **2012-present** - 5th Legislative Council onwards

### **🔗 Source API Endpoints**
The server accesses official LegCo OData APIs:

| Database | Endpoint | Format |
|----------|----------|---------|
| Voting Results | `app.legco.gov.hk/vrdb/odata/vVotingResult` | OData JSON/XML |
| Bills | `app.legco.gov.hk/BillsDB/odata/Vbills` | OData JSON/XML |
| Questions (Oral) | `app.legco.gov.hk/QuestionsDB/odata/ViewOralQuestionsEng` | OData JSON/XML |
| Questions (Written) | `app.legco.gov.hk/QuestionsDB/odata/ViewWrittenQuestionsEng` | OData JSON/XML |
| Hansard | `app.legco.gov.hk/OpenData/HansardDB/Hansard` | OData JSON/XML |

## 🚦 Usage Limits & Performance

- **⚡ Rate Limiting**: 60 requests per minute per IP address
- **📏 Response Size**: Up to 1000 records per request  
- **🌍 Global Availability**: Deployed on Cloudflare Edge network
- **⏱️ Response Time**: Typically under 5 seconds
- **🔄 Retry Logic**: Automatic retries with exponential backoff

## 🎯 Example Queries

### **Real-World Usage Examples**

**💡 Find recent healthcare-related votes:**
```json
{
  "name": "search_voting_results",
  "arguments": {
    "motion_keywords": "healthcare financing",
    "start_date": "2025-06-01",
    "end_date": "2025-06-30",
    "top": 10
  }
}
```

**💡 Track housing legislation progress:**
```json
{
  "name": "search_bills", 
  "arguments": {
    "title_keywords": "Basic Housing Units",
    "gazette_start_date": "2025-01-01",
    "top": 5
  }
}
```

**💡 Research transport policy questions:**
```json
{
  "name": "search_questions",
  "arguments": {
    "subject_keywords": "transport infrastructure",
    "question_type": "oral",
    "year": 2025,
    "top": 20
  }
}
```

**💡 Find bill debate records:**
```json
{
  "name": "search_hansard",
  "arguments": {
    "hansard_type": "bills",
    "subject_keywords": "Basic Housing Units",
    "year": 2025
  }
}
```

## 🛠️ Technical Details

### **🔒 Security Features**
- **Input Sanitization**: All user inputs are sanitized and validated
- **SQL Injection Prevention**: Parameterized queries and input validation
- **Rate Limiting**: Per-IP request limiting with sliding window
- **CORS Support**: Comprehensive cross-origin resource sharing
- **Error Handling**: Graceful error responses with proper HTTP status codes

### **⚡ Architecture**
- **Serverless**: Cloudflare Workers for infinite scalability
- **Edge Computing**: Global deployment for low latency
- **Protocol Support**: HTTP, SSE, WebSocket transports
- **JSON-RPC 2.0**: Full compliance with MCP specification
- **OData Integration**: Native support for LegCo's OData APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is an **unofficial tool** for accessing LegCo open data. For official information, please visit the [Legislative Council website](https://www.legco.gov.hk/).

The data provided by this server comes directly from official LegCo APIs and is intended for research, analysis, and public information purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 🚨 Troubleshooting

### **Common Issues & Solutions**

**❌ Error: "npm ERR! 404 Not Found: @modelcontextprotocol/server-fetch@latest"**
- **Problem**: Trying to use the old JSON config method for remote servers
- **Solution**: Use Claude Desktop's Settings UI instead:
  1. Settings → Integrations → Add Integration
  2. URL: `https://legco-search-mcp.herballemon.workers.dev/sse`
  3. Transport: SSE

**❌ Error: "Server disconnected" or "Transport closed unexpectedly"**
- **Problem**: Incorrect configuration method
- **Solution**: Remote MCP servers must be configured via Settings UI, not `claude_desktop_config.json`

**❌ Error: "Failed to fetch" or CORS errors**
- **Problem**: Browser security restrictions
- **Solution**: Use the SSE endpoint instead of direct HTTP calls from browsers

**✅ Verify Server Status**
```bash
# Check if server is healthy
curl https://legco-search-mcp.herballemon.workers.dev/health

# Test tool listing
curl -X POST https://legco-search-mcp.herballemon.workers.dev/mcp-http \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list", "id": 1}'
```

### **Configuration Validation**

**For Claude Desktop:**
- ✅ Use Settings → Integrations (not JSON config)
- ✅ URL: `https://legco-search-mcp.herballemon.workers.dev/sse`
- ✅ Transport: SSE
- ❌ Don't add remote servers to `claude_desktop_config.json`

**For Developers:**
- ✅ HTTP endpoint: `/mcp-http`
- ✅ SSE endpoint: `/sse`
- ✅ WebSocket endpoint: `/mcp`
- ✅ All endpoints support CORS

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/legco-search-mcp/issues)
- **Documentation**: [CLAUDE.md](CLAUDE.md) for detailed technical documentation
- **Health Check**: [https://legco-search-mcp.herballemon.workers.dev/health](https://legco-search-mcp.herballemon.workers.dev/health)
- **Live Testing**: Use the curl commands above to verify connectivity