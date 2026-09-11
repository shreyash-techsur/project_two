# Technical Architecture Document: Expense Tracker

**Version:** 1.0
**Project:** Expense Tracker
**Generated:** 2026-09-11
**Source:** PRD-ExpenseTracker.md v1.0, FRD-ExpenseTracker.md v1.0, PROJECT.md

---

## 1. Architectural Overview

### Architecture Pattern

The Expense Tracker follows a **monolithic, two-tier architecture** — a single Node.js server process that serves both the static web UI and the REST API, backed by an embedded SQLite database. This pattern is chosen for its zero-dependency simplicity: no separate database server, no reverse proxy, no build pipeline. The entire application runs with a single command and persists data to a local file.

### Key Architectural Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monolithic server (API + static serving) | Single-command startup, no CORS issues, minimal deployment complexity | Express.js serves both `/api/*` routes and static HTML/CSS/JS from a `public/` directory |
| Embedded SQLite | Zero-configuration persistence, survives server restarts, no external DB dependency | `better-sqlite3` for synchronous, reliable file-based storage |
| Cents-based integer arithmetic | Avoid floating-point rounding errors in financial calculations | All amounts stored as integers (cents); display layer divides by 100 |
| No authentication | Single-user MVP; adding auth later requires middleware, not rewrite | No session, token, or user management in v1 |
| Server-side validation as authority | Client validation is UX convenience; server is the trust boundary | All inputs re-validated on server before persistence |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser                                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Web UI (HTML/CSS/JS)                     │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────────┐  ┌─────────────┐  │  │
│  │  │ Expense Form │  │  Expense List    │  │ Total Display│  │  │
│  │  │ (Add / Edit) │  │  (All Records)   │  │ (Sum $)     │  │  │
│  │  └──────────────┘  └──────────────────┘  └─────────────┘  │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │                                  │
│                     fetch() / XHR                                 │
│                    (same-origin HTTP)                             │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Node.js Server     │
                    │    (Express.js)       │
                    │                       │
                    │  ┌─────────────────┐  │
                    │  │ Static File     │  │
                    │  │ Middleware      │  │  GET /
                    │  └─────────────────┘  │
                    │                       │
                    │  ┌─────────────────┐  │
                    │  │ API Router      │  │  /api/expenses
                    │  │                 │  │
                    │  │ ┌─────────────┐ │  │
                    │  │ │ Validation  │ │  │  Input checks
                    │  │ │ Middleware  │ │  │
                    │  │ └─────────────┘ │  │
                    │  │                 │  │
                    │  │ ┌─────────────┐ │  │
                    │  │ │ Route       │ │  │  Business logic
                    │  │ │ Handlers    │ │  │
                    │  │ └─────────────┘ │  │
                    │  └─────────────────┘  │
                    │                       │
                    │  ┌─────────────────┐  │
                    │  │ Storage Layer   │  │  Data access
                    │  │ (Database)      │  │
                    │  └────────┬────────┘  │
                    └───────────┼───────────┘
                                │
                      File System I/O
                                │
                    ┌───────────▼───────────┐
                    │   SQLite Database     │
                    │   data/expenses.db    │
                    │                       │
                    │   ┌───────────────┐   │
                    │   │  expenses     │   │
                    │   │  table        │   │
                    │   └───────────────┘   │
                    └───────────────────────┘
```

### Deployment Topology

The application runs as a single process on a single machine. No container orchestration, load balancing, or external services are required.

```
┌─────────────────────────────────────────┐
│            Host Machine                 │
│                                         │
│   ┌───────────────────────────────┐     │
│   │  Node.js Process (port 3000)  │     │
│   │  - Express.js HTTP server     │     │
│   │  - Static file serving        │     │
│   │  - REST API endpoints         │     │
│   │  - SQLite connection          │     │
│   └──────────────┬────────────────┘     │
│                  │                      │
│   ┌──────────────▼────────────────┐     │
│   │  data/expenses.db             │     │
│   │  (SQLite database file)       │     │
│   └───────────────────────────────┘     │
│                                         │
│   ┌───────────────────────────────┐     │
│   │  public/                      │     │
│   │  ├── index.html               │     │
│   │  ├── style.css                │     │
│   │  └── app.js                   │     │
│   └───────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**Startup command:** `npm start` (or `node server.js`)
**Default port:** 3000 (configurable via `PORT` environment variable)
**Database location:** `./data/expenses.db` (configurable via `DB_PATH` environment variable)

