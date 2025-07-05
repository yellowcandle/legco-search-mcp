// Cloudflare Remote MCP Server Template (authless)
// See: https://developers.cloudflare.com/agents/guides/remote-mcp-server/

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
    // Remove potentially dangerous characters and limit length
    const sanitized = value
      .replace(/[^\w\s\-.,()[\]']/g, '')
      .replace(/'/g, "''")
      .slice(0, 500);
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
        if (params.motion_keywords) filters.push(`substringof('${sanitizeString(params.motion_keywords)}', motion_en)`);
        if (params.term_no) filters.push(`term_no eq ${params.term_no}`);
        break;
        
      case 'bills':
        if (params.title_keywords) filters.push(`substringof('${sanitizeString(params.title_keywords)}', bill_title_eng)`);
        if (params.gazette_year) filters.push(`year(bill_gazette_date) eq ${params.gazette_year}`);
        if (params.gazette_start_date) filters.push(`bill_gazette_date ge datetime'${params.gazette_start_date}'`);
        if (params.gazette_end_date) filters.push(`bill_gazette_date le datetime'${params.gazette_end_date}'`);
        break;
        
      case 'questions_oral':
      case 'questions_written':
        if (params.subject_keywords) filters.push(`substringof('${sanitizeString(params.subject_keywords)}', SubjectName)`);
        if (params.member_name) filters.push(`substringof('${sanitizeString(params.member_name)}', MemberName)`);
        if (params.meeting_date) filters.push(`MeetingDate eq datetime'${params.meeting_date}'`);
        if (params.year) filters.push(`year(MeetingDate) eq ${params.year}`);
        break;
        
      default:
        if (endpoint.startsWith('hansard')) {
          if (params.subject_keywords) filters.push(`substringof('${sanitizeString(params.subject_keywords)}', Subject)`);
          if (params.speaker) filters.push(`Speaker eq '${sanitizeString(params.speaker)}'`);
          if (params.meeting_date) filters.push(`MeetingDate eq datetime'${params.meeting_date}'`);
          if (params.year) filters.push(`year(MeetingDate) eq ${params.year}`);
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
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
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
    
    const response = await fetchWithRetry(fullUrl, { 
      method: 'GET', 
      headers 
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
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
      return {
        ...data,
        _metadata: {
          status: response.status,
          content_type: contentType,
          endpoint,
          params
        }
      };
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
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listChanged: false
              }
            },
            serverInfo: {
              name: 'LegCo Search MCP Server',
              version: '0.1.0'
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

// --- Main Worker Handler ---
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    const method = request.method;
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
    
    try {
      logInfo('Request received', { method, url: url.pathname, ip, requestId });
      
      // CORS preflight
      if (method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Upgrade, Connection, Cache-Control, Accept, Accept-Encoding, Accept-Language, User-Agent, Referer, Origin, X-Requested-With',
            'Access-Control-Allow-Credentials': 'false',
            'Access-Control-Max-Age': '86400',
            'Vary': 'Origin',
          },
        });
      }

      // WebSocket endpoint for MCP
      if (url.pathname.endsWith('/mcp')) {
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
          return handleWebSocket(request, requestId);
        }
        
        // Return info for non-WebSocket requests
        return new Response(
          JSON.stringify({
            message: 'This endpoint supports WebSocket connections for MCP protocol',
            usage: 'Connect via WebSocket with MCP JSON-RPC messages',
            protocol: 'MCP 2024-11-05',
            auth: 'none'
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Health check endpoint
      if (url.pathname.endsWith('/health')) {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            service: 'LegCo Search MCP Server',
            version: '0.1.0',
            timestamp: new Date().toISOString(),
            requestId
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // MCP HTTP endpoint (pure JSON-RPC over HTTP)
      if (url.pathname.endsWith('/mcp-http')) {
        if (method === 'GET') {
          return new Response(
            JSON.stringify({
              message: 'This endpoint supports HTTP-based MCP communication',
              usage: 'POST with JSON-RPC 2.0 messages',
              protocol: 'MCP 2024-11-05',
              transport: 'HTTP',
              auth: 'none'
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }
        
        if (method !== 'POST') {
          throw new ValidationError('Only POST requests are supported for HTTP MCP endpoint');
        }
        
        // Rate limiting
        if (!checkRateLimit(ip)) {
          throw new RateLimitError(
            `Rate limit exceeded: ${RATE_LIMIT} requests per ${RATE_LIMIT_WINDOW} seconds.`,
            RATE_LIMIT_WINDOW
          );
        }
        
        let req: any;
        try {
          req = await request.json();
        } catch (error) {
          throw new ValidationError('Invalid JSON in request body');
        }
        
        // Handle JSON-RPC methods for HTTP transport
        if (req.method === 'initialize') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: req.id,
              result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                  tools: {
                    listChanged: false
                  }
                },
                serverInfo: {
                  name: 'LegCo Search MCP Server',
                  version: '0.1.0'
                }
              }
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        } else if (req.method === 'tools/list') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: req.id,
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
                ],
              }
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        } else if (req.method === 'tools/call') {
          const params = req.params || {};
          const toolName = params.name;
          const arguments_ = params.arguments || {};
          
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
          
          logInfo('Tool call completed successfully', { toolName, requestId });
          
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: req.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                  },
                ],
              }
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        } else {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: req.id || null,
              error: {
                code: -32601,
                message: `Method not found: ${req.method}`
              }
            }),
            {
              status: 404,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }
      }

      // MCP SSE endpoint (Server-Sent Events)
      if (url.pathname.endsWith('/sse')) {
        if (method === 'GET') {
          // Create SSE stream
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          const encoder = new TextEncoder();
          
          // Send SSE headers
          const headers = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Accept, Accept-Encoding, Accept-Language, User-Agent, Referer, Origin, X-Requested-With',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Credentials': 'false',
            'Vary': 'Origin',
          };
          
          // Start with connection established message
          const writeSSE = (data: any, event?: string) => {
            let message = '';
            if (event) message += `event: ${event}\n`;
            message += `data: ${JSON.stringify(data)}\n\n`;
            writer.write(encoder.encode(message));
          };
          
          // Send initial connection established event
          writeSSE({
            jsonrpc: '2.0',
            method: 'notifications/initialized',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {
                  listChanged: false
                }
              },
              serverInfo: {
                name: 'LegCo Search MCP Server',
                version: '0.1.0'
              }
            }
          }, 'message');
          
          // Keep connection alive
          const keepAliveInterval = setInterval(() => {
            writer.write(encoder.encode(': heartbeat\n\n'));
          }, 30000);
          
          // Handle client disconnect
          const response = new Response(readable, { headers });
          
          // Cleanup on close (this won't work in Workers, but it's good practice)
          setTimeout(() => {
            clearInterval(keepAliveInterval);
            writer.close().catch(() => {});
          }, 300000); // 5 minutes timeout
          
          return response;
        }
        
        if (method !== 'POST') {
          throw new ValidationError('Only GET (SSE) and POST (JSON-RPC) requests are supported');
        }
        
        // Rate limiting
        if (!checkRateLimit(ip)) {
          throw new RateLimitError(
            `Rate limit exceeded: ${RATE_LIMIT} requests per ${RATE_LIMIT_WINDOW} seconds.`,
            RATE_LIMIT_WINDOW
          );
        }
        
        let req: any;
        try {
          req = await request.json();
        } catch (error) {
          throw new ValidationError('Invalid JSON in request body');
        }
        
        if (req.method === 'initialize') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: req.id,
              result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                  tools: {
                    listChanged: false
                  }
                },
                serverInfo: {
                  name: 'LegCo Search MCP Server',
                  version: '0.1.0'
                }
              }
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        } else if (req.method === 'tools/list') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: req.id,
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
                ],
              }
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        } else if (req.method === 'tools/call') {
          const params = req.params || {};
          const toolName = params.name;
          const arguments_ = params.arguments || {};
          
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
          
          logInfo('Tool call completed successfully', { toolName, requestId });
          
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: req.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                  },
                ],
              }
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        } else {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: req.id || null,
              error: {
                code: -32601,
                message: `Method not found: ${req.method}`
              }
            }),
            {
              status: 404,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }
      }

      // OAuth/OpenID Connect endpoints
      if (
        url.pathname.startsWith('/.well-known/oauth-authorization-server') ||
        url.pathname.startsWith('/.well-known/openid-configuration')
      ) {
        return new Response(
          JSON.stringify({
            error: "OAuth/OpenID Connect is not supported. This is an authless API."
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Default response for unknown endpoints
      return new Response(
        JSON.stringify({
          service: 'LegCo Search MCP Server',
          version: '0.1.0',
          description: 'Hong Kong Legislative Council Search MCP Server',
          endpoints: {
            health: '/health',
            mcp_http: '/mcp-http',
            mcp_sse: '/sse',
            mcp_websocket: '/mcp',
          },
          protocols: ['HTTP', 'WebSocket'],
          auth: 'none',
          requestId,
          timestamp: new Date().toISOString()
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
      
    } catch (error) {
      logError('Request failed', { error: error as Error, method, url: url.pathname, ip, requestId });
      return createErrorResponse(error as Error, requestId);
    }
  },
}; 