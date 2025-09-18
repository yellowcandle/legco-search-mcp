// Cloudflare Agents SDK MCP Server for LegCo Search
// Updated to MCP 2025-06-18 with enhanced features

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const BASE_URLS: Record<string, string> = {
  voting: 'https://app.legco.gov.hk/vrdb/odata/vVotingResult',
  bills: 'https://app.legco.gov.hk/BillsDB/odata/Vbills',
  questions_oral: 'https://app.legco.gov.hk/QuestionsDB/odata/ViewOralQuestionsEng',
  questions_written: 'https://app.legco.gov.hk/QuestionsDB/odata/ViewWrittenQuestionsEng',
  hansard: 'https://app.legco.gov.hk/OpenData/HansardDB/Hansard',
  hansard_questions: 'https://app.legco.gov.hk/OpenData/HansardDB/Questions',
  hansard_bills: 'https://app.legco.gov.hk/OpenData/HansardDB/Bills',
  hansard_motions: 'https://app.legco.gov.hk/OpenData/HansardDB/Motions',
  hansard_voting: 'https://app.legco.gov.hk/OpenData/HansardDB/VotingResults',
  hansard_speeches: 'https://app.legco.gov.hk/OpenData/HansardDB/Speeches',
  hansard_rundown: 'https://app.legco.gov.hk/OpenData/HansardDB/Rundown',
};

// --- Error Classes ---
class LegCoAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'LegCoAPIError';
  }
}

class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// --- Enhanced Logging ---
interface LogContext {
  endpoint?: string;
  ip?: string;
  method?: string;
  params?: Record<string, any>;
  error?: Error;
  timestamp?: string;
  requestId?: string;
  dateStr?: string;
  value?: any;
  attempt?: number;
  maxRetries?: number;
  url?: string;
  count?: number;
  limit?: number;
  toolName?: string;
  headers?: Record<string, string>;
  allowed?: any[];
  min?: number;
  max?: number;
  original?: string;
  sanitized?: string;
  keywords?: string;
  speaker?: string;
  fullUrl?: string;
  status?: number;
  statusText?: string;
  errorText?: string;
  data?: any;
}

function logError(message: string, context: LogContext = {}): void {
  const logEntry = {
    level: 'ERROR',
    message,
    timestamp: new Date().toISOString(),
    requestId: context.requestId || crypto.randomUUID(),
    ...context
  };
  console.error(JSON.stringify(logEntry));
}

function logWarning(message: string, context: LogContext = {}): void {
  const logEntry = {
    level: 'WARNING',
    message,
    timestamp: new Date().toISOString(),
    requestId: context.requestId || crypto.randomUUID(),
    ...context
  };
  console.warn(JSON.stringify(logEntry));
}

function logInfo(message: string, context: LogContext = {}): void {
  const logEntry = {
    level: 'INFO',
    message,
    timestamp: new Date().toISOString(),
    requestId: context.requestId || crypto.randomUUID(),
    ...context
  };
  console.log(JSON.stringify(logEntry));
}

// --- Enhanced Utility Functions ---
function validateDateFormat(dateStr?: string): boolean {
  if (!dateStr) return true;
  try {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && dateStr === date.toISOString().split('T')[0];
  } catch (error) {
    logError('Date validation failed', { error: error as Error, dateStr });
    return false;
  }
}