---

## 2. Component Architecture

### Backend Components

The backend is a single Node.js process organized into distinct logical layers. Each layer has a clear responsibility and communicates only with its adjacent layer.

#### Server Entry Point (`server.js`)

Responsible for bootstrapping the application: initializing the database, configuring Express middleware, mounting routes, and starting the HTTP listener. On startup, it ensures the `data/` directory and SQLite database exist, then logs readiness.

#### Static File Middleware

Serves the contents of the `public/` directory (HTML, CSS, JavaScript) at the root path (`/`). Uses Express's built-in `express.static()` middleware. No build step or bundler is required — the frontend is vanilla HTML/CSS/JS.

#### API Router (`routes/expenses.js`)

Defines the three REST endpoints under `/api/expenses`. Each route handler receives the validated request, calls the storage layer, and returns the appropriate HTTP response. The router is mounted on the Express app as a sub-router.

| Route | Handler | Responsibility |
|-------|---------|----------------|
| `GET /api/expenses` | `listExpenses` | Query all records, return ordered array |
| `POST /api/expenses` | `createExpense` | Validate input, insert record, return created object |
| `PUT /api/expenses/:id` | `updateExpense` | Validate input + ID, update record, return updated object |

#### Validation Middleware (`middleware/validate.js`)

A reusable middleware function applied to `POST` and `PUT` routes. It checks all input fields against the rules defined in the FRD (amount range, description length, category length) and returns a `400` response with structured error codes if any validation fails. If all checks pass, it calls `next()` to proceed to the route handler.

#### Storage Layer (`db/database.js`)

Encapsulates all SQLite interactions behind a clean interface. This layer is the only code that imports `better-sqlite3`. It exposes three functions:

| Function | Signature | Description |
|----------|-----------|-------------|
| `initialize()` | `() → void` | Creates the database file, table, and indexes if they do not exist |
| `getAllExpenses()` | `() → Expense[]` | Returns all expenses ordered by `created_at` DESC |
| `createExpense(data)` | `(ExpenseInput) → Expense` | Inserts a new record, returns the full row including `id` and timestamps |
| `updateExpense(id, data)` | `(number, ExpenseInput) → Expense \| null` | Updates an existing record, returns the updated row or `null` if not found |

#### Error Handler (`middleware/errorHandler.js`)

A global Express error-handling middleware that catches unhandled errors from any route, logs the full error server-side (including stack trace), and returns a sanitized `500` response with the appropriate error code (`ERR_STORAGE_WRITE` or `ERR_STORAGE_READ`). No stack traces or internal details are ever sent to the client.

### Frontend Components

The frontend is a single HTML page with embedded or linked CSS and JavaScript. No framework, no build tools, no transpilation.

#### HTML Structure (`public/index.html`)

A single-page layout with three major sections:

1. **Expense Form** — positioned at the top. Contains input fields for amount, description, and category, plus a submit button. The button label toggles between "Add Expense" and "Save Changes" depending on mode. A "Cancel" button appears in edit mode.

2. **Total Display** — prominently positioned (e.g., below the form or in a sticky header). Shows the formatted total of all expenses (e.g., `Total: $1,234.56`). Displays `$0.00` in the empty state.

3. **Expense List** — a table or card list below the total. Each row shows the formatted amount, description, category, and an "Edit" button. An empty-state message is shown when no expenses exist.

#### Styles (`public/style.css`)

Minimal, clean CSS providing visual hierarchy, responsive layout (functional on mobile, optimized for desktop), and feedback states (error highlighting on invalid fields, success indicators).

#### Application Logic (`public/app.js`)

Vanilla JavaScript handling all client-side behavior:

| Responsibility | Description |
|----------------|-------------|
| API communication | `fetch()` calls to `GET`, `POST`, and `PUT` endpoints |
| Form management | Collecting input values, toggling between add/edit mode, clearing fields |
| Client-side validation | Pre-flight checks matching server rules (UX convenience, not authoritative) |
| List rendering | DOM manipulation to display expenses, update rows after mutations |
| Total calculation | Summing all displayed expense amounts (cents) and formatting as currency |
| Error display | Showing inline validation errors, toast messages for server errors |
| XSS prevention | Escaping user-provided text (description, category) before inserting into DOM |

