# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a FastMCP server that provides access to Hong Kong Legislative Council (LegCo) open data APIs through the Model Context Protocol (MCP). The server enables AI assistants to search and retrieve information from:

- **Voting Results Database**: Council meetings, committees, and subcommittees since 2012
- **Bills Database**: Legislative bills since 1844
- **Questions Database**: Oral and written questions at Council meetings since 2012  
- **Hansard Database**: Official records of proceedings since 2012

## Development Commands

### Package Management
```bash
# Install dependencies
uv add <package>

# Remove dependencies  
uv remove <package>

# Sync environment
uv sync

# Run commands in virtual environment
uv run <command>
```

### Testing and Development
```bash
# Run the test suite
uv run python test_server.py

# Start the MCP server (for testing - will run indefinitely)
uv run legco-search-mcp

# Install in development mode
uv pip install -e .

# Check code can import without errors
uv run python -c "from src.legco_search_mcp.server import LegCoSearchMCP; print('Import successful')"
```

### Building and Distribution
```bash
# Build the package
uv build

# Install from built package
uv pip install dist/legco_search_mcp-*.whl
```

## Architecture

### Core Components

**`src/legco_search_mcp/server.py`** - Main MCP server implementation:
- `LegCoSearchMCP`: Main server class with context manager support
- `_register_tools()`: Registers 4 main MCP tools (voting, bills, questions, hansard)
- `_search_odata_endpoint()`: Core method that builds OData queries and handles API requests
- Security: Input sanitization, validation, and SQL injection prevention

**MCP Tools Provided:**
1. `search_voting_results`: Search voting records with meeting type, date, member filters
2. `search_bills`: Search bills with title keywords, gazette dates
3. `search_questions`: Search oral/written questions with subject/member filters  
4. `search_hansard`: Search official proceedings by type (hansard/questions/bills/motions/voting)

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

### MCP Client Setup
Add to Claude Desktop configuration:
```json
{
  "mcpServers": {
    "legco-search": {
      "command": "legco-search-mcp"
    }
  }
}
```

### Environment Requirements
- Python ≥3.10 (required by FastMCP)
- Dependencies managed via UV package manager
- Network access to LegCo API endpoints

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