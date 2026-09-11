---
phase: express-build
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - db/database.js
  - server.js
  - data/.gitkeep
autonomous: true

features:
  implements: ["F2"]
  depends_on: []
  enables: ["F0", "F3", "F4", "F5"]

must_haves:
  truths:
    - "SQLite database file is created automatically on first run"
    - "expenses table exists with correct schema and CHECK constraints"
    - "Storage layer can insert an expense and retrieve all expenses"
    - "Server process starts, initializes DB, and logs readiness"
    - "Data persists across process restart"
  artifacts:
    - path: "package.json"
      provides: "Project manifest with express, better-sqlite3, helmet dependencies"
      contains: "better-sqlite3"
    - path: "db/database.js"
      provides: "Storage layer with initialize, getAllExpenses, createExpense"
      exports: ["initialize", "getAllExpenses", "createExpense"]
    - path: "server.js"
      provides: "Entry point that initializes DB and starts Express on PORT"
      contains: "initialize"
    - path: "data/.gitkeep"
      provides: "Ensures data directory exists in repo"
  key_links:
    - from: "server.js"
      to: "db/database.js"
      via: "require and initialize() call on startup"
      pattern: "require.*db/database.*initialize"
    - from: "db/database.js"
      to: "data/expenses.db"
      via: "better-sqlite3 file open"
      pattern: "new Database.*data.*expenses\\.db"

integration_contracts:
  requires: []
  provides:
    - artifact: "package.json"
      exports: ["express", "better-sqlite3", "helmet"]
      shape: |
        {
          "name": "expense-tracker",
          "main": "server.js",
          "scripts": { "start": "node server.js" },
          "dependencies": { "express": "^4.18.0", "better-sqlite3": "^9.0.0", "helmet": "^7.0.0" }
        }
      verify: "grep -n 'better-sqlite3' package.json && grep -n 'express' package.json && grep -n 'helmet' package.json && echo CONTRACT_OK"
    - artifact: "db/database.js"
      exports: ["initialize", "getAllExpenses", "createExpense"]
      shape: |
        initialize() → void (creates table + index if not exists, enables WAL)
        getAllExpenses() → Array<{ id, amount, description, category, created_at, updated_at }>
        createExpense({ amount, description, category }) → { id, amount, description, category, created_at, updated_at }
      verify: "grep -n 'function initialize\\|exports.initialize\\|module.exports' db/database.js && grep -n 'getAllExpenses' db/database.js && grep -n 'createExpense' db/database.js && echo CONTRACT_OK"
    - artifact: "server.js"
      exports: ["HTTP server on PORT", "express app"]
      shape: |
        Requires db/database.js, calls initialize(), creates Express app, listens on PORT (default 3000).
        Mounts express.json() middleware. Exports app for later route mounting.
      verify: "grep -n 'initialize' server.js && grep -n 'listen' server.js && grep -n 'express' server.js && echo CONTRACT_OK"
---

<objective>
Create the project scaffold, SQLite database schema, and storage layer for the Expense Tracker.

Purpose: Establish the persistent storage foundation (F2) that all subsequent waves (API, UI, integration) depend on. The database schema, storage functions, and project entry point must exist and be proven correct before any API routes or UI can be built.

Output: A runnable Node.js project with `package.json`, a storage layer (`db/database.js`) exposing `initialize`, `getAllExpenses`, and `createExpense`, a server entry point (`server.js`) that boots the DB and starts Express, and the `data/` directory for the SQLite file.
</objective>

<feature_dependencies>
Implements: F2: Persistent Storage — SQLite schema, storage layer, automatic initialization
Depends on: None
Enables: F0: Expense Entry (needs createExpense), F3: Expense List Display (needs getAllExpenses), F4: Total Amount Display (needs getAllExpenses data), F5: Web-Based UI (needs server.js running Express)
</feature_dependencies>

<context>
@project_specs/TechArch-ExpenseTracker.md (Section 3: Data Model — exact DDL; Section 2: Storage Layer; Section 6: Package.json)
@project_specs/PRD-ExpenseTracker.md (F2: Persistent Storage requirements)
@.planning/express/build-a-simple-expense-tracker-that-allo/SCOPE-DECISION.md
@.planning/express/build-a-simple-expense-tracker-that-allo/WAVE-SCHEDULE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Project scaffold and SQLite storage layer</name>
  <files>package.json, db/database.js, data/.gitkeep</files>
  <action>
