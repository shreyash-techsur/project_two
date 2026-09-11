---
phase: express-build
plan: 02
type: execute
wave: 2
depends_on: [1]
files_modified:
  - routes/expenses.js
  - middleware/validate.js
  - middleware/errorHandler.js
  - server.js
  - tests/api.test.js
autonomous: true

features:
  implements: ["F0", "F1", "F2", "F3", "F4", "F5"]
  depends_on: ["F2"]
  enables: ["F0", "F1", "F3", "F4", "F5"]

must_haves:
  truths:
    - "GET /api/expenses returns 200 with { expenses: [] } when empty"
    - "GET /api/expenses returns all expenses ordered by created_at DESC"
    - "POST /api/expenses with valid body returns 201 with { expense: {...} } including server-generated id, created_at, updated_at"
    - "POST /api/expenses converts dollar amount to integer cents before storage"
    - "PUT /api/expenses/:id with valid body returns 200 with { expense: {...} } including updated updated_at"
    - "PUT /api/expenses/:id converts dollar amount to integer cents before storage"
    - "PUT /api/expenses/:id with non-existent ID returns 404 with ERR_EXPENSE_NOT_FOUND"
    - "PUT /api/expenses/:id with invalid ID returns 400 with ERR_EXPENSE_INVALID_ID"
    - "POST and PUT with invalid body return 400 with structured error codes matching FRD Y2"
    - "Multiple validation errors returned simultaneously in errors array"
    - "Server errors return 500 with sanitized message, no stack traces"
    - "Security headers are set via helmet middleware"
    - "Static files are served from public/ on the root path"
  artifacts:
    - path: "routes/expenses.js"
      provides: "Express router with GET /api/expenses, POST /api/expenses, and PUT /api/expenses/:id"
      exports: ["router"]
    - path: "middleware/validate.js"
      provides: "Validation middleware for expense input (amount, description, category)"
      exports: ["validateExpenseInput"]
    - path: "middleware/errorHandler.js"
      provides: "Global Express error handler returning sanitized JSON errors"
      exports: ["errorHandler"]
    - path: "server.js"
      provides: "Updated entry point with helmet, API routes mounted at /api/expenses, error handler"
      contains: "helmet"
    - path: "tests/api.test.js"
      provides: "Integration tests for GET and POST /api/expenses endpoints"
      contains: "test"
  key_links:
    - from: "server.js"
      to: "routes/expenses.js"
      via: "app.use('/api/expenses', router)"
      pattern: "app\\.use.*api/expenses.*router"
    - from: "routes/expenses.js"
      to: "db/database.js"
      via: "require and call getAllExpenses/createExpense"
      pattern: "require.*db/database"
    - from: "routes/expenses.js"
      to: "middleware/validate.js"
      via: "router.post uses validateExpenseInput middleware"
      pattern: "validateExpenseInput"
    - from: "server.js"
      to: "middleware/errorHandler.js"
      via: "app.use(errorHandler) after routes"
      pattern: "errorHandler"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "db/database.js"
      exports: ["initialize", "getAllExpenses", "createExpense", "updateExpense"]
      verify: "grep -n 'getAllExpenses' db/database.js && grep -n 'createExpense' db/database.js && grep -n 'updateExpense' db/database.js && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "server.js"
      exports: ["HTTP server on PORT", "express app"]
      verify: "grep -n 'express' server.js && grep -n 'listen' server.js && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "package.json"
      exports: ["express", "better-sqlite3", "helmet"]
      verify: "grep -n 'express' package.json && grep -n 'helmet' package.json && echo CONTRACT_OK"
  provides:
    - artifact: "routes/expenses.js"
      exports: ["router"]
      shape: |
        Express.Router with:
          GET  / → calls getAllExpenses(), returns { expenses: [...] } (200)
          POST / → uses validateExpenseInput middleware, converts amount dollars→cents, calls createExpense(), returns { expense: {...} } (201)
          PUT  /:id → validates ID, uses validateExpenseInput middleware, converts amount dollars→cents, calls updateExpense(), returns { expense: {...} } (200) or 404/400
      verify: "grep -n 'router.get' routes/expenses.js && grep -n 'router.post' routes/expenses.js && grep -n 'router.put' routes/expenses.js && echo CONTRACT_OK"
    - artifact: "middleware/validate.js"
      exports: ["validateExpenseInput"]
      shape: |
        validateExpenseInput(req, res, next):
          Validates req.body.{amount, description, category} against FRD rules.
          On failure: returns 400 with { errors: [{ code, message }] }.
          On success: calls next().
      verify: "grep -n 'validateExpenseInput' middleware/validate.js && grep -n 'ERR_EXPENSE' middleware/validate.js && echo CONTRACT_OK"
    - artifact: "middleware/errorHandler.js"
      exports: ["errorHandler"]
      shape: |
        errorHandler(err, req, res, next):
          Logs full error server-side.
          Returns 500 with { error: { code: 'ERR_STORAGE_WRITE'|'ERR_STORAGE_READ', message } }.
          Never exposes stack traces.
      verify: "grep -n 'errorHandler' middleware/errorHandler.js && grep -n 'ERR_STORAGE' middleware/errorHandler.js && echo CONTRACT_OK"
    - artifact: "server.js"
      exports: ["app with helmet, routes, errorHandler mounted"]
      shape: |
        Express app with middleware chain:
          1. helmet() — security headers
          2. express.json() — body parsing
          3. express.static('public/') — static files
          4. /api/expenses — expense routes
          5. errorHandler — global error catcher
      verify: "grep -n 'helmet' server.js && grep -n 'api/expenses' server.js && grep -n 'errorHandler' server.js && echo CONTRACT_OK"
