# UX Mockup

**Project:** Expense Tracker
**Generated:** 2026-09-11
**Based on:** UserStories-ExpenseTracker.md, PRD-ExpenseTracker.md, FRD-ExpenseTracker.md, JOURNEYS-ExpenseTracker.md

---

## Overview

The Expense Tracker is a single-page web application with three core UI regions — expense form, expense list, and running total — all visible simultaneously on one screen. The UX is designed around three guiding principles:

1. **Speed of entry:** The primary interaction (adding an expense) must complete in under 15 seconds. The form auto-focuses on the amount field, clears after submission, and returns focus for the next entry. This supports Maya's daily quick entries (JRN-01.1) and Tom's batch sessions of 15+ receipts (JRN-02.1).

2. **Persistent trust:** Every action that modifies data provides immediate visual confirmation — the expense appears in the list, the total updates, and a success indicator fires. No data lives only in the browser. This addresses the core anxiety shared by all three personas (Cross-Journey Patterns).

3. **Single-glance comprehension:** The total is always visible without scrolling. The form's mode (add vs. edit) is unambiguous. Error states are inline and specific. The user never needs to navigate away from the page to accomplish any task.

### Design Principles

- **One page, zero navigation:** All features are accessible without tabs, menus, or page transitions (US-5.2)
- **Form-first layout:** The expense form occupies the top of the page — it's the first thing users see and interact with (US-5.2, JRN-01.1)
- **Always-visible total:** The running total is positioned so it remains visible regardless of scroll position (US-4.1, JRN-02.2)
- **Inline feedback:** Validation errors appear next to the field that caused them; success/error toasts appear briefly and auto-dismiss (US-0.3, US-5.5)
- **Keyboard-first flow:** Tab order follows amount → description → category → submit; Enter submits the form (US-5.4)

---

## Navigation Map

Since the Expense Tracker is a single-page application with no routing, all functionality lives on one screen. There are no separate pages to navigate between.

| Screen | Route | Reached from | Nav element |
|--------|-------|--------------|-------------|
| Main Dashboard | `/` | Direct URL (bookmark, address bar) | N/A — this is the only screen; it is the app shell |

**Invariant — no orphan screens:** The application has exactly one screen (`/`). All features (form, list, total, edit mode) are regions within this single page, not separate screens. No navigation links are needed because there is nowhere else to go.

---

## User Flows

### Flow 0: Add a New Expense

**Trigger:** User wants to record a purchase (page load auto-focuses the amount field)
**User Stories:** US-0.1, US-0.2, US-0.3, US-0.4
**Journeys:** JRN-01.1 (Maya daily capture), JRN-02.1 (Tom batch entry)

```
[Page Load — Form visible, amount field focused]
    │
    ▼
[User types amount, description, category]
    │
    ▼
[User clicks "Add Expense" or presses Enter]
    │
    ▼
[Client-side validation]
    │
    ├── Validation fails ──▶ [Show inline errors next to invalid fields]
    │                              │
    │                              ▼
    │                        [Form retains input; user corrects and re-submits]
    │                              │
    │                              └──▶ [Back to client-side validation]
    │
    └── Validation passes ──▶ [POST /api/expenses]
                                   │
                                   ├── 201 Created ──▶ [Clear form fields]
                                   │                        │
                                   │                        ▼
                                   │                  [Prepend expense to list]
                                   │                        │
                                   │                        ▼
                                   │                  [Update running total]
                                   │                        │
                                   │                        ▼
                                   │                  [Show success toast (2s)]
                                   │                        │
                                   │                        ▼
                                   │                  [Focus returns to amount field]
                                   │                        │
                                   │                        ▼
                                   │                  [Ready for next entry ──▶ repeat]
                                   │
                                   ├── 400 Bad Request ──▶ [Show server validation errors inline]
                                   │                              │
                                   │                              ▼
                                   │                        [Form retains input for correction]
                                   │
                                   └── 500 Server Error ──▶ [Show "Failed to save expense.
                                                              Please try again." error banner]
                                                                   │
                                                                   ▼
                                                             [Form retains input for retry]
```

**Steps:**

1. **Page loads** — The expense form is visible at the top of the page. The amount field receives auto-focus. If expenses already exist, they appear in the list below with the running total above the list.

2. **User enters data** — Types a dollar amount (e.g., `18.50`), a description (e.g., `Pad Thai takeout`), and a category (e.g., `Food`). Tab moves focus through the fields in order: amount → description → category.

3. **User submits** — Clicks the "Add Expense" button or presses Enter. The button shows a brief loading state (disabled + spinner or "Saving..." label) while the request is in flight.

4. **Client validates** — If any field fails validation, an inline error message appears directly below the offending field in red text. The form retains all entered values. Multiple errors can appear simultaneously.

5. **Server processes** — On successful persistence, the server returns the full expense object with server-generated `id` and `created_at`.

6. **UI updates** — The form clears all three fields. The new expense is prepended to the top of the expense list (most recent first). The running total increments by the new amount. A green success toast appears briefly ("Expense added!") and auto-dismisses after 2 seconds.

