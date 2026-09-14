---
slug: build-a-simple-expense-tracker-that-allo
scope: full
deferred_features: []
stories_excluded_deferred: 0
flow_steps_verified: 12
flow_steps_total: 12
verified: 2026-09-14T08:04:13Z
build: passed
app_url: http://localhost:3000
smoke: passed
dead_links: 0
routes_failed: 0
test_attempts: 2
playwright_pass: 153
playwright_fail: 0
playwright_skip: 0
---

# UAT — Express Task: build-a-simple-expense-tracker-that-allo

**Verified:** 2026-09-14T08:04:13Z
**Build:** ✓ Passed
**Application:** http://localhost:3000

## Test Results

| Status | Count |
|--------|-------|
| ✓ Pass | 153 |
| ✗ Fail | 0 |
| — Skip | 0 |
| **Total** | **153** |

**Fix cycles used:** 2/10

Section breakdown: primary flow 12 · secondary flows 119 · technical checks 22.

## User Flow Coverage

Primary flow: JRN-01.1 — Daily Expense Capture (Maya Rodriguez)

| # | Step (what the user does) | Evidence (file:line) | Status |
|---|---------------------------|----------------------|--------|
| 1 | Opens the expense tracker in her browser | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:109 | pass |
| 2 | Sees an empty list inviting her to add her first expense | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:118 | pass |
| 3 | Sees the entry form with amount, description and category fields | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:126 | pass |
| 4 | Types the amount, what she bought, and the category | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:138 | pass |
| 5 | Clicks Add Expense and her latte appears in the list | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:150 | pass |
| 6 | Sees the running total pick up the new expense | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:164 | pass |
| 7 | Gets a confirmation and a cleared form ready for the next entry | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:174 | pass |
| 8 | Spots a typo, clicks Edit, and the form fills with current values | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:186 | pass |
| 9 | Can tell she is editing — button says Save Changes and Cancel appears | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:197 | pass |
| 10 | Corrects the amount, saves, and the row shows the corrected value | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:209 | pass |
| 11 | Sees the total recalculate to match the correction | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:225 | pass |
| 12 | After saving is confirmed and the form is back to adding new expenses | e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts:237 | pass |

All 12 primary-flow steps carry `file:line` evidence and a passing test. The flow now
includes the F1 edit journey (steps 8–12), which the previous UAT spec did not cover at all.

This table does not replace `## User Story Coverage` below: this one is per-STEP of the primary
flow, that one is per-STORY.

## User Story Coverage

| Story | Title | Status |
|-------|-------|--------|
| US-0.1 | Add a New Expense | pass |
| US-0.2 | Batch-Enter Multiple Expenses | pass |
| US-0.3 | Receive Validation Feedback on Expense Entry | pass |
| US-0.4 | Server-Side Validation of Expense Data | pass |
| US-1.1 | Edit an Existing Expense | pass |
| US-1.2 | Cancel Editing Without Saving | pass |
| US-1.3 | Edit Multiple Expenses in Sequence | pass |
| US-1.4 | Handle Editing a Non-Existent Expense | pass |
| US-2.1 | Data Survives Page Refresh | pass |
| US-2.2 | Data Survives Server Restart | pass |
| US-2.3 | Automatic Storage Initialization | pass |
| US-2.4 | Write-Before-Acknowledge Guarantee | pass |
| US-2.5 | Inspect Storage Directly | pass |
| US-3.1 | View All Expenses on Page Load | pass |
| US-3.2 | See Empty State When No Expenses Exist | pass |
| US-3.3 | List Updates Immediately After Mutations | pass |
| US-3.4 | Handle List Loading Errors Gracefully | pass |
| US-3.5 | Expense List Performance at Scale | pass |
| US-4.1 | View Running Total of All Expenses | pass |
| US-4.2 | Total Updates After Adding an Expense | pass |
| US-4.3 | Total Updates After Editing an Expense | pass |
| US-4.4 | Total Error State | pass |
| US-5.1 | Access Application via Browser | pass |
| US-5.2 | Single-Page Layout with Clear Hierarchy | pass |
| US-5.3 | Single-Command Server Startup | pass |
| US-5.4 | Responsive and Keyboard-Accessible Interface | pass |
| US-5.5 | Graceful Error Handling in the UI | pass |

