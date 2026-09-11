# Jobs to Be Done
## Expense Tracker

| Field | Value |
|-------|-------|
| **Product Name** | Expense Tracker |
| **Date** | 2026-09-11 |
| **Related Personas** | PERSONAS-ExpenseTracker.md |
| **Related PRD** | PRD-ExpenseTracker.md |

---

## JTBD Summary

| ID | Persona | Job Statement | Priority |
|----|---------|--------------|----------|
| JTBD-01.1 | PER-01 | When I have a purchase to record during my workday, I want to enter the amount, description, and category in seconds, so I can keep an accurate spending log without interrupting my workflow. | P0 |
| JTBD-01.2 | PER-01 | When I glance at my expense tracker throughout the day, I want to see my cumulative spending total immediately, so I can self-regulate against my informal weekly budget. | P0 |
| JTBD-01.3 | PER-01 | When I notice I entered the wrong amount or category, I want to correct the entry in place, so I can maintain accurate records without re-entering the whole expense. | P0 |
| JTBD-02.1 | PER-02 | When I sit down on Sunday evening with a stack of receipts, I want to enter 10–20 expenses in rapid succession with each one persisted immediately, so I can trust that no entry is lost if the browser tab closes or the page refreshes mid-session. | P0 |
| JTBD-02.2 | PER-02 | When I finish a batch entry session and spot transposed digits or wrong categories, I want to edit multiple expenses in sequence, so I can correct errors without disrupting my reconciliation flow. | P0 |
| JTBD-02.3 | PER-02 | When I need to reconcile my digital entries against physical receipts, I want to review the full expense list with a session total, so I can confirm every receipt is accounted for before filing them. | P0 |
| JTBD-03.1 | PER-03 | When I set up a new personal finance tool on my home server, I want to start the application with a single terminal command, so I can begin tracking expenses immediately without multi-step installation or configuration. | P0 |
| JTBD-03.2 | PER-03 | When I want to verify my financial data is safe and portable, I want to inspect and back up the storage file directly, so I can confirm data integrity without relying on the application's UI alone. | P0 |
| JTBD-03.3 | PER-03 | When I track expenses daily from different devices on my local network, I want the same entry, edit, and review workflow to work identically everywhere, so I can manage finances without device-specific limitations. | P1 |

---

## PER-01: Maya Rodriguez — Jobs

### JTBD-01.1: Rapid Expense Capture

**Job Statement:**
When I have a purchase to record during my workday, I want to enter the amount, description, and category in seconds, so I can keep an accurate spending log without interrupting my workflow.

**Current Alternatives:**
- Opens a spreadsheet and manually types values into cells, then drags formulas down to recalculate totals — slow and error-prone
- Uses heavyweight budgeting apps (Mint, YNAB) that require navigating through menus, dropdowns of 40+ categories, and multi-screen wizards before a single entry is logged
- Jots amounts on sticky notes or in a notes app, intending to transfer later but often losing track

**Hiring Criteria:**
- Entry form displays all three fields (amount, description, category) on a single screen with no navigation required
- Submitting an expense clears the form and shows the new entry in the list within 1 second
- Free-text category input — no predefined dropdown to slow down entry
- Form validation gives immediate inline feedback without discarding entered data

**Success Measure:** Maya completes a full expense entry (all three fields + submit) in under 10 seconds, measured from first keystroke to confirmation.

**Related Features:** F0, F5
**Priority:** P0

---

### JTBD-01.2: At-a-Glance Spending Awareness

**Job Statement:**
When I glance at my expense tracker throughout the day, I want to see my cumulative spending total immediately, so I can self-regulate against my informal weekly budget.

**Current Alternatives:**
- Manually sums cells in a spreadsheet, which requires selecting ranges and reading formula results — easy to miss rows or corrupt with a stray keystroke
- Mentally estimates based on memory, which becomes inaccurate after 3–4 entries
- Checks bank app balance, which is delayed and includes non-discretionary transactions

**Hiring Criteria:**
- Running total is visible on the page without scrolling or clicking — always present in the viewport
- Total updates immediately after adding or editing an expense, with no manual refresh required
- Total displays with proper currency formatting (two decimal places)

**Success Measure:** Running total is visible without scrolling and reflects the correct sum within 1 second of any expense being added or edited.

**Related Features:** F4, F5
**Priority:** P0

---

### JTBD-01.3: Quick Mistake Correction

**Job Statement:**
When I notice I entered the wrong amount or category, I want to correct the entry in place, so I can maintain accurate records without re-entering the whole expense.

**Current Alternatives:**
- Deletes the spreadsheet row and re-enters from scratch, risking formula breakage
- Leaves the error in place because fixing it is too cumbersome, degrading data quality over time
- In apps with no edit function, adds a "correction" entry with a negative amount — confusing and clutters the list