7. **Ready for next** — Focus returns to the amount field. Tom can immediately begin entering the next receipt in his batch session (US-0.2). The cycle repeats without page reload.

---

### Flow 1: Edit an Existing Expense

**Trigger:** User clicks the "Edit" button on an expense row in the list
**User Stories:** US-1.1, US-1.2, US-1.3, US-1.4
**Journeys:** JRN-01.2 (Maya correcting a mistake), JRN-02.2 (Tom post-batch correction)

```
[User viewing expense list]
    │
    ▼
[Clicks "Edit" on an expense row]
    │
    ▼
[Form enters EDIT MODE]
  - Amount, description, category pre-populated with current values
  - Submit button label changes to "Save Changes"
  - "Cancel" button appears
  - Edit mode indicator visible (e.g., highlighted form border or banner)
    │
    ▼
[User modifies one or more fields]
    │
    ├── User clicks "Cancel" ──▶ [Discard changes, no server call]
    │                                  │
    │                                  ▼
    │                            [Form returns to ADD mode (empty)]
    │                            [List and total unchanged]
    │
    └── User clicks "Save Changes" or presses Enter
             │
             ▼
        [Client-side validation]
             │
             ├── Fails ──▶ [Inline errors; form retains edited values]
             │                    │
             │                    └──▶ [User corrects and re-saves]
             │
             └── Passes ──▶ [PUT /api/expenses/:id]
                                  │
                                  ├── 200 OK ──▶ [Update expense row in list with new values]
                                  │                    │
                                  │                    ▼
                                  │              [Recalculate running total]
                                  │                    │
                                  │                    ▼
                                  │              [Show success toast ("Expense updated!")]
                                  │                    │
                                  │                    ▼
                                  │              [Exit edit mode — form returns to ADD mode]
                                  │                    │
                                  │                    ▼
                                  │              [User can click Edit on another row]
                                  │
                                  ├── 400 Bad Request ──▶ [Inline validation errors]
                                  │                            [Form retains values in edit mode]
                                  │
                                  ├── 404 Not Found ──▶ [Show "Expense not found" error]
                                  │                          [Form retains values so user
                                  │                           can re-enter as new expense]
                                  │
                                  └── 500 Server Error ──▶ [Show "Failed to update expense.
                                                             Please try again." error]
                                                                [Form retains values in edit mode]
```

**Steps:**

1. **Initiate edit** — User scans the expense list and clicks the "Edit" button on the row they want to modify. The Edit button is always visible on every expense row (no hover-reveal or hidden menu).

2. **Form transitions to edit mode** — The expense form at the top of the page populates with the selected expense's current amount, description, and category. The form visually changes to indicate edit mode:
   - The submit button label changes from "Add Expense" to "Save Changes"
   - A "Cancel" button appears next to "Save Changes"
   - The form area gets a subtle visual indicator (e.g., a colored left border or a "Editing expense" label)

3. **User modifies fields** — Any combination of the three fields can be changed. The same validation rules as adding apply.

4. **Save or cancel** — User either saves (click "Save Changes" or Enter) or cancels (click "Cancel"). Cancel makes no server call and returns the form to its empty add-new state.

5. **Successful save** — The expense row in the list updates in-place with the new values. The running total recalculates (e.g., if amount changed from $8.50 to $5.80, total decreases by $2.70). A success toast confirms the edit. The form exits edit mode and returns to add-new state.

6. **Sequential edits** — After saving, the user can immediately click Edit on another expense row (US-1.3, JRN-02.2). Each edit is independent and persisted separately.

---

### Flow 2: Page Load and Data Retrieval

**Trigger:** User navigates to the application URL or refreshes the page
**User Stories:** US-2.1, US-3.1, US-3.2, US-3.4, US-4.1, US-4.4, US-5.1, US-5.2
**Journeys:** JRN-01.1 (Maya arriving), JRN-02.1 (Tom preparing), JRN-03.1 (Priya accessing UI), JRN-03.2 (Priya cross-device)

```
[User navigates to http://localhost:3000]
    │
    ▼
[Server serves HTML + CSS + JS]
    │
    ▼
[Page renders with skeleton/loading state]
  - Form visible and interactive (can begin typing immediately)
  - List area shows loading indicator
  - Total shows "—" or loading placeholder
    │
    ▼
[JS sends GET /api/expenses]
    │
    ├── 200 OK, expenses.length > 0 ──▶ [Render expense list (most recent first)]
    │                                          │
    │                                          ▼
    │                                    [Calculate total from cents sum]
    │                                          │
    │                                          ▼
    │                                    [Display formatted total (e.g., $487.25)]
    │                                          │
    │                                          ▼
    │                                    [Auto-focus amount field]
    │                                          │
    │                                          ▼
    │                                    [Page fully ready]
    │
    ├── 200 OK, expenses.length === 0 ──▶ [Show empty state message in list area]
    │                                          │
    │                                          ▼
    │                                    [Display total as $0.00]
    │                                          │
    │                                          ▼
    │                                    [Auto-focus amount field]
    │
    ├── 500 Server Error ──▶ [Show error message in list area:
    │                          "Failed to load expenses. Please try again."]
    │                              │
    │                              ▼
    │                        [Show "Retry" button]
    │                              │
    │                              ▼
    │                        [Total shows "—" or "Error loading total"]
    │                              │
    │                              ▼
    │                        [Form still visible and usable — user can
    │                         attempt to add expenses even if list fails to load]
    │
    └── Network Error ──▶ [Show "Unable to connect to the server.
                            Check your connection and try again."]
                                │
                                ▼
                          [Show "Retry" button]
                                │
                                ▼
                          [Total shows "—"]
```

