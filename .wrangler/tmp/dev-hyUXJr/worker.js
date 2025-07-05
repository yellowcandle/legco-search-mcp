var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-0tk5fh/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/worker.ts
var BASE_URLS = {
  voting: "https://app.legco.gov.hk/vrdb/odata/vVotingResult",
  bills: "https://app.legco.gov.hk/BillsDB/odata/Vbills",
  questions_oral: "https://app.legco.gov.hk/QuestionsDB/odata/ViewOralQuestionsEng",
  questions_written: "https://app.legco.gov.hk/QuestionsDB/odata/ViewWrittenQuestionsEng",
  hansard: "https://app.legco.gov.hk/OpenData/HansardDB/Hansard",
  hansard_questions: "https://app.legco.gov.hk/OpenData/HansardDB/Questions",
  hansard_bills: "https://app.legco.gov.hk/OpenData/HansardDB/Bills",
  hansard_motions: "https://app.legco.gov.hk/OpenData/HansardDB/Motions",
  hansard_voting: "https://app.legco.gov.hk/OpenData/HansardDB/VotingResults"
};
var LegCoAPIError = class extends Error {
  constructor(message, statusCode, endpoint, originalError) {
    super(message);
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.originalError = originalError;
    this.name = "LegCoAPIError";
  }
  static {
    __name(this, "LegCoAPIError");
  }
};
var ValidationError = class extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
    this.name = "ValidationError";
  }
  static {
    __name(this, "ValidationError");
  }
};
var RateLimitError = class extends Error {
  constructor(message, retryAfter) {
    super(message);
    this.retryAfter = retryAfter;
    this.name = "RateLimitError";
  }
  static {
    __name(this, "RateLimitError");
  }
};
function logError(message, context = {}) {
  const logEntry = {
    level: "ERROR",
    message,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    requestId: context.requestId || crypto.randomUUID(),
    ...context
  };
  console.error(JSON.stringify(logEntry));
}
__name(logError, "logError");
function logWarning(message, context = {}) {
  const logEntry = {
    level: "WARNING",
    message,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    requestId: context.requestId || crypto.randomUUID(),
    ...context
  };
  console.warn(JSON.stringify(logEntry));
}
__name(logWarning, "logWarning");
function logInfo(message, context = {}) {
  const logEntry = {
    level: "INFO",
    message,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    requestId: context.requestId || crypto.randomUUID(),
    ...context
  };
  console.log(JSON.stringify(logEntry));
}
__name(logInfo, "logInfo");
function validateDateFormat(dateStr) {
  if (!dateStr) return true;
  try {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && dateStr === date.toISOString().split("T")[0];
  } catch (error) {
    logError("Date validation failed", { error, dateStr });
    return false;
  }
}
__name(validateDateFormat, "validateDateFormat");
function sanitizeString(value) {
  if (!value) return "";
  try {
    const sanitized = value.replace(/[^\w\s\-.,()[\]']/g, "").replace(/'/g, "''").slice(0, 500);
    return sanitized;
  } catch (error) {
    logError("String sanitization failed", { error, value });
    return "";
  }
}
__name(sanitizeString, "sanitizeString");
function validateEnum(value, allowed) {
  try {
    return allowed.includes(value);
  } catch (error) {
    logError("Enum validation failed", { error, value, allowed });
    return false;
  }
}
__name(validateEnum, "validateEnum");
function validateInteger(value, min, max) {
  try {
    if (typeof value !== "number") return false;
    if (!Number.isInteger(value)) return false;
    if (min !== void 0 && value < min) return false;
    if (max !== void 0 && value > max) return false;
    return true;
  } catch (error) {
    logError("Integer validation failed", { error, value, min, max });
    return false;
  }
}
__name(validateInteger, "validateInteger");
function buildODataQuery(endpoint, params) {
  const query = {};
  const filters = [];
  try {
    if (params.format === "xml") query["$format"] = "xml";
    if (params.top !== void 0) query["$top"] = String(params.top);
    if (params.skip !== void 0) query["$skip"] = String(params.skip);
    query["$inlinecount"] = "allpages";
    switch (endpoint) {
      case "voting":
        if (params.meeting_type) filters.push(`type eq '${sanitizeString(params.meeting_type)}'`);
        if (params.start_date) filters.push(`start_date ge datetime'${params.start_date}'`);
        if (params.end_date) filters.push(`start_date le datetime'${params.end_date}'`);
        if (params.member_name) filters.push(`substringof('${sanitizeString(params.member_name)}', name_en)`);
        if (params.motion_keywords) filters.push(`substringof('${sanitizeString(params.motion_keywords)}', motion_en)`);
        if (params.term_no) filters.push(`term_no eq ${params.term_no}`);
        break;
      case "bills":
        if (params.title_keywords) filters.push(`substringof('${sanitizeString(params.title_keywords)}', bill_title_eng)`);
        if (params.gazette_year) filters.push(`year(bill_gazette_date) eq ${params.gazette_year}`);
        if (params.gazette_start_date) filters.push(`bill_gazette_date ge datetime'${params.gazette_start_date}'`);
        if (params.gazette_end_date) filters.push(`bill_gazette_date le datetime'${params.gazette_end_date}'`);
        break;
      case "questions_oral":
      case "questions_written":
        if (params.subject_keywords) filters.push(`substringof('${sanitizeString(params.subject_keywords)}', SubjectName)`);
        if (params.member_name) filters.push(`substringof('${sanitizeString(params.member_name)}', MemberName)`);
        if (params.meeting_date) filters.push(`MeetingDate eq datetime'${params.meeting_date}'`);
        if (params.year) filters.push(`year(MeetingDate) eq ${params.year}`);
        break;
      default:
        if (endpoint.startsWith("hansard")) {
          if (params.subject_keywords) filters.push(`substringof('${sanitizeString(params.subject_keywords)}', Subject)`);
          if (params.speaker) filters.push(`Speaker eq '${sanitizeString(params.speaker)}'`);
          if (params.meeting_date) filters.push(`MeetingDate eq datetime'${params.meeting_date}'`);
          if (params.year) filters.push(`year(MeetingDate) eq ${params.year}`);
          if (params.question_type && endpoint === "hansard_questions") {
            filters.push(`QuestionType eq '${sanitizeString(params.question_type)}'`);
            filters.push(`HansardType eq 'English'`);
          }
        }
    }
    if (filters.length) query["$filter"] = filters.join(" and ");
  } catch (error) {
    logError("OData query building failed", { error, endpoint, params });
    throw new LegCoAPIError("Failed to build query parameters", void 0, endpoint, error);
  }
  return query;
}
__name(buildODataQuery, "buildODataQuery");
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3e4);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok || response.status >= 400 && response.status < 500) {
        return response;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        break;
      }
      const delay = Math.min(1e3 * Math.pow(2, attempt - 1), 1e4);
      logWarning(`Request failed, retrying in ${delay}ms`, {
        attempt,
        maxRetries,
        error,
        url
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error("Max retries exceeded");
}
__name(fetchWithRetry, "fetchWithRetry");
async function fetchOData(endpoint, params, requestId) {
  const context = { endpoint, params, requestId };
  try {
    const url = BASE_URLS[endpoint];
    if (!url) {
      throw new LegCoAPIError(`Unknown endpoint: ${endpoint}`, 400, endpoint);
    }
    const query = buildODataQuery(endpoint, params);
    const queryString = new URLSearchParams(query).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    const headers = {
      "User-Agent": "LegCo-Search-MCP/1.0",
      "Accept": params.format === "xml" ? "application/xml" : "application/json",
      "Accept-Charset": "utf-8",
      "Cache-Control": "no-cache"
    };
    logInfo("Making API request", { ...context, url: fullUrl, headers });
    const response = await fetchWithRetry(fullUrl, {
      method: "GET",
      headers
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new LegCoAPIError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        endpoint,
        new Error(errorText)
      );
    }
    const contentType = response.headers.get("content-type") || "";
    if (params.format === "xml") {
      const text = await response.text();
      return {
        data: text,
        format: "xml",
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
    logError("OData fetch failed", { ...context, error });
    if (error instanceof LegCoAPIError) {
      throw error;
    }
    throw new LegCoAPIError(
      `Failed to fetch data from ${endpoint}: ${error.message}`,
      void 0,
      endpoint,
      error
    );
  }
}
__name(fetchOData, "fetchOData");
var RATE_LIMIT = 60;
var RATE_LIMIT_WINDOW = 60;
var rateLimitMap = /* @__PURE__ */ new Map();
function checkRateLimit(ip) {
  try {
    const now = Math.floor(Date.now() / 1e3);
    const window = Math.floor(now / RATE_LIMIT_WINDOW);
    const key = `${ip}:${window}`;
    const entry = rateLimitMap.get(key);
    if (entry) {
      if (entry.count >= RATE_LIMIT) {
        logWarning("Rate limit exceeded", { ip, count: entry.count, limit: RATE_LIMIT });
        return false;
      }
      entry.count++;
    } else {
      rateLimitMap.set(key, { window, count: 1 });
    }
    if (rateLimitMap.size > 1e4) {
      const currentWindow = window;
      for (const [k, v] of rateLimitMap.entries()) {
        if (v.window < currentWindow - 1) {
          rateLimitMap.delete(k);
        }
      }
    }
    return true;
  } catch (error) {
    logError("Rate limit check failed", { error, ip });
    return true;
  }
}
__name(checkRateLimit, "checkRateLimit");
function validateSearchVotingParams(params) {
  if (params.meeting_type && !validateEnum(params.meeting_type, [
    "Council Meeting",
    "House Committee",
    "Finance Committee",
    "Establishment Subcommittee",
    "Public Works Subcommittee"
  ])) {
    throw new ValidationError(`Invalid meeting_type: ${params.meeting_type}`, "meeting_type");
  }
  if (params.start_date && !validateDateFormat(params.start_date)) {
    throw new ValidationError(`Invalid start_date format: ${params.start_date}. Use YYYY-MM-DD`, "start_date");
  }
  if (params.end_date && !validateDateFormat(params.end_date)) {
    throw new ValidationError(`Invalid end_date format: ${params.end_date}. Use YYYY-MM-DD`, "end_date");
  }
  if (params.term_no && !validateInteger(params.term_no, 1)) {
    throw new ValidationError(`Invalid term_no: ${params.term_no}. Must be a positive integer`, "term_no");
  }
  if (params.top !== void 0 && !validateInteger(params.top, 1, 1e3)) {
    throw new ValidationError(`Invalid top: ${params.top}. Must be between 1 and 1000`, "top");
  }
  if (params.skip !== void 0 && !validateInteger(params.skip, 0)) {
    throw new ValidationError(`Invalid skip: ${params.skip}. Must be non-negative`, "skip");
  }
  if (params.format && !validateEnum(params.format, ["json", "xml"])) {
    throw new ValidationError(`Invalid format: ${params.format}. Must be 'json' or 'xml'`, "format");
  }
}
__name(validateSearchVotingParams, "validateSearchVotingParams");
function validateSearchBillsParams(params) {
  if (params.gazette_year && !validateInteger(params.gazette_year, 1800, 2100)) {
    throw new ValidationError(`Invalid gazette_year: ${params.gazette_year}. Must be between 1800 and 2100`, "gazette_year");
  }
  if (params.gazette_start_date && !validateDateFormat(params.gazette_start_date)) {
    throw new ValidationError(`Invalid gazette_start_date format: ${params.gazette_start_date}. Use YYYY-MM-DD`, "gazette_start_date");
  }
  if (params.gazette_end_date && !validateDateFormat(params.gazette_end_date)) {
    throw new ValidationError(`Invalid gazette_end_date format: ${params.gazette_end_date}. Use YYYY-MM-DD`, "gazette_end_date");
  }
  if (params.top !== void 0 && !validateInteger(params.top, 1, 1e3)) {
    throw new ValidationError(`Invalid top: ${params.top}. Must be between 1 and 1000`, "top");
  }
  if (params.skip !== void 0 && !validateInteger(params.skip, 0)) {
    throw new ValidationError(`Invalid skip: ${params.skip}. Must be non-negative`, "skip");
  }
  if (params.format && !validateEnum(params.format, ["json", "xml"])) {
    throw new ValidationError(`Invalid format: ${params.format}. Must be 'json' or 'xml'`, "format");
  }
}
__name(validateSearchBillsParams, "validateSearchBillsParams");
function validateSearchQuestionsParams(params) {
  const qtype = params.question_type ?? "oral";
  if (!validateEnum(qtype, ["oral", "written"])) {
    throw new ValidationError(`Invalid question_type: ${qtype}. Must be 'oral' or 'written'`, "question_type");
  }
  if (params.meeting_date && !validateDateFormat(params.meeting_date)) {
    throw new ValidationError(`Invalid meeting_date format: ${params.meeting_date}. Use YYYY-MM-DD`, "meeting_date");
  }
  if (params.year && !validateInteger(params.year, 2e3, 2100)) {
    throw new ValidationError(`Invalid year: ${params.year}. Must be between 2000 and 2100`, "year");
  }
  if (params.top !== void 0 && !validateInteger(params.top, 1, 1e3)) {
    throw new ValidationError(`Invalid top: ${params.top}. Must be between 1 and 1000`, "top");
  }
  if (params.skip !== void 0 && !validateInteger(params.skip, 0)) {
    throw new ValidationError(`Invalid skip: ${params.skip}. Must be non-negative`, "skip");
  }
  if (params.format && !validateEnum(params.format, ["json", "xml"])) {
    throw new ValidationError(`Invalid format: ${params.format}. Must be 'json' or 'xml'`, "format");
  }
}
__name(validateSearchQuestionsParams, "validateSearchQuestionsParams");
function validateSearchHansardParams(params) {
  const htype = params.hansard_type ?? "hansard";
  if (!validateEnum(htype, ["hansard", "questions", "bills", "motions", "voting"])) {
    throw new ValidationError(`Invalid hansard_type: ${htype}. Must be one of: hansard, questions, bills, motions, voting`, "hansard_type");
  }
  if (params.meeting_date && !validateDateFormat(params.meeting_date)) {
    throw new ValidationError(`Invalid meeting_date format: ${params.meeting_date}. Use YYYY-MM-DD`, "meeting_date");
  }
  if (params.year && !validateInteger(params.year, 2e3, 2100)) {
    throw new ValidationError(`Invalid year: ${params.year}. Must be between 2000 and 2100`, "year");
  }
  if (params.question_type && !validateEnum(params.question_type, ["Oral", "Written", "Urgent"])) {
    throw new ValidationError(`Invalid question_type: ${params.question_type}. Must be 'Oral', 'Written', or 'Urgent'`, "question_type");
  }
  if (params.top !== void 0 && !validateInteger(params.top, 1, 1e3)) {
    throw new ValidationError(`Invalid top: ${params.top}. Must be between 1 and 1000`, "top");
  }
  if (params.skip !== void 0 && !validateInteger(params.skip, 0)) {
    throw new ValidationError(`Invalid skip: ${params.skip}. Must be non-negative`, "skip");
  }
  if (params.format && !validateEnum(params.format, ["json", "xml"])) {
    throw new ValidationError(`Invalid format: ${params.format}. Must be 'json' or 'xml'`, "format");
  }
}
__name(validateSearchHansardParams, "validateSearchHansardParams");
async function searchVotingResults(params, requestId) {
  try {
    validateSearchVotingParams(params);
    return await fetchOData("voting", params, requestId);
  } catch (error) {
    logError("Search voting results failed", { error, params, requestId });
    throw error;
  }
}
__name(searchVotingResults, "searchVotingResults");
async function searchBills(params, requestId) {
  try {
    validateSearchBillsParams(params);
    return await fetchOData("bills", params, requestId);
  } catch (error) {
    logError("Search bills failed", { error, params, requestId });
    throw error;
  }
}
__name(searchBills, "searchBills");
async function searchQuestions(params, requestId) {
  try {
    validateSearchQuestionsParams(params);
    const qtype = params.question_type ?? "oral";
    const endpoint = qtype === "oral" ? "questions_oral" : "questions_written";
    return await fetchOData(endpoint, params, requestId);
  } catch (error) {
    logError("Search questions failed", { error, params, requestId });
    throw error;
  }
}
__name(searchQuestions, "searchQuestions");
async function searchHansard(params, requestId) {
  try {
    validateSearchHansardParams(params);
    const htype = params.hansard_type ?? "hansard";
    const endpointMap = {
      hansard: "hansard",
      questions: "hansard_questions",
      bills: "hansard_bills",
      motions: "hansard_motions",
      voting: "hansard_voting"
    };
    const endpoint = endpointMap[htype] || "hansard";
    return await fetchOData(endpoint, params, requestId);
  } catch (error) {
    logError("Search hansard failed", { error, params, requestId });
    throw error;
  }
}
__name(searchHansard, "searchHansard");
function createErrorResponse(error, requestId) {
  let statusCode = 500;
  let errorCode = "INTERNAL_ERROR";
  let message = "An internal server error occurred";
  if (error instanceof ValidationError) {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = error.message;
  } else if (error instanceof LegCoAPIError) {
    statusCode = error.statusCode || 500;
    errorCode = "API_ERROR";
    message = error.message;
  } else if (error instanceof RateLimitError) {
    statusCode = 429;
    errorCode = "RATE_LIMIT_EXCEEDED";
    message = error.message;
  }
  const errorResponse = {
    error: {
      code: errorCode,
      message,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  if (error instanceof RateLimitError && error.retryAfter) {
    headers["Retry-After"] = String(error.retryAfter);
  }
  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers
  });
}
__name(createErrorResponse, "createErrorResponse");
function handleWebSocket(request, requestId) {
  const upgradeHeader = request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected websocket upgrade", { status: 400 });
  }
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);
  server.accept();
  server.addEventListener("message", async (event) => {
    try {
      const data = JSON.parse(event.data);
      logInfo("WebSocket message received", { data, requestId });
      let response;
      if (data.method === "initialize") {
        response = {
          jsonrpc: "2.0",
          id: data.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {
                listChanged: false
              }
            },
            serverInfo: {
              name: "LegCo Search MCP Server",
              version: "0.1.0"
            }
          }
        };
      } else if (data.method === "tools/list") {
        response = {
          jsonrpc: "2.0",
          id: data.id,
          result: {
            tools: [
              {
                name: "search_voting_results",
                description: "Search voting results from LegCo meetings",
                inputSchema: {
                  type: "object",
                  properties: {
                    meeting_type: { type: "string" },
                    start_date: { type: "string" },
                    end_date: { type: "string" },
                    member_name: { type: "string" },
                    motion_keywords: { type: "string" },
                    term_no: { type: "integer" },
                    top: { type: "integer", default: 100 },
                    skip: { type: "integer", default: 0 },
                    format: { type: "string", default: "json" }
                  }
                }
              },
              {
                name: "search_bills",
                description: "Search bills from LegCo database",
                inputSchema: {
                  type: "object",
                  properties: {
                    title_keywords: { type: "string" },
                    gazette_year: { type: "integer" },
                    gazette_start_date: { type: "string" },
                    gazette_end_date: { type: "string" },
                    top: { type: "integer", default: 100 },
                    skip: { type: "integer", default: 0 },
                    format: { type: "string", default: "json" }
                  }
                }
              },
              {
                name: "search_questions",
                description: "Search questions at Council meetings",
                inputSchema: {
                  type: "object",
                  properties: {
                    question_type: { type: "string", default: "oral" },
                    subject_keywords: { type: "string" },
                    member_name: { type: "string" },
                    meeting_date: { type: "string" },
                    year: { type: "integer" },
                    top: { type: "integer", default: 100 },
                    skip: { type: "integer", default: 0 },
                    format: { type: "string", default: "json" }
                  }
                }
              },
              {
                name: "search_hansard",
                description: "Search Hansard (official records of proceedings)",
                inputSchema: {
                  type: "object",
                  properties: {
                    hansard_type: { type: "string", default: "hansard" },
                    subject_keywords: { type: "string" },
                    speaker: { type: "string" },
                    meeting_date: { type: "string" },
                    year: { type: "integer" },
                    question_type: { type: "string" },
                    top: { type: "integer", default: 100 },
                    skip: { type: "integer", default: 0 },
                    format: { type: "string", default: "json" }
                  }
                }
              }
            ]
          }
        };
      } else if (data.method === "tools/call") {
        const toolName = data.params?.name;
        const arguments_ = data.params?.arguments || {};
        if (!toolName) {
          throw new ValidationError("Missing tool name in request");
        }
        let result;
        switch (toolName) {
          case "search_voting_results":
            result = await searchVotingResults(arguments_, requestId);
            break;
          case "search_bills":
            result = await searchBills(arguments_, requestId);
            break;
          case "search_questions":
            result = await searchQuestions(arguments_, requestId);
            break;
          case "search_hansard":
            result = await searchHansard(arguments_, requestId);
            break;
          default:
            throw new ValidationError(`Unknown tool: ${toolName}`);
        }
        response = {
          jsonrpc: "2.0",
          id: data.id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        };
      } else {
        response = {
          jsonrpc: "2.0",
          id: data.id,
          error: {
            code: -32601,
            message: `Method not found: ${data.method}`
          }
        };
      }
      server.send(JSON.stringify(response));
    } catch (error) {
      logError("WebSocket error", { error, requestId });
      const errorResponse = {
        jsonrpc: "2.0",
        id: event.data?.id || null,
        error: {
          code: -32603,
          message: error.message
        }
      };
      server.send(JSON.stringify(errorResponse));
    }
  });
  return new Response(null, {
    status: 101,
    webSocket: client
  });
}
__name(handleWebSocket, "handleWebSocket");
var worker_default = {
  async fetch(request, env, ctx) {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    const method = request.method;
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "unknown";
    try {
      logInfo("Request received", { method, url: url.pathname, ip, requestId });
      if (method === "OPTIONS") {
        return new Response(null, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Upgrade, Connection",
            "Access-Control-Max-Age": "86400"
          }
        });
      }
      if (url.pathname.endsWith("/mcp")) {
        const upgradeHeader = request.headers.get("Upgrade");
        if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
          return handleWebSocket(request, requestId);
        }
        return new Response(
          JSON.stringify({
            message: "This endpoint supports WebSocket connections for MCP protocol",
            usage: "Connect via WebSocket with MCP JSON-RPC messages",
            protocol: "MCP 2024-11-05",
            auth: "none"
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
      if (url.pathname.endsWith("/health")) {
        return new Response(
          JSON.stringify({
            status: "healthy",
            service: "LegCo Search MCP Server",
            version: "0.1.0",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            requestId
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
      if (url.pathname.endsWith("/sse")) {
        if (method === "GET") {
          return new Response(
            JSON.stringify({
              message: "This endpoint expects POST requests for MCP tool calls. No authentication is required.",
              usage: 'POST /sse with { "method": "tools/call", ... }',
              auth: "none"
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }
        if (method !== "POST") {
          throw new ValidationError("Only POST requests are supported for MCP endpoint");
        }
        if (!checkRateLimit(ip)) {
          throw new RateLimitError(
            `Rate limit exceeded: ${RATE_LIMIT} requests per ${RATE_LIMIT_WINDOW} seconds.`,
            RATE_LIMIT_WINDOW
          );
        }
        let req;
        try {
          req = await request.json();
        } catch (error) {
          throw new ValidationError("Invalid JSON in request body");
        }
        if (req.method === "initialize") {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: req.id,
              result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                  tools: {
                    listChanged: false
                  }
                },
                serverInfo: {
                  name: "LegCo Search MCP Server",
                  version: "0.1.0"
                }
              },
              requestId,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        } else if (req.method === "tools/list") {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: req.id,
              result: {
                tools: [
                  {
                    name: "search_voting_results",
                    description: "Search voting results from LegCo meetings",
                    inputSchema: {
                      type: "object",
                      properties: {
                        meeting_type: { type: "string" },
                        start_date: { type: "string" },
                        end_date: { type: "string" },
                        member_name: { type: "string" },
                        motion_keywords: { type: "string" },
                        term_no: { type: "integer" },
                        top: { type: "integer", default: 100 },
                        skip: { type: "integer", default: 0 },
                        format: { type: "string", default: "json" }
                      }
                    }
                  },
                  {
                    name: "search_bills",
                    description: "Search bills from LegCo database",
                    inputSchema: {
                      type: "object",
                      properties: {
                        title_keywords: { type: "string" },
                        gazette_year: { type: "integer" },
                        gazette_start_date: { type: "string" },
                        gazette_end_date: { type: "string" },
                        top: { type: "integer", default: 100 },
                        skip: { type: "integer", default: 0 },
                        format: { type: "string", default: "json" }
                      }
                    }
                  },
                  {
                    name: "search_questions",
                    description: "Search questions at Council meetings",
                    inputSchema: {
                      type: "object",
                      properties: {
                        question_type: { type: "string", default: "oral" },
                        subject_keywords: { type: "string" },
                        member_name: { type: "string" },
                        meeting_date: { type: "string" },
                        year: { type: "integer" },
                        top: { type: "integer", default: 100 },
                        skip: { type: "integer", default: 0 },
                        format: { type: "string", default: "json" }
                      }
                    }
                  },
                  {
                    name: "search_hansard",
                    description: "Search Hansard (official records of proceedings)",
                    inputSchema: {
                      type: "object",
                      properties: {
                        hansard_type: { type: "string", default: "hansard" },
                        subject_keywords: { type: "string" },
                        speaker: { type: "string" },
                        meeting_date: { type: "string" },
                        year: { type: "integer" },
                        question_type: { type: "string" },
                        top: { type: "integer", default: 100 },
                        skip: { type: "integer", default: 0 },
                        format: { type: "string", default: "json" }
                      }
                    }
                  }
                ]
              },
              requestId,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        } else if (req.method === "tools/call") {
          const params = req.params || {};
          const toolName = params.name;
          const arguments_ = params.arguments || {};
          if (!toolName) {
            throw new ValidationError("Missing tool name in request");
          }
          let result;
          switch (toolName) {
            case "search_voting_results":
              result = await searchVotingResults(arguments_, requestId);
              break;
            case "search_bills":
              result = await searchBills(arguments_, requestId);
              break;
            case "search_questions":
              result = await searchQuestions(arguments_, requestId);
              break;
            case "search_hansard":
              result = await searchHansard(arguments_, requestId);
              break;
            default:
              throw new ValidationError(`Unknown tool: ${toolName}`);
          }
          logInfo("Tool call completed successfully", { toolName, requestId });
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: req.id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                  }
                ]
              },
              requestId,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        } else {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: req.id || null,
              error: {
                code: -32601,
                message: `Method not found: ${req.method}`
              },
              requestId,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }),
            {
              status: 404,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }
      }
      if (url.pathname.startsWith("/.well-known/oauth-authorization-server") || url.pathname.startsWith("/.well-known/openid-configuration")) {
        return new Response(
          JSON.stringify({
            error: "OAuth/OpenID Connect is not supported. This is an authless API."
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
      return new Response(
        JSON.stringify({
          service: "LegCo Search MCP Server",
          version: "0.1.0",
          description: "Hong Kong Legislative Council Search MCP Server",
          endpoints: {
            health: "/health",
            mcp_http: "/sse",
            mcp_websocket: "/mcp"
          },
          protocols: ["HTTP", "WebSocket"],
          auth: "none",
          requestId,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    } catch (error) {
      logError("Request failed", { error, method, url: url.pathname, ip, requestId });
      return createErrorResponse(error, requestId);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-0tk5fh/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-0tk5fh/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