---

<objective>
Build the Express.js REST API layer: GET /api/expenses (list), POST /api/expenses (create), and PUT /api/expenses/:id (update) with full validation, error handling, security headers, and integration tests.

Purpose: Implement the backend API surface (F0, F1, F3, F4, F5) on top of the storage foundation (F2 from Wave 1). After this wave, the server accepts HTTP requests to create, update, and list expenses with complete validation matching the FRD error catalog, sanitized error responses, and security headers. This is the contract the frontend (Wave 3) will consume.

Output: `routes/expenses.js` (API router with GET, POST, PUT), `middleware/validate.js` (input validation), `middleware/errorHandler.js` (global error handler), updated `server.js` (mounts all middleware and routes), and `tests/api.test.js` (integration tests proving the API contract).
</objective>

<feature_dependencies>
Implements: F0: Expense Entry (POST /api/expenses with dollar-to-cents conversion and full validation), F1: Expense Editing (PUT /api/expenses/:id with ID validation, not-found handling, dollar-to-cents conversion), F2: Persistent Storage (write-before-acknowledge pattern via storage layer), F3: Expense List Display (GET /api/expenses ordered by created_at DESC), F4: Total Amount Display (amounts in cents returned via GET for client-side summing), F5: Web-Based UI (helmet security headers, static serving, same-origin API)
Depends on: F2: Persistent Storage (db/database.js with initialize, getAllExpenses, createExpense, updateExpense from Wave 1)
Enables: F0 (frontend can POST expenses), F1 (frontend can PUT expenses), F3 (frontend can GET expenses), F4 (frontend can sum amounts), F5 (frontend served from same origin with security headers)
</feature_dependencies>

<context>
@project_specs/FRD-ExpenseTracker.md (F0 process steps 7-13, Y1 endpoint specs, Y2 error catalog)
@project_specs/TechArch-ExpenseTracker.md (Section 2: API Router, Validation Middleware, Error Handler; Section 4: API Design with TypeScript interfaces; Section 5: Security headers)
@.planning/express/build-a-simple-expense-tracker-that-allo/01-PLAN.md (Wave 1 integration contracts — db/database.js exports, server.js structure)
@.planning/express/build-a-simple-expense-tracker-that-allo/SCOPE-DECISION.md (F1 included — PUT endpoint for editing)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Validation middleware, API routes, and error handler</name>
  <files>middleware/validate.js, middleware/errorHandler.js, routes/expenses.js, server.js</files>
  <action>
**1. Create `middleware/validate.js`** — input validation middleware for POST /api/expenses.

Export a single function `validateExpenseInput(req, res, next)` that checks `req.body` against the EXACT rules from FRD Y2 Error Catalog and TechArch §4 POST /api/expenses Request Field Validation:

Validation logic (check ALL rules, collect ALL errors, return them all at once):

