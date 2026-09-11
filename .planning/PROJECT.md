# Expense Tracker

## What This Is

A simple web-based expense tracker that allows users to enter expenses with an amount, description, and category. Users can edit existing expenses, and all data is stored persistently. The application retrieves and displays saved expenses through a web UI, showing the total amount of all stored expenses.

## Core Value

Users can quickly record, edit, and view their expenses with persistent storage and a running total — if nothing else works, expense entry and retrieval must.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can enter a new expense with amount, description, and category
- [ ] User can edit an existing expense (amount, description, category)
- [ ] Expenses are stored persistently (survive page refresh / server restart)
- [ ] User can view a list of all saved expenses
- [ ] The total amount of all stored expenses is displayed

### Out of Scope

- Delete expense — not mentioned in requirements; can be added later
- Multi-user / authentication — single-user tool for now
- Expense filtering/search — keep it simple for v1
- Charts/analytics — display total only, no visualizations
- Export (CSV/PDF) — not part of initial scope
- Mobile app — web UI only

## Context

- Greenfield project, no existing code
- Web UI required — must be accessible via browser
- Persistent storage required — could be file-based or database
- Categories are user-provided text, not a fixed list
- Edit functionality explicitly requested

## Constraints

- **Scope**: Simple — minimal features, focus on core CRUD + total display
- **Platform**: Web-based UI accessible via browser
- **Storage**: Must persist data across sessions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web UI for all interactions | User explicitly requested web UI | -- Pending |
| Persistent storage | User requires data to survive restarts | -- Pending |
| Include edit but not delete | User specified edit; delete not mentioned | -- Pending |

---
*Last updated: 2026-09-11 after initialization*
