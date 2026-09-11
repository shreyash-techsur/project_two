# User Stories
## Expense Tracker

| Field | Value |
|-------|-------|
| **Product Name** | Expense Tracker |
| **Date** | 2026-09-11 |
| **Related PRD** | PRD-ExpenseTracker.md |
| **Related FRD** | FRD-ExpenseTracker.md |

---

## Story Format

Each story follows: **As a [persona], I want to [action], so that [outcome].**

Acceptance criteria are listed beneath each story. Stories are grouped by epic and prioritised.

**Personas:**
- **Maya Rodriguez** (PER-01) — Daily Expense Tracker, intermediate user, logs 3-5 expenses daily
- **Tom Langford** (PER-02) — Periodic Batch Logger, novice user, enters 10-20 expenses weekly
- **Priya Nair** (PER-03) — Developer / Self-Hoster, expert user, values control and inspectability

---

## Epic 0: Expense Entry (F0)

### US-0.1: Add a New Expense
**As a** Maya Rodriguez, **I want to** enter an expense by providing an amount, description, and category through a web form, **so that** I can record my spending in under 15 seconds and move on with my day.

**Acceptance Criteria:**
- [ ] The expense form displays amount, description, and category input fields plus a submit button
- [ ] The amount field accepts numeric values with up to two decimal places (e.g., 10.50)
- [ ] The description field accepts free-text input up to 500 characters
- [ ] The category field accepts free-text input up to 100 characters
- [ ] All three fields are required — the form cannot be submitted with any field empty
- [ ] On successful submission, the form clears all fields and is ready for the next entry
- [ ] The new expense appears immediately in the expense list without a page reload
- [ ] The running total updates immediately to include the new expense amount
- [ ] A brief success indicator (e.g., toast or green flash) confirms the expense was saved

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.2: Batch-Enter Multiple Expenses
**As a** Tom Langford, **I want to** enter 10-20 expenses in rapid succession during a single session, **so that** I can log an entire week's worth of receipts without any data loss or workflow interruption.

**Acceptance Criteria:**
- [ ] After submitting an expense, the form clears and focus returns to the amount field for the next entry
- [ ] Each expense is persisted to the server before the success response is shown (no client-only caching)
- [ ] Entering 20 expenses in sequence results in all 20 appearing in the expense list
- [ ] The running total accurately reflects all entries after each submission
- [ ] No data is lost if the browser tab is accidentally closed mid-session — all previously submitted entries persist

**Priority:** P0 | **Feature Ref:** F0, F2

---

### US-0.3: Receive Validation Feedback on Expense Entry
**As a** Maya Rodriguez, **I want to** see clear inline error messages when I submit an invalid expense, **so that** I can quickly correct my input without losing what I already typed.

**Acceptance Criteria:**
- [ ] Submitting with an empty amount field shows "Amount is required" next to the amount field
- [ ] Submitting with a non-numeric amount shows "Amount must be a valid number"
- [ ] Submitting with a zero or negative amount shows "Amount must be greater than zero"
- [ ] Submitting with an amount exceeding 999,999.99 shows "Amount must not exceed 999,999.99"
- [ ] Submitting with an amount having more than two decimal places shows "Amount must have at most two decimal places"
- [ ] Submitting with an empty description shows "Description is required"
- [ ] Submitting with a description exceeding 500 characters shows "Description must not exceed 500 characters"
- [ ] Submitting with an empty category shows "Category is required"
- [ ] Submitting with a category exceeding 100 characters shows "Category must not exceed 100 characters"
- [ ] The form retains the user's input when validation fails so the user can correct and retry
- [ ] Multiple validation errors are displayed simultaneously when more than one field is invalid

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.4: Server-Side Validation of Expense Data
**As a** Priya Nair, **I want to** know that the server re-validates all expense data independently of the browser, **so that** data integrity is enforced even if client-side validation is bypassed.

**Acceptance Criteria:**
- [ ] The server validates all fields (amount, description, category) with the same rules as the client
- [ ] Invalid requests receive a 400 response with structured error codes (e.g., ERR_EXPENSE_AMOUNT_REQUIRED)
- [ ] Multiple validation errors are returned in an errors array when multiple fields are invalid
- [ ] Server error responses never expose stack traces or internal implementation details
- [ ] The server rejects requests that pass client validation but fail server rules (e.g., manipulated requests)

**Priority:** P0 | **Feature Ref:** F0

---