```javascript
function validateExpenseInput(req, res, next) {
  const errors = [];
  const { amount, description, category } = req.body || {};

  // --- Amount validation ---
  if (amount === undefined || amount === null || amount === '') {
    errors.push({ code: 'ERR_EXPENSE_AMOUNT_REQUIRED', message: 'Amount is required' });
  } else if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push({ code: 'ERR_EXPENSE_INVALID_AMOUNT', message: 'Amount must be a valid number' });
  } else {
    if (amount <= 0) {
      errors.push({ code: 'ERR_EXPENSE_AMOUNT_POSITIVE', message: 'Amount must be greater than zero' });
    }
    if (amount > 999999.99) {
      errors.push({ code: 'ERR_EXPENSE_AMOUNT_TOO_LARGE', message: 'Amount must not exceed 999,999.99' });
    }
    // Precision check: more than 2 decimal places
    const amountStr = String(amount);
    const decimalIndex = amountStr.indexOf('.');
    if (decimalIndex !== -1 && amountStr.length - decimalIndex - 1 > 2) {
      errors.push({ code: 'ERR_EXPENSE_AMOUNT_PRECISION', message: 'Amount must have at most two decimal places' });
    }
  }

  // --- Description validation ---
  if (description === undefined || description === null || description === '') {
    errors.push({ code: 'ERR_EXPENSE_DESC_REQUIRED', message: 'Description is required' });
  } else if (typeof description !== 'string') {
    errors.push({ code: 'ERR_EXPENSE_DESC_REQUIRED', message: 'Description is required' });
  } else {
    if (description.trim().length === 0) {
      errors.push({ code: 'ERR_EXPENSE_DESC_REQUIRED', message: 'Description is required' });
    }
    if (description.length > 500) {
      errors.push({ code: 'ERR_EXPENSE_DESC_TOO_LONG', message: 'Description must not exceed 500 characters' });
    }
  }

  // --- Category validation ---
  if (category === undefined || category === null || category === '') {
    errors.push({ code: 'ERR_EXPENSE_CAT_REQUIRED', message: 'Category is required' });
  } else if (typeof category !== 'string') {
    errors.push({ code: 'ERR_EXPENSE_CAT_REQUIRED', message: 'Category is required' });
  } else {
    if (category.trim().length === 0) {
      errors.push({ code: 'ERR_EXPENSE_CAT_REQUIRED', message: 'Category is required' });
    }
    if (category.length > 100) {
      errors.push({ code: 'ERR_EXPENSE_CAT_TOO_LONG', message: 'Category must not exceed 100 characters' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
}

module.exports = { validateExpenseInput };
```

The validation collects ALL errors and returns them in a single response (FRD Y1 §Create Expense: "Multiple validation errors may be returned as an array"). The error codes and messages match FRD Y2 EXACTLY — do NOT paraphrase.

**ID Validation for PUT route:** Also implement ID path parameter validation for the PUT endpoint. The `:id` must be a positive integer. If not, return 400 with `ERR_EXPENSE_INVALID_ID`. This can be a separate middleware or inline in the route handler.

**2. Create `middleware/errorHandler.js`** — global Express error-handling middleware.

From TechArch §2 (Error Handler):

```javascript
function errorHandler(err, req, res, next) {
  // Log full error server-side (including stack trace)
  console.error('Server error:', err);

  // Determine error code based on context
  const isReadError = err.message && err.message.includes('read');
  const code = isReadError ? 'ERR_STORAGE_READ' : 'ERR_STORAGE_WRITE';
  const message = isReadError
    ? 'Failed to retrieve data. Please try again.'
    : 'Failed to save data. Please try again.';

  // Return sanitized response — NO stack traces, NO internal details
  res.status(500).json({
    error: { code, message }
  });
}

module.exports = { errorHandler };
```

Per TechArch §5: "Server error responses (500) never include stack traces, file paths, or internal implementation details."

**3. Create `routes/expenses.js`** — Express router for expense API endpoints.

From TechArch §2 (API Router) and §4 (Endpoint Specifications):