### Directory Structure

```
expense-tracker/
├── server.js                  # Entry point — bootstrap and start
├── package.json               # Dependencies and scripts
├── routes/
│   └── expenses.js            # API route definitions
├── middleware/
│   ├── validate.js            # Input validation middleware
│   └── errorHandler.js        # Global error handler
├── db/
│   └── database.js            # SQLite storage layer
├── data/
│   └── expenses.db            # SQLite database file (auto-created)
└── public/
    ├── index.html             # Single-page UI
    ├── style.css              # Styles
    └── app.js                 # Client-side JavaScript
```

---

## 3. Data Model

### Entity-Relationship Diagram

The Expense Tracker has a single entity. No relationships exist in v1 (no users table, no categories table). The schema is intentionally flat to match the single-user, MVP scope.

```
┌─────────────────────────────────────┐
│              expenses               │
├─────────────────────────────────────┤
│ PK  id          INTEGER AUTOINCR    │
│     amount      INTEGER NOT NULL    │
│     description TEXT    NOT NULL    │
│     category    TEXT    NOT NULL    │
│     created_at  TEXT    NOT NULL    │
│     updated_at  TEXT    NOT NULL    │
├─────────────────────────────────────┤
│ IDX idx_expenses_created_at (DESC)  │
└─────────────────────────────────────┘
```

### Complete DDL

The following DDL is for SQLite. The `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` forms ensure idempotent initialization — safe to run on every server startup.

```sql
-- =============================================================================
-- Expense Tracker Database Schema
-- Engine: SQLite 3.x
-- Encoding: UTF-8
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: expenses
-- Description: Stores all expense records. One row per expense.
-- Amounts are stored as integers representing cents (e.g., 1050 = $10.50)
-- to avoid floating-point rounding errors in financial calculations.
-- Timestamps are stored as ISO 8601 strings in UTC.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      INTEGER NOT NULL CHECK (amount > 0 AND amount <= 99999999),
    description TEXT    NOT NULL CHECK (length(trim(description)) >= 1 AND length(description) <= 500),
    category    TEXT    NOT NULL CHECK (length(trim(category)) >= 1 AND length(category) <= 100),
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);

-- -----------------------------------------------------------------------------
-- Index: idx_expenses_created_at
-- Purpose: Supports the default list ordering (most recent first).
--          Covers the ORDER BY created_at DESC clause in the list query.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC);
```

### Column Specifications

| Column | SQLite Type | Nullable | Default | Constraints | Storage Notes |
|--------|-------------|----------|---------|-------------|---------------|
| `id` | INTEGER | No | AUTOINCREMENT | PRIMARY KEY | Server-generated. Sequential integers starting at 1. SQLite guarantees uniqueness and monotonic increase. |
| `amount` | INTEGER | No | — | `> 0`, `<= 99999999` | Stored in cents. 99999999 cents = $999,999.99. The API layer converts user-entered dollar values to cents: `Math.round(parseFloat(amount) * 100)`. |
| `description` | TEXT | No | — | Length 1–500 (trimmed ≥ 1) | Free-text. Leading/trailing whitespace trimmed by the API layer before storage. Stored as UTF-8. |
| `category` | TEXT | No | — | Length 1–100 (trimmed ≥ 1) | Free-text. Leading/trailing whitespace trimmed by the API layer before storage. Stored as UTF-8. |
| `created_at` | TEXT | No | — | Valid ISO 8601 | Set once at insert time. Format: `YYYY-MM-DDTHH:mm:ss.sssZ`. Never modified after creation. |
| `updated_at` | TEXT | No | — | Valid ISO 8601 | Set to same value as `created_at` on insert. Updated to current UTC timestamp on every edit via `PUT`. |

### Data Integrity Rules

1. **Amount is always a positive integer** (> 0). The CHECK constraint enforces this at the database level as a safety net behind API validation.
2. **Description and category are never empty** after trimming. The CHECK constraints use `trim()` to reject whitespace-only values at the database level.
3. **`created_at` is immutable.** The `PUT` endpoint updates only `amount`, `description`, `category`, and `updated_at`. The `created_at` value is preserved.
4. **`updated_at` tracks last modification.** On insert, it equals `created_at`. On every subsequent update, it is set to the current UTC time.
5. **No soft-delete.** Delete functionality is out of scope for v1. No `deleted_at` or `is_active` column exists.
6. **No foreign keys.** Single-entity schema. No referential integrity constraints needed.

