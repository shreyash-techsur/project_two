# Wave Schedule

```yaml
wave: 1
domain: database
depends_on: []
features: [F2]
objective: "Create SQLite database schema (expenses table with CHECK constraints, index), storage layer (db/database.js with initialize, getAllExpenses, createExpense, updateExpense functions), and project scaffold (package.json, server.js entry point with DB init)."
estimated_plans: 1
---
wave: 2
domain: backend
depends_on: [1]
features: [F0, F1, F2, F3, F4, F5]
objective: "Build Express.js API routes: GET /api/expenses (list, ordered by created_at DESC), POST /api/expenses (create with dollar-to-cents conversion, full validation, write-before-acknowledge), and PUT /api/expenses/:id (update with ID validation, not-found handling, dollar-to-cents conversion). Add validation middleware, error handler, security headers (helmet), and static file serving from public/."
estimated_plans: 1
---
wave: 3
domain: frontend
depends_on: [2]
features: [F0, F1, F3, F4, F5]
objective: "Build the single-page web UI: expense entry form (amount/description/category with client-side validation, form clears on success), edit mode (Edit button per row, form pre-populates with current values, Save Changes/Cancel buttons, visual edit indicator), expense list (reverse-chronological, currency-formatted amounts, empty state message, XSS-safe text rendering), total display (cents arithmetic, $0.00 default, always visible), responsive layout with clear visual hierarchy."
estimated_plans: 1
---
wave: 4
domain: integration
depends_on: [1, 2, 3]
features: [F0, F1, F2, F3, F4, F5]
objective: "End-to-end verification: single-command startup (npm start), add expense flow (form submit -> POST -> list update -> total update), edit expense flow (Edit button -> form populate -> PUT -> list update -> total update), cancel edit flow, persistence across page refresh and server restart, empty state rendering, validation error display, and Playwright tests covering the full add-edit-and-view journey."
estimated_plans: 1
```

## WAVE SCHEDULE

| Wave | Domain | Plans | Features | Objective |
|------|--------|-------|----------|-----------|
| 1 | database | 1 | F2 | SQLite schema, storage layer (including updateExpense), project scaffold |
| 2 | backend | 1 | F0, F1, F2, F3, F4, F5 | Express API (GET + POST + PUT), validation, error handling, static serving |
| 3 | frontend | 1 | F0, F1, F3, F4, F5 | Single-page UI: form, edit mode, list, total, responsive layout |
| 4 | integration | 1 | F0, F1, F2, F3, F4, F5 | E2E flows, persistence verification, Playwright tests |

**In scope:** 6 features | **Covered:** 6 features | **Deferred:** 0

### Feature-to-Wave Mapping

| Feature | Wave 1 (DB) | Wave 2 (API) | Wave 3 (UI) | Wave 4 (E2E) |
|---------|-------------|--------------|-------------|--------------|
| F0: Expense Entry | | POST /api/expenses | Entry form + validation | Add flow |
| F1: Expense Editing | updateExpense function | PUT /api/expenses/:id | Edit mode (buttons, form toggle, cancel) | Edit flow |
| F2: Persistent Storage | Schema + storage layer | Write-before-acknowledge | | Restart persistence |
| F3: Expense List Display | | GET /api/expenses | List rendering + empty state + Edit buttons | List verification |
| F4: Total Amount Display | | (data via GET) | Cents sum + currency format + recalc on edit | Total accuracy |
| F5: Web-Based UI | | Static serving + helmet | HTML/CSS/JS layout | Single-command startup |