```javascript
const express = require('express');
const router = express.Router();
const database = require('../db/database');
const { validateExpenseInput } = require('../middleware/validate');

// GET /api/expenses — List all expenses (most recent first)
// FRD Y1: Response 200 OK with { expenses: [...] }
router.get('/', (req, res, next) => {
  try {
    const expenses = database.getAllExpenses();
    res.status(200).json({ expenses });
  } catch (err) {
    err.message = 'read: ' + err.message;  // Tag for error handler
    next(err);
  }
});

// POST /api/expenses — Create a new expense
// FRD Y1: Request { amount (dollars), description, category }
// Response 201 Created with { expense: {...} }
router.post('/', validateExpenseInput, (req, res, next) => {
  try {
    const { amount, description, category } = req.body;

    // Convert dollar amount to integer cents (TechArch §3, FRD F0 step 9)
    // Math.round handles floating-point edge cases (e.g., 10.50 * 100 = 1049.9999...)
    const amountCents = Math.round(parseFloat(amount) * 100);

    // Trim description and category before storage (FRD §Y0 Data Integrity Rules)
    const trimmedDescription = description.trim();
    const trimmedCategory = category.trim();

    const expense = database.createExpense({
      amount: amountCents,
      description: trimmedDescription,
      category: trimmedCategory
    });

    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
});

// PUT /api/expenses/:id — Update an existing expense
// FRD F1: Request { amount (dollars), description, category }
// Response 200 OK with { expense: {...} } or 404 if not found
router.put('/:id', validateExpenseInput, (req, res, next) => {
  try {
    // Validate ID parameter
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0 || String(id) !== req.params.id) {
      return res.status(400).json({
        error: { code: 'ERR_EXPENSE_INVALID_ID', message: 'Invalid expense ID' }
      });
    }

    const { amount, description, category } = req.body;

    // Convert dollar amount to integer cents
    const amountCents = Math.round(parseFloat(amount) * 100);

    // Trim description and category before storage
    const trimmedDescription = description.trim();
    const trimmedCategory = category.trim();

    const expense = database.updateExpense(id, {
      amount: amountCents,
      description: trimmedDescription,
      category: trimmedCategory
    });

    if (expense === null) {
      return res.status(404).json({
        error: { code: 'ERR_EXPENSE_NOT_FOUND', message: 'Expense not found' }
      });
    }

    res.status(200).json({ expense });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

Key contract points:
- GET returns `{ expenses: [...] }` (TechArch §4 ListExpensesResponse interface). Empty array when no expenses, NOT null.
- POST accepts `amount` as **dollars** (e.g., `10.50`), converts to **cents** (`1050`) via `Math.round(parseFloat(amount) * 100)`. This is the dollar-to-cents conversion from FRD F0 step 9 and TechArch §3.
- POST returns `{ expense: {...} }` (TechArch §4 ExpenseResponse interface) with status 201.
- PUT accepts `amount` as **dollars**, converts to **cents**, validates `:id` as positive integer, returns 200 with updated expense or 404 if not found, or 400 if ID is invalid.
- PUT does NOT modify `created_at` — only `updated_at` is set to current UTC time.
- Description and category are trimmed before storage (FRD Y0 Data Integrity Rules).
- Errors are forwarded to `next(err)` for the global error handler.

**4. Update `server.js`** — mount helmet, API routes, and error handler.

Modify the existing `server.js` (created in Wave 1) to add:

```javascript
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const database = require('./db/database');
const expensesRouter = require('./routes/expenses');
const { errorHandler } = require('./middleware/errorHandler');

// Initialize storage — MUST succeed or server exits
try {
  database.initialize();
} catch (err) {
  console.error('Failed to initialize storage:', err.message);
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// Security headers (TechArch §5)
app.use(helmet());

// Body parsing
app.use(express.json());

// Static file serving (public/ directory)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/expenses', expensesRouter);

// Global error handler — MUST be after routes
app.use(errorHandler);

// Start server — bind to 0.0.0.0 for container/sandbox access
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Expense Tracker running on http://localhost:${PORT}`);
});

module.exports = app;
```

Middleware order matters (TechArch §2):
1. `helmet()` — security headers first
2. `express.json()` — parse request bodies
3. `express.static()` — serve frontend files
4. `/api/expenses` — API routes
5. `errorHandler` — catch-all error handler (MUST be last)

Bind to `0.0.0.0` (not just localhost) per constraints for sandbox accessibility.

**Do NOT add:**
- Any authentication middleware (out of scope per TechArch §5)
  </action>
  <verify>
```bash
# Verify files exist
test -f middleware/validate.js && test -f middleware/errorHandler.js && test -f routes/expenses.js && echo "FILES OK"

# Verify PUT route exists
grep -n 'router\.put' routes/expenses.js && echo "PUT ROUTE OK"

# Verify validation error codes match FRD Y2 exactly
grep -c 'ERR_EXPENSE_AMOUNT_REQUIRED' middleware/validate.js && \
grep -c 'ERR_EXPENSE_INVALID_AMOUNT' middleware/validate.js && \
grep -c 'ERR_EXPENSE_AMOUNT_POSITIVE' middleware/validate.js && \
grep -c 'ERR_EXPENSE_AMOUNT_TOO_LARGE' middleware/validate.js && \
grep -c 'ERR_EXPENSE_AMOUNT_PRECISION' middleware/validate.js && \
grep -c 'ERR_EXPENSE_DESC_REQUIRED' middleware/validate.js && \
grep -c 'ERR_EXPENSE_DESC_TOO_LONG' middleware/validate.js && \
grep -c 'ERR_EXPENSE_CAT_REQUIRED' middleware/validate.js && \
grep -c 'ERR_EXPENSE_CAT_TOO_LONG' middleware/validate.js && \
echo "ERROR CODES OK"