### Initialization Sequence

On server startup, the storage layer executes the following steps in order:

1. Ensure the `data/` directory exists (create if missing).
2. Open the SQLite database file at `DB_PATH` (default: `./data/expenses.db`). SQLite creates the file if it does not exist.
3. Enable WAL (Write-Ahead Logging) mode for better read/write concurrency: `PRAGMA journal_mode=WAL;`
4. Execute `CREATE TABLE IF NOT EXISTS expenses (...)`.
5. Execute `CREATE INDEX IF NOT EXISTS idx_expenses_created_at (...)`.
6. Log: `"Storage initialized: data/expenses.db"`.

If any step fails, the server logs the error and exits with a non-zero status code. The server must not start in a degraded state without a functional storage layer.

### Sample Queries

**Insert a new expense:**
```sql
INSERT INTO expenses (amount, description, category, created_at, updated_at)
VALUES (1050, 'Lunch at cafe', 'Food', '2026-09-11T12:30:00.000Z', '2026-09-11T12:30:00.000Z');
```

**Retrieve all expenses (most recent first):**
```sql
SELECT id, amount, description, category, created_at, updated_at
FROM expenses
ORDER BY created_at DESC;
```

**Update an existing expense:**
```sql
UPDATE expenses
SET amount = 1200,
    description = 'Lunch at cafe (corrected)',
    category = 'Food',
    updated_at = '2026-09-11T15:30:00.000Z'
WHERE id = 3;
```

**Calculate total (server-side, if needed):**
```sql
SELECT COALESCE(SUM(amount), 0) AS total_cents FROM expenses;
```

---

## 4. API Design

### Base Configuration

| Property | Value |
|----------|-------|
| Base URL | `http://localhost:3000` |
| API prefix | `/api` |
| Content-Type | `application/json` (all API requests and responses) |
| Authentication | None (single-user, no auth in v1) |
| CORS | Not required (same-origin serving) |

### TypeScript Interfaces

These interfaces define the shape of all data flowing through the API. They serve as the contract between frontend and backend.

```typescript
// =============================================================================
// Core Entity
// =============================================================================

/** A persisted expense record as returned by the API. */
interface Expense {
  /** Server-generated unique identifier (auto-incrementing integer). */
  id: number;
  /** Expense amount in cents (e.g., 1050 = $10.50). Always > 0, <= 99999999. */
  amount: number;
  /** Free-text description of the expense. 1–500 characters. */
  description: string;
  /** Free-text category label. 1–100 characters. */
  category: string;
  /** ISO 8601 UTC timestamp of when the expense was created. Immutable. */
  created_at: string;
  /** ISO 8601 UTC timestamp of the last update. Equals created_at if never edited. */
  updated_at: string;
}

// =============================================================================
// Request Bodies
// =============================================================================

/** Request body for POST /api/expenses and PUT /api/expenses/:id */
interface ExpenseInput {
  /** Amount in cents. Must be a positive integer > 0 and <= 99999999. */
  amount: number;
  /** Description text. Required, 1–500 characters after trimming. */
  description: string;
  /** Category text. Required, 1–100 characters after trimming. */
  category: string;
}

// =============================================================================
// Response Bodies
// =============================================================================

/** Response body for GET /api/expenses */
interface ListExpensesResponse {
  /** Array of all expense records, ordered by created_at descending. */
  expenses: Expense[];
}

/** Response body for POST /api/expenses (201) and PUT /api/expenses/:id (200) */
interface ExpenseResponse {
  /** The created or updated expense record. */
  expense: Expense;
}

// =============================================================================
// Error Responses
// =============================================================================

/** A single structured error. */
interface ApiError {
  /** Machine-readable error code (e.g., "ERR_EXPENSE_AMOUNT_REQUIRED"). */
  code: string;
  /** Human-readable error message. */
  message: string;
}

/** Error response with a single error (most 404 and 500 responses). */
interface SingleErrorResponse {
  error: ApiError;
}

/** Error response with multiple validation errors (400 responses). */
interface MultipleErrorResponse {
  errors: ApiError[];
}
```

### Endpoint Specifications

#### GET /api/expenses — List All Expenses

