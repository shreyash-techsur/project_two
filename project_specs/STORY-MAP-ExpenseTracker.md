# User Story Map
## Expense Tracker

| Field | Value |
|-------|-------|
| **Product Name** | Expense Tracker |
| **Date** | 2026-09-11 |
| **Related Personas** | PERSONAS-ExpenseTracker.md |
| **Related Journeys** | JOURNEYS-ExpenseTracker.md |
| **Related JTBD** | JTBD-ExpenseTracker.md |
| **Related User Stories** | UserStories-ExpenseTracker.md |
| **Related PRD** | PRD-ExpenseTracker.md |

---

## Overview

This story map organizes the 27 user stories from UserStories-ExpenseTracker.md along two dimensions: the horizontal axis represents journey stages that users traverse (from JOURNEYS-ExpenseTracker.md), and the vertical axis represents detail level within each stage. Each story is annotated with a **Natural Acceptance Criterion (NaC)** — a testable statement derived from the intersection of a JTBD outcome (what matters to the user) and the journey stage (when/where it matters). NaC bridge the gap between abstract job outcomes and concrete, verifiable story acceptance criteria.

**Release structure:** All 27 stories are P0 (MVP). They are organized into two releases based on journey completeness:
- **R1 — Core Workflow:** Stories that enable the primary add → review → edit → verify journey for all three personas. A user can enter expenses, see them listed, edit mistakes, and trust the data persists.
- **R2 — Robustness & Scale:** Stories that harden error handling, ensure performance at scale, and enable multi-device confidence. These extend journey depth without breaking existing flows.

---

## Story Map Matrix

### PER-01: Maya Rodriguez
**Journey:** JRN-01.1 (Daily Expense Capture) + JRN-01.2 (Correcting a Mistaken Entry)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Open app in browser, navigate to bookmarked URL | PER-01 | Epic 5 (F5) | US-5.1: Access Application via Browser | JTBD-01.1: App loads in browser with no install — user reaches the form in under 5s | R1 |
| Scan page — see form, list, and running total at a glance | PER-01 | Epic 5 (F5) | US-5.2: Single-Page Layout with Clear Hierarchy | JTBD-01.2: Form, list, and total are all visible on one page without navigation | R1 |
| Enter amount, description, category, and submit | PER-01 | Epic 0 (F0) | US-0.1: Add a New Expense | JTBD-01.1: Full expense entry completes in under 10s; new entry appears in list within 1s | R1 |
| See validation feedback on invalid input | PER-01 | Epic 0 (F0) | US-0.3: Receive Validation Feedback on Expense Entry | JTBD-01.1: Inline errors appear without discarding entered data, so entry flow isn't interrupted | R1 |
| Glance at cumulative total to gauge spending pace | PER-01 | Epic 4 (F4) | US-4.1: View Running Total of All Expenses | JTBD-01.2: Running total visible without scrolling, formatted as currency | R1 |
| See total update after adding an expense | PER-01 | Epic 4 (F4) | US-4.2: Total Updates After Adding an Expense | JTBD-01.2: Total reflects correct sum within 1s of submission — no manual refresh | R1 |
| Scan expense list, notice wrong amount on an entry | PER-01 | Epic 3 (F3) | US-3.1: View All Expenses on Page Load | JTBD-01.3: All expenses visible on load with amount, description, category per row | R1 |
| See friendly message when no expenses exist yet | PER-01 | Epic 3 (F3) | US-3.2: See Empty State When No Expenses Exist | JTBD-01.1: Empty state guides user to add first expense — form remains functional | R1 |
| Click edit on incorrect expense, form pre-populates | PER-01 | Epic 1 (F1) | US-1.1: Edit an Existing Expense | JTBD-01.3: Edit populates form with current values; corrected entry and total update within 2s | R1 |
| See total recalculate after editing an amount | PER-01 | Epic 4 (F4) | US-4.3: Total Updates After Editing an Expense | JTBD-01.3: Total adjusts immediately after edit — old amount removed, new amount added | R1 |
| Refresh browser next morning, all entries intact | PER-01 | Epic 2 (F2) | US-2.1: Data Survives Page Refresh | JTBD-01.1: All previously entered expenses are listed after browser refresh — zero loss | R1 |
| Use keyboard to navigate form fields and submit | PER-01 | Epic 5 (F5) | US-5.4: Responsive and Keyboard-Accessible Interface | JTBD-01.1: Tab order follows amount → description → category → submit; Enter submits | R2 |