**Hiring Criteria:**
- Each expense in the list has a visible edit action that populates the form with current values
- User can modify any combination of amount, description, and category in a single edit
- Edited values are persisted and the list plus total reflect changes within 2 seconds
- A cancel option exits edit mode without saving, preserving the original values

**Success Measure:** Maya edits an existing expense and sees both the corrected entry and recalculated total within 2 seconds of saving.

**Related Features:** F1, F3, F4
**Priority:** P0

---

## PER-02: Tom Langford — Jobs

### JTBD-02.1: Reliable Batch Entry

**Job Statement:**
When I sit down on Sunday evening with a stack of receipts, I want to enter 10–20 expenses in rapid succession with each one persisted immediately, so I can trust that no entry is lost if the browser tab closes or the page refreshes mid-session.

**Current Alternatives:**
- Enters expenses into a browser-based tool that uses localStorage, then loses the entire session when accidentally closing the tab or clearing cookies
- Types receipts into a spreadsheet that auto-saves to cloud, but loses track of rows and totals when the sheet grows past 100 entries
- Relies on memory and receipt photos, but faded ink and forgotten amounts mean missed tax deductions

**Hiring Criteria:**
- Each expense is persisted to server-side storage before the UI confirms success — no client-only storage
- The entry form is ready for the next expense immediately after submission (form clears, focus returns to first field)
- All 20 expenses entered in a session survive an accidental tab closure, page refresh, or browser crash
- Data survives a full server restart between weekly sessions with zero loss

**Success Measure:** All expenses entered during a batch session (10–20 entries) are retrievable after closing and reopening the browser — zero entries lost.

**Related Features:** F0, F2
**Priority:** P0

---

### JTBD-02.2: Post-Batch Error Correction

**Job Statement:**
When I finish a batch entry session and spot transposed digits or wrong categories, I want to edit multiple expenses in sequence, so I can correct errors without disrupting my reconciliation flow.

**Current Alternatives:**
- In spreadsheets, clicks cell by cell and re-types values, often introducing new errors while fixing old ones
- In apps without inline edit, deletes and re-enters the expense from scratch, losing the original timestamp and order
- Gives up on corrections because the friction is too high, leading to inaccurate tax records

**Hiring Criteria:**
- Each expense in the list provides an edit action that loads current values into the form
- After saving one edit, the user can immediately select another expense to edit without extra navigation
- Edited values persist to server-side storage and the list reflects changes without a full page reload
- The running total recalculates correctly after each edit

**Success Measure:** Tom can edit an expense and immediately see the updated value in the list and recalculated total, enabling correction of 3–5 expenses within 2 minutes.

**Related Features:** F1, F3, F4
**Priority:** P0

---

### JTBD-02.3: Receipt Reconciliation

**Job Statement:**
When I need to reconcile my digital entries against physical receipts, I want to review the full expense list with a session total, so I can confirm every receipt is accounted for before filing them.

**Current Alternatives:**
- Prints the spreadsheet and manually checks off receipts one by one — time-consuming and wasteful
- Scrolls through a banking app that mixes expense categories with income and transfers, making it hard to isolate relevant entries
- Counts receipts and compares to row count in a spreadsheet, but has no easy way to verify amounts match

**Hiring Criteria:**
- The full expense list loads completely in under 1 second, even with 500+ accumulated entries
- Each row displays amount, description, and category clearly enough to match against a physical receipt
- The total is always visible for comparison against a manually summed receipt stack
- The list displays without pagination or truncation so all entries are scannable

**Success Measure:** The complete expense list and total load in under 1 second with 500+ entries, enabling Tom to cross-check all entries against his receipt stack in a single scrollable view.

**Related Features:** F3, F4, F5
**Priority:** P0

---

## PER-03: Priya Nair — Jobs

### JTBD-03.1: Zero-Friction Self-Hosted Setup

**Job Statement:**
When I set up a new personal finance tool on my home server, I want to start the application with a single terminal command, so I can begin tracking expenses immediately without multi-step installation or configuration.

**Current Alternatives:**
- Uses SaaS expense tools that require account creation and store financial data on third-party servers — a privacy risk she's unwilling to accept
- Deploys self-hosted tools that demand Docker, environment variable setup, or dependency resolution, turning a simple install into a multi-hour troubleshooting session
- Builds custom scripts and spreadsheets, which work but lack a web UI for convenient daily use

**Hiring Criteria:**
- Application starts and serves the web UI with a single command (e.g., `npm start` or `python app.py`)
- No Docker, no environment variable configuration, no external database setup required for first run
- The storage layer initializes automatically on first launch — no manual schema creation or file provisioning
- Application is accessible via a local network URL from any device on the same network

**Success Measure:** Priya starts the application with one terminal command and has a usable web UI within 10 seconds, with zero manual configuration steps.

**Related Features:** F5, F2
**Priority:** P0

---

### JTBD-03.2: Transparent and Portable Data Storage

**Job Statement:**
When I want to verify my financial data is safe and portable, I want to inspect and back up the storage file directly, so I can confirm data integrity without relying on the application's UI alone.

