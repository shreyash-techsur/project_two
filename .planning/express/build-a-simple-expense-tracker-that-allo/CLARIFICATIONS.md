---
schema_version: 1
slug: build-a-simple-expense-tracker-that-allo
questions_asked: 1
questions_answered: 1
replan_waves: [1, 2, 3, 4]
reason: "User overrode scope decision to include F1 (Expense Editing). All 4 plans updated to include F1."
date: 2026-09-11
---

## Questions

1. **SCOPE-Q1 (from SCOPE-DECISION.md):** "This spec has 6 features but express builds reliably deliver fewer. I picked the Daily Expense Capture journey (add expenses and view them with a running total), which defers editing. Keep that, or start with a different journey?"

## Answers

1. **User answer:** Include F1 (Expense Editing) — "that feature is important." The user's original brief explicitly requested "with an edit option." Scope overridden to full 6-feature set.

## Replan

All 4 plans updated to include F1 (Expense Editing):
- **Wave 1 (01-PLAN.md):** Added `updateExpense(id, data)` function to storage layer
- **Wave 2 (02-PLAN.md):** Added `PUT /api/expenses/:id` endpoint with ID validation, not-found handling
- **Wave 3 (03-PLAN.md):** Added Edit button per row, edit mode (Save Changes/Cancel buttons, edit indicator), `enterEditMode()`/`exitEditMode()` functions
- **Wave 4 (04-PLAN.md):** Added E2E tests for edit flow, cancel flow, sequential edits, edit persistence, edit mode UI
- **WAVE-SCHEDULE.md:** Updated to include F1 across all waves
- **SCOPE-DECISION.md:** Updated to full scope (6 features, 0 deferred)
- **SCOPE-SEAL.json:** Updated to reflect full scope
