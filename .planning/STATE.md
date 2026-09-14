# Project State

**Workflow Mode:** spec-express
**Current Milestone:** v1
**Status:** in-progress
**Last activity:** 2026-09-14 - Built F1 (Expense Editing) delta for build-a-simple-expense-tracker-that-allo; scope now genuinely full (31 API + 59 E2E tests passing)

---

## Spec Documents

Spec documents were generated in `project_specs/` during initialization. Use `/pivota_spec-quick` for new work — the planner will automatically reference these docs.

## Express Plans Completed

| Plan | Description | Date | Commits | Duration |
|------|-------------|------|---------|----------|
| 01 | Project scaffold & SQLite storage layer | 2026-09-11 | 836389b, af5a968 | 2 min |
| 02 | REST API layer with validation and integration tests | 2026-09-11 | 64f5c9a, 560a494 | 3 min |
| 03 | Frontend UI with form, validation, list, and total | 2026-09-11 | bf6c2bd, 897255e | 3 min |
| 04 | Playwright E2E integration tests (10 tests, full journey) | 2026-09-11 | 11fdca6, db8f98f | 9 min |
| F1 delta | Expense Editing across all 4 waves (scope override) | 2026-09-14 | f8a07b4, 012719a, c051800, e6302ea | 12 min |

## Decisions

- Bound server to 0.0.0.0 for sandbox accessibility
- F1 (Expense Editing) IS built — user scope override (2026-09-14) reversed the earlier deferral; updateExpense + PUT /api/expenses/:id + edit-mode UI all implemented
- PUT validates the :id path param before the body, so a bad ID returns ERR_EXPENSE_INVALID_ID instead of body errors
- created_at is immutable on update; only updated_at advances
- All SQL uses parameterized prepared statements
- Helmet configured with frameguard:false, contentSecurityPolicy:false for iframe preview
- Used node:test built-in runner — no extra test dependencies
- server.js uses require.main guard for test importability
- All user text rendered via textContent (XSS prevention) — never innerHTML
- Total uses integer cents arithmetic; Intl.NumberFormat for display
- Client validation mirrors FRD Y2 error catalog; server is authoritative
- Chromium-only E2E testing — cross-browser deferred to R2 scope
- Direct SQLite DELETE in beforeEach for test isolation (not file deletion)
- Serial Playwright execution (workers: 1) for shared SQLite DB

## Quick Tasks Completed

| # | Description | Date | Commit | UAT | Directory |
|---|-------------|------|--------|-----|-----------|

### Express Tasks Completed

| # | Description | Date | Commit | Scope | UAT | Directory |
|---|-------------|------|--------|-------|-----|-----------|
| build-a-simple-expense-tracker-that-allo | Build a simple expense tracker with add, edit, view, and total features | 2026-09-14 | e6302ea | full (6/6) | 31 API + 59 E2E | [build-a-simple-expense-tracker-that-allo](./express/build-a-simple-expense-tracker-that-allo/) |

## Blockers/Concerns

(none)