## Epic 1: Expense Editing (F1)

### US-1.1: Edit an Existing Expense
**As a** Maya Rodriguez, **I want to** click an edit button on an expense and modify its amount, description, or category, **so that** I can correct a typo or wrong amount without re-entering the entire record.

**Acceptance Criteria:**
- [ ] Each expense row in the list displays an Edit button or link
- [ ] Clicking Edit populates the expense form with the selected expense's current amount, description, and category
- [ ] The UI clearly indicates "edit mode" (e.g., button label changes to "Save Changes" and a "Cancel" button appears)
- [ ] The user can modify any combination of the three fields
- [ ] On save, the same validation rules as expense entry (F0) are applied
- [ ] On successful save, the expense list row updates with the new values immediately
- [ ] The running total recalculates immediately to reflect the edited amount
- [ ] A brief success indicator confirms the edit was saved
- [ ] After save, the form exits edit mode and returns to add-new state

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.2: Cancel Editing Without Saving
**As a** Tom Langford, **I want to** cancel an in-progress edit and discard my changes, **so that** I can abandon a correction without accidentally modifying the stored expense.

**Acceptance Criteria:**
- [ ] A Cancel button is visible when the form is in edit mode
- [ ] Clicking Cancel discards all pending changes without making any server request
- [ ] The form returns to its default add-new state after cancellation
- [ ] The expense list and running total remain unchanged after cancellation
- [ ] The original expense values remain intact in the list

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.3: Edit Multiple Expenses in Sequence
**As a** Tom Langford, **I want to** edit several expenses one after another to fix category and amount errors from a batch session, **so that** I can correct mistakes efficiently without disrupting my review workflow.

**Acceptance Criteria:**
- [ ] After saving an edit, the user can immediately click Edit on another expense
- [ ] Each edit is persisted independently — saving one edit does not affect other expenses
- [ ] The expense list reflects all sequential edits accurately
- [ ] The running total is correct after multiple sequential edits

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.4: Handle Editing a Non-Existent Expense
**As a** Priya Nair, **I want to** receive a clear error if I attempt to save an edit for an expense that no longer exists, **so that** I understand the failure and can take appropriate action.

**Acceptance Criteria:**
- [ ] If the server cannot find the expense by ID, a 404 response is returned with error code ERR_EXPENSE_NOT_FOUND
- [ ] The UI displays a clear "Expense not found" error message to the user
- [ ] The form does not clear on a 404 error, allowing the user to re-enter the data as a new expense if desired
- [ ] Invalid or malformed IDs return a 400 response with error code ERR_EXPENSE_INVALID_ID

**Priority:** P0 | **Feature Ref:** F1

---

## Epic 2: Persistent Storage (F2)

### US-2.1: Data Survives Page Refresh
**As a** Maya Rodriguez, **I want to** refresh my browser page and see all my previously entered expenses still listed, **so that** I can trust that my data is safe and not just stored in the browser.

**Acceptance Criteria:**
- [ ] After adding one or more expenses, refreshing the browser page shows all previously entered expenses
- [ ] The expense list loads via GET /api/expenses from server-side storage on page load
- [ ] The running total matches the sum of all persisted expenses after refresh
- [ ] No expense data is stored only in browser memory, localStorage, or sessionStorage

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.2: Data Survives Server Restart
**As a** Tom Langford, **I want to** have all my expenses persist even if the server is stopped and restarted between my weekly sessions, **so that** I never lose receipt data I've already entered.

**Acceptance Criteria:**
- [ ] After entering expenses, stopping the server process, and starting it again, all expenses are still retrievable
- [ ] The GET /api/expenses endpoint returns all previously stored expenses after a restart
- [ ] The running total is correct after a server restart
- [ ] No data corruption occurs during the stop/start cycle

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.3: Automatic Storage Initialization
**As a** Priya Nair, **I want to** have the storage layer automatically create and initialize itself on first run, **so that** I can start the app with a single command and immediately begin tracking expenses without manual database setup.

**Acceptance Criteria:**
- [ ] On first server start, the storage file/database is created automatically if it does not exist
- [ ] The schema (tables, indexes) is created during initialization
- [ ] The server logs a message confirming storage initialization (e.g., "Storage initialized successfully")
- [ ] Subsequent starts detect the existing store and skip re-creation
- [ ] If schema integrity is compromised, the server attempts repair and logs a warning

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.4: Write-Before-Acknowledge Guarantee
**As a** Tom Langford, **I want to** know that each expense is confirmed written to disk before the app tells me it was saved, **so that** I can trust every confirmation and never have phantom entries that vanish.

