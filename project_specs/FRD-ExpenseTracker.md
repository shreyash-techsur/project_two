# Functional Requirements Document: Expense Tracker

**Version:** 1.0
**Project:** Expense Tracker
**Generated:** 2026-09-11
**Source:** PRD-ExpenseTracker.md v1.0, PROJECT.md

---

## Scope

This FRD specifies the functional behavior of the Expense Tracker application — a single-user, web-based tool for recording, editing, and viewing personal expenses with persistent storage. It covers all six PRD features (F0–F5), the database schema, REST API surface, error catalog, and integration points. Every feature is P0 (Critical — MVP requirement).

## Conventions

- **Feature IDs** follow the PRD: F0 through F5.
- **Process steps** are numbered sequentially; sub-steps use letters (a, b, c).
- **Input fields** specify type, constraints, and whether they are required or optional.
- **Error codes** use the format `ERR_{DOMAIN}_{NAME}` (e.g., `ERR_EXPENSE_INVALID_AMOUNT`).
- **Amounts** are stored as integers representing cents to avoid floating-point errors. Display values divide by 100 and format to two decimal places.
- **Timestamps** use ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`) in UTC.
- **IDs** are server-generated unique identifiers (UUIDs or auto-incrementing integers).

## Table of Contents

### Features
- **F0** — Expense Entry
- **F1** — Expense Editing
- **F2** — Persistent Storage
- **F3** — Expense List Display
- **F4** — Total Amount Display
- **F5** — Web-Based User Interface

### Cross-Feature Specifications
- **Y0** — Database Schema (DDL)
- **Y1** — REST API Endpoints
- **Y2** — Error Catalog
- **Y3** — Integration Points

## Shared Terminology

- **Expense:** A single financial record consisting of an amount, description, category, and metadata (ID, timestamp).
- **Amount (cents):** Integer representation of a monetary value in the smallest currency unit (e.g., 1050 = $10.50). All arithmetic and storage uses cents; display converts to decimal.
- **Category:** A free-text label assigned by the user to classify an expense. Not drawn from a predefined list.
- **Persistence:** Server-side storage that survives page refresh, browser closure, and server restart.
- **Mutation:** Any operation that changes stored data (create or update). Every mutation must be confirmed persisted before the server responds with success.
- **Empty state:** The UI condition when zero expenses exist in storage.

---

## F0: Expense Entry

**Description:** Users create a new expense by filling out a web form with amount, description, and category. On submission the expense is validated, persisted to the server-side store, and immediately reflected in both the expense list and the running total. This is the primary interaction point of the application and must be fast, intuitive, and reliable.

**Terminology:**
- **Expense form:** The HTML form containing amount, description, and category input fields plus a submit button.
- **Submission:** The act of sending the form data to the server for validation and persistence.

**Sub-features:**
- Numeric input field for expense amount (supports dollars and cents)
- Free-text input field for description
- Free-text input field for category
- Client-side and server-side validation
- Immediate UI feedback on success or error
- Form clears after successful submission
- New expense appended to expense list without page reload
- Running total recalculated after successful submission

**Process:**
1. User navigates to the application URL; the expense form is visible on load.
2. User enters a value in the **amount** field.
3. User enters text in the **description** field.
4. User enters text in the **category** field.
5. User clicks the **Submit** (or **Add Expense**) button.
6. Client performs front-end validation:
   a. Amount is present, numeric, and greater than zero.
   b. Description is present and non-empty after trimming whitespace.
   c. Category is present and non-empty after trimming whitespace.
   d. If any validation fails, display an inline error message next to the offending field and stop submission.
7. Client sends a `POST /api/expenses` request with the validated data (amount as a decimal dollar value, e.g., `10.50`).
8. Server performs back-end validation (same rules as step 6, plus max-length checks).
9. Server converts the validated dollar amount to integer cents (e.g., `10.50` → `1050`) and writes the expense record to persistent storage. The `created_at` and `updated_at` timestamps are both set to the current UTC time on initial creation.
10. Server confirms the write completed successfully (data is durable).
11. Server responds with `201 Created` and the full expense object (including server-generated `id`, `created_at`, and `updated_at`).
12. Client receives the response:
    a. Clears all form fields.
    b. Appends the new expense to the displayed expense list.
    c. Recalculates and updates the displayed total.
    d. Shows a brief success indicator (e.g., green flash or toast message).
13. If the server responds with an error (4xx or 5xx), the client displays the error message and does **not** clear the form, so the user can correct and retry.

**Inputs:**
- `amount` (number, required): The expense amount in dollars as a decimal number (e.g., `10.50`). Must be a positive number greater than 0. Maximum value: 999,999.99. Precision: up to two decimal places. The server converts to integer cents for storage (e.g., `10.50` → `1050`).
- `description` (string, required): Free-text description of the expense. Min length: 1 character (after trim). Max length: 500 characters.
- `category` (string, required): Free-text category label. Min length: 1 character (after trim). Max length: 100 characters.

**Outputs:**
- On success: the created expense object (`{ id, amount, description, category, created_at, updated_at }`) displayed in the expense list; updated total.
- On validation error: inline error messages next to the invalid field(s).
- On server error: a general error message displayed to the user.

**Validation:**
- Amount must be a number (reject alphabetic, special characters, empty).
- Amount must be > 0 (reject zero and negative values).
- Amount must be <= 999,999.99 (reject unreasonably large values).
- Amount precision must not exceed two decimal places (reject 10.123).
- Description must not be empty after trimming whitespace.
- Description must not exceed 500 characters.
- Category must not be empty after trimming whitespace.
- Category must not exceed 100 characters.
- All validation rules are enforced on both client and server. Server validation is authoritative.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Amount missing or empty | 400 | ERR_EXPENSE_AMOUNT_REQUIRED | "Amount is required" |
| Amount not a valid number | 400 | ERR_EXPENSE_INVALID_AMOUNT | "Amount must be a valid number" |
| Amount <= 0 | 400 | ERR_EXPENSE_AMOUNT_POSITIVE | "Amount must be greater than zero" |
| Amount > 999999.99 | 400 | ERR_EXPENSE_AMOUNT_TOO_LARGE | "Amount must not exceed 999,999.99" |
| Amount has > 2 decimal places | 400 | ERR_EXPENSE_AMOUNT_PRECISION | "Amount must have at most two decimal places" |
| Description missing or empty | 400 | ERR_EXPENSE_DESC_REQUIRED | "Description is required" |
| Description > 500 chars | 400 | ERR_EXPENSE_DESC_TOO_LONG | "Description must not exceed 500 characters" |
| Category missing or empty | 400 | ERR_EXPENSE_CAT_REQUIRED | "Category is required" |
| Category > 100 chars | 400 | ERR_EXPENSE_CAT_TOO_LONG | "Category must not exceed 100 characters" |
| Storage write failure | 500 | ERR_STORAGE_WRITE | "Failed to save expense. Please try again." |

**API Surface (this feature):** `POST /api/expenses` — see `Y1-api.md` §Create Expense for full request/response schema.

**Schema Surface (this feature):** Writes to the `expenses` table — see `Y0-schema.md` for DDL.

---

## F1: Expense Editing

**Description:** Users can modify any previously entered expense. Clicking an edit action on an expense row populates a form with the expense's current values. The user can change any combination of amount, description, and category, then save. The same validation rules as expense entry apply. Changes are persisted and the expense list and running total update immediately. The user may also cancel editing to discard changes.

**Terminology:**
- **Edit mode:** The UI state where an existing expense's values are loaded into a form for modification.
- **Cancel:** Discarding pending edits and returning the form to its default (empty / add-new) state.

**Sub-features:**
- Each expense row displays an Edit button/link
- Clicking Edit loads the expense's current values into the expense form (or a dedicated edit form)
- User can modify amount, description, and/or category independently
- Save action persists changes and refreshes the list and total
- Cancel action discards changes without any server call
- Visual indicator that the form is in "edit mode" vs. "add mode"

**Process:**
1. User views the expense list (see F3).
2. User clicks the **Edit** button on a specific expense row.
3. The expense form (or a dedicated edit area) is populated with the selected expense's current `amount`, `description`, and `category`.
4. The UI indicates edit mode (e.g., button label changes from "Add Expense" to "Save Changes"; a "Cancel" button appears).
5. User modifies one or more fields.
6. **Save path:**
   a. User clicks **Save Changes**.
   b. Client performs front-end validation (identical rules to F0 step 6).
   c. If validation fails, display inline errors and stop.
   d. Client sends `PUT /api/expenses/:id` with the updated fields (amount as a decimal dollar value).
   e. Server validates the request body (same rules as F0 step 8).
   f. Server verifies the expense with `:id` exists. If not, returns 404.
   g. Server updates the record in persistent storage.
   h. Server confirms persistence.
   i. Server responds with `200 OK` and the full updated expense object.
   j. Client updates the expense row in the list with new values.
   k. Client recalculates and displays the updated total.
   l. Client exits edit mode (form clears or returns to add-new state).
   m. Client shows a brief success indicator.
7. **Cancel path:**
   a. User clicks **Cancel**.
   b. Client discards all pending changes (no server call).
   c. Client exits edit mode (form clears or returns to add-new state).
   d. Expense list and total remain unchanged.

**Inputs:**
- `id` (string or integer, required): The unique identifier of the expense to edit. Supplied via the URL path parameter, not user-entered.
- `amount` (number, required): Same constraints as F0.
- `description` (string, required): Same constraints as F0.
- `category` (string, required): Same constraints as F0.

**Outputs:**
- On success: the updated expense object reflected in the list; recalculated total.
- On validation error: inline error messages (same as F0).
- On not-found: error message indicating the expense no longer exists.
- On server error: general error message.
- On cancel: no change to stored data or UI list.

**Validation:**
- All F0 validation rules apply to the edited values.
- The expense `id` must reference an existing record; if deleted or never existed, return 404.
- If no fields have actually changed, the server may still accept the PUT and return 200 (idempotent update).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Expense not found | 404 | ERR_EXPENSE_NOT_FOUND | "Expense not found" |
| All F0 validation errors | 400 | (same as F0) | (same as F0) |
| Storage write failure | 500 | ERR_STORAGE_WRITE | "Failed to update expense. Please try again." |
| Invalid or malformed ID | 400 | ERR_EXPENSE_INVALID_ID | "Invalid expense ID" |

**API Surface (this feature):** `PUT /api/expenses/:id` — see `Y1-api.md` §Update Expense for full request/response schema.

**Schema Surface (this feature):** Updates the `expenses` table — see `Y0-schema.md` for DDL. The `updated_at` column is set to the current timestamp on every update.

---

## F2: Persistent Storage

**Description:** All expense data is stored in a server-side persistent store that survives page refreshes, browser closures, and full server restart cycles. This is the foundational reliability requirement. No mutation (create or update) is reported as successful to the client until the data is confirmed durable on disk. The storage layer must handle sequential read/write operations safely for the single-user scenario.

**Terminology:**
- **Durable write:** A write operation that is confirmed flushed to disk (not just buffered in memory) before the server sends a success response.
- **Storage backend:** The concrete persistence mechanism — SQLite database (recommended) or a JSON file with atomic writes.
- **Record:** A single row/entry in the expenses store, representing one expense.

**Sub-features:**
- Server-side persistent store (SQLite recommended; JSON file acceptable)
- Automatic schema initialization on first run (create tables/files if they do not exist)
- Write-before-acknowledge: server confirms persistence before responding with success
- Data survives: page refresh, browser closure, server restart
- Each expense record contains: `id`, `amount` (cents), `description`, `category`, `created_at`, `updated_at`
- Safe sequential access for single-user scenario (no concurrent-write corruption)

**Process:**
1. On server startup, the storage layer checks whether the persistent store exists.
   a. If it does not exist (first run), create the store (e.g., create SQLite database file + schema, or initialize an empty JSON file).
   b. If it exists, open it and verify schema integrity (table/column existence).
2. On every create operation (`POST /api/expenses`):
   a. Begin a transaction (if using a database).
   b. Insert the new record with a server-generated `id` and `created_at` timestamp.
   c. Commit the transaction / flush to disk.
   d. Only after confirmed persistence, return the success response.
3. On every update operation (`PUT /api/expenses/:id`):
   a. Begin a transaction.
   b. Verify the record exists; if not, return 404 without modifying data.
   c. Update the record's fields and set `updated_at` to the current timestamp.
   d. Commit / flush.
   e. Return the success response.
4. On every read operation (`GET /api/expenses`):
   a. Query all records from the store.
   b. Return the result set. Read operations do not modify data.

**Inputs:**
- Expense data from API requests (validated before reaching the storage layer).

**Outputs:**
- Persisted records retrievable via `GET /api/expenses`.
- Confirmation of successful write (used by API layer to respond with 201/200).

**Validation:**
- Storage layer receives only pre-validated data (validation is the API layer's responsibility — see F0, F1).
- On startup, if the schema is missing or corrupt, the storage layer must create/repair it and log a warning. The server must not crash on first run.
- If a write fails (disk full, permission error, database lock timeout), the storage layer must surface a clear error to the API layer, which translates it to `500 ERR_STORAGE_WRITE`.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Storage file/db cannot be created on first run | — (server fails to start) | — | Server logs: "Failed to initialize storage: {detail}" |
| Write fails (disk full, I/O error) | 500 | ERR_STORAGE_WRITE | "Failed to save data. Please try again." |
| Read fails (db locked, corrupt) | 500 | ERR_STORAGE_READ | "Failed to retrieve data. Please try again." |
| Schema migration/integrity check fails | — (server fails to start) | — | Server logs: "Storage schema integrity check failed: {detail}" |

**API Surface (this feature):** This feature is the backend implementation behind all API endpoints. It does not expose its own endpoint.

**Schema Surface (this feature):** Defines and owns the `expenses` table — see `Y0-schema.md` for full DDL.

---

## F3: Expense List Display

**Description:** The application displays all saved expenses in a list within the web UI. The list is the primary view for reviewing spending history and the entry point for editing individual expenses. It loads all expenses on page load and updates in real-time after any mutation (create or edit) without requiring a manual page refresh.

**Terminology:**
- **Expense row:** A single visual row in the list representing one expense record.
- **Empty state:** The UI shown when zero expenses exist — a friendly message instead of a blank area.
- **Real-time update:** The list reflects mutations immediately via the API response data, without a full page reload.

**Sub-features:**
- Fetch and display all expenses on page load
- Each expense row shows: amount (formatted as currency), description, category
- Each expense row includes an Edit button (entry point for F1)
- List updates immediately after adding (F0) or editing (F1) an expense
- Empty state message when no expenses exist
- Expenses displayed in reverse chronological order (most recent first, by `created_at` descending)
- Proper currency formatting for amount values (two decimal places, dollar sign or locale symbol)

**Process:**
1. On page load, client sends `GET /api/expenses`.
2. Server queries the persistent store for all expense records.
3. Server responds with `200 OK` and an array of expense objects, ordered by `created_at` descending (most recent first).
4. Client renders the expense list:
   a. If the array is empty, display the empty state message (e.g., "No expenses yet. Add your first expense above!").
   b. If the array has items, render each expense as a row showing:
      - Amount formatted as currency (e.g., `$10.50`)
      - Description text
      - Category text
      - Edit button
5. After a successful create (F0 step 12) or edit (F1 step 6j), the client updates the list in place using the response data — no additional `GET` request is required (though a full refresh is also acceptable).
6. The list remains visible at all times (not hidden behind tabs or navigation).

**Inputs:**
- None from the user for list display (data comes from the API).

**Outputs:**
- Rendered list of all expenses with amount, description, category, and Edit action per row.
- Empty state message when no expenses exist.
- Expense count (optional but recommended — e.g., "Showing 12 expenses").

**Validation:**
- Client must handle an empty array gracefully (show empty state, not a broken UI).
- Client must handle amounts stored as cents by dividing by 100 for display.
- Client must escape or sanitize description and category text to prevent XSS (since they are free-text user input rendered in HTML).
- If the `GET /api/expenses` request fails, display an error message and offer a retry option.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Failed to retrieve expenses | 500 | ERR_STORAGE_READ | "Failed to load expenses. Please try again." |
| Network error (client-side) | — | — | "Unable to connect to the server. Check your connection and try again." |

**API Surface (this feature):** `GET /api/expenses` — see `Y1-api.md` §List Expenses for full response schema.

**Schema Surface (this feature):** Reads from the `expenses` table — see `Y0-schema.md` for DDL.

---

## F4: Total Amount Display

**Description:** The application calculates and prominently displays the total of all stored expense amounts. The total gives the user an at-a-glance spending summary. It updates immediately when an expense is added or edited and displays $0.00 when no expenses exist. All arithmetic is performed on integer cents to avoid floating-point rounding errors.

**Terminology:**
- **Running total:** The sum of all expense amounts currently in storage, displayed as a formatted currency value.
- **Cents arithmetic:** Summation is performed on integer cent values; the result is divided by 100 only for display.

**Sub-features:**
- Total calculated from all stored expenses
- Prominently displayed in the UI (always visible, not hidden or scrolled out of view)
- Updates immediately after create (F0) or edit (F1) — no manual refresh
- Formatted as currency with two decimal places and currency symbol (e.g., `$1,234.56`)
- Shows `$0.00` when no expenses exist
- Calculation uses integer cents to prevent floating-point errors

**Process:**
1. On page load, after the expense list is fetched (`GET /api/expenses`), the client calculates the total:
   a. Sum all `amount` values (integers in cents) from the response array.
   b. Divide the sum by 100 to get the display value.
   c. Format with currency symbol and two decimal places.
   d. Render in the designated total display area.
2. If the expense array is empty, display `$0.00`.
3. After a successful create (F0):
   a. Add the new expense's amount (cents) to the current total.
   b. Re-render the formatted total.
4. After a successful edit (F1):
   a. Subtract the old amount (cents) and add the new amount (cents) to the current total.
   b. Alternatively, recalculate by summing all displayed expenses.
   c. Re-render the formatted total.
5. The total display area is always visible on the page (not behind a scroll or a tab).

**Inputs:**
- Expense amount values from the `GET /api/expenses` response (or from individual mutation responses).

**Outputs:**
- A single formatted currency string representing the sum of all expense amounts.
- Displayed in a prominent, always-visible location in the UI.

**Validation:**
- Total must never show more or fewer than two decimal places.
- Total must never be negative (all expense amounts are positive by F0 validation).
- Total must use integer arithmetic (cents) before converting to display format to avoid floating-point drift.
- If the expense list fetch fails, the total should either show a loading/error state or retain the last known value — never display a stale incorrect number.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Cannot calculate (list fetch failed) | — | — | Total area shows "—" or "Error loading total" |

**API Surface (this feature):** The total is calculated client-side from the `GET /api/expenses` response. No dedicated total endpoint is required (though one could be added as an optimization in the future). See `Y1-api.md` §List Expenses.

**Schema Surface (this feature):** Reads the `amount` column from the `expenses` table — see `Y0-schema.md`.

---

## F5: Web-Based User Interface

**Description:** The entire application is accessed through a standard web browser. The UI consolidates expense entry (F0), expense editing (F1), the expense list (F3), and the total display (F4) into a single cohesive page. It must be clean, functional, and usable without installation, plugins, or a mobile app. The server serves the UI assets and exposes the REST API on the same origin.

**Terminology:**
- **Single-page layout:** All functionality is available on one page without navigation between separate pages.
- **Same-origin serving:** The web server serves both the HTML/CSS/JS UI files and the `/api/*` endpoints, avoiding CORS issues.
- **Modern browser:** Latest stable versions of Chrome, Firefox, Safari, and Edge.

**Sub-features:**
- Single-page layout with expense form, expense list, and total visible simultaneously
- Works in all modern browsers (Chrome, Firefox, Safari, Edge — latest versions)
- Responsive layout usable on different screen sizes (desktop primary; tablet/phone should be functional but not pixel-perfect)
- Clear visual hierarchy: form prominently placed (top or left), list below or beside, total always visible
- No external plugins, extensions, or installations required by the user
- Accessible via URL (localhost during development; deployable to any static host + API server)
- Server starts with a single command (e.g., `npm start`, `python app.py`, or equivalent)
- Static assets (HTML, CSS, JS) served by the same server that hosts the API

**Process:**
1. User starts the server with a single command (see NFR: single-command startup).
2. User opens a browser and navigates to the application URL (e.g., `http://localhost:3000`).
3. The server responds with the HTML page, which loads CSS and JS assets.
4. On page load, the JavaScript:
   a. Fetches expenses from `GET /api/expenses` (F3).
   b. Renders the expense list.
   c. Calculates and displays the total (F4).
   d. Renders the expense entry form (F0) in its default "add" state.
5. The user interacts with the page (add, edit) without navigating away. All mutations happen via API calls (fetch/XHR) and the DOM updates in place.

**Inputs:**
- User interactions: form input, button clicks, edit/cancel actions.
- No user-provided configuration or setup required.

**Outputs:**
- A rendered web page containing:
  - Expense entry form (amount, description, category, submit button)
  - Expense list (rows with amount, description, category, edit button)
  - Total amount display (formatted currency)
  - Feedback messages (success toasts, validation errors, server errors)

**Validation:**
- The page must load and render correctly with zero expenses (empty state).
- The page must load and render correctly with 1,000 expenses (performance target: under 1 second).
- All interactive elements must be keyboard-accessible (tab order, enter to submit).
- Free-text fields rendered in the list must be sanitized to prevent XSS.
- The UI must not depend on localStorage or sessionStorage for data persistence (server-side persistence only, per F2).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Server not running / unreachable | — | — | Browser shows default connection error; no custom handling needed |
| Static assets fail to load | — | — | Browser shows broken page; ensure assets are bundled with server |
| JS runtime error prevents rendering | — | — | Console error; implement try/catch around init to show fallback message |

**API Surface (this feature):** This feature consumes all API endpoints defined in `Y1-api.md`. It does not define its own endpoints beyond serving static files.

**Schema Surface (this feature):** No direct schema interaction. All data access is through the REST API.

---

## Y0: Database Schema

This section defines the complete database schema for the Expense Tracker. SQLite is the recommended storage engine. If a JSON-file backend is used instead, the field definitions, types, and constraints below still apply to the data structure.

### Table: `expenses`

Stores all expense records. One row per expense.

```sql
CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      INTEGER     NOT NULL,   -- stored in cents (e.g., 1050 = $10.50)
    description TEXT        NOT NULL,
    category    TEXT        NOT NULL,
    created_at  TEXT        NOT NULL,   -- ISO 8601 UTC timestamp
    updated_at  TEXT        NOT NULL    -- ISO 8601 UTC timestamp, same as created_at on insert
);
```

### Column Details

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| `id` | INTEGER | No | Auto-increment | PRIMARY KEY | Server-generated unique identifier |
| `amount` | INTEGER | No | — | > 0, <= 99999999 (i.e., $999,999.99 in cents) | Stored as cents to avoid floating-point errors |
| `description` | TEXT | No | — | Length 1–500 characters | Free-text, user-provided |
| `category` | TEXT | No | — | Length 1–100 characters | Free-text, user-provided |
| `created_at` | TEXT | No | — | Valid ISO 8601 | Set on insert, never modified |
| `updated_at` | TEXT | No | — | Valid ISO 8601 | Set on insert, updated on every edit |

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC);
```

- **`idx_expenses_created_at`**: Supports the default list ordering (most recent first). For the MVP with <= 1,000 records this is optional but good practice.

### Initialization

On server startup:
1. Open (or create) the SQLite database file (e.g., `data/expenses.db`).
2. Execute the `CREATE TABLE IF NOT EXISTS` statement.
3. Execute the `CREATE INDEX IF NOT EXISTS` statement.
4. Log: "Storage initialized successfully" or "Storage already exists, schema verified."

### Data Integrity Rules

- `amount` is always a positive integer (> 0) stored in cents. The server converts the client-submitted decimal dollar value to cents before storage (e.g., `Math.round(parseFloat(amount) * 100)`).
- `description` and `category` are stored as-is (trimmed of leading/trailing whitespace by the API layer before storage).
- `created_at` is set once at insert time and never changed.
- `updated_at` is set to `created_at` on insert and updated to the current UTC timestamp on every edit.
- No soft-delete column exists in v1 (delete is out of scope).

### JSON-File Alternative

If SQLite is not used, the JSON file structure is:

```json
{
  "expenses": [
    {
      "id": 1,
      "amount": 1050,
      "description": "Lunch",
      "category": "Food",
      "created_at": "2026-09-11T12:00:00.000Z",
      "updated_at": "2026-09-11T12:00:00.000Z"
    }
  ],
  "next_id": 2
}
```

- `next_id` tracks the next auto-increment value.
- Writes must be atomic: write to a temp file, then rename over the original to prevent corruption on crash.

---

## Y1: REST API Endpoints

All API endpoints are served under the `/api` path prefix. The server also serves static UI assets at the root path (`/`). All request and response bodies use `Content-Type: application/json`. Amounts in **request** payloads are decimal dollar values (e.g., `10.50`). Amounts in **response** payloads and storage are integers representing cents (e.g., `1050`). The server is responsible for converting dollars to cents on input.

### Base URL

- Development: `http://localhost:3000`
- API prefix: `/api`

---

### List Expenses

**`GET /api/expenses`**

Retrieves all expense records, ordered by `created_at` descending (most recent first).

**Request:**
- No request body.
- No query parameters (no pagination or filtering in v1).

**Response — 200 OK:**

```json
{
  "expenses": [
    {
      "id": 1,
      "amount": 1050,
      "description": "Lunch at cafe",
      "category": "Food",
      "created_at": "2026-09-11T12:30:00.000Z",
      "updated_at": "2026-09-11T12:30:00.000Z"
    },
    {
      "id": 2,
      "amount": 4500,
      "description": "Monthly gym",
      "category": "Health",
      "created_at": "2026-09-10T09:00:00.000Z",
      "updated_at": "2026-09-10T09:00:00.000Z"
    }
  ]
}
```

**Response — 200 OK (empty):**

```json
{
  "expenses": []
}
```

**Response — 500 Internal Server Error:**

```json
{
  "error": {
    "code": "ERR_STORAGE_READ",
    "message": "Failed to retrieve data. Please try again."
  }
}
```

---

### Create Expense

**`POST /api/expenses`**

Creates a new expense record.

**Request Body:**

```json
{
  "amount": 10.50,
  "description": "Lunch at cafe",
  "category": "Food"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `amount` | number | Yes | > 0, <= 999999.99 (dollars); max 2 decimal places. Server converts to integer cents for storage. |
| `description` | string | Yes | 1–500 characters (trimmed) |
| `category` | string | Yes | 1–100 characters (trimmed) |

**Response — 201 Created:**

```json
{
  "expense": {
    "id": 3,
    "amount": 1050,
    "description": "Lunch at cafe",
    "category": "Food",
    "created_at": "2026-09-11T14:00:00.000Z",
    "updated_at": "2026-09-11T14:00:00.000Z"
  }
}
```

**Response — 400 Bad Request:**

```json
{
  "error": {
    "code": "ERR_EXPENSE_AMOUNT_REQUIRED",
    "message": "Amount is required"
  }
}
```

Multiple validation errors may be returned as an array:

```json
{
  "errors": [
    { "code": "ERR_EXPENSE_AMOUNT_REQUIRED", "message": "Amount is required" },
    { "code": "ERR_EXPENSE_DESC_REQUIRED", "message": "Description is required" }
  ]
}
```

**Response — 500 Internal Server Error:**

```json
{
  "error": {
    "code": "ERR_STORAGE_WRITE",
    "message": "Failed to save expense. Please try again."
  }
}
```

---

### Update Expense

**`PUT /api/expenses/:id`**

Updates an existing expense record. All fields are required in the request body (full replacement, not partial patch).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | The unique ID of the expense to update |

**Request Body:**

```json
{
  "amount": 12.00,
  "description": "Lunch at cafe (corrected)",
  "category": "Food"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `amount` | number | Yes | > 0, <= 999999.99 (dollars); max 2 decimal places. Server converts to integer cents for storage. |
| `description` | string | Yes | 1–500 characters (trimmed) |
| `category` | string | Yes | 1–100 characters (trimmed) |

**Response — 200 OK:**

```json
{
  "expense": {
    "id": 3,
    "amount": 1200,
    "description": "Lunch at cafe (corrected)",
    "category": "Food",
    "created_at": "2026-09-11T14:00:00.000Z",
    "updated_at": "2026-09-11T15:30:00.000Z"
  }
}
```

**Response — 404 Not Found:**

```json
{
  "error": {
    "code": "ERR_EXPENSE_NOT_FOUND",
    "message": "Expense not found"
  }
}
```

**Response — 400 Bad Request:**

```json
{
  "error": {
    "code": "ERR_EXPENSE_INVALID_ID",
    "message": "Invalid expense ID"
  }
}
```

(Validation errors same format as Create Expense 400 response.)

**Response — 500 Internal Server Error:**

```json
{
  "error": {
    "code": "ERR_STORAGE_WRITE",
    "message": "Failed to update expense. Please try again."
  }
}
```

---

### Endpoint Summary

| Method | Path | Description | Success | Feature |
|--------|------|-------------|---------|---------|
| `GET` | `/api/expenses` | List all expenses | 200 | F3, F4 |
| `POST` | `/api/expenses` | Create a new expense | 201 | F0 |
| `PUT` | `/api/expenses/:id` | Update an existing expense | 200 | F1 |
| `GET` | `/` | Serve the web UI (HTML/CSS/JS) | 200 | F5 |

### Common Response Headers

- `Content-Type: application/json` for all `/api/*` responses.
- `Content-Type: text/html` for the root `/` response.

### Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "ERR_CATEGORY_CODE",
    "message": "Human-readable error message"
  }
}
```

Or, for multiple validation errors:

```json
{
  "errors": [
    { "code": "ERR_CODE_1", "message": "Message 1" },
    { "code": "ERR_CODE_2", "message": "Message 2" }
  ]
}
```

---

## Y2: Error Catalog

This section consolidates all error codes used across the Expense Tracker application. Each error code is unique and follows the `ERR_{DOMAIN}_{NAME}` convention.

### Expense Validation Errors (HTTP 400)

| Error Code | Message | Trigger | Feature(s) |
|------------|---------|---------|------------|
| ERR_EXPENSE_AMOUNT_REQUIRED | "Amount is required" | Amount field missing or empty in request body | F0, F1 |
| ERR_EXPENSE_INVALID_AMOUNT | "Amount must be a valid number" | Amount is not a valid number (non-numeric value in request body) | F0, F1 |
| ERR_EXPENSE_AMOUNT_POSITIVE | "Amount must be greater than zero" | Amount <= 0 | F0, F1 |
| ERR_EXPENSE_AMOUNT_TOO_LARGE | "Amount must not exceed 999,999.99" | Amount > 999,999.99 (dollars) | F0, F1 |
| ERR_EXPENSE_AMOUNT_PRECISION | "Amount must have at most two decimal places" | Client sends a decimal amount with > 2 decimal places (pre-conversion check) | F0, F1 |
| ERR_EXPENSE_DESC_REQUIRED | "Description is required" | Description field missing, empty, or whitespace-only | F0, F1 |
| ERR_EXPENSE_DESC_TOO_LONG | "Description must not exceed 500 characters" | Description exceeds 500 characters | F0, F1 |
| ERR_EXPENSE_CAT_REQUIRED | "Category is required" | Category field missing, empty, or whitespace-only | F0, F1 |
| ERR_EXPENSE_CAT_TOO_LONG | "Category must not exceed 100 characters" | Category exceeds 100 characters | F0, F1 |
| ERR_EXPENSE_INVALID_ID | "Invalid expense ID" | ID path parameter is not a valid positive integer | F1 |

### Resource Errors (HTTP 404)

| Error Code | Message | Trigger | Feature(s) |
|------------|---------|---------|------------|
| ERR_EXPENSE_NOT_FOUND | "Expense not found" | PUT request references an ID that does not exist in storage | F1 |

### Storage Errors (HTTP 500)

| Error Code | Message | Trigger | Feature(s) |
|------------|---------|---------|------------|
| ERR_STORAGE_WRITE | "Failed to save data. Please try again." | Disk I/O error, database lock, or other write failure | F0, F1, F2 |
| ERR_STORAGE_READ | "Failed to retrieve data. Please try again." | Database read error, corrupt data, or lock timeout | F2, F3 |

### Client-Side Errors (No HTTP Status)

These errors are displayed in the UI and do not correspond to server responses:

| Error Condition | Message | Feature(s) |
|-----------------|---------|------------|
| Network failure / server unreachable | "Unable to connect to the server. Check your connection and try again." | F3, F5 |
| Total cannot be calculated | Total area shows "—" or "Error loading total" | F4 |
| JavaScript runtime error | Fallback message: "Something went wrong. Please refresh the page." | F5 |

### Error Handling Guidelines

- **Server validation is authoritative.** Client-side validation is a UX convenience; the server must re-validate all inputs and return appropriate error codes.
- **Multiple errors per request.** When multiple validation rules fail simultaneously (e.g., missing amount AND missing description), the server should return all errors in the `errors` array format, not just the first one found.
- **No stack traces in responses.** Server errors (500) must never include stack traces or internal details in the API response. Internal details should be logged server-side only.
- **Retry guidance.** Storage errors (500) include "Please try again" to indicate the operation is retryable. Validation errors (400) do not, because the same input will fail again.

---

## Y3: Integration Points

The Expense Tracker is a self-contained, single-user application with no external service dependencies in v1. This section documents the integration boundaries for completeness and to guide future expansion.

### External Dependencies

**None.** The application has zero external runtime dependencies:

- No external databases — uses embedded SQLite (or a local JSON file).
- No external APIs — no third-party services called at runtime.
- No authentication providers — single-user, no auth required.
- No email or notification services.
- No cloud storage or CDN.

### Internal Integration Boundaries

| Boundary | From | To | Protocol | Notes |
|----------|------|----|----------|-------|
| Browser → Server | Web UI (HTML/JS) | Backend server | HTTP (same-origin) | All `/api/*` calls and static asset serving |
| Server → Storage | Backend server | SQLite file (or JSON file) | File system I/O | Direct file access on the same machine |

### Future Integration Considerations

The following integrations are out of scope for v1 but may be relevant in future iterations. The current architecture should not preclude them:

- **Authentication provider** (e.g., OAuth, session-based auth): Would require adding an auth middleware layer and a `users` table.
- **Cloud database** (e.g., PostgreSQL, MySQL): Would require swapping the storage layer implementation; the API layer should be storage-agnostic.
- **Export service** (CSV/PDF generation): Would add new API endpoints (e.g., `GET /api/expenses/export?format=csv`).
- **Backup/sync service**: Would read from the SQLite file or database and push to remote storage.

### Environment Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | HTTP port the server listens on | `3000` | No |
| `DB_PATH` | Path to the SQLite database file | `./data/expenses.db` | No |

- No API keys, secrets, or credentials are needed for v1.
- Configuration is via environment variables with sensible defaults. The application must run with zero configuration.

---

