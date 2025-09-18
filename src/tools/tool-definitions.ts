// MCP Tool Definitions with Zod schemas
// Enhanced for MCP 2025-06-18 protocol

import { z } from "zod";

// Search Voting Results Tool Schema
export const searchVotingResultsSchema = {
  meeting_type: z.enum([
    'Council Meeting', 'House Committee', 'Finance Committee',
    'Establishment Subcommittee', 'Public Works Subcommittee'
  ]).optional().describe("Type of meeting to filter by"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    .describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    .describe("End date in YYYY-MM-DD format"),
  member_name: z.string().max(100).optional()
    .describe("Name of the member to search for"),
  motion_keywords: z.string().max(500).optional()
    .describe("Keywords to search in motion text (supports multi-word)"),
  term_no: z.number().int().min(1).max(10).optional()
    .describe("Legislative term number"),
  top: z.number().int().min(1).max(1000).default(100)
    .describe("Maximum number of results to return"),
  skip: z.number().int().min(0).default(0)
    .describe("Number of results to skip"),
  format: z.enum(['json', 'xml']).default('json')
    .describe("Response format")
};

// Search Bills Tool Schema
export const searchBillsSchema = {
  title_keywords: z.string().max(500).optional()
    .describe("Keywords to search in bill titles (supports multi-word)"),
  gazette_year: z.number().int().min(1800).max(2100).optional()
    .describe("Year when bill was gazetted"),
  gazette_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    .describe("Gazette start date in YYYY-MM-DD format"),
  gazette_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    .describe("Gazette end date in YYYY-MM-DD format"),
  top: z.number().int().min(1).max(1000).default(100)
    .describe("Maximum number of results to return"),
  skip: z.number().int().min(0).default(0)
    .describe("Number of results to skip"),
  format: z.enum(['json', 'xml']).default('json')
    .describe("Response format")
};

// Search Questions Tool Schema
export const searchQuestionsSchema = {
  question_type: z.enum(['oral', 'written']).default('oral')
    .describe("Type of questions to search"),
  subject_keywords: z.string().max(500).optional()
    .describe("Keywords to search in question subjects (supports multi-word)"),
  member_name: z.string().max(100).optional()
    .describe("Name of the member who asked the question"),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    .describe("Specific meeting date in YYYY-MM-DD format"),
  year: z.number().int().min(2000).max(2100).optional()
    .describe("Year of the meeting"),
  top: z.number().int().min(1).max(1000).default(100)
    .describe("Maximum number of results to return"),
  skip: z.number().int().min(0).default(0)
    .describe("Number of results to skip"),
  format: z.enum(['json', 'xml']).default('json')
    .describe("Response format")
};

// Search Hansard Tool Schema
export const searchHansardSchema = {
  hansard_type: z.enum(['hansard', 'questions', 'bills', 'motions', 'voting']).default('hansard')
    .describe("Type of Hansard records to search"),
  subject_keywords: z.string().max(500).optional()
    .describe("Keywords to search in subjects (supports multi-word, not available for main hansard)"),
  speaker: z.string().max(100).optional()
    .describe("Name of the speaker (available for questions and speeches)"),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    .describe("Specific meeting date in YYYY-MM-DD format"),
  year: z.number().int().min(2000).max(2100).optional()
    .describe("Year of the meeting"),
  question_type: z.enum(['Oral', 'Written', 'Urgent']).optional()
    .describe("Type of questions (only for hansard_questions)"),
  top: z.number().int().min(1).max(1000).default(100)
    .describe("Maximum number of results to return"),
  skip: z.number().int().min(0).default(0)
    .describe("Number of results to skip"),
  format: z.enum(['json', 'xml']).default('json')
    .describe("Response format")
};

// Ping Tool Schema (new in 2025-06-18)
export const pingSchema = {};

// Tool metadata for registration
export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
  handler: (params: any) => Promise<any>;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'search_voting_results',
    description: 'Search voting results from LegCo meetings with enhanced filtering',
    schema: searchVotingResultsSchema,
    handler: async (params) => {
      // Implementation will be provided by the MCP server
      throw new Error('Handler not implemented');
    }
  },
  {
    name: 'search_bills',
    description: 'Search bills from LegCo database with enhanced date filtering',
    schema: searchBillsSchema,
    handler: async (params) => {
      throw new Error('Handler not implemented');
    }
  },
  {
    name: 'search_questions',
    description: 'Search questions at Council meetings with enhanced filtering',
    schema: searchQuestionsSchema,
    handler: async (params) => {
      throw new Error('Handler not implemented');
    }
  },
  {
    name: 'search_hansard',
    description: 'Search Hansard (official records of proceedings) with multiple data sources',
    schema: searchHansardSchema,
    handler: async (params) => {
      throw new Error('Handler not implemented');
    }
  },
  {
    name: 'ping',
    description: 'Check server liveness and get basic server information',
    schema: pingSchema,
    handler: async (params) => {
      throw new Error('Handler not implemented');
    }
  }
];

// Validation helpers
export function validateToolParams(toolName: string, params: any): boolean {
  const toolDef = TOOL_DEFINITIONS.find(t => t.name === toolName);
  if (!toolDef) return false;

  try {
    // Validate each parameter against its schema
    for (const [key, schema] of Object.entries(toolDef.schema)) {
      if (params[key] !== undefined) {
        schema.parse(params[key]);
      }
    }
    return true;
  } catch (error) {
    console.error(`Validation failed for tool ${toolName}:`, error);
    return false;
  }
}

export function getToolSchema(toolName: string): Record<string, z.ZodTypeAny> | null {
  const toolDef = TOOL_DEFINITIONS.find(t => t.name === toolName);
  return toolDef ? toolDef.schema : null;
}

export function getToolDescription(toolName: string): string | null {
  const toolDef = TOOL_DEFINITIONS.find(t => t.name === toolName);
  return toolDef ? toolDef.description : null;
}