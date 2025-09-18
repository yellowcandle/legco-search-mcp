# Tasks: Update MCP Server to Latest Version

**Input**: Design documents from `/specs/001-update-this-mcp/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: tech stack (TypeScript/ES modules), libraries (Cloudflare Agents SDK), structure (single project)
2. Load optional design documents:
   → data-model.md: Extract entities (MCPVersion, ServerConfiguration, ClientCompatibility, PerformanceMetrics)
   → contracts/: Each file → contract test task [P] (health-check.json, mcp-initialize.json, version-info.json)
   → research.md: Extract decisions (Agents SDK migration, OAuth integration, Durable Objects)
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, McpAgent migration, OAuth setup
   → Integration: transport compatibility, state management
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Install Cloudflare Agents SDK dependency in package.json
- [ ] T002 [P] Configure Durable Objects for agent state management in wrangler.toml
- [ ] T003 [P] Set up OAuth provider configuration in wrangler.toml
- [ ] T004 [P] Update TypeScript configuration for Agents SDK in tsconfig.json

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T005 [P] Contract test health-check.json in tests/contract/test-health-check.js
- [ ] T006 [P] Contract test mcp-initialize.json in tests/contract/test-mcp-initialize.js
- [ ] T007 [P] Contract test version-info.json in tests/contract/test-version-info.js
- [ ] T008 [P] Integration test MCP protocol version negotiation in tests/integration/test-protocol-negotiation.js
- [ ] T009 [P] Integration test OAuth authentication flow in tests/integration/test-oauth-flow.js
- [ ] T010 [P] Integration test multi-transport compatibility in tests/integration/test-transport-compatibility.js

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T011 Create MCPVersion entity model in src/models/mcp-version.ts
- [ ] T012 Create ServerConfiguration entity model in src/models/server-configuration.ts
- [ ] T013 Create ClientCompatibility entity model in src/models/client-compatibility.ts
- [ ] T014 Create PerformanceMetrics entity model in src/models/performance-metrics.ts
- [ ] T015 Migrate to McpAgent class in src/worker.ts (replace direct MCP implementation)
- [ ] T016 Implement OAuth authentication integration in src/auth/oauth.ts
- [ ] T017 Migrate state management to Durable Objects SQL in src/state/durable-objects.ts
- [ ] T018 Update MCP tool definitions with Zod schemas in src/tools/tool-definitions.ts
- [ ] T019 Implement resource subscriptions and notifications in src/tools/resource-subscriptions.ts
- [ ] T020 Add progress notifications for long-running requests in src/tools/progress-notifications.ts

## Phase 3.4: Integration
- [ ] T021 Update SSE transport handler for Agents SDK in src/transports/sse-handler.ts
- [ ] T022 Update WebSocket transport handler for Agents SDK in src/transports/websocket-handler.ts
- [ ] T023 Update HTTP transport handler for Agents SDK in src/transports/http-handler.ts
- [ ] T024 Implement MCP ping support for liveness checking in src/handlers/ping-handler.ts
- [ ] T025 Add enhanced logging levels and annotations in src/logging/enhanced-logging.ts
- [ ] T026 Update health check endpoint with version info in src/health/health-check.ts

## Phase 3.5: Polish
- [ ] T027 [P] Unit tests for MCPVersion entity in tests/unit/test-mcp-version.ts
- [ ] T028 [P] Unit tests for ServerConfiguration entity in tests/unit/test-server-configuration.ts
- [ ] T029 [P] Unit tests for ClientCompatibility entity in tests/unit/test-client-compatibility.ts
- [ ] T030 [P] Unit tests for PerformanceMetrics entity in tests/unit/test-performance-metrics.ts
- [ ] T031 [P] Unit tests for McpAgent migration in tests/unit/test-mcp-agent.ts
- [ ] T032 [P] Unit tests for OAuth integration in tests/unit/test-oauth.ts
- [ ] T033 Performance validation (<100ms health checks) in tests/performance/test-health-check-performance.js
- [ ] T034 End-to-end protocol compliance testing in tests/e2e/test-protocol-compliance.js
- [ ] T035 [P] Update README.md with Agents SDK architecture documentation
- [ ] T036 [P] Update CLAUDE.md with McpAgent usage and OAuth integration
- [ ] T037 [P] Update AGENTS.md with new capabilities and state management
- [ ] T038 Run manual-testing.md scenarios for validation
- [ ] T039 Deploy to staging environment and validate
- [ ] T040 Deploy to production with rollback capability

## Dependencies
- Tests (T005-T010) before implementation (T011-T026)
- T011-T014 blocks T015 (entity models before McpAgent migration)
- T015 blocks T016-T017 (McpAgent before OAuth and state management)
- T016 blocks T021-T023 (OAuth before transport updates)
- T017 blocks T018-T020 (state management before tool enhancements)
- Implementation before polish (T027-T040)

## Parallel Example
```
# Launch T005-T010 together:
Task: "Contract test health-check.json in tests/contract/test-health-check.js"
Task: "Contract test mcp-initialize.json in tests/contract/test-mcp-initialize.js"
Task: "Contract test version-info.json in tests/contract/test-version-info.js"
Task: "Integration test MCP protocol version negotiation in tests/integration/test-protocol-negotiation.js"
Task: "Integration test OAuth authentication flow in tests/integration/test-oauth-flow.js"
Task: "Integration test multi-transport compatibility in tests/integration/test-transport-compatibility.js"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P] (health-check.json, mcp-initialize.json, version-info.json)
   - Each endpoint → implementation task

2. **From Data Model**:
   - Each entity → model creation task [P] (MCPVersion, ServerConfiguration, ClientCompatibility, PerformanceMetrics)
   - Relationships → service layer tasks

3. **From User Stories**:
   - Each story → integration test [P] (protocol negotiation, OAuth flow, transport compatibility)
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → McpAgent Migration → OAuth → State Management → Tools → Transports → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (health-check, mcp-initialize, version-info)
- [x] All entities have model tasks (MCPVersion, ServerConfiguration, ClientCompatibility, PerformanceMetrics)
- [x] All tests come before implementation (TDD principle)
- [x] Parallel tasks truly independent (different files, no shared state)
- [x] Each task specifies exact file path (e.g., src/models/mcp-version.ts)
- [x] No task modifies same file as another [P] task (file-level isolation)