**Acceptance Criteria:**
- [ ] The server does not respond with 201 (create) or 200 (update) until the data is durably written to storage
- [ ] If a write fails (disk full, I/O error), the server responds with 500 ERR_STORAGE_WRITE
- [ ] The client displays "Failed to save expense. Please try again." on storage write failure
- [ ] The form retains user input on a storage failure so the user can retry

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.5: Inspect Storage Directly
**As a** Priya Nair, **I want to** inspect the stored expense data by directly querying the SQLite database or reading the JSON file, **so that** I can verify data integrity, create backups, or migrate data independently of the application.

**Acceptance Criteria:**
- [ ] Expense data is stored in a standard format (SQLite database or JSON file)
- [ ] The storage file can be copied for backup purposes
- [ ] Each stored record contains id, amount (cents), description, category, created_at, and updated_at fields
- [ ] Amount values are stored as integers representing cents (e.g., 1050 for $10.50)
- [ ] Timestamps are stored in ISO 8601 UTC format

**Priority:** P0 | **Feature Ref:** F2

---

## Epic 3: Expense List Display (F3)

### US-3.1: View All Expenses on Page Load
**As a** Maya Rodriguez, **I want to** see a list of all my saved expenses as soon as I open the application, **so that** I can quickly review my spending history and check what I logged yesterday.

**Acceptance Criteria:**
- [ ] On page load, the application fetches all expenses from GET /api/expenses
- [ ] Each expense row displays the amount formatted as currency (e.g., $10.50), description, and category
- [ ] Expenses are ordered with the most recent first (by created_at descending)
- [ ] Each expense row includes an Edit button as the entry point for editing (F1)
- [ ] The list is visible on the page without requiring navigation to a separate screen

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.2: See Empty State When No Expenses Exist
**As a** Maya Rodriguez, **I want to** see a friendly message when I have no expenses yet, **so that** I understand the list is intentionally empty and I'm guided to add my first expense.

**Acceptance Criteria:**
- [ ] When zero expenses exist, the list area displays a message such as "No expenses yet. Add your first expense above!"
- [ ] The empty state message is friendly and non-technical
- [ ] The expense form is still visible and functional during empty state
- [ ] The total displays $0.00 during empty state
- [ ] After adding the first expense, the empty state message is replaced by the expense list

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.3: List Updates Immediately After Mutations
**As a** Tom Langford, **I want to** see the expense list update immediately after I add or edit an expense without manually refreshing the page, **so that** I can verify each entry in real-time during my batch session.

**Acceptance Criteria:**
- [ ] After adding a new expense, it appears in the list without a page reload
- [ ] After editing an expense, the updated values appear in the correct row without a page reload
- [ ] The list maintains its ordering (most recent first) after mutations
- [ ] No duplicate entries appear after add or edit operations

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.4: Handle List Loading Errors Gracefully
**As a** Priya Nair, **I want to** see a meaningful error message if the expense list fails to load, **so that** I can diagnose the issue and retry.

**Acceptance Criteria:**
- [ ] If GET /api/expenses returns a 500 error, the UI displays "Failed to load expenses. Please try again."
- [ ] If the network is unreachable, the UI displays "Unable to connect to the server. Check your connection and try again."
- [ ] A retry option (button or link) is provided so the user can attempt to reload
- [ ] The UI does not display a broken or empty table — the error state is intentional and clear

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.5: Expense List Performance at Scale
**As a** Tom Langford, **I want to** load and view a list of 500+ accumulated expenses in under 1 second, **so that** my weekly review sessions remain fast even after months of use.

**Acceptance Criteria:**
- [ ] The expense list renders within 1 second for up to 1,000 expenses
- [ ] Amount values are correctly converted from cents to display format for all entries
- [ ] Description and category text are sanitized to prevent XSS when rendered in HTML
- [ ] The list is scrollable and does not break the page layout with many entries

**Priority:** P0 | **Feature Ref:** F3

---

## Epic 4: Total Amount Display (F4)

### US-4.1: View Running Total of All Expenses
**As a** Maya Rodriguez, **I want to** see the total of all my expenses prominently displayed and always visible, **so that** I can gauge whether I'm staying within my informal weekly budget at a glance.