### PER-02: Tom Langford
**Journey:** JRN-02.1 (Sunday Batch Receipt Entry) + JRN-02.2 (Post-Batch Error Correction and Reconciliation)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Open app, see last week's entries still present | PER-02 | Epic 2 (F2) | US-2.2: Data Survives Server Restart | JTBD-02.1: All expenses persist across server stop/start — zero loss between weekly sessions | R1 |
| Enter first receipt, see it appear in list immediately | PER-02 | Epic 0 (F0) | US-0.2: Batch-Enter Multiple Expenses | JTBD-02.1: Each expense persisted server-side before confirmation; form clears and refocuses for next entry | R1 |
| Know each entry is written to disk before confirmation | PER-02 | Epic 2 (F2) | US-2.4: Write-Before-Acknowledge Guarantee | JTBD-02.1: Server responds only after durable write — no phantom entries that vanish | R1 |
| See list update in real time during batch entry | PER-02 | Epic 3 (F3) | US-3.3: List Updates Immediately After Mutations | JTBD-02.1: New entries appear without page reload; no duplicates after add or edit | R1 |
| Spot transposed digits in list, click edit to fix | PER-02 | Epic 1 (F1) | US-1.3: Edit Multiple Expenses in Sequence | JTBD-02.2: Sequential edits persist independently; list and total reflect each correction immediately | R1 |
| Cancel an accidental edit without saving | PER-02 | Epic 1 (F1) | US-1.2: Cancel Editing Without Saving | JTBD-02.2: Cancel discards changes — original values remain intact, no server request made | R1 |
| Compare on-screen total against manual receipt sum | PER-02 | Epic 4 (F4) | US-4.3: Total Updates After Editing an Expense | JTBD-02.3: Total recalculates after each edit — matches manual sum for reconciliation | R1 |
| See clear error messages when something goes wrong | PER-02 | Epic 5 (F5) | US-5.5: Graceful Error Handling in the UI | JTBD-02.1: Non-technical messages for server/network errors; user knows whether to retry | R2 |
| Load 500+ expenses in under 1 second for review | PER-02 | Epic 3 (F3) | US-3.5: Expense List Performance at Scale | JTBD-02.3: Full list renders within 1s for 500+ entries — weekly reviews stay fast after months | R2 |

### PER-03: Priya Nair
**Journey:** JRN-03.1 (First-Time Self-Hosted Setup and Verification) + JRN-03.2 (Multi-Device Daily Tracking)

| Activity | Persona | Epic | Stories | NaC | Release |
|----------|---------|------|---------|-----|---------|
| Run single terminal command to start app | PER-03 | Epic 5 (F5) | US-5.3: Single-Command Server Startup | JTBD-03.1: One command starts server + UI; accessible at local URL within 10s, zero config | R1 |
| Storage auto-initializes on first run | PER-03 | Epic 2 (F2) | US-2.3: Automatic Storage Initialization | JTBD-03.1: Storage file/schema created automatically — no manual DB setup or migration | R1 |
| Enter test expense, verify it appears in list | PER-03 | Epic 0 (F0) | US-0.1: Add a New Expense | JTBD-03.1: Entry via web form works immediately after first start — form → list → total cycle functional | R1 |
| Server validates data independently of browser | PER-03 | Epic 0 (F0) | US-0.4: Server-Side Validation of Expense Data | JTBD-03.2: Server rejects invalid data with structured error codes — integrity enforced even if client bypassed | R1 |
| Query storage file directly from terminal | PER-03 | Epic 2 (F2) | US-2.5: Inspect Storage Directly | JTBD-03.2: Standard format (SQLite/JSON); queryable with `sqlite3`/`cat`; data matches UI 100% | R1 |
| Receive clear error on editing a deleted/missing expense | PER-03 | Epic 1 (F1) | US-1.4: Handle Editing a Non-Existent Expense | JTBD-03.2: 404 with ERR_EXPENSE_NOT_FOUND — clear error, form preserved for re-entry | R1 |
| See error state if expense list fails to load | PER-03 | Epic 3 (F3) | US-3.4: Handle List Loading Errors Gracefully | JTBD-03.2: Meaningful error message + retry option — no broken/empty table on failure | R2 |
| See error state if total cannot be calculated | PER-03 | Epic 4 (F4) | US-4.4: Total Error State | JTBD-03.2: Total shows "—" or error text on failure — never displays stale value | R2 |

