---
phase: express-build
plan: 02
subsystem: api
tags: [express, rest-api, validation, helmet, sqlite, integration-tests]

# Dependency graph
requires:
  - phase: express-build-01
    provides: "db/database.js (initialize, getAllExpenses, createExpense), server.js scaffold, package.json with deps"
provides:
  - "GET /api/expenses endpoint returning { expenses: [...] } ordered by created_at DESC"
  - "POST /api/expenses endpoint with dollar-to-cents conversion, validation, trimming"
  - "Validation middleware with all 9 FRD Y2 error codes"
  - "Global error handler with sanitized 500 responses"
  - "Helmet security headers on all responses"
  - "21 integration tests covering full API contract"
affects: [express-build-03, express-build-04]

# Tech tracking
tech-stack:
  added: [helmet, "node:test (built-in)"]
  patterns: ["Express Router pattern for API routes", "Middleware-based validation collecting all errors", "require.main guard for testable server entry point", "Dollar-to-cents conversion with Math.round"]

key-files:
  created:
    - middleware/validate.js
    - middleware/errorHandler.js
    - routes/expenses.js
    - tests/api.test.js
  modified:
    - server.js
    - package.json

key-decisions:
  - "Used helmet with frameguard:false, contentSecurityPolicy:false to allow preview iframe embedding"
  - "Used node:test built-in test runner (Node 20+) — no extra test dependency needed"
  - "Made app.listen conditional with require.main === module for test importability"
  - "Tagged read errors in route handler for error handler classification"

patterns-established:
  - "Express Router: routes/*.js exports router, server.js mounts at /api/* path"
  - "Validation middleware: collect ALL errors before responding, return { errors: [...] }"
  - "Error handler: log full error server-side, return sanitized { error: { code, message } }"
  - "Integration tests: use node:test + http module, test server on random port, isolated DB"

# Metrics
duration: 3min
completed: 2026-09-11
---

# Plan 02: Express REST API Layer Summary

**GET/POST /api/expenses endpoints with 9-code FRD Y2 validation, dollar-to-cents conversion, helmet security headers, and 21 integration tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-11T11:49:55Z
- **Completed:** 2026-09-11T11:52:57Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Built complete REST API surface: GET /api/expenses (list, ordered DESC) and POST /api/expenses (create with validation)
- Implemented all 9 FRD Y2 validation error codes with simultaneous multi-error response
- Added dollar-to-cents conversion (Math.round) and description/category trimming
- Configured helmet security headers (with iframe-friendly settings for sandbox preview)
- Created 21 integration tests covering happy paths, all validation codes, error format, security headers, and PUT-absent verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Validation middleware, API routes, and error handler** - `64f5c9a` (feat)
2. **Task 2: Integration tests for API endpoints** - `560a494` (test)

## Files Created/Modified
- `middleware/validate.js` - Input validation with all 9 FRD Y2 error codes
- `middleware/errorHandler.js` - Global error handler with sanitized 500 responses
- `routes/expenses.js` - Express router with GET and POST /api/expenses
- `tests/api.test.js` - 21 integration tests using node:test
- `server.js` - Updated with helmet, route mounting, error handler, require.main guard
- `package.json` - Added npm test script

## Decisions Made
- Used `helmet({ frameguard: false, contentSecurityPolicy: false })` to allow preview iframe embedding per database_contract constraint
- Used Node.js built-in `node:test` runner (Node 20+) instead of installing jest/vitest — zero extra dependencies
- Added `require.main === module` guard to `server.js` so tests can import the app without triggering `app.listen()` on port 3000
- Tagged read errors with `'read: '` prefix in route handler for error handler classification (ERR_STORAGE_READ vs ERR_STORAGE_WRITE)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Made server.js testable with require.main guard**
- **Found during:** Task 2 (Integration tests)
- **Issue:** `server.js` calls `app.listen()` at require-time, which conflicts with test server needing its own port
- **Fix:** Wrapped `app.listen()` in `if (require.main === module)` guard so tests can `require('../server')` without auto-binding
- **Files modified:** server.js
- **Verification:** `npm test` passes (21/21); standalone `node server.js` still starts correctly
- **Committed in:** 560a494 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for testability. No scope creep — the plan's server.js update already changed the file; this adds the standard Node.js test-compatibility pattern.

## Known Stubs

None found.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API layer complete and tested, ready for Wave 3 (frontend UI)
- Frontend can consume GET /api/expenses and POST /api/expenses from same origin
- Static files served from public/ directory (currently empty, ready for frontend assets)

---
*Phase: express-build*
*Completed: 2026-09-11*

## Self-Check: PASSED
- All 4 created files exist on disk
- Both task commits (64f5c9a, 560a494) found in git log
- Build check: `npm test` → exit 0 (21/21 tests pass)
- Known Stubs section present, no blocking stubs