**Acceptance Criteria:**
- [ ] The total amount is displayed prominently in the UI, always visible without scrolling
- [ ] The total is formatted as currency with a dollar sign and two decimal places (e.g., $1,234.56)
- [ ] The total is calculated by summing all expense amounts using integer cents arithmetic
- [ ] The final cent sum is divided by 100 for display, avoiding floating-point rounding errors
- [ ] The total shows $0.00 when no expenses exist

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.2: Total Updates After Adding an Expense
**As a** Maya Rodriguez, **I want to** see the total update immediately after I add a new expense, **so that** I have real-time feedback on my cumulative spending.

**Acceptance Criteria:**
- [ ] After adding a new expense, the total increases by the new expense's amount
- [ ] The total update happens without a page reload
- [ ] The updated total is accurate to the cent (integer arithmetic, no floating-point drift)
- [ ] The total format remains consistent (currency symbol, two decimal places) after update

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.3: Total Updates After Editing an Expense
**As a** Tom Langford, **I want to** see the total recalculate immediately after I edit an expense's amount, **so that** I can verify the correction is reflected in my session reconciliation.

**Acceptance Criteria:**
- [ ] After editing an expense's amount, the total adjusts to reflect the change (old amount removed, new amount added)
- [ ] The total update happens without a page reload
- [ ] Editing a non-amount field (description or category only) does not change the total
- [ ] The total remains correct after multiple sequential edits

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.4: Total Error State
**As a** Priya Nair, **I want to** see a clear indication if the total cannot be calculated due to a data loading failure, **so that** I am never misled by a stale or incorrect total.

**Acceptance Criteria:**
- [ ] If the expense list fails to load, the total area displays "—" or "Error loading total" instead of a number
- [ ] The total never displays a stale value from a previous successful load after a failed refresh
- [ ] Once the list loads successfully (e.g., after retry), the total displays correctly

**Priority:** P0 | **Feature Ref:** F4

---

## Epic 5: Web-Based User Interface (F5)

### US-5.1: Access Application via Browser
**As a** Maya Rodriguez, **I want to** open the expense tracker by navigating to a URL in my browser, **so that** I can start tracking expenses without installing any software or plugins.