---

## NaC Derivation Table

| JTBD ID | Outcome | Journey Stage | NaC | Story |
|---------|---------|---------------|-----|-------|
| JTBD-01.1 | Expense recorded in under 10 seconds | JRN-01.1: Enter First Expense | Full entry (amount + description + category + submit) completes in under 10s; new entry appears in list within 1s | US-0.1 |
| JTBD-01.1 | Expense recorded in under 10 seconds | JRN-01.1: Enter First Expense | Inline validation errors appear without discarding entered data | US-0.3 |
| JTBD-01.1 | Expense recorded in under 10 seconds | JRN-01.1: Arrive | App loads in browser via URL with no install; form reachable in under 5s | US-5.1 |
| JTBD-01.1 | Expense recorded in under 10 seconds | JRN-01.1: Enter Second Expense | Form clears and is ready for next entry within 1s; tab order logical | US-5.4 |
| JTBD-01.1 | Minimize time to start work | JRN-01.1: Orient | Empty state guides user to add first expense; form is functional | US-3.2 |
| JTBD-01.1 | Expense recorded in under 10 seconds | JRN-01.1: Monitor | All previously entered expenses listed after browser refresh — zero loss | US-2.1 |
| JTBD-01.2 | Running total always visible and current | JRN-01.1: Orient | Form, list, and total visible on one page without navigation | US-5.2 |
| JTBD-01.2 | Running total always visible and current | JRN-01.1: Monitor | Running total visible without scrolling, formatted as currency with 2 decimal places | US-4.1 |
| JTBD-01.2 | Running total always visible and current | JRN-01.1: Enter Second Expense | Total reflects correct sum within 1s of submission — no manual refresh | US-4.2 |
| JTBD-01.3 | Entry corrected in place within 2 seconds | JRN-01.2: Spot Error | All expenses visible on load with amount, description, and category per row | US-3.1 |
| JTBD-01.3 | Entry corrected in place within 2 seconds | JRN-01.2: Correct Values | Edit populates form with current values; corrected entry and total update within 2s | US-1.1 |
| JTBD-01.3 | Entry corrected in place within 2 seconds | JRN-01.2: Verify Correction | Total adjusts immediately — old amount removed, new amount added | US-4.3 |
| JTBD-02.1 | Zero entries lost during batch session | JRN-02.1: Begin Batch | Each expense persisted to server before UI confirms; form clears and refocuses for next | US-0.2 |
| JTBD-02.1 | Zero entries lost during batch session | JRN-02.1: Continue Batch | Server responds only after durable write — no phantom entries | US-2.4 |
| JTBD-02.1 | Zero entries lost during batch session | JRN-02.1: Continue Batch | New entries appear in list without page reload; no duplicates | US-3.3 |
| JTBD-02.1 | Zero entries lost during batch session | JRN-02.1: Prepare | All expenses persist across server stop/start — zero loss between weekly sessions | US-2.2 |
| JTBD-02.1 | Zero entries lost during batch session | JRN-02.1: Finish Session | Non-technical error messages for server/network failures; user knows whether to retry | US-5.5 |
| JTBD-02.2 | Sequential edits persist correctly | JRN-02.2: Fix Errors in Sequence | Sequential edits persist independently; list and total reflect each correction immediately | US-1.3 |
| JTBD-02.2 | Sequential edits persist correctly | JRN-02.2: Fix Errors in Sequence | Cancel discards changes — original values intact, no server request | US-1.2 |
| JTBD-02.3 | Full list loads in under 1 second at scale | JRN-02.2: Verify Total | Total recalculates after each edit — matches manual receipt sum | US-4.3 |
| JTBD-02.3 | Full list loads in under 1 second at scale | JRN-02.2: Begin Reconciliation | Full list renders within 1s for 500+ entries | US-3.5 |
| JTBD-03.1 | Single-command startup with zero config | JRN-03.1: Install | One command starts server + UI; accessible within 10s, zero config | US-5.3 |
| JTBD-03.1 | Single-command startup with zero config | JRN-03.1: Test Entry | Storage auto-initializes on first run — no manual DB setup | US-2.3 |
| JTBD-03.2 | Storage file is inspectable and consistent | JRN-03.1: Inspect Storage | Standard format (SQLite/JSON); queryable with standard tools; 100% match with UI | US-2.5 |
| JTBD-03.2 | Storage file is inspectable and consistent | JRN-03.1: Test Entry | Server validates independently of browser with structured error codes | US-0.4 |
| JTBD-03.2 | Storage file is inspectable and consistent | JRN-03.1: Restart Verification | 404 with ERR_EXPENSE_NOT_FOUND on missing expense — clear error, form preserved | US-1.4 |
| JTBD-03.2 | Storage file is inspectable and consistent | JRN-03.1: Access UI | Meaningful error message + retry on list load failure — no broken table | US-3.4 |
| JTBD-03.2 | Storage file is inspectable and consistent | JRN-03.1: Access UI | Total shows error indicator on failure — never displays stale value | US-4.4 |