function sanitizeString(value?: string): string {
  if (!value) return '';
  try {
    // Remove potentially dangerous characters but preserve spaces and common punctuation
    // Allow: letters, numbers, spaces, hyphens, periods, commas, parentheses, apostrophes
    const sanitized = value
      .replace(/[^\w\s\-.,()[\]'"&]/g, '') // Allow more safe characters including quotes and ampersand
      .replace(/'/g, "''")
      .trim()
      .slice(0, 500);
    
    // Log the sanitization for debugging
    if (value !== sanitized) {
      logInfo('String sanitized', { original: value, sanitized });
    }
    
    return sanitized;
  } catch (error) {
    logError('String sanitization failed', { error: error as Error, value });
    return '';
  }
}

function validateEnum<T>(value: T, allowed: T[]): boolean {
  try {
    return allowed.includes(value);
  } catch (error) {
    logError('Enum validation failed', { error: error as Error, value, allowed });
    return false;
  }
}

function validateInteger(value: any, min?: number, max?: number): boolean {
  try {
    if (typeof value !== 'number') return false;
    if (!Number.isInteger(value)) return false;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  } catch (error) {
    logError('Integer validation failed', { error: error as Error, value, min, max });
    return false;
  }
}

// --- Enhanced OData Query Builder ---
function buildODataQuery(endpoint: string, params: Record<string, any>): Record<string, string> {
  const query: Record<string, string> = {};
  const filters: string[] = [];
  
  try {
    // Format parameter
    if (params.format === 'xml') query['$format'] = 'xml';
    
    // Pagination parameters
    if (params.top !== undefined) query['$top'] = String(params.top);
    if (params.skip !== undefined) query['$skip'] = String(params.skip);
    query['$inlinecount'] = 'allpages';
    
    // Build endpoint-specific filters
    switch (endpoint) {
      case 'voting':
        if (params.meeting_type) filters.push(`type eq '${sanitizeString(params.meeting_type)}'`);
        if (params.start_date) filters.push(`start_date ge datetime'${params.start_date}'`);
        if (params.end_date) filters.push(`start_date le datetime'${params.end_date}'`);
        if (params.member_name) filters.push(`substringof('${sanitizeString(params.member_name)}', name_en)`);
        if (params.motion_keywords) {
          const keywords = sanitizeString(params.motion_keywords);
          if (keywords) {
            const words = keywords.split(/\s+/).filter(w => w.length > 0);
            if (words.length === 1) {
              filters.push(`substringof('${words[0]}', motion_en)`);
            } else {
              const wordFilters = words.map(word => `substringof('${word}', motion_en)`);
              filters.push(`(${wordFilters.join(' and ')})`);
            }
          }
        }
        if (params.term_no) filters.push(`term_no eq ${params.term_no}`);
        break;
        
      case 'bills':
        if (params.title_keywords) {
          const keywords = sanitizeString(params.title_keywords);
          if (keywords) {
            const words = keywords.split(/\s+/).filter(w => w.length > 0);
            if (words.length === 1) {
              filters.push(`substringof('${words[0]}', bill_title_eng)`);
            } else {
              const wordFilters = words.map(word => `substringof('${word}', bill_title_eng)`);
              filters.push(`(${wordFilters.join(' and ')})`);
            }
          }
        }
        if (params.gazette_year) filters.push(`year(bill_gazette_date) eq ${params.gazette_year}`);
        if (params.gazette_start_date) filters.push(`bill_gazette_date ge datetime'${params.gazette_start_date}'`);
        if (params.gazette_end_date) filters.push(`bill_gazette_date le datetime'${params.gazette_end_date}'`);
        break;
        
      case 'questions_oral':
      case 'questions_written':
        if (params.subject_keywords) {
          const keywords = sanitizeString(params.subject_keywords);
          if (keywords) {
            // For multi-word searches, split and create multiple substring filters
            const words = keywords.split(/\s+/).filter(w => w.length > 0);
            if (words.length === 1) {
              filters.push(`substringof('${words[0]}', SubjectName)`);
            } else {
              // Multiple words - all must be present (AND logic)
              const wordFilters = words.map(word => `substringof('${word}', SubjectName)`);
              filters.push(`(${wordFilters.join(' and ')})`);
            }
          }
        }
        if (params.member_name) filters.push(`substringof('${sanitizeString(params.member_name)}', MemberName)`);
        if (params.meeting_date) filters.push(`MeetingDate eq datetime'${params.meeting_date}'`);
        if (params.year) filters.push(`year(MeetingDate) eq ${params.year}`);
        break;
        
      default:
        if (endpoint.startsWith('hansard')) {
          // Handle different hansard endpoints with different field structures
          if (params.subject_keywords) {
            const keywords = sanitizeString(params.subject_keywords);
            if (keywords) {
              const words = keywords.split(/\s+/).filter(w => w.length > 0);
              if (endpoint === 'hansard') {
                // Main hansard endpoint doesn't have Subject field, skip subject_keywords
                logWarning('Subject keywords not supported for main hansard endpoint', { endpoint, keywords });
              } else {
                // Other hansard endpoints have Subject field
                if (words.length === 1) {
                  filters.push(`substringof('${words[0]}', Subject)`);
                } else {
                  const wordFilters = words.map(word => `substringof('${word}', Subject)`);
                  filters.push(`(${wordFilters.join(' and ')})`);
                }
              }
            }
          }
          
          // Speaker field handling varies by endpoint
          if (params.speaker) {
            const speakerName = sanitizeString(params.speaker);
            if (endpoint === 'hansard_questions' || endpoint === 'hansard_speeches') {
              filters.push(`substringof('${speakerName}', Speaker)`);
            } else if (endpoint === 'hansard_rundown') {
              // Rundown uses SpeakerID, need to handle differently
              logWarning('Speaker search by name not directly supported for rundown endpoint', { endpoint, speaker: speakerName });
            }
          }
          
          if (params.meeting_date) filters.push(`MeetingDate eq datetime'${params.meeting_date}'`);
          if (params.year) filters.push(`year(MeetingDate) eq ${params.year}`);
          
          // Question type only applies to hansard_questions
          if (params.question_type && endpoint === 'hansard_questions') {
            filters.push(`QuestionType eq '${sanitizeString(params.question_type)}'`);
            filters.push(`HansardType eq 'English'`);
          }
        }
    }
    
    if (filters.length) query['$filter'] = filters.join(' and ');
    
  } catch (error) {
    logError('OData query building failed', { error: error as Error, endpoint, params });
    throw new LegCoAPIError('Failed to build query parameters', undefined, endpoint, error as Error);
  }
  
  return query;
}

// --- Enhanced HTTP Client with Retry Logic ---
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Don't retry on client errors (4xx), only on server errors (5xx) and network issues
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      logWarning(`Request failed, retrying in ${delay}ms`, { 
        attempt, 
        maxRetries, 
        error: error as Error, 
        url 
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

async function fetchOData(endpoint: string, params: Record<string, any>, requestId?: string): Promise<any> {
  const context: LogContext = { endpoint, params, requestId };
  
  try {
    const url = BASE_URLS[endpoint];
    if (!url) {
      throw new LegCoAPIError(`Unknown endpoint: ${endpoint}`, 400, endpoint);
    }
    
    const query = buildODataQuery(endpoint, params);
    const queryString = new URLSearchParams(query).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    const headers: Record<string, string> = {
      'User-Agent': 'LegCo-Search-MCP/1.0',
      'Accept': params.format === 'xml' ? 'application/xml' : 'application/json',
      'Accept-Charset': 'utf-8',
      'Cache-Control': 'no-cache'
    };
    
    logInfo('Making API request', { ...context, url: fullUrl, headers });
    
    logInfo('Final request URL', { ...context, fullUrl });
    
    const response = await fetchWithRetry(fullUrl, { 
      method: 'GET', 
      headers 
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logError('API request failed with non-OK status', {
        ...context,
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.slice(0, 500), // Limit error text length
        url: fullUrl
      });
      throw new LegCoAPIError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        endpoint,
        new Error(errorText)
      );
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (params.format === 'xml') {
      const text = await response.text();
      return {
        data: text,
        format: 'xml',
        content_type: contentType,
        status: response.status
      };
    } else {
      const data = await response.json();
      const result = data as Record<string, any>;
      result._metadata = {
        status: response.status,
        content_type: contentType,
        endpoint,
        params
      };
      return result;
    }
    
  } catch (error) {
    logError('OData fetch failed', { ...context, error: error as Error });
    
    if (error instanceof LegCoAPIError) {
      throw error;
    }
    
    throw new LegCoAPIError(
      `Failed to fetch data from ${endpoint}: ${(error as Error).message}`,
      undefined,
      endpoint,
      error as Error
    );
  }
}

// --- Enhanced Rate Limiting ---
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60; // seconds
const rateLimitMap: Map<string, { window: number; count: number }> = new Map();

function checkRateLimit(ip: string): boolean {
  try {
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / RATE_LIMIT_WINDOW);
    const key = `${ip}:${window}`;
    const entry = rateLimitMap.get(key);
    
    if (entry) {
      if (entry.count >= RATE_LIMIT) {
        logWarning('Rate limit exceeded', { ip, count: entry.count, limit: RATE_LIMIT });
        return false;
      }
      entry.count++;
    } else {
      rateLimitMap.set(key, { window, count: 1 });
    }
    
    // Clean up old entries periodically
    if (rateLimitMap.size > 10000) {
      const currentWindow = window;
      for (const [k, v] of rateLimitMap.entries()) {
        if (v.window < currentWindow - 1) { // Keep current and previous window
          rateLimitMap.delete(k);
        }
      }
    }
    
    return true;
  } catch (error) {
    logError('Rate limit check failed', { error: error as Error, ip });
    return true; // Fail open
  }
}

// --- Enhanced Validation Functions ---
function validateSearchVotingParams(params: Record<string, any>): void {
  if (params.meeting_type && !validateEnum(params.meeting_type, [
    'Council Meeting', 'House Committee', 'Finance Committee', 'Establishment Subcommittee', 'Public Works Subcommittee'
  ])) {
    throw new ValidationError(`Invalid meeting_type: ${params.meeting_type}`, 'meeting_type');
  }
  
  if (params.start_date && !validateDateFormat(params.start_date)) {
    throw new ValidationError(`Invalid start_date format: ${params.start_date}. Use YYYY-MM-DD`, 'start_date');
  }
  
  if (params.end_date && !validateDateFormat(params.end_date)) {
    throw new ValidationError(`Invalid end_date format: ${params.end_date}. Use YYYY-MM-DD`, 'end_date');
  }
  
  if (params.term_no && !validateInteger(params.term_no, 1)) {
    throw new ValidationError(`Invalid term_no: ${params.term_no}. Must be a positive integer`, 'term_no');
  }
  
  if (params.top !== undefined && !validateInteger(params.top, 1, 1000)) {
    throw new ValidationError(`Invalid top: ${params.top}. Must be between 1 and 1000`, 'top');
  }
  
  if (params.skip !== undefined && !validateInteger(params.skip, 0)) {
    throw new ValidationError(`Invalid skip: ${params.skip}. Must be non-negative`, 'skip');
  }
  
  if (params.format && !validateEnum(params.format, ['json', 'xml'])) {
    throw new ValidationError(`Invalid format: ${params.format}. Must be 'json' or 'xml'`, 'format');
  }
}

function validateSearchBillsParams(params: Record<string, any>): void {
  if (params.gazette_year && !validateInteger(params.gazette_year, 1800, 2100)) {
    throw new ValidationError(`Invalid gazette_year: ${params.gazette_year}. Must be between 1800 and 2100`, 'gazette_year');
  }
  
  if (params.gazette_start_date && !validateDateFormat(params.gazette_start_date)) {
    throw new ValidationError(`Invalid gazette_start_date format: ${params.gazette_start_date}. Use YYYY-MM-DD`, 'gazette_start_date');
  }
  
  if (params.gazette_end_date && !validateDateFormat(params.gazette_end_date)) {
    throw new ValidationError(`Invalid gazette_end_date format: ${params.gazette_end_date}. Use YYYY-MM-DD`, 'gazette_end_date');
  }
  
  if (params.top !== undefined && !validateInteger(params.top, 1, 1000)) {
    throw new ValidationError(`Invalid top: ${params.top}. Must be between 1 and 1000`, 'top');
  }
  
  if (params.skip !== undefined && !validateInteger(params.skip, 0)) {
    throw new ValidationError(`Invalid skip: ${params.skip}. Must be non-negative`, 'skip');
  }
  
  if (params.format && !validateEnum(params.format, ['json', 'xml'])) {
    throw new ValidationError(`Invalid format: ${params.format}. Must be 'json' or 'xml'`, 'format');
  }
}

function validateSearchQuestionsParams(params: Record<string, any>): void {
  const qtype = params.question_type ?? 'oral';
  if (!validateEnum(qtype, ['oral', 'written'])) {
    throw new ValidationError(`Invalid question_type: ${qtype}. Must be 'oral' or 'written'`, 'question_type');
  }
  
  if (params.meeting_date && !validateDateFormat(params.meeting_date)) {
    throw new ValidationError(`Invalid meeting_date format: ${params.meeting_date}. Use YYYY-MM-DD`, 'meeting_date');
  }
  
  if (params.year && !validateInteger(params.year, 2000, 2100)) {
    throw new ValidationError(`Invalid year: ${params.year}. Must be between 2000 and 2100`, 'year');
  }
  
  if (params.top !== undefined && !validateInteger(params.top, 1, 1000)) {
    throw new ValidationError(`Invalid top: ${params.top}. Must be between 1 and 1000`, 'top');
  }
  
  if (params.skip !== undefined && !validateInteger(params.skip, 0)) {
    throw new ValidationError(`Invalid skip: ${params.skip}. Must be non-negative`, 'skip');
  }
  
  if (params.format && !validateEnum(params.format, ['json', 'xml'])) {
    throw new ValidationError(`Invalid format: ${params.format}. Must be 'json' or 'xml'`, 'format');
  }
}

function validateSearchHansardParams(params: Record<string, any>): void {
  const htype = params.hansard_type ?? 'hansard';
  if (!validateEnum(htype, ['hansard', 'questions', 'bills', 'motions', 'voting'])) {
    throw new ValidationError(`Invalid hansard_type: ${htype}. Must be one of: hansard, questions, bills, motions, voting`, 'hansard_type');
  }
  
  if (params.meeting_date && !validateDateFormat(params.meeting_date)) {
    throw new ValidationError(`Invalid meeting_date format: ${params.meeting_date}. Use YYYY-MM-DD`, 'meeting_date');
  }
  
  if (params.year && !validateInteger(params.year, 2000, 2100)) {
    throw new ValidationError(`Invalid year: ${params.year}. Must be between 2000 and 2100`, 'year');
  }
  
  if (params.question_type && !validateEnum(params.question_type, ['Oral', 'Written', 'Urgent'])) {
    throw new ValidationError(`Invalid question_type: ${params.question_type}. Must be 'Oral', 'Written', or 'Urgent'`, 'question_type');
  }
  
  if (params.top !== undefined && !validateInteger(params.top, 1, 1000)) {
    throw new ValidationError(`Invalid top: ${params.top}. Must be between 1 and 1000`, 'top');
  }
  
  if (params.skip !== undefined && !validateInteger(params.skip, 0)) {
    throw new ValidationError(`Invalid skip: ${params.skip}. Must be non-negative`, 'skip');
  }
  
  if (params.format && !validateEnum(params.format, ['json', 'xml'])) {
    throw new ValidationError(`Invalid format: ${params.format}. Must be 'json' or 'xml'`, 'format');
  }
}

// --- Enhanced MCP Tool Implementations ---
async function searchVotingResults(params: Record<string, any>, requestId?: string): Promise<any> {
  try {
    validateSearchVotingParams(params);
    return await fetchOData('voting', params, requestId);
  } catch (error) {
    logError('Search voting results failed', { error: error as Error, params, requestId });
    throw error;
  }
}

async function searchBills(params: Record<string, any>, requestId?: string): Promise<any> {
  try {
    validateSearchBillsParams(params);
    return await fetchOData('bills', params, requestId);
  } catch (error) {
    logError('Search bills failed', { error: error as Error, params, requestId });
    throw error;
  }
}

async function searchQuestions(params: Record<string, any>, requestId?: string): Promise<any> {
  try {
    validateSearchQuestionsParams(params);
    const qtype = params.question_type ?? 'oral';
    const endpoint = qtype === 'oral' ? 'questions_oral' : 'questions_written';
    return await fetchOData(endpoint, params, requestId);
  } catch (error) {
    logError('Search questions failed', { error: error as Error, params, requestId });
    throw error;
  }
}

async function searchHansard(params: Record<string, any>, requestId?: string): Promise<any> {
  try {
    validateSearchHansardParams(params);
    const htype = params.hansard_type ?? 'hansard';
    const endpointMap: Record<string, string> = {
      hansard: 'hansard',
      questions: 'hansard_questions',
      bills: 'hansard_bills',
      motions: 'hansard_motions',
      voting: 'hansard_voting',
    };
    const endpoint = endpointMap[htype] || 'hansard';
    return await fetchOData(endpoint, params, requestId);
  } catch (error) {
    logError('Search hansard failed', { error: error as Error, params, requestId });
    throw error;
  }
}

// --- CORS Headers Helper ---
function getCORSHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Accept, Accept-Encoding, Accept-Language, User-Agent, Referer, Origin, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'false',
    'Vary': 'Origin',
  };
}

// --- Enhanced Error Response Function ---
function createErrorResponse(error: Error, requestId?: string): Response {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An internal server error occurred';
  
  if (error instanceof ValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error instanceof LegCoAPIError) {
    statusCode = error.statusCode || 500;
    errorCode = 'API_ERROR';
    message = error.message;
  } else if (error instanceof RateLimitError) {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    message = error.message;
  }
  
  const errorResponse = {
    error: {
      code: errorCode,
      message,
      requestId,
      timestamp: new Date().toISOString()
    }
  };
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getCORSHeaders(),
  };
  
  if (error instanceof RateLimitError && error.retryAfter) {
    headers['Retry-After'] = String(error.retryAfter);
  }
  
  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers
  });
}

