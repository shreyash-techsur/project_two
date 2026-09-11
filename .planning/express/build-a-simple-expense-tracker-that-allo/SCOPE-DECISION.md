---
schema_version: 1
slug: build-a-simple-expense-tracker-that-allo
scope: reduced
reason: capacity
reduction_effective: true
generated_by: pivota_spec-scope-auditor
date: 2026-09-11T09:05:28Z
metrics: { p0_features: 6, p1_p3_features: 0, entities: 2, endpoints: 4, integrations: 3, nfr_flags: 0, gap_density: 0.009 }
budget: { hard_trip: true, size_trip: false, gap_trip: false }
mvp_scope:
  included_features: [F0, F2, F3, F4, F5]
  primary_journey: "JRN-01.1"
  selection_source: journey-primary
deferred_scope:
  excluded_features: [F1]
  excluded_reason: "not-in-primary-journey"
---

## Decision

This spec declares 6 P0 features with 0 P1-P3 features. The `scope metrics` tool reports a **HARD_TRIP** on capacity: 6 P0 features exceeds the express budget threshold. Scope is reduced to 5 features by selecting the primary journey (JRN-01.1: Daily Expense Capture) and deferring the feature not required by that journey.

## Why

The hard-trip budget predicate fired on capacity: 6 P0 features against the express hard limit. All 6 features are labelled P0 and all 27 stories are P0, so priority cannot differentiate -- the entire project is MVP-critical by its own labels. Release grouping is similarly unhelpful: R1 contains 22 of 27 stories and touches all 6 features.

Selection was made by journey structure instead. The STORY-MAP was present (`selection_source: journey-primary`). JRN-01.1 (Daily Expense Capture) was identified as the primary journey because it has the most stage lines in the STORY-MAP (5 activity rows for PER-01) and forms a complete create-to-view loop: the user opens the app (F5), sees the form/list/total (F5, F4), enters an expense (F0), sees it persisted (F2), and views the updated list and total (F3, F4).

The thinnest stories satisfying each stage were selected:
- **Arrive** (F5): US-5.1 -- Access Application via Browser (4 AC)
- **Orient** (F5, F4): US-5.2 -- Single-Page Layout (5 AC), US-4.1 -- View Running Total (5 AC)
- **Enter First Expense** (F0, F2): US-0.1 -- Add a New Expense (9 AC), US-2.1 -- Data Survives Page Refresh (4 AC)
- **Enter Second Expense** (F0, F2, F3, F4): US-4.2 -- Total Updates After Adding (4 AC)
- **Monitor** (F3, F4): US-3.1 -- View All Expenses on Page Load (5 AC)

The union of Feature Refs from selected stories is: **F0, F2, F3, F4, F5** (5 features).

F1 (Expense Editing) is the sole feature not touched by JRN-01.1. Adding the next journey (JRN-01.2: Correcting a Mistaken Entry) would bring F1 back, restoring the full 6-feature set -- which is exactly the size that tripped the budget. So JRN-01.2 does not fit as a whole journey, and half a journey is not taken.

**Step 8 hard check:**
1. Create-to-view loop: F0 creates an expense, F3 displays it, F4 shows the total. Complete.
2. User-facing surface: F5 (Web-Based User Interface) is included. Satisfied.

## In scope

5 of 6 features selected:

| Feature | Name | Why included |
|---------|------|--------------|
| F0 | Expense Entry | Primary interaction -- enter amount, description, category |
| F2 | Persistent Storage | Data survives refresh and restart |
| F3 | Expense List Display | View all saved expenses |
| F4 | Total Amount Display | Running total of all expenses |
| F5 | Web-Based User Interface | Browser-based single-page layout, single-command startup |

The MVP delivers a complete add-and-view workflow: a user opens the app in a browser, enters expenses, sees them listed with a running total, and trusts the data persists across sessions.

## Deferred beyond MVP

| Feature | Name | Reason |
|---------|------|--------|
| F1 | Expense Editing | Not required by the primary journey (JRN-01.1). Editing is the core of JRN-01.2 (Correcting a Mistaken Entry) and JRN-02.2 (Post-Batch Error Correction), both of which are deferred. Adding JRN-01.2 would restore all 6 features, exceeding the express budget. |

Without F1 the user can still enter expenses, view them, and see the total. They cannot correct a mistake in place -- they would need to re-enter an expense (or graduate to the standard phase to get edit capability).

## Graduation path

To build the full 6-feature system including expense editing (F1), use the **standard phase route** (`/pivota_spec-plan`). The standard phase supports the full feature set without express capacity constraints and can plan all 27 stories across all 6 journeys.

## Open Questions

```yaml
- id: SCOPE-Q1
  source: scope-decision
  header: "Journey"
  question: "This spec has 6 features but express builds reliably deliver fewer. I picked the Daily Expense Capture journey (add expenses and view them with a running total), which defers editing. Keep that, or start with a different journey?"
  options:
    - "Keep: Daily Expense Capture (add + view + total, no editing)"
    - "Start with: Batch Receipt Entry (add in bulk + view, no editing)"
    - "Start with: Self-Hosted Setup (add + verify storage, no editing)"
  default: "Keep: Daily Expense Capture (add + view + total, no editing)"
  affects: [F0, F2, F3, F4, F5]
  can_widen_scope: false
```

## Notes

- `p0_unit: features` -- the tool counted distinct features referenced by P0 stories. All 27 stories are P0 and reference 6 features.
- No warnings were reported by `scope metrics`.
- `prd_has_gaps: false` -- no TBD/TODO/FIXME found in PRD definitions; gap rule (Step 7) had nothing to act on.
- Every option in SCOPE-Q1 produces a 5-feature set (each journey touches F0, F2, F3, F4, F5 but not F1), so no option can widen scope.