---

## Release Planning

### Release R1: Core Workflow
**Theme:** Enable the complete add → review → edit → verify journey for all personas with reliable persistence.

**Stories (22):** US-0.1, US-0.2, US-0.3, US-0.4, US-1.1, US-1.2, US-1.3, US-1.4, US-2.1, US-2.2, US-2.3, US-2.4, US-2.5, US-3.1, US-3.2, US-3.3, US-4.1, US-4.2, US-4.3, US-5.1, US-5.2, US-5.3

**Personas Served:** PER-01 (Maya), PER-02 (Tom), PER-03 (Priya)

**JTBD Addressed:** JTBD-01.1, JTBD-01.2, JTBD-01.3, JTBD-02.1, JTBD-02.2, JTBD-02.3 (partial), JTBD-03.1, JTBD-03.2

**Journeys Completable:**
- JRN-01.1 (Daily Expense Capture) — full end-to-end
- JRN-01.2 (Correcting a Mistaken Entry) — full end-to-end
- JRN-02.1 (Sunday Batch Receipt Entry) — full end-to-end
- JRN-02.2 (Post-Batch Error Correction) — core flow (reconciliation works, scale perf in R2)
- JRN-03.1 (First-Time Setup and Verification) — full end-to-end
- JRN-03.2 (Multi-Device Daily Tracking) — functional (relies on R1 features)

**Acceptance Gate:**
- [ ] All NaC for R1 stories pass
- [ ] PER-01 can complete JRN-01.1 (add expenses) and JRN-01.2 (edit expense) end-to-end
- [ ] PER-02 can complete JRN-02.1 (batch entry with zero loss) and JRN-02.2 (sequential edits)
- [ ] PER-03 can complete JRN-03.1 (single-command start, inspect storage, restart verification)
- [ ] Data survives page refresh and server restart with zero loss

---

### Release R2: Robustness & Scale
**Theme:** Harden error handling, ensure performance at scale, and polish cross-device / accessibility experience.

**Stories (5):** US-3.4, US-3.5, US-4.4, US-5.4, US-5.5

**Personas Served:** PER-01 (Maya), PER-02 (Tom), PER-03 (Priya)

**JTBD Addressed:** JTBD-02.1 (error resilience), JTBD-02.3 (scale performance), JTBD-03.2 (system transparency), JTBD-03.3 (multi-device consistency)