27 of 27 stories tested. 0 excluded.

Two acceptance criteria are verified at the API layer rather than through the browser, because
the browser cannot produce the input: a non-numeric amount is blocked by `input type="number"`,
and over-length description/category are blocked by `maxlength`. Both rules are therefore
exercised against the server as a manipulated client would (US-0.3, US-0.4), which is where the
spec says authority lives. US-2.2 (server restart) is verified by reading the on-disk SQLite
file directly and asserting the API serves exactly what is on disk — the server is not killed
mid-run, which would terminate the UAT session itself.

## Deferred by scope decision

None — this run built full scope. `SCOPE-DECISION.md` records `scope: full` with
`deferred_scope.excluded_features: []` following the 2026-09-11 user override that reinstated
F1 (Expense Editing). All 6 features (F0–F5) and all 27 stories were in the built set, so the
deferred-exclusion pass dropped nothing.

## Failing Tests

None — all tests passed.

## Fix Cycles

**Cycle 1 — US-1.4: form cleared on a 404 during edit save.** Genuine application defect, not a
test artifact. The acceptance criterion requires "The form does not clear on a 404 error,
allowing the user to re-enter the data as a new expense if desired", and express plan 03 success
criterion 20 agrees ("404 on PUT shows 'Expense not found' toast, form retains values"). The
shipped `public/app.js` called `exitEditMode()` in the PUT 404 branch, and that function
unconditionally ran `form.reset()`, wiping the user's typed input.

Fix (`public/app.js`, commit `f31ac6d`): `exitEditMode(preserveInput)` now skips `form.reset()`
when preserving; the 404 branch passes `true`. Everything else in the exit path is unchanged, so
the form still returns to add-new state and a subsequent submit POSTs a new expense rather than
re-attempting the failed PUT. A latent bug was caught in the same change:
`cancelBtn.addEventListener('click', exitEditMode)` passed the click `Event` as the first
argument, which would have become a truthy `preserveInput` and silently stopped Cancel from
clearing the form — it is now wrapped in `function () { exitEditMode(); }`.

Regression check after the fix: 18/18 edit-story tests pass (including US-1.1 "form exits edit
mode and returns to add-new state" and US-1.2 "form returns to its default add-new state after
cancellation"), and the full suite went from 152/153 to 153/153.

## Route Smoke Test

| Check | Result |
|-------|--------|
| Dead links (404) | 0 |
| Failed routes (5xx) | 0 |

The app is a deliberate single-page layout (US-5.2: no tabs, navigation menus, or page
transitions), so the home document contains no internal page links to crawl. Both served routes
were probed directly: `GET /` → 200 and `GET /api/expenses` → 200.

## Playwright Report

Test file: `e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts` (153 tests, regenerated
this run — the prior version predated the F1 delta and had zero edit coverage with 10 of 27
stories untested)
Results: `playwright-results.json`
Config: `playwright.config.js` — chromium, `workers: 1` (serial, shared SQLite DB)

## Build Log

Build system: npm (Express + better-sqlite3, vanilla JS frontend)
Build attempts: 1/10
Build status: ✓ Passed

The project has no `build` script — it is a no-transpile Node server serving static assets, per
US-5.3 ("No separate build step, database migration command, or configuration file is required
before first run"). Build verification therefore ran `npm install` (clean) plus `node --check`
across `server.js`, `db/database.js`, `routes/expenses.js`, `middleware/*.js`, and
`public/app.js` — all clean. The app then started with the single command `npm start` and
answered on port 3000, which is the criterion that actually matters for this project.

## Next Steps

All acceptance criteria verified. Express task build-a-simple-expense-tracker-that-allo is
production-ready at full scope — 27 of 27 stories, 153 of 153 tests, 0 deferred.

To re-verify: `/pivota_spec-verify-express build-a-simple-expense-tracker-that-allo`
To investigate interactively: `npx playwright test e2e/uat/build-a-simple-expense-tracker-that-allo.spec.ts --headed`
