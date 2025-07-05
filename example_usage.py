#!/usr/bin/env python3
"""Example usage of the LegCo Search MCP server."""

import asyncio
import json
from datetime import datetime, timedelta


async def example_usage():
    """Demonstrate how to use the LegCo Search MCP tools."""
    
    # Note: This is a demonstration of the tool parameters
    # In actual usage, these would be called through the MCP protocol
    
    print("=== LegCo Search MCP Server Examples ===\n")
    
    # Example 1: Search recent voting results
    print("1. Search voting results from Council meetings in 2023:")
    voting_params = {
        "meeting_type": "Council Meeting",
        "start_date": "2023-01-01",
        "end_date": "2023-12-31",
        "top": 10
    }
    print(f"Parameters: {json.dumps(voting_params, indent=2)}")
    print()
    
    # Example 2: Search bills with specific keywords
    print("2. Search bills containing 'election' or 'electoral':")
    bills_params = {
        "title_keywords": "election",
        "gazette_year": 2023,
        "top": 5
    }
    print(f"Parameters: {json.dumps(bills_params, indent=2)}")
    print()
    
    # Example 3: Search oral questions about housing
    print("3. Search oral questions about housing:")
    questions_params = {
        "question_type": "oral",
        "subject_keywords": "housing",
        "year": 2023,
        "top": 15
    }
    print(f"Parameters: {json.dumps(questions_params, indent=2)}")
    print()
    
    # Example 4: Search Hansard records
    print("4. Search Hansard questions from specific speaker:")
    hansard_params = {
        "hansard_type": "questions",
        "question_type": "Oral",
        "speaker": "LAM Tai-fai",
        "year": 2023,
        "top": 10
    }
    print(f"Parameters: {json.dumps(hansard_params, indent=2)}")
    print()
    
    # Example 5: Search voting results for specific motion keywords
    print("5. Search voting results containing 'budget' or 'appropriation':")
    motion_search_params = {
        "motion_keywords": "budget",
        "term_no": 7,  # Current term
        "top": 20
    }
    print(f"Parameters: {json.dumps(motion_search_params, indent=2)}")
    print()
    
    print("=== Configuration Examples ===\n")
    
    # MCP Configuration example
    print("MCP Server Configuration (claude_desktop_config.json):")
    mcp_config = {
        "mcpServers": {
            "legco-search": {
                "command": "legco-search-mcp"
            }
        }
    }
    print(json.dumps(mcp_config, indent=2))
    print()
    
    print("=== Available Meeting Types ===")
    meeting_types = [
        "Council Meeting",
        "House Committee", 
        "Finance Committee",
        "Establishment Subcommittee",
        "Public Works Subcommittee"
    ]
    for mt in meeting_types:
        print(f"- {mt}")
    print()
    
    print("=== Available Hansard Types ===")
    hansard_types = [
        "hansard - Official records of proceedings",
        "questions - Questions to Government",
        "bills - Government bills or Members' bills",
        "motions - Government motions or Members' motions", 
        "voting - Voting results"
    ]
    for ht in hansard_types:
        print(f"- {ht}")
    print()
    
    print("=== Question Types ===")
    question_types = [
        "oral - Oral questions",
        "written - Written questions",
        "Urgent - Urgent questions (Hansard only)"
    ]
    for qt in question_types:
        print(f"- {qt}")


if __name__ == "__main__":
    asyncio.run(example_usage())