# LegCo Search MCP Server

A Model Context Protocol (MCP) server for accessing Hong Kong Legislative Council (LegCo) open data APIs.

## Features

This MCP server provides access to the following LegCo databases:

- **Voting Results**: Access voting results from Council meetings, House Committee, Finance Committee, and Subcommittees
- **Bills Database**: Search and retrieve information about bills considered by the Council since 1844
- **Questions Database**: Access oral and written questions raised by Members at Council meetings
- **Hansard Database**: Official records of proceedings, including questions, bills, motions, and voting results

## Deployment Options

### Option 1: Local MCP Server (Original)

Install and run locally as a traditional MCP server:

```bash
pip install -e .
legco-search-mcp
```

### Option 2: Cloudflare Workers (New!)

Deploy to Cloudflare Workers for global access and scalability:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to Cloudflare
wrangler deploy
```

See [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) for detailed instructions.

## Installation

### For Local Development

```bash
pip install -e .
```

### For Cloudflare Workers

```bash
npm install
```

## Usage

### Local MCP Server

```bash
legco-search-mcp
```

### Cloudflare Workers

After deployment, your server will be available at:
```
https://your-worker-name.your-account.workers.dev/sse
```

### Available Tools

#### 1. `search_voting_results`
Search voting results from LegCo meetings.

**Parameters:**
- `meeting_type`: Type of meeting (Council Meeting, House Committee, Finance Committee, etc.)
- `start_date`: Start date in YYYY-MM-DD format
- `end_date`: End date in YYYY-MM-DD format
- `member_name`: Name of member (partial match)
- `motion_keywords`: Keywords to search in motion text
- `term_no`: Legislative Council term number (5, 6, 7)
- `top`: Number of records to return (default 100)
- `skip`: Number of records to skip (default 0)
- `format`: Return format ('json' or 'xml')

**Example:**
```json
{
  "meeting_type": "Council Meeting",
  "start_date": "2023-01-01",
  "motion_keywords": "budget",
  "top": 50
}
```

#### 2. `search_bills`
Search bills from LegCo database.

**Parameters:**
- `title_keywords`: Keywords to search in bill titles
- `gazette_year`: Year when bill was gazetted
- `gazette_start_date`: Start date in YYYY-MM-DD format
- `gazette_end_date`: End date in YYYY-MM-DD format
- `top`: Number of records to return (default 100)
- `skip`: Number of records to skip (default 0)
- `format`: Return format ('json' or 'xml')

**Example:**
```json
{
  "title_keywords": "election",
  "gazette_year": 2023,
  "top": 20
}
```

#### 3. `search_questions`
Search questions at Council meetings.

**Parameters:**
- `question_type`: Type of question ('oral' or 'written')
- `subject_keywords`: Keywords to search in question subjects
- `member_name`: Name of member who asked the question
- `meeting_date`: Meeting date in YYYY-MM-DD format
- `year`: Year of the meeting
- `top`: Number of records to return (default 100)
- `skip`: Number of records to skip (default 0)
- `format`: Return format ('json' or 'xml')

**Example:**
```json
{
  "question_type": "oral",
  "subject_keywords": "housing",
  "year": 2023,
  "top": 30
}
```

#### 4. `search_hansard`
Search Hansard (official records of proceedings).

**Parameters:**
- `hansard_type`: Type of Hansard record ('hansard', 'questions', 'bills', 'motions', 'voting')
- `subject_keywords`: Keywords to search in subjects
- `speaker`: Name of speaker
- `meeting_date`: Meeting date in YYYY-MM-DD format
- `year`: Year of the meeting
- `question_type`: For questions: 'Oral', 'Written', 'Urgent'
- `top`: Number of records to return (default 100)
- `skip`: Number of records to skip (default 0)
- `format`: Return format ('json' or 'xml')

**Example:**
```json
{
  "hansard_type": "questions",
  "question_type": "Oral",
  "subject_keywords": "transport",
  "year": 2023
}
```

## Configuration

### Local MCP Settings

Add this server to your MCP settings configuration:

```json
{
  "mcpServers": {
    "legco-search": {
      "command": "legco-search-mcp",
      "env": {}
    }
  }
}
```

### Remote MCP Settings (Cloudflare Workers)

For remote deployment, use the mcp-remote proxy:

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

### Claude Desktop Configuration

For Claude Desktop, add to your `claude_desktop_config.json`:

**Local Server:**
```json
{
  "mcpServers": {
    "legco-search": {
      "command": "legco-search-mcp"
    }
  }
}
```

**Remote Server (Cloudflare Workers):**
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

## API Endpoints

This server accesses the following LegCo open data endpoints:

- **Voting Results**: `https://app.legco.gov.hk/vrdb/odata/vVotingResult`
- **Bills**: `https://app.legco.gov.hk/BillsDB/odata/Vbills`
- **Questions (Oral)**: `https://app.legco.gov.hk/QuestionsDB/odata/ViewOralQuestionsEng`
- **Questions (Written)**: `https://app.legco.gov.hk/QuestionsDB/odata/ViewWrittenQuestionsEng`
- **Hansard**: `https://app.legco.gov.hk/OpenData/HansardDB/Hansard`

## Data Coverage

- **Voting Results**: Fifth Legislative Council onwards (2012-present)
- **Bills**: Since 1844
- **Questions**: Fifth Legislative Council onwards (2012-present)
- **Hansard**: Fifth Legislative Council onwards (2012-present)

## License

This project is licensed under the MIT License.

## Disclaimer

This is an unofficial tool for accessing LegCo open data. For official information, please visit the [Legislative Council website](https://www.legco.gov.hk/).