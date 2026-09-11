# Wave Schedule

```yaml
wave: 1
domain: database
depends_on: []
features: [F2]
objective: "Create SQLite database schema (expenses table with CHECK constraints, index), storage layer (db/database.js with initialize, getAllExpenses, createExpense functions), and project scaffold (package.json, server.js entry point with DB init). No PUT/updateExpense (deferred, out of scope)."
estimated_plans: 1
---
wave: 2
domain: backend
depends_on: [1]
features: [F0, F2, F3, F4, F5]
objective: "Build Express.js API routes: GET /api/expenses (list, ordered by created_at DESC) and POST /api/expenses (create with dollar-to-cents conversion, full validation, write-before-acknowledge). Add validation middleware, error handler, security headers (helmet), and static file serving from public/. No PUT endpoint (deferred, out of scope)."
estimated_plans: 1
---
wave: 3
domain: frontend
depends_on: [2]
features: [F0, F3, F4, F5]
objective: "Build the single-page web UI: expense entry form (amount/description/category with client-side validation, form clears on success), expense list (reverse-chronological, currency-formatted amounts, empty state message, XSS-safe text rendering), total display (cents arithmetic, $0.00 default, always visible), responsive layout with clear visual hierarchy. No edit buttons or edit mode (deferred, out of scope)."
estimated_plans: 1
---
wave: 4
domain: integration
depends_on: [1, 2, 3]
features: [F0, F2, F3, F4, F5]
objective: "End-to-end verification: single-command startup (npm start), add expense flow (form submit -> POST -> list update -> total update), persistence across page refresh and server restart, empty state rendering, validation error display, and Playwright tests covering the full add-and-view journey."
estimated_plans: 1
```

## WAVE SCHEDULE

| Wave | Domain | Plans | Features | Objective |
|------|--------|-------|----------|-----------|
| 1 | database | 1 | F2 | SQLite schema, storage layer, project scaffold |
| 2 | backend | 1 | F0, F2, F3, F4, F5 | Express API (GET + POST), validation, error handling, static serving |
| 3 | frontend | 1 | F0, F3, F4, F5 | Single-page UI: form, list, total, responsive layout |
| 4 | integration | 1 | F0, F2, F3, F4, F5 | E2E flows, persistence verification, Playwright tests |

**In scope:** 5 features | **Covered:** 5 features | **Deferred by scope decision:** 1 (deferred, out of scope: Expense Editing)

Deferred features are a recorded decision (`SCOPE-DECISION.md`), not a coverage gap.

### Feature-to-Wave Mapping

| Feature | Wave 1 (DB) | Wave 2 (API) | Wave 3 (UI) | Wave 4 (E2E) |
|---------|-------------|--------------|-------------|--------------|
| F0: Expense Entry | | POST /api/expenses | Entry form + validation | Add flow |
| F2: Persistent Storage | Schema + storage layer | Write-before-acknowledge | | Restart persistence |
| F3: Expense List Display | | GET /api/expenses | List rendering + empty state | List verification |
| F4: Total Amount Display | | (data via GET) | Cents sum + currency format | Total accuracy |
| F5: Web-Based UI | | Static serving + helmet | HTML/CSS/JS layout | Single-command startup |

### What is NOT built (deferred, out of scope)

- No `PUT /api/expenses/:id` endpoint
- No `updateExpense` function in storage layer
- No Edit buttons on expense rows
- No edit mode in the expense form
- No Cancel button or mode toggling
- No `ERR_EXPENSE_NOT_FOUND` or `ERR_EXPENSE_INVALID_ID` error handling