# Verify helmet is in server.js
grep -n 'helmet' server.js && echo "HELMET OK"

# Verify error handler is mounted after routes
grep -n 'errorHandler' server.js && echo "ERROR HANDLER OK"

# Verify route mounting
grep -n "api/expenses" server.js && echo "ROUTES MOUNTED OK"

# Start server and test endpoints
timeout 10 node server.js &
SERVER_PID=$!
sleep 2

# Test GET /api/expenses (empty)
GET_RESPONSE=$(curl -s http://localhost:3000/api/expenses)
echo "GET empty: $GET_RESPONSE"
echo "$GET_RESPONSE" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('GET EMPTY OK:', Array.isArray(d.expenses) && d.expenses.length === 0)"

# Test POST /api/expenses (valid)
POST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"amount": 10.50, "description": "Lunch at cafe", "category": "Food"}')
echo "POST valid: $POST_RESPONSE"
echo "$POST_RESPONSE" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const e = d.expense;
console.log('POST 201 OK:', e.id > 0 && e.amount === 1050 && e.description === 'Lunch at cafe' && e.category === 'Food' && e.created_at && e.updated_at);
"

# Test POST status code
POST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"amount": 5.00, "description": "Coffee", "category": "Drinks"}')
echo "POST STATUS: $POST_STATUS"

