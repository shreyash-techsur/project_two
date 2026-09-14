---
slug: build-a-simple-expense-tracker-that-allo
description: Build a simple expense tracker with add, edit, view, and total features
scope: full
deferred_features: []
date: 2026-09-14
total_plans: 4
total_waves: 4
---

# Express Task: Build a simple expense tracker — Summary

## Execution Overview

**Scope:** Full — nothing cut. All 6 P0 features (F0–F5) are built, including F1 (Expense Editing), which was restored by the user scope override recorded in `SCOPE-DECISION.md`.
**Plans:** 4 across 4 waves
**Date:** 2026-09-14

### Wave Breakdown

| Wave | Plans | Domain | Status |
|------|-------|--------|--------|
| 1 | 01 | database | ✓ Complete |
| 2 | 02 | backend | ✓ Complete |
| 3 | 03 | frontend | ✓ Complete |
| 4 | 04 | integration | ✓ Complete |

### Execution Note — F1 delta run (2026-09-14)

Waves 1–4 were originally executed on 2026-09-11 against a plan set in which F1
(Expense Editing) was **deferred**. The plans and `SCOPE-DECISION.md` were then
rewritten (commit `d3bc25c`) to **include** F1, but no execution followed, so the
committed code did not implement the plans on disk.

The resume gate could not detect this: every plan had both a summary and a matching
commit, so a re-run would have skipped all four waves and reported success against a
build that was missing a feature. This run closed that gap by implementing only the
F1 delta, leaving the already-verified F0/F2/F3/F4/F5 work untouched.

| Wave | F1 delta applied | Commit |
|------|------------------|--------|
| 1 | `updateExpense(id, {...})` in `db/database.js` | `f8a07b4` |
| 2 | `PUT /api/expenses/:id` + ID validation; replaced the obsolete "PUT returns 404" test with 11 PUT tests | `012719a` |
| 3 | Edit button per row, form pre-population, Save Changes/Cancel, edit indicator | `c051800` |
| 4 | 8 E2E tests for the edit journey | `e6302ea` |

### Per-Plan Details

**01 (wave 1, database):** SQLite schema, storage layer, and project scaffold.
- `db/database.js` exports `initialize`, `getAllExpenses`, `createExpense`, `updateExpense`
- `updateExpense` returns the updated row, or `null` when the ID does not exist
- `created_at` is immutable on update; `updated_at` is refreshed

**02 (wave 2, backend):** Express REST API with validation and error handling.
- `GET /api/expenses`, `POST /api/expenses`, `PUT /api/expenses/:id`
- ID validation runs before body validation, so a malformed ID reports
  `ERR_EXPENSE_INVALID_ID` rather than being masked by body errors
- 31 integration tests passing

**03 (wave 3, frontend):** Single-page UI with add and edit modes.
- Per-row Edit button; form pre-populates with current values (cents → dollars)
- `Save Changes` / `Cancel`; Cancel makes no server call
- `.editing-row` highlight and `#edit-indicator` banner mark edit mode
- All user text rendered via `textContent` (XSS prevention)

**04 (wave 4, integration):** Playwright E2E coverage.
- 18 tests in `e2e/expense-tracker.spec.js`, including 8 for the edit flow
- 59 tests passing across the full Playwright run (includes the UAT spec)

### Aggregated Stats

- **API integration tests:** 31 passing
- **E2E tests:** 59 passing (18 in the main spec + UAT spec)
- **Total commits (F1 delta):** 4

### Deviations

1. **Plan 02 middleware order (Rule 1 — auto-fixed).** The plan placed
   `validateExpenseInput` before the ID check on the PUT route, which would let body
   errors mask an invalid ID and contradict the FRD's `ERR_EXPENSE_INVALID_ID` case.
   ID validation was extracted into a `validateExpenseId` middleware that runs first.
   Covered by the test "reports an invalid ID rather than body errors when both are invalid".

2. **Obsolete test replaced.** `tests/api.test.js` asserted `PUT /api/expenses/1`
   returns 404 because no PUT endpoint existed. That assertion contradicts F1 and was
   replaced by a `PUT /api/expenses/:id` suite.

3. **Contract verify commands — 2 spurious failures (not fixed, documented).**
   The `verify:` commands in plans 03 and 04 grep `public/style.css` for
   `#expense-form` / `#expense-list`. The stylesheet has always targeted
   `.form-section` / `.list-section` instead, so these commands fail against correct
   code. Pre-existing and cosmetic; the styling itself is correct.

### Environment notes

This sandbox started without `node_modules`, the Playwright Chromium binary, or its
system libraries. `npm install`, `npx playwright install chromium`, and
`npx playwright install-deps chromium` were run to make verification possible.