// --- SSE Handler ---
async function handleSSE(request: Request, requestId: string): Promise<Response> {
  try {
    // For SSE, we need to handle JSON-RPC over HTTP
    // This is a simplified implementation
    if (request.method === 'POST') {
      return handleHTTPMCP(request, requestId);
    }

    // For GET requests, establish SSE connection
    const response = new Response(
      `data: ${JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        method: 'connection/established',
        params: { requestId }
      })}\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
    return response;
  } catch (error) {
    logError('SSE handler failed', { error: error as Error, requestId });
    return createErrorResponse(error as Error, requestId);
  }
}

// --- HTTP MCP Handler ---
async function handleHTTPMCP(request: Request, requestId: string): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({})) as any;
    const { method, params, id } = body;

    let response: any;

    switch (method) {
      case 'initialize':
        response = {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2025-06-18',
            capabilities: {
              tools: { listChanged: true },
              logging: {}
            },
            serverInfo: {
              name: 'legco-search-mcp',
              version: '0.2.0'
            }
          }
        };
        break;

      case 'tools/list':
        response = {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'search_voting_results',
                description: 'Search voting results from LegCo meetings',
                inputSchema: {
                  type: 'object',
                  properties: {
                    meeting_type: { type: 'string' },
                    start_date: { type: 'string' },
                    end_date: { type: 'string' },
                    member_name: { type: 'string' },
                    motion_keywords: { type: 'string' },
                    term_no: { type: 'integer' },
                    top: { type: 'integer', default: 100 },
                    skip: { type: 'integer', default: 0 },
                    format: { type: 'string', default: 'json' }
                  }
                }
              },
              {
                name: 'search_bills',
                description: 'Search bills from LegCo database',
                inputSchema: {
                  type: 'object',
                  properties: {
                    title_keywords: { type: 'string' },
                    gazette_year: { type: 'integer' },
                    gazette_start_date: { type: 'string' },
                    gazette_end_date: { type: 'string' },
                    top: { type: 'integer', default: 100 },
                    skip: { type: 'integer', default: 0 },
                    format: { type: 'string', default: 'json' }
                  }
                }
              },
              {
                name: 'search_questions',
                description: 'Search questions at Council meetings',
                inputSchema: {
                  type: 'object',
                  properties: {
                    question_type: { type: 'string', default: 'oral' },
                    subject_keywords: { type: 'string' },
                    member_name: { type: 'string' },
                    meeting_date: { type: 'string' },
                    year: { type: 'integer' },
                    top: { type: 'integer', default: 100 },
                    skip: { type: 'integer', default: 0 },
                    format: { type: 'string', default: 'json' }
                  }
                }
              },
              {
                name: 'search_hansard',
                description: 'Search Hansard (official records of proceedings)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    hansard_type: { type: 'string', default: 'hansard' },
                    subject_keywords: { type: 'string' },
                    speaker: { type: 'string' },
                    meeting_date: { type: 'string' },
                    year: { type: 'integer' },
                    question_type: { type: 'string' },
                    top: { type: 'integer', default: 100 },
                    skip: { type: 'integer', default: 0 },
                    format: { type: 'string', default: 'json' }
                  }
                }
              }
            ]
          }
        };
        break;

      case 'tools/call':
        const toolName = params?.name;
        const arguments_ = params?.arguments || {};

        if (!toolName) {
          throw new ValidationError('Missing tool name in request');
        }

        let result: any;
        switch (toolName) {
          case 'search_voting_results':
            result = await searchVotingResults(arguments_, requestId);
            break;
          case 'search_bills':
            result = await searchBills(arguments_, requestId);
            break;
          case 'search_questions':
            result = await searchQuestions(arguments_, requestId);
            break;
          case 'search_hansard':
            result = await searchHansard(arguments_, requestId);
            break;
          default:
            throw new ValidationError(`Unknown tool: ${toolName}`);
        }

        response = {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        };
        break;

      default:
        response = {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        };
    }

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders()
      }
    });

  } catch (error) {
    logError('HTTP MCP handler failed', { error: error as Error, requestId });
    return createErrorResponse(error as Error, requestId);
  }
}

// --- WebSocket Handler ---
function handleWebSocket(request: Request, requestId: string): Response {
  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected websocket upgrade', { status: 400 });
  }

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();
  
  server.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data as string);
      logInfo('WebSocket message received', { data, requestId });
      
      let response: any;
      
      if (data.method === 'initialize') {
        response = {
          jsonrpc: '2.0',
          id: data.id,
          result: {
            protocolVersion: '2025-06-18',
            capabilities: {
              tools: {
                listChanged: true
              },
              logging: {}
            },
            serverInfo: {
              name: 'legco-search-mcp',
              version: '0.2.0'
            }
          }
        };
      } else if (data.method === 'tools/list') {
        response = {
          jsonrpc: '2.0',
          id: data.id,
          result: {
            tools: [
              {
                name: 'search_voting_results',
                description: 'Search voting results from LegCo meetings',
                inputSchema: {
                  type: 'object',
                  properties: {
                    meeting_type: { type: 'string' },
                    start_date: { type: 'string' },
                    end_date: { type: 'string' },
                    member_name: { type: 'string' },
                    motion_keywords: { type: 'string' },
                    term_no: { type: 'integer' },
                    top: { type: 'integer', default: 100 },
                    skip: { type: 'integer', default: 0 },
                    format: { type: 'string', default: 'json' },
                  },
                },
              },
              {
                name: 'search_bills',
                description: 'Search bills from LegCo database',
                inputSchema: {
                  type: 'object',
                  properties: {
                    title_keywords: { type: 'string' },
                    gazette_year: { type: 'integer' },
                    gazette_start_date: { type: 'string' },
                    gazette_end_date: { type: 'string' },
                    top: { type: 'integer', default: 100 },
                    skip: { type: 'integer', default: 0 },
                    format: { type: 'string', default: 'json' },
                  },
                },
              },
              {
                name: 'search_questions',
                description: 'Search questions at Council meetings',
                inputSchema: {
                  type: 'object',
                  properties: {
                    question_type: { type: 'string', default: 'oral' },
                    subject_keywords: { type: 'string' },
                    member_name: { type: 'string' },
                    meeting_date: { type: 'string' },
                    year: { type: 'integer' },
                    top: { type: 'integer', default: 100 },
                    skip: { type: 'integer', default: 0 },
                    format: { type: 'string', default: 'json' },
                  },
                },
              },
              {
                name: 'search_hansard',
                description: 'Search Hansard (official records of proceedings)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    hansard_type: { type: 'string', default: 'hansard' },
                    subject_keywords: { type: 'string' },
                    speaker: { type: 'string' },
                    meeting_date: { type: 'string' },
                    year: { type: 'integer' },
                    question_type: { type: 'string' },
                    top: { type: 'integer', default: 100 },
                    skip: { type: 'integer', default: 0 },
                    format: { type: 'string', default: 'json' },
                  },
                },
              },
            ]
          }
        };
      } else if (data.method === 'tools/call') {
        const toolName = data.params?.name;
        const arguments_ = data.params?.arguments || {};
        
        if (!toolName) {
          throw new ValidationError('Missing tool name in request');
        }
        
        let result: any;
        switch (toolName) {
          case 'search_voting_results':
            result = await searchVotingResults(arguments_, requestId);
            break;
          case 'search_bills':
            result = await searchBills(arguments_, requestId);
            break;
          case 'search_questions':
            result = await searchQuestions(arguments_, requestId);
            break;
          case 'search_hansard':
            result = await searchHansard(arguments_, requestId);
            break;
          default:
            throw new ValidationError(`Unknown tool: ${toolName}`);
        }
        
        response = {
          jsonrpc: '2.0',
          id: data.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        };
      } else {
        response = {
          jsonrpc: '2.0',
          id: data.id,
          error: {
            code: -32601,
            message: `Method not found: ${data.method}`
          }
        };
      }
      
      server.send(JSON.stringify(response));
      
    } catch (error) {
      logError('WebSocket error', { error: error as Error, requestId });
      
      const errorResponse = {
        jsonrpc: '2.0',
        id: (event.data as any)?.id || null,
        error: {
          code: -32603,
          message: (error as Error).message
        }
      };
      
      server.send(JSON.stringify(errorResponse));
    }
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

// Environment interface for Cloudflare Workers
interface Env {
  LEGCO_MCP: DurableObjectNamespace<LegCoMcpServer>;
}

// MCP Server state interface
interface ServerState {
  requestCount: number;
  lastRequestTime: string;
  version: string;
}

// Main MCP Server class extending McpAgent
export class LegCoMcpServer extends McpAgent<Env, ServerState> {
  // Initial state for the server
  initialState: ServerState = {
    requestCount: 0,
    lastRequestTime: new Date().toISOString(),
    version: "2025-06-18"
  };

  // Implement the abstract server property
  server = new McpServer({
    name: "legco-search-mcp",
    version: "0.2.0"
  });

  async init() {
    // Register MCP tools with enhanced schemas for 2025-06-18
    this.server.tool(
      "search_voting_results",
      "Search voting results from LegCo meetings with enhanced filtering",
      {
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
      },
      async (params) => {
        try {
          const result = await this.searchVotingResults(params);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }],
            annotations: {
              audience: ["user", "assistant"],
              priority: 0.8,
              lastModified: new Date().toISOString()
            }
          };
        } catch (error) {
          logError('Search voting results failed', { error: error as Error, params });
          throw error;
        }
      }
    );

    this.server.tool(
      "search_bills",
      "Search bills from LegCo database with enhanced date filtering",
      {
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
      },
      async (params) => {
        try {
          const result = await this.searchBills(params);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }],
            annotations: {
              audience: ["user", "assistant"],
              priority: 0.8,
              lastModified: new Date().toISOString()
            }
          };
        } catch (error) {
          logError('Search bills failed', { error: error as Error, params });
          throw error;
        }
      }
    );

    this.server.tool(
      "search_questions",
      "Search questions at Council meetings with enhanced filtering",
      {
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
      },
      async (params) => {
        try {
          const result = await this.searchQuestions(params);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }],
            annotations: {
              audience: ["user", "assistant"],
              priority: 0.8,
              lastModified: new Date().toISOString()
            }
          };
        } catch (error) {
          logError('Search questions failed', { error: error as Error, params });
          throw error;
        }
      }
    );

    this.server.tool(
      "search_hansard",
      "Search Hansard (official records of proceedings) with multiple data sources",
      {
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
      },
      async (params) => {
        try {
          const result = await this.searchHansard(params);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }],
            annotations: {
              audience: ["user", "assistant"],
              priority: 0.8,
              lastModified: new Date().toISOString()
            }
          };
        } catch (error) {
          logError('Search hansard failed', { error: error as Error, params });
          throw error;
        }
      }
    );

    // Register a simple ping tool for liveness checking (new in 2025-06-18)
    this.server.tool(
      "ping",
      "Check server liveness and get basic server information",
      {},
      async () => {
        const now = new Date().toISOString();
        this.setState({
          ...this.state,
          requestCount: this.state.requestCount + 1,
          lastRequestTime: now
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "alive",
              server: "LegCo Search MCP Server",
              version: this.state.version,
              protocol: "2025-06-18",
              requestCount: this.state.requestCount,
              lastRequestTime: this.state.lastRequestTime,
              timestamp: now
            }, null, 2)
          }]
        };
      }
    );
  }

  // Tool implementation methods (keeping existing logic but updating for new protocol)
  private async searchVotingResults(params: any): Promise<any> {
    validateSearchVotingParams(params);
    return await fetchOData('voting', params, crypto.randomUUID());
  }

  private async searchBills(params: any): Promise<any> {
    validateSearchBillsParams(params);
    return await fetchOData('bills', params, crypto.randomUUID());
  }

  private async searchQuestions(params: any): Promise<any> {
    validateSearchQuestionsParams(params);
    const qtype = params.question_type ?? 'oral';
    const endpoint = qtype === 'oral' ? 'questions_oral' : 'questions_written';
    return await fetchOData(endpoint, params, crypto.randomUUID());
  }

  private async searchHansard(params: any): Promise<any> {
    validateSearchHansardParams(params);
    const htype = params.hansard_type ?? 'hansard';
    const endpointMap: Record<string, string> = {
      hansard: 'hansard',
      questions: 'hansard_questions',
      bills: 'hansard_bills',
      motions: 'hansard_motions',
      voting: 'hansard_voting',
    };
    const endpoint = endpointMap[htype] || 'hansard';
    return await fetchOData(endpoint, params, crypto.randomUUID());
  }
}

// Default export for Cloudflare Workers using McpAgent
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      const startTime = Date.now();
      const responseTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'LegCo Search MCP Server',
          version: '0.2.0',
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: {
              listChanged: true
            },
            resources: {
              subscribe: true,
              listChanged: true
            },
            prompts: {
              listChanged: true
            },
            logging: {}
          },
          serverInfo: {
            name: 'legco-search-mcp',
            version: '0.2.0'
          },
          responseTime,
          timestamp: new Date().toISOString()
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Response-Time': String(responseTime)
          },
        }
      );
    }

    // MCP WebSocket endpoint
    if (url.pathname === '/mcp') {
      return handleWebSocket(request, crypto.randomUUID());
    }

    // MCP SSE endpoint - simplified HTTP-based MCP
    if (url.pathname === '/sse') {
      return await handleSSE(request, crypto.randomUUID());
    }

    // HTTP MCP endpoint for compatibility
    if (url.pathname === '/mcp-http') {
      return await handleHTTPMCP(request, crypto.randomUUID());
    }

    // Default response
    return new Response(
      JSON.stringify({
        service: 'LegCo Search MCP Server',
        version: '0.2.0',
        endpoints: {
          health: '/health',
          mcp: '/mcp (WebSocket)',
          sse: '/sse (Server-Sent Events)',
          'mcp-http': '/mcp-http (HTTP compatibility)'
        },
        protocol: '2025-06-18',
        auth: 'none',
        agent: 'Cloudflare Agents SDK'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}; 