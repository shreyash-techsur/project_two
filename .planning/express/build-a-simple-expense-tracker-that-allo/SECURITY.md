# Security Report — Express: build-a-simple-expense-tracker-that-allo

**Mode:** retroactive
**Audited:** 2026-09-11
**Verdict:** SECURED
**Confirmed HIGH/CRITICAL:** 0

## Summary

The expense tracker implements a small, well-structured attack surface with sound security fundamentals. All SQLite queries use parameterized statements, eliminating SQL injection. The frontend renders user-controlled data exclusively via `textContent`, preventing XSS. Server-side validation is thorough with correct type checks, range bounds, and length limits. The error handler sanitizes all 500 responses, preventing information disclosure. No HIGH or CRITICAL issues were confirmed. Several MEDIUM and LOW findings relate to missing defense-in-depth (disabled CSP/frameguard, no rate limiting, unbounded query results) and minor information disclosure (committed test artifacts with internal paths). These are documented as accepted risks below given the single-user, no-auth design scope.

## Attack surface audited

| Area | STRIDE | Verdict | Evidence (file:line) |
|------|--------|---------|----------------------|
| SQL injection — INSERT | Tampering | ✅ Safe | `db/database.js:82-87` — parameterized `?` placeholders in `insertStmt.run()` |
| SQL injection — SELECT | Tampering | ✅ Safe | `db/database.js:55-60` — static query, no user input interpolated |
| XSS — frontend rendering | Tampering | ✅ Safe | `public/app.js:244,248` — all user data rendered via `textContent` |
| XSS — innerHTML usage | Tampering | ✅ Safe | `public/app.js:28,49,222` — `innerHTML` only set to empty string `''` |
| Input validation bypass — amount type | Tampering | ✅ Safe | `middleware/validate.js:15` — `typeof !== 'number' \|\| isNaN()` blocks strings and NaN |
| Input validation bypass — Infinity | Tampering | ✅ Safe | `middleware/validate.js:21` — `amount > 999999.99` catches Infinity; line 18 catches -Infinity |
| Input validation bypass — precision | Tampering | ✅ Safe | `middleware/validate.js:25-29` — string-based decimal check |
| Input validation — description length | Tampering | ✅ Safe | `middleware/validate.js:41` — capped at 500 chars with type check |
| Input validation — category length | Tampering | ✅ Safe | `middleware/validate.js:55` — capped at 100 chars with type check |
| DB CHECK constraints (defense-in-depth) | Tampering | ✅ Safe | `db/database.js:32-34` — DB-level CHECK constraints mirror app validation |
| Error info disclosure | Info Disclosure | ✅ Safe | `middleware/errorHandler.js:20-22` — generic error codes/messages, no stack/path leakage |
| Path traversal — static files | Tampering | ✅ Safe | `server.js:29` — `express.static()` with `path.join(__dirname, 'public')` — Express blocks `..` traversal |
| Path traversal — DB_PATH env var | Tampering | ✅ Safe (not HTTP-reachable) | `db/database.js:16` — set via env var at startup, not user-controlled |
| Prototype pollution via JSON body | Tampering | ✅ Safe | `server.js:26` — `express.json()` uses `JSON.parse`, not vulnerable to `__proto__` injection |
| Secret/token leakage | Info Disclosure | ✅ Safe | No secrets, API keys, or tokens in codebase; no `.env` files committed |
| Auth/authz boundaries | Spoofing / EoP | N/A — by design | No authentication; intentional single-user app per scope |
| Helmet security headers | Defense-in-depth | ⚠️ Accepted risk | `server.js:23` — `frameguard:false, contentSecurityPolicy:false` — see AR-01, AR-02 |
| Rate limiting — POST endpoint | DoS | ⚠️ Accepted risk | No rate limiter on `POST /api/expenses` — see AR-03 |
| Unbounded GET response | DoS | ⚠️ Accepted risk | `db/database.js:55-60` — `SELECT` with no `LIMIT` — see AR-04 |
| Committed test artifacts | Info Disclosure | ⚠️ Low | `playwright-results.json` committed with internal paths — see AR-05 |

## Confirmed findings

None — no confirmed HIGH/CRITICAL findings.

All candidate issues were either refuted (safe by implementation) or classified as accepted LOW/MEDIUM risks appropriate for the application's scope (single-user, no-auth, local-use expense tracker).

## Resolved findings

None — first audit.

## Accepted risks

| ID | Severity | Risk | Why accepted | Owner |
|----|----------|------|--------------|-------|
| AR-01 | LOW | **CSP disabled** (`contentSecurityPolicy: false` at `server.js:23`). No Content-Security-Policy header is sent, removing defense-in-depth against XSS. | Intentional for iframe preview embedding per TechArch §5. No current XSS vector exists — all user data rendered via `textContent`. If edit/delete features (F1) are added with new rendering paths, CSP should be re-evaluated. | Phase owner |
| AR-02 | LOW | **Frameguard disabled** (`frameguard: false` at `server.js:23`). App can be embedded in iframes, enabling clickjacking. | Intentional for iframe preview. Impact is minimal — no authentication, no destructive actions. An attacker could only trick a user into adding expenses to their own tracker. | Phase owner |
| AR-03 | MEDIUM | **No rate limiting on POST** (`routes/expenses.js:23`). An unauthenticated attacker can send unlimited POST requests to fill the SQLite database. | Single-user app with no auth by design. Body is limited to ~100KB by `express.json()` defaults. DB CHECK constraints prevent oversized individual records. In production, a reverse proxy or `express-rate-limit` should be added. | Phase owner |
| AR-04 | MEDIUM | **Unbounded GET response** (`db/database.js:55-60`). `getAllExpenses()` returns every row with no `LIMIT` or pagination. After sustained POST abuse (AR-03), a GET could return a very large JSON response causing memory pressure. | Acceptable for single-user scope. At 500 chars/description + 100 chars/category, ~100K rows would produce ~60MB response. Real risk requires AR-03 (no rate limit) to be exploited first. Pagination should be added if the app scales. | Phase owner |
| AR-05 | LOW | **Test artifact committed** (`playwright-results.json`). Contains absolute sandbox paths (e.g., `/home/daytona/project/...`). No secrets, but leaks build environment structure. | No credentials or tokens present. Internal paths have limited value to an attacker. Should be added to `.gitignore` to prevent future commits. | Phase owner |

## Audit trail

- **Diff scoped via:** `git diff --stat main...HEAD` — 27 files changed, 6294 insertions
- **Register:** built retroactively from diff; all new routes, middleware, DB queries, static serving, and frontend rendering examined
- **Refutation:** 19 candidate areas examined across STRIDE categories; 0 confirmed HIGH/CRITICAL; 5 accepted as LOW/MEDIUM risk; 14 verified safe with file:line evidence
- **Key verifications performed:**
  - SQL injection: confirmed parameterized queries at `db/database.js:82-87` and static query at `db/database.js:55-60`
  - XSS: confirmed `textContent` usage for all user data at `public/app.js:244,248`; `innerHTML` only used with empty string
  - Input validation: confirmed type checks, NaN/Infinity handling, precision check, length limits at `middleware/validate.js:13-58`
  - Error handling: confirmed sanitized responses at `middleware/errorHandler.js:20-22`
  - No `exec`, `spawn`, `eval`, `child_process`, `Function()` calls found in application code
  - No prototype pollution vector: `express.json()` uses safe `JSON.parse`
  - No secrets, `.env` files, or credentials committed