**Journeys Extended:**
- JRN-02.1 — graceful error handling during batch entry (US-5.5)
- JRN-02.2 — list performance at 500+ entries for reconciliation (US-3.5)
- JRN-03.1 — error states for data verification workflows (US-3.4, US-4.4)
- JRN-03.2 — responsive layout for multi-device use (US-5.4)

**Acceptance Gate:**
- [ ] All NaC for R2 stories pass
- [ ] Expense list renders within 1s for 1,000 entries
- [ ] Error states display meaningful messages for server/network failures
- [ ] UI is keyboard-navigable and functional across screen sizes
- [ ] R1 journeys remain fully functional after R2 additions

---

## Coverage Analysis

### Persona Coverage

| Persona | R1 Stories | R2 Stories |
|---------|-----------|-----------|
| PER-01: Maya | US-0.1, US-0.3, US-1.1, US-2.1, US-3.1, US-3.2, US-4.1, US-4.2, US-4.3, US-5.1, US-5.2 | US-5.4 |
| PER-02: Tom | US-0.2, US-1.2, US-1.3, US-2.2, US-2.4, US-3.3, US-4.3 | US-3.5, US-5.5 |
| PER-03: Priya | US-0.4, US-1.4, US-2.3, US-2.5, US-5.3 | US-3.4, US-4.4 |

### JTBD Coverage

| JTBD ID | Outcome | Release | Stories | NaC Count |
|---------|---------|---------|---------|-----------|
| JTBD-01.1 | Rapid expense capture in under 10s | R1 | US-0.1, US-0.3, US-2.1, US-3.2, US-5.1 | 6 |
| JTBD-01.2 | Running total always visible and current | R1 | US-4.1, US-4.2, US-5.2 | 3 |
| JTBD-01.3 | Entry corrected in place within 2s | R1 | US-1.1, US-3.1, US-4.3 | 3 |
| JTBD-02.1 | Zero entries lost during batch session | R1, R2 | US-0.2, US-2.2, US-2.4, US-3.3, US-5.5 | 5 |
| JTBD-02.2 | Sequential edits persist correctly | R1 | US-1.2, US-1.3 | 2 |
| JTBD-02.3 | Full list loads in under 1s at scale | R1, R2 | US-3.5, US-4.3 | 2 |
| JTBD-03.1 | Single-command startup with zero config | R1 | US-2.3, US-5.3 | 2 |
| JTBD-03.2 | Storage file inspectable and consistent | R1, R2 | US-0.4, US-1.4, US-2.5, US-3.4, US-4.4 | 5 |
| JTBD-03.3 | Identical behavior across devices | R2 | US-5.4 | 1 |

### Gap Analysis

- **JTBD-03.3 (Multi-Device Consistency):** Only partially addressed. US-5.4 covers responsive layout, but no dedicated story tests cross-device data synchronization. Server-side persistence (US-2.1, US-2.2) implicitly enables multi-device data consistency, but there is no explicit verification story. *Recommendation:* Consider adding a cross-device verification acceptance test to US-5.4 or as a future P1 story.
- **Journey stages without dedicated stories:** JRN-02.1 "Handle Faded Receipt" stage has no dedicated story — the edit capability (US-1.1) serves as the safety net, but a "flag for review" feature is deferred.
- **Orphan stories:** None — all 27 stories are mapped to at least one journey stage.
- **Delete capability:** Explicitly out of scope per PROJECT.md. No journey stage requires delete, but Tom's reconciliation (JRN-02.2) and Priya's data management may eventually need it.

---

## NaC-to-Acceptance Criteria Mapping