**1. Create `package.json`** with EXACT structure from TechArch Section 6:

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

Run `npm install` to install dependencies.

**2. Create `data/.gitkeep`** — empty file ensuring the `data/` directory exists in the repo. Add `data/expenses.db` to `.gitignore` (the DB file is runtime-generated, not committed).

**3. Create `db/database.js`** — the storage layer. This is the ONLY file that imports `better-sqlite3`. It exposes three functions:

- **`initialize()`**: Called once on server startup. Steps (from TechArch §3 Initialization Sequence):
  1. Ensure `data/` directory exists (`fs.mkdirSync` with `{ recursive: true }`)
  2. Open SQLite database at path from `process.env.DB_PATH || './data/expenses.db'`
  3. Enable WAL mode: `db.pragma('journal_mode = WAL')`
  4. Execute the EXACT DDL from TechArch §3:

```sql
CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      INTEGER NOT NULL CHECK (amount > 0 AND amount <= 99999999),
    description TEXT    NOT NULL CHECK (length(trim(description)) >= 1 AND length(description) <= 500),
    category    TEXT    NOT NULL CHECK (length(trim(category)) >= 1 AND length(category) <= 100),
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC);
```

  5. Log: `console.log('Storage initialized: data/expenses.db')` (or the actual DB_PATH value)
  6. If any step fails, log the error and throw (server.js will catch and exit non-zero)

- **`getAllExpenses()`**: Returns all expenses ordered by `created_at DESC`. Uses a prepared statement:
  ```sql
  SELECT id, amount, description, category, created_at, updated_at
  FROM expenses
  ORDER BY created_at DESC;
  ```
  Returns the array of row objects. On error, throw with enough context for the error handler to map to `ERR_STORAGE_READ`.

- **`createExpense({ amount, description, category })`**: Inserts a new record. Steps:
  1. Generate `created_at` and `updated_at` as `new Date().toISOString()` (ISO 8601 UTC)
  2. Use a prepared statement:
  ```sql
  INSERT INTO expenses (amount, description, category, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?);
  ```
  3. After `stmt.run(...)`, use `info.lastInsertRowid` to retrieve the new ID
  4. Fetch and return the full row (using a prepared `SELECT ... WHERE id = ?`) so the API can return the complete `Expense` object including server-generated fields
  5. On error, throw with context for `ERR_STORAGE_WRITE`

All queries MUST use parameterized statements (prepared statements via `db.prepare()`). NEVER use string concatenation for SQL. This is the SQL injection prevention mandated by TechArch §5.

**Important — NO `updateExpense` function.** F1 (Expense Editing) is deferred per SCOPE-DECISION.md. Do not implement `updateExpense`, do not add a PUT-related query.

Module pattern: Use `module.exports = { initialize, getAllExpenses, createExpense }`.
  </action>
  <verify>
```bash
# Dependencies installed
node -e "require('better-sqlite3'); require('express'); console.log('DEPS OK')"

# Storage layer loads without error
node -e "const db = require('./db/database'); console.log(typeof db.initialize, typeof db.getAllExpenses, typeof db.createExpense); console.log('MODULE OK')"

# Initialize creates DB and table
node -e "
const db = require('./db/database');
db.initialize();
const Database = require('better-sqlite3');
const d = new Database('./data/expenses.db');
const tables = d.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'\").get();
const idx = d.prepare(\"SELECT name FROM sqlite_master WHERE type='index' AND name='idx_expenses_created_at'\").get();
console.log('TABLE:', tables ? 'OK' : 'MISSING');
console.log('INDEX:', idx ? 'OK' : 'MISSING');
d.close();
"

# Create and retrieve an expense
node -e "
const db = require('./db/database');
db.initialize();
const created = db.createExpense({ amount: 1050, description: 'Test lunch', category: 'Food' });
console.log('CREATED:', JSON.stringify(created));
const all = db.getAllExpenses();
console.log('ALL COUNT:', all.length);
console.log('FIRST:', JSON.stringify(all[0]));
if (created.id && created.amount === 1050 && created.description === 'Test lunch' && created.category === 'Food' && created.created_at && created.updated_at) {
  console.log('CREATE CONTRACT OK');
}
if (all.length === 1 && all[0].id === created.id) {
  console.log('GET ALL CONTRACT OK');
}
"

# Clean up test DB
rm -f ./data/expenses.db
```
  </verify>
  <done>