**Current Alternatives:**
- Uses localStorage-only browser tools that provide no way to back up, migrate, or inspect data outside the browser — opaque and fragile
- Stores data in proprietary SaaS formats that cannot be exported without vendor-specific tools
- Maintains parallel spreadsheet backups of data entered in apps, doubling the work

**Hiring Criteria:**
- Data is stored in a standard, inspectable format (SQLite database or JSON file) on the server's filesystem
- The storage file can be backed up with a simple file copy (`cp data.db data.db.bak`)
- Data written by the application is immediately readable via standard tools (`sqlite3`, `cat`, `jq`)
- Expense records survive a full server restart cycle (stop → start → verify data intact) with zero loss

**Success Measure:** Priya can query the storage file directly (e.g., `sqlite3 data.db "SELECT * FROM expenses"`) and confirm all entries match what the web UI displays — 100% consistency.

**Related Features:** F2
**Priority:** P0

---

### JTBD-03.3: Consistent Multi-Device Daily Tracking

**Job Statement:**
When I track expenses daily from different devices on my local network, I want the same entry, edit, and review workflow to work identically everywhere, so I can manage finances without device-specific limitations.

**Current Alternatives:**
- Uses browser-based tools with localStorage, which means data entered on the laptop is invisible from the tablet — each device has its own isolated data set
- Syncs spreadsheets via cloud services, introducing the third-party data exposure she's trying to avoid
- Enters all expenses from a single device, losing the convenience of logging from whichever device is at hand

**Hiring Criteria:**
- All CRUD operations (add, edit, list, total) work identically whether accessed from laptop or tablet via the local network URL
- Data entered from one device appears immediately when the page is loaded from another device
- The web UI renders correctly in all modern browsers without device-specific workarounds
- No client-side state is required — all data lives on the server

**Success Measure:** An expense entered from Priya's laptop is visible and editable from her tablet within 5 seconds of a page load, with identical data and totals on both devices.

**Related Features:** F0, F1, F3, F4, F5
**Priority:** P1

---

## Outcome-to-Feature Traceability

| JTBD ID | Feature | Expected Outcome |
|---------|---------|-----------------|
| JTBD-01.1 | F0, F5 | User records an expense in under 10 seconds via a minimal, single-screen form |
| JTBD-01.2 | F4, F5 | Cumulative spending total is always visible and updates within 1 second of any change |
| JTBD-01.3 | F1, F3, F4 | Editing an expense updates the list and recalculated total within 2 seconds |
| JTBD-02.1 | F0, F2 | Every expense in a batch session is persisted server-side before confirmation — zero entries lost on tab close |
| JTBD-02.2 | F1, F3, F4 | Sequential edits persist correctly with list and total reflecting each change immediately |
| JTBD-02.3 | F3, F4, F5 | Full expense list with total loads in under 1 second for 500+ entries |
| JTBD-03.1 | F5, F2 | Application starts with one command and is usable within 10 seconds with zero configuration |
| JTBD-03.2 | F2 | Storage file is inspectable with standard tools and matches UI data with 100% consistency |
| JTBD-03.3 | F0, F1, F3, F4, F5 | Identical CRUD behavior and data across devices on the local network |

---

## NaC Preview

| JTBD ID | Outcome | Candidate NaC |
|---------|---------|--------------|
| JTBD-01.1 | Expense recorded in under 10 seconds | Given the expense form is displayed, when a user fills in amount, description, and category and submits, then the new expense appears in the list and the form clears within 1 second |
| JTBD-01.2 | Running total always visible and current | Given expenses exist, when the page is loaded or an expense is added/edited, then the total is visible without scrolling and reflects the correct sum within 1 second |
| JTBD-01.3 | Entry corrected in place within 2 seconds | Given an expense is in the list, when the user clicks edit, changes a field, and saves, then the list and total update within 2 seconds without a page reload |
| JTBD-02.1 | Zero entries lost during batch session | Given a user submits 15 expenses and closes the browser tab, when the user reopens the page, then all 15 expenses are displayed in the list |
| JTBD-02.2 | Sequential edits persist correctly | Given a user edits 3 expenses in sequence, when each edit is saved, then the list and total reflect each correction immediately and all changes persist after page refresh |
| JTBD-02.3 | Full list loads in under 1 second at scale | Given 500+ expenses are stored, when the page is loaded, then all expenses and the correct total are displayed within 1 second |
| JTBD-03.1 | Single-command startup with zero config | Given the application code is present, when the user runs one terminal command, then the web UI is accessible at a local URL within 10 seconds |
| JTBD-03.2 | Storage file is inspectable and consistent | Given expenses have been entered via the UI, when the user queries the storage file with standard tools, then all entries match the UI display exactly |
| JTBD-03.3 | Identical behavior across devices | Given the app is running on a home server, when a user enters an expense from device A and loads the page from device B, then the expense appears with correct data and total on device B |

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-11*