Retrieves all expense records, ordered by `created_at` descending (most recent first). No pagination or filtering in v1.

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/api/expenses` |
| Auth | None |
| Query Parameters | None |
| Request Body | None |
| Success Status | `200 OK` |
| Response Type | `ListExpensesResponse` |

**Success Response (200 OK):**

```json
{
  "expenses": [
    {
      "id": 2,
      "amount": 4500,
      "description": "Monthly gym",
      "category": "Health",
      "created_at": "2026-09-11T14:00:00.000Z",
      "updated_at": "2026-09-11T14:00:00.000Z"
    },
    {
      "id": 1,
      "amount": 1050,
      "description": "Lunch at cafe",
      "category": "Food",
      "created_at": "2026-09-11T12:30:00.000Z",
      "updated_at": "2026-09-11T12:30:00.000Z"
    }
  ]
}
```

**Empty Response (200 OK):**

```json
{
  "expenses": []
}
```

**Error Response (500):**

```json
{
  "error": {
    "code": "ERR_STORAGE_READ",
    "message": "Failed to retrieve data. Please try again."
  }
}
```

---

#### POST /api/expenses — Create Expense

Creates a new expense record. The server generates the `id`, `created_at`, and `updated_at` values.

| Property | Value |
|----------|-------|
| Method | `POST` |
| Path | `/api/expenses` |
| Auth | None |
| Content-Type | `application/json` |
| Request Body | `ExpenseInput` |
| Success Status | `201 Created` |
| Response Type | `ExpenseResponse` |

**Request Body:**

```json
{
  "amount": 1050,
  "description": "Lunch at cafe",
  "category": "Food"
}
```

**Request Field Validation:**

| Field | Type | Required | Min | Max | Notes |
|-------|------|----------|-----|-----|-------|
| `amount` | integer | Yes | 1 | 99999999 | In cents. Must be > 0. |
| `description` | string | Yes | 1 char | 500 chars | After trimming whitespace. |
| `category` | string | Yes | 1 char | 100 chars | After trimming whitespace. |

**Success Response (201 Created):**

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

**Validation Error Response (400):**

```json
{
  "errors": [
    { "code": "ERR_EXPENSE_AMOUNT_REQUIRED", "message": "Amount is required" },
    { "code": "ERR_EXPENSE_DESC_REQUIRED", "message": "Description is required" }
  ]
}
```

**Storage Error Response (500):**

```json
{
  "error": {
    "code": "ERR_STORAGE_WRITE",
    "message": "Failed to save expense. Please try again."
  }
}
```

---

#### PUT /api/expenses/:id — Update Expense

Updates an existing expense record. All fields are required (full replacement, not partial patch). The server updates the `updated_at` timestamp.

| Property | Value |
|----------|-------|
| Method | `PUT` |
| Path | `/api/expenses/:id` |
| Auth | None |
| Content-Type | `application/json` |
| Path Parameters | `id` (integer) — the expense ID |
| Request Body | `ExpenseInput` |
| Success Status | `200 OK` |
| Response Type | `ExpenseResponse` |

**Request Body:**

```json
{
  "amount": 1200,
  "description": "Lunch at cafe (corrected)",
  "category": "Food"
}
```

**Request Field Validation:**

Same as POST /api/expenses, plus:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `:id` (path) | integer | Yes | Must be a positive integer referencing an existing record |

**Success Response (200 OK):**

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

**Not Found Response (404):**

```json
{
  "error": {
    "code": "ERR_EXPENSE_NOT_FOUND",
    "message": "Expense not found"
  }
}
```

**Invalid ID Response (400):**

```json
{
  "error": {
    "code": "ERR_EXPENSE_INVALID_ID",
    "message": "Invalid expense ID"
  }
}
```

**Storage Error Response (500):**

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

| Method | Path | Description | Success | Error Codes | Features |
|--------|------|-------------|---------|-------------|----------|
| `GET` | `/api/expenses` | List all expenses (most recent first) | 200 | ERR_STORAGE_READ | F03, F04 |
| `POST` | `/api/expenses` | Create a new expense | 201 | ERR_EXPENSE_*, ERR_STORAGE_WRITE | F00 |
| `PUT` | `/api/expenses/:id` | Update an existing expense | 200 | ERR_EXPENSE_*, ERR_STORAGE_WRITE, ERR_EXPENSE_NOT_FOUND | F01 |
| `GET` | `/` | Serve the web UI | 200 | — | F05 |

### Request/Response Flow

```
Client                          Server                         SQLite
  │                                │                              │
  │  GET /api/expenses             │                              │
  │ ──────────────────────────────>│                              │
  │                                │  SELECT * FROM expenses     │
  │                                │  ORDER BY created_at DESC   │
  │                                │ ────────────────────────────>│
  │                                │                              │
  │                                │  [rows]                     │
  │                                │ <────────────────────────────│
  │  200 { expenses: [...] }       │                              │
  │ <──────────────────────────────│                              │
  │                                │                              │
  │  POST /api/expenses            │                              │
  │  { amount, description, cat }  │                              │
  │ ──────────────────────────────>│                              │
  │                                │  validate input              │
  │                                │  INSERT INTO expenses ...    │
  │                                │ ────────────────────────────>│
  │                                │                              │
  │                                │  { id, ... }                │
  │                                │ <────────────────────────────│
  │  201 { expense: {...} }        │                              │
  │ <──────────────────────────────│                              │
  │                                │                              │
  │  PUT /api/expenses/3           │                              │
  │  { amount, description, cat }  │                              │
  │ ──────────────────────────────>│                              │
  │                                │  validate input              │
  │                                │  UPDATE expenses SET ...     │
  │                                │  WHERE id = 3               │
  │                                │ ────────────────────────────>│
  │                                │                              │
  │                                │  { changes: 1 }             │
  │                                │ <────────────────────────────│
  │  200 { expense: {...} }        │                              │
  │ <──────────────────────────────│                              │