**Acceptance Criteria:**
- [ ] The application is accessible via a URL (e.g., http://localhost:3000)
- [ ] The page loads and renders the expense form, expense list, and total in a single-page layout
- [ ] No browser plugins, extensions, or installations are required
- [ ] The application works in the latest versions of Chrome, Firefox, Safari, and Edge

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.2: Single-Page Layout with Clear Hierarchy
**As a** Maya Rodriguez, **I want to** see the expense form, expense list, and total all on one page with a clear visual hierarchy, **so that** I can enter expenses, review history, and check my total without navigating between pages.

**Acceptance Criteria:**
- [ ] The expense form is prominently placed (top or left of page)
- [ ] The expense list is visible below or beside the form
- [ ] The total amount is always visible without scrolling to it
- [ ] All three components (form, list, total) are accessible without tabs, navigation menus, or page transitions
- [ ] The layout has a clear visual hierarchy distinguishing form, list, and total sections

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.3: Single-Command Server Startup
**As a** Priya Nair, **I want to** start the entire application (server + UI) with a single terminal command, **so that** I can get it running immediately on my home server without complex setup procedures.

**Acceptance Criteria:**
- [ ] The application starts with a single command (e.g., `npm start`, `python app.py`, or equivalent)
- [ ] The server serves both the static UI assets (HTML, CSS, JS) and the API endpoints on the same origin
- [ ] No separate build step, database migration command, or configuration file is required before first run
- [ ] After the server starts, navigating to the URL immediately shows a functional application
- [ ] The PORT is configurable via environment variable with a sensible default (3000)

**Priority:** P0 | **Feature Ref:** F5, F2

---

### US-5.4: Responsive and Keyboard-Accessible Interface
**As a** Maya Rodriguez, **I want to** use the expense tracker on different screen sizes and navigate it with my keyboard, **so that** I can use it comfortably on my work laptop and personal devices.

**Acceptance Criteria:**
- [ ] The layout is usable on desktop screen sizes (primary target)
- [ ] The layout remains functional (not pixel-perfect) on tablet and phone screen sizes
- [ ] All interactive elements (form fields, buttons) are accessible via keyboard tab navigation
- [ ] The form can be submitted by pressing Enter
- [ ] Focus order follows a logical sequence (amount → description → category → submit)

**Priority:** P0 | **Feature Ref:** F5

---

### US-5.5: Graceful Error Handling in the UI
**As a** Tom Langford, **I want to** see clear, non-technical error messages when something goes wrong, **so that** I understand the problem and know whether to retry or seek help.

**Acceptance Criteria:**
- [ ] Validation errors appear inline next to the relevant form field
- [ ] Server errors (500) display a user-friendly message such as "Failed to save expense. Please try again."
- [ ] Network errors display "Unable to connect to the server. Check your connection and try again."
- [ ] JavaScript runtime errors are caught and display a fallback message: "Something went wrong. Please refresh the page."
- [ ] Error messages do not expose technical details (no stack traces, error codes shown only in structured API responses)

**Priority:** P0 | **Feature Ref:** F5

---

## Summary Table

| Epic | Story Count | P0 | P1 | P2 |
|------|-------------|----|----|-----|
| Epic 0: Expense Entry | 4 | 4 | 0 | 0 |
| Epic 1: Expense Editing | 4 | 4 | 0 | 0 |
| Epic 2: Persistent Storage | 5 | 5 | 0 | 0 |
| Epic 3: Expense List Display | 5 | 5 | 0 | 0 |
| Epic 4: Total Amount Display | 4 | 4 | 0 | 0 |
| Epic 5: Web-Based User Interface | 5 | 5 | 0 | 0 |
| **Total** | **27** | **27** | **0** | **0** |

---

## Story Index

| Story ID | Title | Priority | Feature Ref | Primary Persona |
|----------|-------|----------|-------------|-----------------|
| US-0.1 | Add a New Expense | P0 | F0 | Maya Rodriguez |
| US-0.2 | Batch-Enter Multiple Expenses | P0 | F0, F2 | Tom Langford |
| US-0.3 | Receive Validation Feedback on Expense Entry | P0 | F0 | Maya Rodriguez |
| US-0.4 | Server-Side Validation of Expense Data | P0 | F0 | Priya Nair |
| US-1.1 | Edit an Existing Expense | P0 | F1 | Maya Rodriguez |
| US-1.2 | Cancel Editing Without Saving | P0 | F1 | Tom Langford |
| US-1.3 | Edit Multiple Expenses in Sequence | P0 | F1 | Tom Langford |
| US-1.4 | Handle Editing a Non-Existent Expense | P0 | F1 | Priya Nair |
| US-2.1 | Data Survives Page Refresh | P0 | F2 | Maya Rodriguez |
| US-2.2 | Data Survives Server Restart | P0 | F2 | Tom Langford |
| US-2.3 | Automatic Storage Initialization | P0 | F2 | Priya Nair |
| US-2.4 | Write-Before-Acknowledge Guarantee | P0 | F2 | Tom Langford |
| US-2.5 | Inspect Storage Directly | P0 | F2 | Priya Nair |
| US-3.1 | View All Expenses on Page Load | P0 | F3 | Maya Rodriguez |
| US-3.2 | See Empty State When No Expenses Exist | P0 | F3 | Maya Rodriguez |
| US-3.3 | List Updates Immediately After Mutations | P0 | F3 | Tom Langford |
| US-3.4 | Handle List Loading Errors Gracefully | P0 | F3 | Priya Nair |
| US-3.5 | Expense List Performance at Scale | P0 | F3 | Tom Langford |
| US-4.1 | View Running Total of All Expenses | P0 | F4 | Maya Rodriguez |
| US-4.2 | Total Updates After Adding an Expense | P0 | F4 | Maya Rodriguez |
| US-4.3 | Total Updates After Editing an Expense | P0 | F4 | Tom Langford |
| US-4.4 | Total Error State | P0 | F4 | Priya Nair |
| US-5.1 | Access Application via Browser | P0 | F5 | Maya Rodriguez |
| US-5.2 | Single-Page Layout with Clear Hierarchy | P0 | F5 | Maya Rodriguez |
| US-5.3 | Single-Command Server Startup | P0 | F5, F2 | Priya Nair |
| US-5.4 | Responsive and Keyboard-Accessible Interface | P0 | F5 | Maya Rodriguez |
| US-5.5 | Graceful Error Handling in the UI | P0 | F5 | Tom Langford |

---

## Priority Definitions

| Priority | Definition |
|----------|------------|
| **P0** | Critical - Must have for MVP |
| **P1** | High - Important for first release |
| **P2** | Medium - Nice to have |
| **P3** | Low - Future consideration |

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-11*