# Test validation — missing fields
VAL_RESPONSE=$(curl -s -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{}')
echo "VALIDATION: $VAL_RESPONSE"
VAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{}')
echo "VAL STATUS: $VAL_STATUS"

# Test GET /api/expenses (should have 2 now)
GET_RESPONSE2=$(curl -s http://localhost:3000/api/expenses)
echo "$GET_RESPONSE2" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('GET 2 OK:', d.expenses.length === 2)"

# Test security headers
HEADERS=$(curl -sI http://localhost:3000/api/expenses)
echo "$HEADERS" | grep -i "x-content-type-options" && echo "SECURITY HEADER OK"

kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# Clean up test DB
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm
echo "VERIFY COMPLETE"
```
  </verify>
  <done>
- `middleware/validate.js` exports `validateExpenseInput` that checks amount (required, numeric, positive, <= 999999.99, max 2 decimal places), description (required, non-empty after trim, max 500 chars), category (required, non-empty after trim, max 100 chars)
- All error codes match FRD Y2 EXACTLY: ERR_EXPENSE_AMOUNT_REQUIRED, ERR_EXPENSE_INVALID_AMOUNT, ERR_EXPENSE_AMOUNT_POSITIVE, ERR_EXPENSE_AMOUNT_TOO_LARGE, ERR_EXPENSE_AMOUNT_PRECISION, ERR_EXPENSE_DESC_REQUIRED, ERR_EXPENSE_DESC_TOO_LONG, ERR_EXPENSE_CAT_REQUIRED, ERR_EXPENSE_CAT_TOO_LONG
- Multiple validation errors returned simultaneously in `{ errors: [...] }` array format
- `middleware/errorHandler.js` exports `errorHandler` that logs full error server-side, returns sanitized 500 with ERR_STORAGE_READ or ERR_STORAGE_WRITE — no stack traces
- `routes/expenses.js` exports Express router with GET /, POST /, and PUT /:id (mounted at /api/expenses)
- GET returns `{ expenses: [...] }` with 200, expenses ordered by created_at DESC
- POST accepts amount in dollars, converts to cents via `Math.round(parseFloat(amount) * 100)`, trims description/category, returns `{ expense: {...} }` with 201
- PUT accepts amount in dollars, converts to cents, validates :id as positive integer, trims description/category, returns `{ expense: {...} }` with 200, or 404 with ERR_EXPENSE_NOT_FOUND, or 400 with ERR_EXPENSE_INVALID_ID
- PUT does NOT modify created_at — only updated_at is set to current UTC time
- `server.js` updated with helmet(), /api/expenses route, errorHandler middleware in correct order
- Server binds to 0.0.0.0 on PORT (default 3000)
  </done>

  <feature_dependencies>
  Implements: F0: Expense Entry (POST /api/expenses with validation and dollar-to-cents conversion), F1: Expense Editing (PUT /api/expenses/:id with ID validation, not-found handling), F2: Persistent Storage (write-before-acknowledge via createExpense/updateExpense), F3: Expense List Display (GET /api/expenses returning ordered expenses), F4: Total Amount Display (amounts in cents via GET response for client-side summing), F5: Web-Based UI (helmet security headers, static serving, same-origin API)
  Depends on: F2 (db/database.js from Wave 1)
  Enables: F0, F1, F3, F4, F5 (frontend in Wave 3 consumes these endpoints)
  </feature_dependencies>
</task>

<task type="auto">
  <name>Task 2: Integration tests for API endpoints</name>
  <files>tests/api.test.js, package.json</files>
  <action>
**1. Install test dependency.** Add a lightweight test runner. Use Node.js built-in `node:test` and `node:assert` (available in Node 18+, no extra dependency needed). No npm install required.

If Node version < 18, fall back to a simple self-contained test script using `assert` module and `http` module. Prefer the built-in `node:test` approach.

**2. Create `tests/api.test.js`** — integration tests that start the server and make real HTTP requests.

The test file should:
- Import `app` from `../server.js` (which initializes the DB)
- Use `app.listen()` on a random/test port
- Make HTTP requests with `fetch` or `http.request`
- Clean up the test DB after tests

Test cases covering the API contract:

**GET /api/expenses:**
1. Returns 200 with `{ expenses: [] }` when empty
2. Returns expenses ordered by `created_at` DESC after creating multiple
3. Each expense in response has all fields: `id`, `amount`, `description`, `category`, `created_at`, `updated_at`
4. Response Content-Type is application/json

**POST /api/expenses — happy path:**
5. Returns 201 with `{ expense: {...} }` for valid input
6. Amount is converted from dollars to cents (send 10.50, get back 1050)
7. Description and category are trimmed (send "  Lunch  ", get back "Lunch")
8. Response includes server-generated `id`, `created_at`, `updated_at`
9. `created_at` equals `updated_at` on new records

**POST /api/expenses — validation errors:**
10. Empty body returns 400 with `errors` array containing ERR_EXPENSE_AMOUNT_REQUIRED, ERR_EXPENSE_DESC_REQUIRED, ERR_EXPENSE_CAT_REQUIRED
11. Negative amount returns ERR_EXPENSE_AMOUNT_POSITIVE
12. Amount > 999999.99 returns ERR_EXPENSE_AMOUNT_TOO_LARGE
13. Amount with > 2 decimals returns ERR_EXPENSE_AMOUNT_PRECISION
14. Description > 500 chars returns ERR_EXPENSE_DESC_TOO_LONG
15. Category > 100 chars returns ERR_EXPENSE_CAT_TOO_LONG
16. Non-numeric amount (e.g., "abc") returns ERR_EXPENSE_INVALID_AMOUNT
17. Whitespace-only description returns ERR_EXPENSE_DESC_REQUIRED

**PUT /api/expenses/:id — happy path:**
18. Returns 200 with `{ expense: {...} }` for valid update
19. Amount is converted from dollars to cents (send 15.00, get back 1500)
20. Description and category are trimmed before storage
21. `created_at` is unchanged after update; `updated_at` is updated
22. Response includes the full updated expense object

**PUT /api/expenses/:id — error cases:**
23. Non-existent ID returns 404 with ERR_EXPENSE_NOT_FOUND
24. Invalid ID (e.g., "abc", "-1", "0") returns 400 with ERR_EXPENSE_INVALID_ID
25. Validation errors (empty body) returns 400 with errors array (same as POST)

**Security:**
26. Response headers include security headers from helmet (X-Content-Type-Options: nosniff at minimum)

**Error response format:**
27. Validation errors use `{ errors: [...] }` format (array)
28. Each error object has `code` and `message` fields
29. Not-found and invalid-ID errors use `{ error: { code, message } }` format (singular object)

Use `process.env.DB_PATH` set to a test-specific path (e.g., `./data/test-expenses.db`) so tests don't interfere with development data. Clean up the test DB file after tests complete.

**3. Add test script to `package.json`:**
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "DB_PATH=./data/test-expenses.db node --test tests/api.test.js"
}
```

The test script sets `DB_PATH` to a test database and uses Node.js built-in test runner.
  </action>
  <verify>
```bash
# Run the tests
DB_PATH=./data/test-expenses.db node --test tests/api.test.js 2>&1 | tail -30 && echo "TESTS PASSED"

# Clean up test DB
rm -f ./data/test-expenses.db ./data/test-expenses.db-wal ./data/test-expenses.db-shm
```
  </verify>
  <done>
- `tests/api.test.js` exists with integration tests covering GET, POST, PUT, validation, error format, and security headers
- Tests use a separate test database (DB_PATH=./data/test-expenses.db)
- `npm test` runs all tests and they pass (0 failures)
- Tests cover: empty list, create expense, update expense, dollar-to-cents conversion, trimming, all 9 validation error codes, multiple errors in array, ERR_EXPENSE_NOT_FOUND (404), ERR_EXPENSE_INVALID_ID (400), security headers
- Test DB is cleaned up after test run
- `package.json` has `"test"` script configured
  </done>

  <feature_dependencies>
  Implements: F0: Expense Entry (tests verify POST creates expenses correctly), F1: Expense Editing (tests verify PUT updates expenses correctly, 404 on not found, 400 on invalid ID), F2: Persistent Storage (tests verify data persists across requests), F3: Expense List Display (tests verify GET returns correct data), F4: Total Amount Display (tests verify amounts in cents), F5: Web-Based UI (tests verify security headers)
  Depends on: F2 (storage layer from Wave 1), routes/expenses.js (Task 1 of this plan)
  Enables: Regression safety for Wave 3 and Wave 4 — tests become permanent verification assets
  </feature_dependencies>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→API | Untrusted JSON request bodies from browser/curl crossing into Express route handlers |
| API→Storage | Validated and converted data crossing from route handlers into db/database.js |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering (SQL Injection) | routes/expenses.js → db/database.js | mitigate | Route handler passes only validated, typed values (amountCents as integer, trimmed strings) to `createExpense()` and `updateExpense()`. Storage layer uses `db.prepare()` with `?` parameters exclusively (inherited from Wave 1). No user input reaches SQL via string interpolation. The `:id` parameter is parsed via `parseInt()` and validated as a positive integer before use. |
| T-02-02 | Tampering (Input Manipulation) | middleware/validate.js | mitigate | `validateExpenseInput` validates ALL fields server-side before any mutation. Amount checked for type, range, precision. Description/category checked for presence, type, length. Client validation is convenience only — server validation is authoritative (TechArch §1, FRD Y2). |
| T-02-03 | Information Disclosure (Stack Traces) | middleware/errorHandler.js | mitigate | `errorHandler` logs `err` (with stack) to `console.error` server-side only. HTTP 500 response contains only `{ error: { code, message } }` — no stack traces, no file paths, no internal details (TechArch §5). |
| T-02-04 | Information Disclosure (Security Headers) | server.js — helmet middleware | mitigate | `helmet()` sets X-Content-Type-Options: nosniff, X-Frame-Options: DENY, CSP: default-src 'self', and disables legacy X-XSS-Protection. Mounted first in middleware chain so all responses get headers. |
| T-02-05 | Denial of Service (Large Payloads) | server.js — express.json() | mitigate | Express.json() has a default body size limit of 100KB. For this single-user app with max field sizes (500 chars + 100 chars + number), this is more than adequate. No additional limit needed for MVP. |
| T-02-06 | Tampering (ID manipulation on PUT) | routes/expenses.js — PUT /:id | mitigate | The `:id` parameter is validated as a positive integer via `parseInt()` with strict comparison against the original string. Non-integer, negative, or zero IDs return 400 with `ERR_EXPENSE_INVALID_ID`. Non-existent IDs return 404 with `ERR_EXPENSE_NOT_FOUND`. No authorization check needed (single-user app per TechArch §5). |
</threat_model>

<verification>
```bash
# Full integration verification
npm install

# Start server and verify full API contract
timeout 15 node server.js &
SERVER_PID=$!
sleep 2

# 1. GET empty
EMPTY=$(curl -s http://localhost:3000/api/expenses)
echo "$EMPTY" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); if(!Array.isArray(d.expenses)||d.expenses.length!==0) process.exit(1); console.log('1. GET empty: PASS')"

# 2. POST valid expense (dollar to cents)
CREATED=$(curl -s -X POST http://localhost:3000/api/expenses -H 'Content-Type: application/json' -d '{"amount":10.50,"description":"Lunch","category":"Food"}')
echo "$CREATED" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const e=d.expense;
if(e.amount!==1050) process.exit(1);
if(e.description!=='Lunch') process.exit(1);
if(!e.id||!e.created_at||!e.updated_at) process.exit(1);
console.log('2. POST valid: PASS');
"

# 3. POST second expense
curl -s -X POST http://localhost:3000/api/expenses -H 'Content-Type: application/json' -d '{"amount":25.00,"description":"Book","category":"Education"}' > /dev/null

# 4. GET with 2 expenses, most recent first
LIST=$(curl -s http://localhost:3000/api/expenses)
echo "$LIST" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
if(d.expenses.length!==2) process.exit(1);
if(d.expenses[0].description!=='Book') process.exit(1);
console.log('4. GET ordered: PASS');
"

# 5. POST validation — empty body returns 400 with multiple errors
VAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/expenses -H 'Content-Type: application/json' -d '{}')
test "$VAL_STATUS" = "400" && echo "5. Validation 400: PASS" || echo "5. Validation 400: FAIL"

VAL_BODY=$(curl -s -X POST http://localhost:3000/api/expenses -H 'Content-Type: application/json' -d '{}')
echo "$VAL_BODY" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
if(!Array.isArray(d.errors)||d.errors.length<3) process.exit(1);
const codes=d.errors.map(e=>e.code);
if(!codes.includes('ERR_EXPENSE_AMOUNT_REQUIRED')) process.exit(1);
if(!codes.includes('ERR_EXPENSE_DESC_REQUIRED')) process.exit(1);
if(!codes.includes('ERR_EXPENSE_CAT_REQUIRED')) process.exit(1);
console.log('5b. Multiple errors: PASS');
"

# 6. Security headers
HEADERS=$(curl -sI http://localhost:3000/api/expenses)
echo "$HEADERS" | grep -qi "x-content-type-options" && echo "6. Security headers: PASS" || echo "6. Security headers: FAIL"

# 7. PUT endpoint works — update the first expense
PUT_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/expenses/1 -H 'Content-Type: application/json' -d '{"amount":15.00,"description":"Updated Lunch","category":"Dining"}')
echo "$PUT_RESPONSE" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const e=d.expense;
if(e.amount===1500 && e.description==='Updated Lunch') {
  console.log('7a. PUT update: PASS');
} else {
  console.log('7a. PUT update: FAIL');
}
"

# 7b. PUT with non-existent ID returns 404
PUT_404=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:3000/api/expenses/99999 -H 'Content-Type: application/json' -d '{"amount":5,"description":"test","category":"test"}')
test "$PUT_404" = "404" && echo "7b. PUT 404: PASS" || echo "7b. PUT 404: FAIL (got $PUT_404)"

# 7c. PUT with invalid ID returns 400
PUT_400=$(curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:3000/api/expenses/abc -H 'Content-Type: application/json' -d '{"amount":5,"description":"test","category":"test"}')
test "$PUT_400" = "400" && echo "7c. PUT invalid ID: PASS" || echo "7c. PUT invalid ID: FAIL (got $PUT_400)"

kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# 8. Run integration tests
DB_PATH=./data/test-expenses.db node --test tests/api.test.js 2>&1 | tail -20
echo "8. Integration tests: CHECK OUTPUT ABOVE"

# Clean up
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm
rm -f data/test-expenses.db data/test-expenses.db-wal data/test-expenses.db-shm
```
</verification>

<success_criteria>
1. `GET /api/expenses` returns 200 with `{ expenses: [] }` when empty, and `{ expenses: [...] }` ordered by created_at DESC when populated
2. `POST /api/expenses` with valid `{ amount, description, category }` returns 201 with `{ expense: { id, amount (cents), description, category, created_at, updated_at } }`
3. Dollar-to-cents conversion: sending `amount: 10.50` stores and returns `amount: 1050`
4. Description and category are trimmed before storage
5. Validation returns 400 with `{ errors: [...] }` array containing ALL applicable error codes from FRD Y2
6. All 9 validation error codes are implemented: ERR_EXPENSE_AMOUNT_REQUIRED, ERR_EXPENSE_INVALID_AMOUNT, ERR_EXPENSE_AMOUNT_POSITIVE, ERR_EXPENSE_AMOUNT_TOO_LARGE, ERR_EXPENSE_AMOUNT_PRECISION, ERR_EXPENSE_DESC_REQUIRED, ERR_EXPENSE_DESC_TOO_LONG, ERR_EXPENSE_CAT_REQUIRED, ERR_EXPENSE_CAT_TOO_LONG
7. Server errors return 500 with `{ error: { code, message } }` — no stack traces
8. Helmet security headers present on all responses
9. `npm test` passes all integration tests
10. `PUT /api/expenses/:id` with valid body returns 200 with updated expense (amount in cents, updated_at changed, created_at unchanged)
11. `PUT /api/expenses/:id` with non-existent ID returns 404 with `ERR_EXPENSE_NOT_FOUND`
12. `PUT /api/expenses/:id` with invalid ID returns 400 with `ERR_EXPENSE_INVALID_ID`
13. Server binds to 0.0.0.0 on PORT (default 3000)
</success_criteria>

<output>
After completion, create `.planning/express/build-a-simple-expense-tracker-that-allo/02-SUMMARY.md`
</output>