```

---

## 5. Security Architecture

### Authentication

No authentication is required for v1. The application is designed as a single-user tool running on localhost. All endpoints are open and accessible without credentials.

**Future consideration:** Adding authentication would involve:
1. A `users` table with hashed passwords or OAuth tokens.
2. An auth middleware applied to all `/api/*` routes.
3. Session management via cookies or JWT tokens.
4. The current route structure supports middleware insertion without refactoring.

### Authorization

No authorization model in v1. Every request has full access to all expense records. There is no concept of ownership or access control.

### Data Protection

#### Input Sanitization

All user-provided text (description, category) is treated as untrusted input:

- **Server-side:** Values are trimmed of leading/trailing whitespace before storage. Parameterized queries (prepared statements) are used for all SQLite operations, preventing SQL injection. No string concatenation is used in query construction.

- **Client-side:** When rendering expense data in the DOM, all text values are escaped or inserted via `textContent` (not `innerHTML`) to prevent Cross-Site Scripting (XSS) attacks.

#### SQL Injection Prevention

The storage layer exclusively uses parameterized queries via `better-sqlite3`'s prepared statement API:

```javascript
// Safe: parameterized query
const stmt = db.prepare('INSERT INTO expenses (amount, description, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
stmt.run(amount, description, category, createdAt, updatedAt);

// Never: string concatenation
// db.exec(`INSERT INTO expenses ... VALUES (${amount}, '${description}', ...)`);  // UNSAFE
```

#### Data at Rest

The SQLite database file (`data/expenses.db`) is stored unencrypted on the local filesystem. For the single-user, localhost deployment model, this is acceptable. The file should have restrictive permissions (`600` or `644`), readable only by the server process owner.

#### Data in Transit

For local development, data travels over unencrypted HTTP on localhost. For production deployment, a reverse proxy (e.g., nginx, Caddy) should terminate TLS and forward to the application. The application itself does not handle TLS.

#### Error Information Leakage

Server error responses (500) never include stack traces, file paths, or internal implementation details. Only the standardized error code and a human-readable message are returned. Full error details are logged to the server console for debugging.

### Security Headers

The Express server should set the following security headers (via `helmet` middleware or manually):

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `0` | Disable legacy XSS filter (modern CSP is preferred) |
| `Content-Security-Policy` | `default-src 'self'` | Restrict resource loading to same origin |

---

## 6. Technology Stack

### Runtime & Framework

| Layer | Technology | Version | Purpose | Rationale |
|-------|------------|---------|---------|-----------|
| Runtime | Node.js | 18.x LTS or 20.x LTS | JavaScript server runtime | Widely available, single-language stack with frontend |
| Framework | Express.js | 4.x | HTTP server and routing | Minimal, well-documented, industry-standard for small APIs |
| Database | SQLite 3 | 3.x (via better-sqlite3) | Persistent data storage | Zero-configuration, file-based, no external server needed |
| SQLite Driver | better-sqlite3 | 9.x or 10.x | Node.js SQLite bindings | Synchronous API (simpler code), faster than node-sqlite3 for single-user |

### Frontend

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| HTML5 | — | Page structure | Standard, no build tools needed |
| CSS3 | — | Styling and layout | Standard, responsive design |
| Vanilla JavaScript | ES6+ | Client-side logic | No framework needed for this scope; avoids build complexity |

### Development Dependencies

| Package | Purpose | Required |
|---------|---------|----------|
| `nodemon` | Auto-restart server on file changes during development | Optional (dev only) |
| `helmet` | Security headers middleware | Recommended |

### Package.json Structure

```json
{
  "name": "expense-tracker",
  "version": "1.0.0",
  "description": "Simple web-based expense tracker with persistent storage",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "better-sqlite3": "^9.0.0",
    "helmet": "^7.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### System Requirements

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Node.js | 18.x LTS | Required for ES module support and modern APIs |
| Disk space | ~50 MB | Node modules (~40 MB) + SQLite DB (grows with usage) |
| RAM | ~50 MB | Node.js process baseline |
| OS | Linux, macOS, Windows | Any OS with Node.js support |

---

## 7. Integration Points

### External Dependencies

None. The Expense Tracker is a fully self-contained application with zero external runtime dependencies:

- No external database servers
- No third-party APIs
- No authentication providers
- No email or notification services
- No cloud storage or CDN
- No message queues or event buses

### Internal Integration Boundaries

| Boundary | From | To | Protocol | Data Format | Notes |
|----------|------|----|----------|-------------|-------|
| Browser → Server (API) | Web UI (`public/app.js`) | Express.js API routes | HTTP (same-origin) | JSON | All `/api/*` calls via `fetch()` |
| Browser → Server (Static) | Browser URL bar | Express.js static middleware | HTTP | HTML/CSS/JS | Initial page load and asset serving |
| Server → Database | Storage layer (`db/database.js`) | SQLite file (`data/expenses.db`) | File system I/O | SQL (prepared statements) | Synchronous calls via `better-sqlite3` |

### Environment Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `PORT` | integer | `3000` | No | HTTP port the server listens on |
| `DB_PATH` | string | `./data/expenses.db` | No | Path to the SQLite database file |

No API keys, secrets, tokens, or credentials are required. The application starts and runs with zero configuration.

### Future Integration Considerations

The following integrations are out of scope for v1 but the architecture does not preclude them:

| Future Integration | Architectural Impact | Effort |
|--------------------|---------------------|--------|
| Authentication (OAuth/session) | Add auth middleware + `users` table; no route restructuring | Medium |
| PostgreSQL/MySQL | Swap `db/database.js` implementation; API layer unchanged | Medium |
| CSV/PDF export | Add `GET /api/expenses/export` endpoint; no schema changes | Low |
| Delete functionality | Add `DELETE /api/expenses/:id` endpoint + handler | Low |
| Expense filtering | Add query parameters to `GET /api/expenses`; extend SQL query | Low |
| Cloud deployment | Add Dockerfile or deploy script; no code changes | Low |

---

## Appendix: Validation Self-Check

| Check | Status |
|-------|--------|
| All FRD entities have table definitions | Yes — `expenses` table fully defined with DDL and CHECK constraints |
| All FRD APIs have endpoint specs | Yes — GET, POST, PUT endpoints with request/response schemas |
| DDL is valid and complete | Yes — valid SQLite DDL with CHECK constraints and index |
| Architecture supports all requirements | Yes — F00 through F05 mapped to components |
| TypeScript interfaces match API payloads | Yes — `Expense`, `ExpenseInput`, response types, error types defined |
| Error codes documented | Yes — all error codes from FRD Y2 covered in endpoint specs |
| Security considerations addressed | Yes — SQL injection, XSS, error leakage, security headers |
| Deployment topology documented | Yes — single process, single command startup |

---

*Generated from PRD-ExpenseTracker.md v1.0 and FRD-ExpenseTracker.md v1.0*
*Technical Architecture Document v1.0 — 2026-09-11*