- `package.json` exists with express, better-sqlite3, helmet as dependencies
- `npm install` succeeds, `node_modules/` populated
- `db/database.js` exports `initialize`, `getAllExpenses`, `createExpense` (no `updateExpense`)
- `initialize()` creates `data/expenses.db` with `expenses` table matching TechArch DDL exactly (CHECK constraints, AUTOINCREMENT, index)
- WAL mode enabled
- `createExpense` inserts a row and returns the full record with server-generated `id`, `created_at`, `updated_at`
- `getAllExpenses` returns rows ordered by `created_at DESC`
- All SQL uses parameterized prepared statements (no string concatenation)
- `data/.gitkeep` exists; `data/expenses.db` is in `.gitignore`
  </done>

  <feature_dependencies>
  Implements: F2: Persistent Storage — SQLite schema with CHECK constraints, storage layer functions, automatic initialization
  Depends on: None
  Enables: F0 (createExpense), F3 (getAllExpenses), F4 (data for total calculation)
  </feature_dependencies>
</task>

<task type="auto">
  <name>Task 2: Server entry point with DB initialization and Express bootstrap</name>
  <files>server.js, .gitignore</files>
  <action>
**1. Create `server.js`** — the application entry point. From TechArch §2 (Server Entry Point):

```javascript
const express = require('express');
const path = require('path');
const database = require('./db/database');

// Initialize storage — MUST succeed or server exits
try {
  database.initialize();
} catch (err) {
  console.error('Failed to initialize storage:', err.message);
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// Middleware
app.use(express.json());

// Static file serving (public/ directory, for Wave 3)
app.use(express.static(path.join(__dirname, 'public')));

// Placeholder for API routes (Wave 2 will mount routes here)
// app.use('/api/expenses', expensesRouter);

app.listen(PORT, () => {
  console.log(`Expense Tracker running on http://localhost:${PORT}`);
});

module.exports = app;
```

Key points per TechArch:
- DB initialization happens BEFORE server starts listening. If it fails, `process.exit(1)` — the server must not start in a degraded state (TechArch §3 Initialization Sequence).
- `express.json()` middleware is mounted for JSON request body parsing.
- `express.static()` is configured to serve from `public/` (Wave 3 will create these files; the middleware is safe to mount now — it just serves nothing).
- The server exports `app` so Wave 2 can import it if needed for testing, but the primary entry is `node server.js`.
- PORT is configurable via `process.env.PORT` with default 3000 (TechArch §7).

**Do NOT add:**
- `helmet` middleware yet (Wave 2 task — it belongs with API security headers)
- API routes (Wave 2)
- Error handler middleware (Wave 2)
- Any PUT endpoint or edit-related code (F1 deferred)

**2. Create/update `.gitignore`**:
```
node_modules/
data/expenses.db
data/expenses.db-wal
data/expenses.db-shm
```
  </action>
  <verify>
```bash
# Server starts and creates DB
timeout 5 node server.js &
SERVER_PID=$!
sleep 2

# Check server is listening
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "No static content yet (expected)"

# Check DB was created
ls -la data/expenses.db && echo "DB FILE OK"

# Check server logged correctly
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# Verify DB persists after server stop
node -e "
const Database = require('better-sqlite3');
const d = new Database('./data/expenses.db');
const t = d.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'\").get();
console.log('PERSIST CHECK:', t ? 'OK' : 'FAIL');
d.close();
"

# Clean up
rm -f ./data/expenses.db ./data/expenses.db-wal ./data/expenses.db-shm

