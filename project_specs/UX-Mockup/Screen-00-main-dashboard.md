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