**Steps:**

1. **Navigation** — User opens their browser and navigates to the application URL (bookmarked or typed). The server responds with the HTML page, which loads CSS and JS assets.

2. **Immediate render** — The page renders its structural layout immediately: the expense form appears at the top and is interactive (the user can start typing before data loads). The list area and total show brief loading placeholders.

3. **Data fetch** — JavaScript sends `GET /api/expenses` to load all stored expenses.

4. **Success with data** — The list renders all expenses in rows (most recent first by `created_at`). The total is calculated by summing all `amount` values (cents), dividing by 100, and formatting as currency. Focus moves to the amount field.

5. **Success with no data (empty state)** — The list area shows a friendly message: "No expenses yet. Add your first expense above!" The total displays `$0.00`. The form is visible and ready for the first entry.

6. **Error states** — If the server returns 500 or the network is unreachable, the list area shows an appropriate error message with a "Retry" button. The total shows "—" to avoid displaying a misleading number. The form remains visible and functional.

---

### Flow 3: Batch Entry Session

**Trigger:** User has multiple expenses to enter in sequence (e.g., Tom's Sunday receipt session)
**User Stories:** US-0.2, US-0.1
**Journeys:** JRN-02.1 (Tom Sunday batch)

```
[User has a stack of receipts to enter]
    │
    ▼
[Page loaded, amount field focused]
    │
    ▼
┌─── BATCH LOOP (repeats N times) ───────────────┐
│                                                  │
│  [Enter amount → Tab → description → Tab →       │
│   category → Enter/click Submit]                 │
│       │                                          │
│       ▼                                          │
│  [Expense saved → form clears → toast appears]   │
│       │                                          │
│       ▼                                          │
│  [Focus returns to amount field automatically]   │
│       │                                          │
│       ▼                                          │
│  [List updates (new entry at top)]               │
│  [Total updates (incremented)]                   │
│       │                                          │
│       ▼                                          │
│  [Ready for next receipt]                        │
│                                                  │
└──────────────────────────────────────────────────┘
    │
    ▼
[All receipts entered — user verifies list + total]
    │
    ▼
[Session complete — all data persisted server-side]
[Safe to close tab/browser — no data loss]
```

**Key UX requirements for batch flow:**

1. **Zero-friction repetition** — After each successful submission, the form clears ALL fields and focus returns to the amount field. The user never needs to click into a field or navigate — they simply start typing the next amount.

2. **Incremental trust** — Each expense appears in the list immediately after submission. The list grows visibly with each entry. The total increments with each addition. These visual confirmations build Tom's confidence that data is being saved.

3. **Server-side persistence per entry** — Each expense is individually persisted to the server before the success response. If the browser crashes after entry #10, entries 1–10 are safe. There is no client-side batch buffer.

4. **No interruptions** — Success toasts appear briefly (2 seconds) and auto-dismiss without requiring interaction. They must not steal focus from the amount field or block the next entry.

5. **Performance at scale** — After 15+ entries in a single session (on top of potentially hundreds of existing entries), the list must still render quickly and the form must respond without lag (US-3.5).

---

## Screen Designs

### Screen: Main Dashboard (Single Page)

**Purpose:** The one and only screen of the application — provides expense entry, expense list display, running total, and inline editing all in a single view.
**User Stories:** US-0.1, US-0.2, US-0.3, US-1.1, US-1.2, US-3.1, US-3.2, US-4.1, US-5.1, US-5.2, US-5.4
**Route:** `/`

#### Layout — Default State (Add Mode, With Expenses)

```
┌─────────────────────────────────────────────────────────────┐
│                     EXPENSE TRACKER                         │
│                   (App Title / Header)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ TOTAL DISPLAY ────────────────────────────────────────┐ │
│  │                                                        │ │
│  │   Total Expenses          $1,234.56                    │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE FORM (Add Mode) ─────────────────────────────┐ │
│  │                                                        │ │
│  │  Amount ($)        Description            Category     │ │
│  │  ┌──────────┐     ┌──────────────────┐   ┌──────────┐ │ │
│  │  │ 0.00     │     │                  │   │          │ │ │
│  │  └──────────┘     └──────────────────┘   └──────────┘ │ │
│  │                                                        │ │
│  │  [ Add Expense ]                                       │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE LIST ─────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  ┌─ Row ─────────────────────────────────────────────┐ │ │
│  │  │ $18.50    Pad Thai takeout        Food    [Edit]  │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │  ┌─ Row ─────────────────────────────────────────────┐ │ │
│  │  │ $12.00    Lyft home               Transport [Edit]│ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │  ┌─ Row ─────────────────────────────────────────────┐ │ │
│  │  │  $5.80    Morning coffee          Coffee  [Edit]  │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  (scrollable if many entries)                          │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Layout — Edit Mode

```
┌─────────────────────────────────────────────────────────────┐
│                     EXPENSE TRACKER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ TOTAL DISPLAY ────────────────────────────────────────┐ │
│  │   Total Expenses          $1,234.56                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE FORM (Edit Mode) ────────────────────────────┐ │
│  │  ┌────────────────────────────────────────────────┐    │ │
│  │  │ ✏ Editing expense                              │    │ │
│  │  └────────────────────────────────────────────────┘    │ │
│  │                                                        │ │
│  │  Amount ($)        Description            Category     │ │
│  │  ┌──────────┐     ┌──────────────────┐   ┌──────────┐ │ │
│  │  │ 8.50     │     │ Morning coffee   │   │ Snacks   │ │ │
│  │  └──────────┘     └──────────────────┘   └──────────┘ │ │
│  │                                                        │ │
│  │  [ Save Changes ]  [ Cancel ]                          │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE LIST ─────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  ┌─ Row ─────────────────────────────────────────────┐ │ │
│  │  │ $18.50    Pad Thai takeout        Food    [Edit]  │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │  ┌─ Row (being edited — highlighted) ────────────────┐ │ │
│  │  │ $8.50     Morning coffee          Snacks  [Edit]  │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Layout — Validation Error State

```
┌─────────────────────────────────────────────────────────────┐
│                     EXPENSE TRACKER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ TOTAL DISPLAY ────────────────────────────────────────┐ │
│  │   Total Expenses          $1,234.56                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE FORM ────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  Amount ($)        Description            Category     │ │
│  │  ┌──────────┐     ┌──────────────────┐   ┌──────────┐ │ │
│  │  │          │     │ Some item        │   │          │ │ │
│  │  └──────────┘     └──────────────────┘   └──────────┘ │ │
│  │  ⚠ Amount is      (valid)                ⚠ Category  │ │
│  │    required                                is required│ │
│  │                                                        │ │
│  │  [ Add Expense ]                                       │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE LIST ─────────────────────────────────────────┐ │
│  │  (unchanged — still shows all expenses)                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Layout — Empty State (No Expenses)

```
┌─────────────────────────────────────────────────────────────┐
│                     EXPENSE TRACKER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ TOTAL DISPLAY ────────────────────────────────────────┐ │
│  │   Total Expenses          $0.00                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE FORM ────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  Amount ($)        Description            Category     │ │
│  │  ┌──────────┐     ┌──────────────────┐   ┌──────────┐ │ │
│  │  │          │     │                  │   │          │ │ │
│  │  └──────────┘     └──────────────────┘   └──────────┘ │ │
│  │                                                        │ │
│  │  [ Add Expense ]                                       │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE LIST (Empty State) ───────────────────────────┐ │
│  │                                                        │ │
│  │         No expenses yet.                               │ │
│  │         Add your first expense above!                  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Layout — Error State (Failed to Load)

```
┌─────────────────────────────────────────────────────────────┐
│                     EXPENSE TRACKER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ TOTAL DISPLAY ────────────────────────────────────────┐ │
│  │   Total Expenses          —                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE FORM ────────────────────────────────────────┐ │
│  │  (still visible and functional)                        │ │
│  │  Amount ($)        Description            Category     │ │
│  │  ┌──────────┐     ┌──────────────────┐   ┌──────────┐ │ │
│  │  │          │     │                  │   │          │ │ │
│  │  └──────────┘     └──────────────────┘   └──────────┘ │ │
│  │  [ Add Expense ]                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE LIST (Error State) ───────────────────────────┐ │
│  │                                                        │ │
│  │    ⚠ Failed to load expenses.                         │ │
│  │      Please try again.                                 │ │
│  │                                                        │ │
│  │             [ Retry ]                                  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Layout — Loading State

```
┌─────────────────────────────────────────────────────────────┐
│                     EXPENSE TRACKER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ TOTAL DISPLAY ────────────────────────────────────────┐ │
│  │   Total Expenses          ···                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE FORM ────────────────────────────────────────┐ │
│  │  (visible and interactive — user can start typing)     │ │
│  │  Amount ($)        Description            Category     │ │
│  │  ┌──────────┐     ┌──────────────────┐   ┌──────────┐ │ │
│  │  │          │     │                  │   │          │ │ │
│  │  └──────────┘     └──────────────────┘   └──────────┘ │ │
│  │  [ Add Expense ]                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EXPENSE LIST (Loading) ───────────────────────────────┐ │
│  │                                                        │ │
│  │    ████████████████████  ████████  ████████             │ │
│  │    ████████████████████  ████████  ████████             │ │
│  │    ████████████████████  ████████  ████████             │ │
│  │                                                        │ │
│  │    (skeleton rows or spinner)                          │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Information Hierarchy

| Priority | Content | Placement | Rationale |
|----------|---------|-----------|-----------|
| Primary | Running total | Top of page, always visible | Users glance at this most — Maya for budget tracking (US-4.1), Tom for reconciliation (JRN-02.2) |
| Primary | Expense form | Below total, above list | First action point — users arrive to add expenses (JRN-01.1) |
| Primary | Expense list | Below form | Verification layer — users confirm entries here (US-3.1) |
| Secondary | Edit button per row | Right side of each expense row | Entry point for editing — must be visible but not dominant (US-1.1) |
| Secondary | Form mode indicator | Inside form area | Tells user whether they're adding or editing (US-1.1) |
| Secondary | Success/error toasts | Top-right corner, overlaying content | Transient feedback — important but shouldn't obstruct workflow (US-0.1) |
| Tertiary | Validation error messages | Inline below each field | Only visible when relevant — doesn't clutter the default view (US-0.3) |
| Tertiary | Empty state message | In list area | Only shown when no expenses exist (US-3.2) |
| Tertiary | Loading/error states | In list area and total | Transient — replaced by content once data loads (US-3.4, US-4.4) |

#### States

| State | Appearance | User Feedback | User Stories |
|-------|------------|---------------|--------------|
| Default (loaded, has expenses) | Form empty in add mode; list shows expenses; total shows sum | N/A | US-3.1, US-4.1, US-5.2 |
| Loading (page load) | Form visible; list shows skeleton/spinner; total shows "···" | Implicit loading indicator | US-3.1, US-5.1 |
| Empty (no expenses) | Form empty; list area shows friendly message; total shows $0.00 | "No expenses yet. Add your first expense above!" | US-3.2 |
| Submitting (add/edit in progress) | Submit button disabled with "Saving..." label or spinner | Button state change signals processing | US-0.1, US-1.1 |
| Success (after add/edit) | Form clears; list updates; total updates | Green toast: "Expense added!" or "Expense updated!" (auto-dismiss 2s) | US-0.1, US-1.1 |
| Validation error | Red inline text below invalid fields; form retains values | Specific error messages per field | US-0.3 |
| Server error (save failed) | Error banner/toast with retry guidance; form retains values | "Failed to save expense. Please try again." | US-2.4, US-5.5 |
| Network error | Error message in list area | "Unable to connect to the server. Check your connection and try again." | US-3.4, US-5.5 |
| Load error (list failed) | List area shows error with retry button; total shows "—" | "Failed to load expenses. Please try again." + [Retry] button | US-3.4, US-4.4 |
| Edit mode | Form populated with existing values; "Save Changes" + "Cancel" buttons; edit indicator | Visual mode change (border color, label) | US-1.1, US-1.2 |
| Edit mode — expense not found | Error message shown | "Expense not found" — form retains values for re-entry as new | US-1.4 |

#### Interactive Elements

| Element | Type | Behavior | Keyboard | User Stories |
|---------|------|----------|----------|--------------|
| Amount field | `<input type="number" step="0.01">` | Accepts numeric input with up to 2 decimal places; auto-focused on page load and after submission | Tab to next field | US-0.1, US-5.4 |
| Description field | `<input type="text" maxlength="500">` | Free-text input; trims whitespace on submit | Tab to next field | US-0.1 |
| Category field | `<input type="text" maxlength="100">` | Free-text input; trims whitespace on submit | Tab to submit button | US-0.1 |
| Add Expense button | Primary CTA | Validates and submits form via POST; disabled during request | Enter key submits form | US-0.1, US-5.4 |
| Save Changes button | Primary CTA (edit mode) | Validates and submits edit via PUT; disabled during request | Enter key submits form | US-1.1 |
| Cancel button | Secondary button (edit mode only) | Discards changes, returns to add mode; no server call | Escape key (optional) | US-1.2 |
| Edit button (per row) | Text button or icon button | Populates form with expense values; switches to edit mode | Focusable via Tab | US-1.1 |
| Retry button | Text button | Re-triggers GET /api/expenses | Focusable via Tab | US-3.4 |
| Success toast | Non-interactive notification | Appears top-right; auto-dismisses after 2 seconds | Not focusable (decorative) | US-0.1, US-1.1 |

---

## Interaction Patterns

### Pattern: Form Submission with Inline Validation

**When to use:** Every form submit action (add expense, save edit)
**User Stories:** US-0.3, US-5.5
**Behavior:**

1. User clicks submit (or presses Enter).
2. Client-side validation runs on all fields simultaneously.
3. If any field is invalid:
   - The field's border changes to red.
   - An error message appears directly below the field in red text (e.g., "Amount is required").
   - Multiple errors can appear at once (all invalid fields show their respective messages).
   - The form retains all entered values — nothing is cleared.
   - Focus moves to the first invalid field.
4. If all fields are valid:
   - The submit button becomes disabled and shows a loading indicator (e.g., "Saving..." or a small spinner).
   - The request is sent to the server.
   - On success: form clears, list updates, total updates, success toast appears.
   - On server error: error message appears (toast or banner), form retains values for retry.
5. The submit button re-enables after the server responds (success or error).

**Validation error messages** (from FRD Y2 Error Catalog):

| Field | Condition | Message |
|-------|-----------|---------|
| Amount | Empty | "Amount is required" |
| Amount | Not numeric | "Amount must be a valid number" |
| Amount | Zero or negative | "Amount must be greater than zero" |
| Amount | Exceeds 999,999.99 | "Amount must not exceed 999,999.99" |
| Amount | More than 2 decimals | "Amount must have at most two decimal places" |
| Description | Empty | "Description is required" |
| Description | Over 500 chars | "Description must not exceed 500 characters" |
| Category | Empty | "Category is required" |
| Category | Over 100 chars | "Category must not exceed 100 characters" |

---

### Pattern: Form Mode Toggle (Add ↔ Edit)

**When to use:** Switching between adding a new expense and editing an existing one
**User Stories:** US-1.1, US-1.2
**Behavior:**

1. **Entering edit mode:**
   - User clicks "Edit" on an expense row.
   - The form fields populate with the expense's current values (amount in dollars, description, category).
   - The submit button label changes from "Add Expense" to "Save Changes".
   - A "Cancel" button appears next to "Save Changes".
   - A visual indicator appears (e.g., a colored left border on the form or a small "Editing expense" banner at the top of the form).
   - The corresponding expense row in the list gets a subtle highlight (e.g., light background color) to show which entry is being edited.
   - Focus moves to the amount field.

2. **Exiting edit mode (save):**
   - After a successful save, the form clears and returns to add mode.
   - The submit button label reverts to "Add Expense".
   - The "Cancel" button disappears.
   - The edit indicator disappears.
   - The row highlight is removed and the row shows updated values.

3. **Exiting edit mode (cancel):**
   - No server request is made.
   - The form clears and returns to add mode.
   - The expense list and total remain unchanged.
   - All visual edit indicators are removed.

4. **Switching between edits:**
   - If the user clicks "Edit" on a different row while already in edit mode, the form updates to the new expense's values without requiring a cancel first. No changes to the previously selected expense are saved.

---

### Pattern: Optimistic List Update

**When to use:** After successful add or edit operations
**User Stories:** US-3.3, US-4.2, US-4.3
**Behavior:**

1. The server responds with the full expense object (including `id`, `created_at`, `updated_at`).
2. For **add**: The new expense is prepended to the top of the list (most recent first ordering). The total increases by the new amount.
3. For **edit**: The existing row updates in-place with the new values. No row moves position (the list order is by `created_at` which doesn't change on edit). The total adjusts by the difference between old and new amounts.
4. The DOM update happens without a full page reload. No additional GET request is required.
5. If the list was previously showing the empty state, it transitions to showing the first expense row.

---

### Pattern: Success Toast

**When to use:** After successful add or edit operations
**User Stories:** US-0.1, US-1.1
**Behavior:**

1. A small toast notification appears in the top-right corner of the viewport.
2. The toast has a green/success color scheme.
3. **Add:** Message reads "Expense added!"
4. **Edit:** Message reads "Expense updated!"
5. The toast auto-dismisses after 2 seconds (slides out or fades).
6. The toast does NOT steal focus — the user can continue typing in the form immediately.
7. Multiple toasts stack if the user submits rapidly (but practically, this is unlikely given the 2-second timeout).
8. The toast is decorative/informational — it does not require user interaction to dismiss.

---

### Pattern: Error Display

**When to use:** Server errors (500), network errors, not-found errors (404)
**User Stories:** US-2.4, US-3.4, US-4.4, US-5.5, US-1.4
**Behavior:**

1. **Save failure (500 on POST/PUT):**
   - A red/error toast or inline banner appears with: "Failed to save expense. Please try again."
   - The form retains all entered values so the user can retry.
   - The submit button re-enables for retry.

2. **List load failure (500 on GET):**
   - The list area shows an error message: "Failed to load expenses. Please try again."
   - A "Retry" button appears below the message.
   - The total display shows "—" instead of a number.
   - The form remains visible and functional.

3. **Network failure (fetch error):**
   - Similar to load failure but with message: "Unable to connect to the server. Check your connection and try again."
   - "Retry" button present.

4. **Not found (404 on PUT):**
   - An error message appears: "Expense not found."
   - The form remains in edit mode with the user's values so they can choose to re-enter as a new expense or cancel.

5. **JavaScript runtime error:**
   - A global error handler catches unhandled exceptions.
   - A fallback message appears: "Something went wrong. Please refresh the page."

**Error messages never expose:**
- Stack traces
- Error codes (codes are in API responses for developers, not shown in UI)
- Internal implementation details

---

### Pattern: Currency Formatting

**When to use:** Displaying any monetary amount (total, expense row amounts)
**User Stories:** US-4.1, US-3.1
**Behavior:**

1. All amounts stored as integer cents are divided by 100 for display.
2. Format: `$X,XXX.XX` (dollar sign, comma-separated thousands, exactly two decimal places).
3. Examples:
   - 1050 cents → `$10.50`
   - 100 cents → `$1.00`
   - 99999999 cents → `$999,999.99`
   - 0 cents → `$0.00`
4. The total always shows exactly two decimal places (never `$10.5` or `$10`).
5. Amounts in the expense list use the same formatting as the total.

---

### Pattern: Focus Management

**When to use:** After any state transition that changes available interactive elements
**User Stories:** US-0.2, US-5.4
**Behavior:**

1. **Page load:** Amount field receives auto-focus.
2. **After successful add:** Amount field receives focus (supports batch entry rhythm).
3. **After entering edit mode:** Amount field receives focus (pre-populated value is selected for easy overwrite).
4. **After successful edit save:** Amount field receives focus (add mode restored).
5. **After cancel edit:** Amount field receives focus (add mode restored).
6. **After validation error:** First invalid field receives focus.
7. **Tab order within form:** Amount → Description → Category → Submit button (→ Cancel button if in edit mode).
8. **Tab order in list:** Each expense row's Edit button is focusable in the tab sequence.

---

## Responsive Considerations

**User Stories:** US-5.4, US-5.2
**Journeys:** JRN-03.2 (Priya multi-device)

The Expense Tracker is primarily a desktop application, but must remain functional (not pixel-perfect) on tablet and phone screen sizes. The layout adapts at two breakpoints.

### Desktop (>1024px) — Primary Target

```
┌─────────────────────────────────────────────────────────────┐
│                     EXPENSE TRACKER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Total ────────────────────────────────────────────────┐ │
│  │ Total Expenses                          $1,234.56      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Form ─────────────────────────────────────────────────┐ │
│  │ Amount($)  │  Description              │  Category     │ │
│  │ [________] │  [________________________]│  [__________] │ │
│  │                                                        │ │
│  │ [ Add Expense ]                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ List ─────────────────────────────────────────────────┐ │
│  │ $18.50  │  Pad Thai takeout         │  Food   │ [Edit] │ │
│  │ $12.00  │  Lyft home                │  Transport│[Edit]│ │
│  │  $5.80  │  Morning coffee           │  Coffee │ [Edit] │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- **Form fields** arranged horizontally in a single row (amount, description, category side by side)
- **List columns** spread across full width: amount | description | category | edit action
- **Total** spans full width with label left-aligned and amount right-aligned
- **Max content width:** ~800px centered, with padding on larger screens
- **Expense list** uses table-like layout with clear column alignment

### Tablet (768px — 1024px)

```
┌───────────────────────────────────────┐
│           EXPENSE TRACKER             │
├───────────────────────────────────────┤
│                                       │
│ ┌─ Total ───────────────────────────┐ │
│ │ Total Expenses       $1,234.56    │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌─ Form ────────────────────────────┐ │
│ │ Amount($)     Description         │ │
│ │ [__________]  [__________________]│ │
│ │ Category                          │ │
│ │ [__________________]              │ │
│ │                                   │ │
│ │ [ Add Expense ]                   │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌─ List ────────────────────────────┐ │
│ │ $18.50  Pad Thai takeout          │ │
│ │         Food              [Edit]  │ │
│ │─────────────────────────────────  │ │
│ │ $12.00  Lyft home                 │ │
│ │         Transport         [Edit]  │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

- **Form fields** wrap: amount and description on one row, category on the next row
- **List rows** become two-line cards: amount + description on line 1, category + edit on line 2
- **Total** remains visible at the top (same layout as desktop but narrower)
- **Touch targets** for Edit buttons are at least 44x44px for comfortable tapping (Priya's tablet use — JRN-03.2)

### Mobile (<768px)

```
┌─────────────────────────────┐
│      EXPENSE TRACKER        │
├─────────────────────────────┤
│                             │
│ ┌─ Total ─────────────────┐ │
│ │ Total        $1,234.56  │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─ Form ──────────────────┐ │
│ │ Amount ($)              │ │
│ │ [______________________]│ │
│ │ Description             │ │
│ │ [______________________]│ │
│ │ Category                │ │
│ │ [______________________]│ │
│ │                         │ │
│ │ [    Add Expense     ]  │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─ List ──────────────────┐ │
│ │ ┌─────────────────────┐ │ │
│ │ │ $18.50        [Edit]│ │ │
│ │ │ Pad Thai takeout    │ │ │
│ │ │ Food                │ │ │
│ │ └─────────────────────┘ │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ $12.00        [Edit]│ │ │
│ │ │ Lyft home           │ │ │
│ │ │ Transport           │ │ │
│ │ └─────────────────────┘ │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- **Form fields** stack vertically — each field takes full width
- **Submit button** takes full width for easy tapping
- **List entries** become card layout: amount + edit on top row, description on second row, category on third row
- **Touch targets** minimum 44x44px for all interactive elements
- **Total** remains fixed/sticky at the top when scrolling (important for long lists)
- **Font sizes** remain readable (minimum 16px for inputs to prevent iOS zoom)

### Responsive Behavior Notes

| Aspect | Desktop | Tablet | Mobile |
|--------|---------|--------|--------|
| Form layout | Horizontal (3 fields in a row) | Wrapped (2 + 1) | Vertical (stacked) |
| List layout | Table-like columns | Two-line rows | Card layout |
| Total position | Top of page | Top of page | Sticky top |
| Submit button | Auto width | Auto width | Full width |
| Min touch target | N/A | 44x44px | 44x44px |
| Input font size | 14-16px | 16px | 16px (prevents iOS zoom) |

---

## Accessibility Notes

**User Stories:** US-5.4, US-5.5

### Color Contrast

- All text must meet WCAG 2.1 AA contrast ratio of at least 4.5:1 against its background.
- Error messages (red text) must maintain sufficient contrast — avoid pure red on white; use darker red (e.g., `#d32f2f` on `#ffffff` = 5.7:1).
- Success toast (green text/background) must be readable — use dark green text on light green background, or white text on dark green.
- The "—" error state for the total display must be visually distinct from a valid number (not just a color difference — the dash character itself communicates the error state, satisfying non-color-dependent communication).

### Keyboard Navigation

- **Tab order:** Amount field → Description field → Category field → Submit button → (Cancel button if in edit mode) → Expense list rows (Edit buttons)
- **Enter key:** Submits the form when focus is on any form field or the submit button.
- **Escape key (recommended):** Exits edit mode (equivalent to clicking Cancel) when focus is in the form during edit mode.
- **All interactive elements** (buttons, inputs) must be reachable via keyboard Tab navigation.
- **No keyboard traps:** Tab must cycle through all interactive elements and eventually return to the beginning of the page.
- **Focus ring:** All focusable elements must show a visible focus indicator (browser default or custom outline). Do not suppress `outline: none` without providing a visible alternative.

### Screen Reader Considerations

- **Form labels:** Each input field must have an associated `<label>` element (using `for`/`id` pairing or wrapping the input).
  - Amount: `<label for="amount">Amount ($)</label>`
  - Description: `<label for="description">Description</label>`
  - Category: `<label for="category">Category</label>`
- **Error messages:** Validation error messages should use `aria-describedby` linked to the corresponding input so screen readers announce the error when the field is focused. Additionally, use `aria-invalid="true"` on the invalid field.
- **Form mode announcement:** When switching to edit mode, use `aria-live="polite"` on the form mode indicator so screen readers announce "Editing expense" or "Adding new expense."
- **Running total:** The total display area should use `aria-live="polite"` so changes are announced without interrupting the user. Label it with `aria-label="Total expenses"`.
- **Success toast:** Use `role="status"` and `aria-live="polite"` so the confirmation is announced by screen readers.
- **Expense list:** Use semantic HTML:
  - A `<table>` (or `role="table"`) with headers for Amount, Description, Category, and Actions.
  - Each Edit button should include accessible text: `aria-label="Edit expense: [description]"` to distinguish between rows.
- **Empty state:** The "No expenses yet" message should be within the list area so screen readers find it where they'd expect list content.
- **Error states:** Use `role="alert"` for critical error messages (server errors, load failures) so they are immediately announced. Use `aria-live="polite"` for non-critical status changes.

### ARIA Labels Needed

| Element | ARIA Attribute | Value |
|---------|---------------|-------|
| Amount input | `aria-label` or `<label>` | "Amount in dollars" |
| Description input | `aria-label` or `<label>` | "Expense description" |
| Category input | `aria-label` or `<label>` | "Expense category" |
| Submit button (add mode) | `aria-label` | "Add expense" (if button text is not descriptive enough) |
| Submit button (edit mode) | `aria-label` | "Save changes to expense" |
| Cancel button | `aria-label` | "Cancel editing" |
| Edit button (per row) | `aria-label` | "Edit expense: {description}" |
| Retry button | `aria-label` | "Retry loading expenses" |
| Total display | `aria-live="polite"`, `aria-label` | "Total expenses: $X,XXX.XX" |
| Success toast | `role="status"`, `aria-live="polite"` | (content is the message text) |
| Error messages | `role="alert"` | (content is the error text) |
| Form mode indicator | `aria-live="polite"` | "Editing expense" or hidden when in add mode |
| Expense list table | `role="table"` or `<table>` | Table with column headers |
| Validation errors | `aria-describedby` on input | Error message ID linked to the input |
| Invalid fields | `aria-invalid="true"` | Set when validation fails; removed on correction |

### Semantic HTML Guidelines

- Use `<main>` for the primary content area.
- Use `<header>` for the app title.
- Use `<form>` for the expense entry/edit form with proper `<label>` elements.
- Use `<table>` with `<thead>` and `<tbody>` for the expense list (or an equally semantic structure with ARIA roles if using a non-table layout).
- Use `<button>` (not `<div>` or `<span>`) for all clickable actions.
- Use `<input type="number">` for the amount field (provides native numeric keyboard on mobile).
- Use `<h1>` for the app title, `<h2>` for section labels (Total, Add Expense, Expenses) if visible section headings are used, or visually-hidden headings for screen reader landmarks.