echo "VERIFY COMPLETE"
```
  </verify>
  <done>
- `server.js` exists, requires `db/database.js`, calls `initialize()` before listening
- Server exits with non-zero code if DB initialization fails
- Express app mounts `express.json()` and `express.static('public/')`
- Server listens on PORT (default 3000, configurable via env var)
- Server logs "Expense Tracker running on http://localhost:{PORT}" on successful start
- `data/expenses.db` is created on first run and persists after server stops
- `.gitignore` excludes `node_modules/`, `data/expenses.db`, and WAL files
- No API routes, no helmet, no error handler (those are Wave 2)
- No PUT endpoint, no updateExpense usage (F1 deferred)
  </done>

  <feature_dependencies>
  Implements: F2: Persistent Storage — server-side initialization, automatic schema creation on first run, process exits on storage failure
  Depends on: None (Task 1 creates db/database.js, but both tasks are in the same plan/wave)
  Enables: F5 (server entry point for Express app, static serving ready), F0/F3 (server ready for API route mounting in Wave 2)
  </feature_dependencies>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| server.js → SQLite | Application-controlled SQL hitting the embedded database |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering (SQL Injection) | db/database.js — all SQL queries | mitigate | All queries use `db.prepare()` with positional `?` parameters in `createExpense` and `getAllExpenses`. No string interpolation or concatenation in any SQL path. Verified by grep for `db.prepare` and absence of template literals in SQL strings. |
| T-01-02 | Information Disclosure | server.js — error on DB init failure | mitigate | `catch` block logs `err.message` to server console only, then calls `process.exit(1)`. No error details sent to any HTTP response (server isn't listening yet when init fails). |
| T-01-03 | Denial of Service | db/database.js — CHECK constraints on amount/description/category | mitigate | Database-level CHECK constraints (`amount > 0 AND amount <= 99999999`, `length(trim(description)) >= 1`, etc.) act as a safety net behind application validation (Wave 2). Malformed data that bypasses app validation is rejected at the DB level. |
</threat_model>

<verification>
```bash
# Full integration check: install, start, create, retrieve, restart-persist
npm install

# Start server, create an expense via storage layer, verify persistence
node -e "
const db = require('./db/database');
db.initialize();
const e1 = db.createExpense({ amount: 2500, description: 'Coffee', category: 'Food' });
const e2 = db.createExpense({ amount: 15000, description: 'Book', category: 'Education' });
console.log('Created:', e1.id, e2.id);
const all = db.getAllExpenses();
console.log('Count:', all.length);
console.log('Order OK:', all[0].id === e2.id && all[1].id === e1.id);
console.log('Amounts OK:', all[0].amount === 15000 && all[1].amount === 2500);
"

# Verify data persists by reopening
node -e "
const db = require('./db/database');
db.initialize();
const all = db.getAllExpenses();
console.log('After reinit count:', all.length);
console.log('PERSIST OK:', all.length === 2);
"

# Verify server starts and exits cleanly
timeout 3 node server.js &
sleep 2
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ ; echo
kill %1 2>/dev/null; wait 2>/dev/null

# Clean up
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm
```
</verification>

<success_criteria>
1. `npm install` completes without errors
2. `node server.js` starts, creates `data/expenses.db`, logs initialization and listening messages, and exits cleanly on SIGTERM
3. `db/database.js` exports exactly three functions: `initialize`, `getAllExpenses`, `createExpense` — no `updateExpense`
4. The `expenses` table has the exact schema from TechArch DDL: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `amount INTEGER NOT NULL CHECK(amount > 0 AND amount <= 99999999)`, `description TEXT NOT NULL CHECK(...)`, `category TEXT NOT NULL CHECK(...)`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`
5. The `idx_expenses_created_at` index exists on `created_at DESC`
6. `createExpense` returns a complete row with server-generated `id`, `created_at`, `updated_at`
7. `getAllExpenses` returns rows ordered by `created_at DESC`
8. Data survives `initialize()` being called again (idempotent — `CREATE TABLE IF NOT EXISTS`)
9. All SQL uses parameterized prepared statements
10. No F1 (Expense Editing) artifacts: no `updateExpense`, no PUT-related code
</success_criteria>

<output>
After completion, create `.planning/express/build-a-simple-expense-tracker-that-allo/01-SUMMARY.md`
</output>