| NaC | Story | AC from UserStories | Aligned? |
|-----|-------|---------------------|----------|
| Full entry completes in under 10s; new entry appears in list within 1s | US-0.1 | Form displays amount, description, category + submit; new expense appears in list without reload; form clears on success | Yes |
| Each expense persisted server-side before confirmation; form clears and refocuses | US-0.2 | Each expense persisted to server before success shown; form clears and focus returns to amount field; no data lost on tab close | Yes |
| Inline validation errors appear without discarding entered data | US-0.3 | Per-field error messages displayed; form retains input on validation failure; multiple errors shown simultaneously | Yes |
| Server rejects invalid data with structured error codes | US-0.4 | Server validates all fields; 400 response with structured error codes; no stack traces exposed | Yes |
| Edit populates form with current values; entry and total update within 2s | US-1.1 | Edit button per row; form pre-populates; user can modify any field; list and total update on save | Yes |
| Cancel discards changes — original values intact, no server request | US-1.2 | Cancel button visible in edit mode; discards changes; no server request; list/total unchanged | Yes |
| Sequential edits persist independently; list and total reflect each correction | US-1.3 | After saving edit, can immediately edit another; each edit persisted independently; total correct after multiple edits | Yes |
| 404 with ERR_EXPENSE_NOT_FOUND — clear error, form preserved | US-1.4 | Server returns 404 with ERR_EXPENSE_NOT_FOUND; UI shows clear message; form does not clear on 404 | Yes |
| All expenses listed after browser refresh — zero loss | US-2.1 | After adding expenses, page refresh shows all entries; list loads via GET /api/expenses; no browser-only storage | Yes |
| All expenses persist across server stop/start — zero loss | US-2.2 | Expenses survive server stop/start cycle; GET returns all entries after restart; no data corruption | Yes |
| Storage auto-initializes on first run — no manual DB setup | US-2.3 | Storage file/DB created automatically if absent; schema created during init; server logs confirmation | Yes |
| Server responds only after durable write — no phantom entries | US-2.4 | No 201/200 until data written to disk; 500 ERR_STORAGE_WRITE on failure; client shows retry message | Yes |
| Standard format; queryable with standard tools; 100% match with UI | US-2.5 | SQLite or JSON format; file copyable for backup; records contain all fields; amounts stored as cents | Yes |
| All expenses visible on load with amount, description, category per row | US-3.1 | Fetches all expenses on load; each row shows currency-formatted amount, description, category; most recent first | Yes |
| Empty state guides user to add first expense | US-3.2 | Friendly message when zero expenses; form visible and functional; total shows $0.00 | Yes |
| New entries appear without page reload; no duplicates | US-3.3 | List updates after add/edit without reload; maintains ordering; no duplicate entries | Yes |
| Meaningful error message + retry on list load failure | US-3.4 | 500 error shows user-friendly message; network error shows connection message; retry option provided | Yes |
| Full list renders within 1s for 500+ entries | US-3.5 | List renders within 1s for up to 1,000 expenses; amounts converted correctly; text sanitized for XSS | Yes |
| Running total visible without scrolling, formatted as currency | US-4.1 | Total always visible without scrolling; formatted with $ and 2 decimal places; cents arithmetic; $0.00 when empty | Yes |
| Total reflects correct sum within 1s of submission | US-4.2 | Total increases by new amount; updates without reload; integer arithmetic; format consistent | Yes |
| Total adjusts immediately — old amount removed, new amount added | US-4.3 | Total adjusts after edit; updates without reload; non-amount edit doesn't change total; correct after multiple edits | Yes |
| Total shows error indicator on failure — never stale value | US-4.4 | Shows "—" or error text on failure; never stale value; correct after successful retry | Yes |
| App loads in browser with no install | US-5.1 | Accessible via URL; single-page layout; no plugins required; works in Chrome, Firefox, Safari, Edge | Yes |
| Form, list, and total visible on one page without navigation | US-5.2 | Form prominent; list visible; total always visible; no tabs or navigation menus; clear visual hierarchy | Yes |
| One command starts server + UI; accessible within 10s | US-5.3 | Single command start; serves UI and API on same origin; no separate build step; PORT configurable with default | Yes |
| Tab order logical; Enter submits; responsive across screens | US-5.4 | Desktop primary; tablet/phone functional; keyboard tab navigation; Enter submits; logical focus order | Yes |
| Non-technical error messages for server/network failures | US-5.5 | Inline validation errors; user-friendly server error messages; network error messages; no stack traces | Yes |

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-11*
