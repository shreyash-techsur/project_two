---
schema_version: 1
slug: build-a-simple-expense-tracker-that-allo
scope: full
reason: user-override
reduction_effective: false
generated_by: pivota_spec-scope-auditor
date: 2026-09-11T09:05:28Z
updated: 2026-09-11
updated_reason: "User explicitly requested F1 (Expense Editing) be included — editing was in the original brief"
metrics: { p0_features: 6, p1_p3_features: 0, entities: 2, endpoints: 4, integrations: 3, nfr_flags: 0, gap_density: 0.009 }
budget: { hard_trip: false, size_trip: false, gap_trip: false }
mvp_scope:
  included_features: [F0, F1, F2, F3, F4, F5]
  primary_journey: "JRN-01.1"
  selection_source: user-override
deferred_scope:
  excluded_features: []
  excluded_reason: "none"
---

## Decision

All 6 P0 features are included in scope. The user explicitly requested that F1 (Expense Editing) be part of the build, as editing was specified in the original project brief. The original scope reduction that deferred F1 has been overridden.

## Why

The original scope decision deferred F1 (Expense Editing) because 6 P0 features exceeded the express budget threshold. However, the user's original brief explicitly stated "with an edit option" as a core requirement. The user confirmed this is important and must be included.

## In scope

6 of 6 features selected:

| Feature | Name | Why included |
|---------|------|--------------|
| F0 | Expense Entry | Primary interaction — enter amount, description, category |
| F1 | Expense Editing | User-requested — edit existing expenses in place |
| F2 | Persistent Storage | Data survives refresh and restart |
| F3 | Expense List Display | View all saved expenses |
| F4 | Total Amount Display | Running total of all expenses |
| F5 | Web-Based User Interface | Browser-based single-page layout, single-command startup |

The MVP delivers a complete add-edit-and-view workflow: a user opens the app in a browser, enters expenses, edits them if needed, sees them listed with a running total, and trusts the data persists across sessions.

## Deferred beyond MVP

None — all features are in scope.

## Notes

- Scope override requested by user on 2026-09-11.
- Original scope decision deferred F1 due to express budget hard-trip on capacity. User override takes precedence.
- All 6 features, 27 stories, and 6 journeys are now in scope.
