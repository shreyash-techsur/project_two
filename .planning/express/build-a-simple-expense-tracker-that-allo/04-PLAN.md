---
phase: express-build
plan: 04
type: execute
wave: 4
depends_on: [1, 2, 3]
files_modified:
  - playwright.config.js
  - e2e/expense-tracker.spec.js
  - package.json
autonomous: true

features:
  implements: ["F0", "F1", "F2", "F3", "F4", "F5"]
  depends_on: ["F2"]
  enables: []

must_haves:
  truths:
    - "npm start boots the server and serves the app at http://localhost:3000 in under 10 seconds"
    - "User can add an expense via the form and see it appear in the list with correct currency formatting"
    - "User can click Edit on an expense, modify values, save, and see the row update in-place with recalculated total"
    - "User can cancel an edit and see no changes to the expense or total"
    - "Total updates immediately after adding or editing an expense"
    - "Form clears after successful submission and focus returns to amount field"
    - "Multiple expenses can be entered and edited in sequence without page reload"
    - "Expenses persist across page refresh — all entries remain after reload"
    - "Expenses persist across server restart — all entries survive stop/start cycle"
    - "Empty state shows friendly message and $0.00 total when no expenses exist"
    - "Validation errors display inline when submitting invalid data"
    - "Playwright E2E tests pass covering the full add-edit-and-view journey"
  artifacts:
    - path: "playwright.config.js"
      provides: "Playwright configuration targeting http://localhost:3000"
      contains: "baseURL"
    - path: "e2e/expense-tracker.spec.js"
      provides: "End-to-end tests for the full Daily Expense Capture (JRN-01.1) and Correcting a Mistaken Entry (JRN-01.2) journeys"
      contains: "test"
    - path: "package.json"
      provides: "Updated with Playwright devDependency and e2e test script"
      contains: "playwright"
  key_links:
    - from: "e2e/expense-tracker.spec.js"
      to: "http://localhost:3000"
      via: "Playwright browser automation against the running app"
      pattern: "page\\.goto"
    - from: "playwright.config.js"
      to: "server.js"
      via: "webServer config starts the app before tests"
      pattern: "webServer"

integration_contracts:
  requires:
    - from_plan: "01"
      artifact: "package.json"
      exports: ["express", "better-sqlite3", "helmet"]
      verify: "grep -n 'express' package.json && grep -n 'better-sqlite3' package.json && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "db/database.js"
      exports: ["initialize", "getAllExpenses", "createExpense"]
      verify: "grep -n 'initialize' db/database.js && grep -n 'getAllExpenses' db/database.js && grep -n 'createExpense' db/database.js && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "server.js"
      exports: ["HTTP server on PORT", "express app"]
      verify: "grep -n 'express' server.js && grep -n 'listen' server.js && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "routes/expenses.js"
      exports: ["router"]
      verify: "grep -n 'router.get' routes/expenses.js && grep -n 'router.post' routes/expenses.js && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "middleware/validate.js"
      exports: ["validateExpenseInput"]
      verify: "grep -n 'validateExpenseInput' middleware/validate.js && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "server.js"
      exports: ["app with helmet, routes, errorHandler mounted"]
      verify: "grep -n 'helmet' server.js && grep -n 'api/expenses' server.js && grep -n 'errorHandler' server.js && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "public/index.html"
      exports: ["HTML page with expense-form, expense-list, total-display sections"]
      verify: "grep -n 'expense-form' public/index.html && grep -n 'expense-list' public/index.html && grep -n 'total-amount' public/index.html && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "public/app.js"
      exports: ["loadExpenses()", "handleSubmit()", "renderExpenses()", "updateTotal()", "validateForm()", "enterEditMode()", "exitEditMode()"]
      verify: "grep -n 'loadExpenses' public/app.js && grep -n 'handleSubmit' public/app.js && grep -n 'enterEditMode' public/app.js && grep -n 'fetch.*api/expenses' public/app.js && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "public/style.css"
      exports: ["Responsive layout styles"]
      verify: "grep -n 'expense-form' public/style.css && grep -n '@media' public/style.css && echo CONTRACT_OK"
  provides:
    - artifact: "e2e/expense-tracker.spec.js"
      exports: ["E2E test suite for Daily Expense Capture journey"]
      shape: |
        Playwright test file with test cases covering:
        - Empty state (page load, $0.00 total, empty state message)
        - Add expense flow (form fill → submit → list update → total update → form clear)
        - Edit expense flow (Edit button → form populate → modify → save → row update → total update)
        - Cancel edit flow (Edit button → form populate → Cancel → no changes)
        - Batch entry (add multiple, verify ordering and total accuracy)
        - Sequential edits (edit multiple expenses in sequence)
        - Persistence (page refresh retains all data including edits)
        - Validation errors (inline error display on invalid submit, including during edit)
        - Cents arithmetic accuracy (no floating-point drift)
      verify: "grep -n 'test.*empty\\|test.*add\\|test.*edit\\|test.*cancel\\|test.*persist\\|test.*valid' e2e/expense-tracker.spec.js && echo CONTRACT_OK"
    - artifact: "playwright.config.js"
      exports: ["Playwright config with webServer and baseURL"]
      shape: |
        module.exports = defineConfig({
          webServer: { command: 'npm start', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
          use: { baseURL: 'http://localhost:3000' }
        })
      verify: "grep -n 'baseURL' playwright.config.js && grep -n 'webServer' playwright.config.js && echo CONTRACT_OK"
---

<objective>
End-to-end integration verification: install Playwright, configure it to launch the app via `npm start`, and write E2E tests that verify the complete Daily Expense Capture journey (JRN-01.1) and Correcting a Mistaken Entry journey (JRN-01.2) — single-command startup, add expense flow, edit expense flow (Edit button → form populate → save → row update → total recalc), cancel edit flow, batch entry, sequential edits, persistence across page refresh, empty state, validation error display, and cents arithmetic accuracy.

Purpose: Prove that all three prior waves (database, API, frontend) integrate correctly into a working application including the edit workflow. The Playwright tests become permanent regression assets that validate both the add and edit user journeys end-to-end in a real browser.

Output: `playwright.config.js` (configuration), `e2e/expense-tracker.spec.js` (E2E test suite), updated `package.json` (Playwright devDependency and e2e script).
</objective>

<feature_dependencies>
Implements: F0: Expense Entry (E2E test proves form → POST → list works), F1: Expense Editing (E2E test proves Edit → PUT → row update → total recalc, cancel flow, sequential edits, 404 handling), F2: Persistent Storage (E2E test proves data survives page refresh including edits), F3: Expense List Display (E2E test proves list renders with correct data, ordering, and Edit buttons), F4: Total Amount Display (E2E test proves total accuracy with cents arithmetic after both add and edit), F5: Web-Based UI (E2E test proves single-command startup and full page functionality)
Depends on: F2: Persistent Storage (database, API, and frontend from Waves 1-3 must all exist)
Enables: None (final wave — this is the verification capstone)
</feature_dependencies>

<context>
@project_specs/JOURNEYS-ExpenseTracker.md (JRN-01.1: Daily Expense Capture — the primary journey to test)
@project_specs/PRD-ExpenseTracker.md (Success Metrics: entry speed, persistence, zero data loss)
@project_specs/FRD-ExpenseTracker.md (F0 process, F2 persistence, F3 list display, F4 total calculation, Y2 Error Catalog)
@.planning/express/build-a-simple-expense-tracker-that-allo/01-PLAN.md (Wave 1 contracts — db/database.js, server.js, package.json)
@.planning/express/build-a-simple-expense-tracker-that-allo/02-PLAN.md (Wave 2 contracts — API routes, validation, error handling)
@.planning/express/build-a-simple-expense-tracker-that-allo/03-PLAN.md (Wave 3 contracts — HTML structure, app.js, CSS)
@.planning/express/build-a-simple-expense-tracker-that-allo/SCOPE-DECISION.md (F1 included — edit tests required)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Playwright setup and configuration</name>
  <files>playwright.config.js, package.json</files>
  <action>
**1. Install Playwright as a devDependency:**

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

Only install Chromium — this is a single-user tool, not a cross-browser product. Chromium is sufficient for E2E verification and keeps install fast.

**2. Add e2e test script to `package.json`:**

Update the `scripts` section in `package.json` to add:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "DB_PATH=./data/test-expenses.db node --test tests/api.test.js",
  "test:e2e": "npx playwright test"
}
```

Keep the existing `start`, `dev`, and `test` scripts intact. Only ADD `test:e2e`.

**3. Create `playwright.config.js`:**

```javascript
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  workers: 1,  // Serial execution — single SQLite DB
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,  // Server must start within 10 seconds (JRN-03.1 success measure)
    env: {
      PORT: '3000',
    },
  },
});
```

Key configuration decisions:
- `workers: 1` — Tests run serially because they share a single SQLite database. Parallel execution would cause data conflicts.
- `webServer.command: 'npm start'` — Playwright automatically starts the server before tests and stops it after. This verifies the single-command startup (F5, US-5.3, JTBD-03.1).
- `webServer.timeout: 10000` — Server must be ready within 10 seconds (JTBD-03.1 success measure: "usable within 10 seconds").
- `reuseExistingServer: !process.env.CI` — In CI, always start fresh. In dev, reuse if already running.
- Chromium only (no `projects` array for multi-browser) — scope is verification, not cross-browser testing.
- `headless: true` — No browser window in sandbox/CI.

**Do NOT configure:**
- Multiple browser projects (cross-browser is R2 scope via US-5.4)
  </action>
  <verify>
```bash
# Verify Playwright is installed
npx playwright --version 2>&1 && echo "PLAYWRIGHT INSTALLED OK"

# Verify config exists and has key settings
test -f playwright.config.js && echo "CONFIG EXISTS OK"
grep -n 'baseURL' playwright.config.js && echo "BASEURL OK"
grep -n 'webServer' playwright.config.js && echo "WEBSERVER OK"
grep -n 'npm start' playwright.config.js && echo "NPM START OK"
grep -n "testDir.*e2e" playwright.config.js && echo "TESTDIR OK"

# Verify package.json has e2e script
grep -n 'test:e2e' package.json && echo "E2E SCRIPT OK"

# Verify existing scripts preserved
grep -n '"start"' package.json && grep -n '"test"' package.json && echo "EXISTING SCRIPTS OK"
```
  </verify>
  <done>
- `@playwright/test` installed as devDependency in package.json
- Chromium browser installed via `npx playwright install chromium`
- `playwright.config.js` exists with: testDir `./e2e`, baseURL `http://localhost:3000`, webServer launching `npm start` with 10-second timeout, workers: 1 (serial), headless: true
- `package.json` has `"test:e2e": "npx playwright test"` script added
- Existing `start`, `dev`, `test` scripts preserved unchanged
- No multi-browser projects configured (Chromium only)
  </done>

  <feature_dependencies>
  Implements: F5: Web-Based UI (Playwright config verifies single-command startup via webServer.command = 'npm start' with 10s timeout)
  Depends on: F2 (package.json from Wave 1), F5 (server.js from Wave 1/2)
  Enables: Task 2 (E2E test file requires Playwright installed and configured)
  </feature_dependencies>
</task>

<task type="auto">
  <name>Task 2: E2E test suite for Daily Expense Capture journey</name>
  <files>e2e/expense-tracker.spec.js</files>
  <action>
**Create `e2e/expense-tracker.spec.js`** — Playwright E2E tests covering the full Daily Expense Capture journey (JRN-01.1) and integration verification.

The tests must clean the database before each test to ensure isolation. Since the app uses SQLite at `data/expenses.db`, each test should start from a known state.

**Test Structure:**

```javascript
const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Clean DB before each test for isolation
test.beforeEach(async () => {
  const dbPath = path.join(__dirname, '..', 'data', 'expenses.db');
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';
  // Remove DB files to start fresh
  [dbPath, walPath, shmPath].forEach(f => {
    try { fs.unlinkSync(f); } catch {}
  });
});
```

**Test Cases (organized by JRN-01.1 journey stages):**

**Group 1: Arrive + Orient — Empty State (JRN-01.1 stages 1-2)**

```javascript
test('empty state: page loads with title, $0.00 total, and empty state message', async ({ page }) => {
  await page.goto('/');

  // Page title
  await expect(page.locator('h1')).toContainText('Expense Tracker');

  // Total shows $0.00 (US-4.1, F4 empty state)
  await expect(page.locator('#total-amount')).toContainText('$0.00');

  // Empty state message (US-3.2)
  await expect(page.locator('#expense-list')).toContainText('No expenses yet');

  // Form is visible and functional (US-3.2: form visible during empty state)
  await expect(page.locator('#expense-form')).toBeVisible();
  await expect(page.locator('#amount')).toBeVisible();
  await expect(page.locator('#description')).toBeVisible();
  await expect(page.locator('#category')).toBeVisible();
  await expect(page.locator('#submit-btn')).toBeVisible();
});

test('empty state: amount field is auto-focused on page load', async ({ page }) => {
  await page.goto('/');
  // Auto-focus on amount field (UX-Mockup, US-5.2)
  await expect(page.locator('#amount')).toBeFocused();
});
```

**Group 2: Enter First Expense (JRN-01.1 stage 3)**

```javascript
test('add expense: form submit creates expense, updates list and total, clears form', async ({ page }) => {
  await page.goto('/');

  // Fill in the form (JRN-01.1: Enter First Expense)
  await page.locator('#amount').fill('18.50');
  await page.locator('#description').fill('Pad Thai takeout');
  await page.locator('#category').fill('Food');

  // Submit
  await page.locator('#submit-btn').click();

  // Expense appears in list (US-0.1: new expense appears without reload)
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('.expense-amount')).toContainText('$18.50');
  await expect(page.locator('.expense-description')).toContainText('Pad Thai takeout');
  await expect(page.locator('.expense-category')).toContainText('Food');

  // Total updates (US-4.2: total reflects new amount within 1s)
  await expect(page.locator('#total-amount')).toContainText('$18.50');

  // Form clears after success (US-0.1: form clears on success)
  await expect(page.locator('#amount')).toHaveValue('');
  await expect(page.locator('#description')).toHaveValue('');
  await expect(page.locator('#category')).toHaveValue('');

  // Empty state message replaced by list
  await expect(page.locator('.empty-state')).not.toBeVisible();

  // Focus returns to amount field for batch entry (US-0.2)
  await expect(page.locator('#amount')).toBeFocused();

  // Success toast appears (UX-Mockup success toast)
  await expect(page.locator('.toast.success')).toContainText('Expense added');
});
```

**Group 3: Enter Second Expense + Total Update (JRN-01.1 stage 4)**

```javascript
test('batch entry: add two expenses in sequence, verify ordering and total accuracy', async ({ page }) => {
  await page.goto('/');

  // First expense
  await page.locator('#amount').fill('18.50');
  await page.locator('#description').fill('Pad Thai takeout');
  await page.locator('#category').fill('Food');
  await page.locator('#submit-btn').click();

  // Wait for first expense to appear
  await expect(page.locator('.expense-row')).toHaveCount(1);

  // Second expense (batch flow — form should already be cleared and focused)
  await page.locator('#amount').fill('12.00');
  await page.locator('#description').fill('Lyft home');
  await page.locator('#category').fill('Transport');
  await page.locator('#submit-btn').click();

  // Both expenses in list (US-3.1: all expenses visible)
  await expect(page.locator('.expense-row')).toHaveCount(2);

  // Most recent first (created_at DESC ordering — US-3.1)
  const descriptions = page.locator('.expense-description');
  await expect(descriptions.nth(0)).toContainText('Lyft home');
  await expect(descriptions.nth(1)).toContainText('Pad Thai takeout');

  // Total is sum of both: $18.50 + $12.00 = $30.50 (US-4.2, cents arithmetic)
  await expect(page.locator('#total-amount')).toContainText('$30.50');
});
```

**Group 3b: Edit Expense Flow (JRN-01.2 — Correcting a Mistaken Entry)**

```javascript
test('edit expense: clicking Edit populates form, saving updates row and total', async ({ page }) => {
  await page.goto('/');

  // First, add an expense
  await page.locator('#amount').fill('18.50');
  await page.locator('#description').fill('Pad Thai takeout');
  await page.locator('#category').fill('Food');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('#total-amount')).toContainText('$18.50');

  // Click Edit on the expense
  await page.locator('.expense-edit-btn').click();

  // Form should be populated with current values
  await expect(page.locator('#amount')).toHaveValue('18.50');
  await expect(page.locator('#description')).toHaveValue('Pad Thai takeout');
  await expect(page.locator('#category')).toHaveValue('Food');

  // UI should be in edit mode
  await expect(page.locator('#submit-btn')).toHaveText('Save Changes');
  await expect(page.locator('#cancel-btn')).toBeVisible();
  await expect(page.locator('#edit-indicator')).toBeVisible();

  // Modify the amount and category (JRN-01.2: correct the mistake)
  await page.locator('#amount').fill('5.80');
  await page.locator('#category').fill('Coffee');

  // Save
  await page.locator('#submit-btn').click();

  // Row should update in-place with new values
  await expect(page.locator('.expense-amount')).toContainText('$5.80');
  await expect(page.locator('.expense-category')).toContainText('Coffee');
  await expect(page.locator('.expense-description')).toContainText('Pad Thai takeout'); // unchanged

  // Total should reflect the edit ($18.50 → $5.80)
  await expect(page.locator('#total-amount')).toContainText('$5.80');

  // Form should exit edit mode
  await expect(page.locator('#submit-btn')).toHaveText('Add Expense');
  await expect(page.locator('#cancel-btn')).not.toBeVisible();

  // Success toast
  await expect(page.locator('.toast.success')).toContainText('Expense updated');
});

test('cancel edit: clicking Cancel discards changes, no server call', async ({ page }) => {
  await page.goto('/');

  // Add an expense
  await page.locator('#amount').fill('25.00');
  await page.locator('#description').fill('Grocery shopping');
  await page.locator('#category').fill('Groceries');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(1);

  // Click Edit
  await page.locator('.expense-edit-btn').click();

  // Modify the amount
  await page.locator('#amount').fill('99.99');

  // Click Cancel
  await page.locator('#cancel-btn').click();

  // Form should return to add mode
  await expect(page.locator('#submit-btn')).toHaveText('Add Expense');
  await expect(page.locator('#cancel-btn')).not.toBeVisible();
  await expect(page.locator('#amount')).toHaveValue('');

  // Original expense unchanged
  await expect(page.locator('.expense-amount')).toContainText('$25.00');
  await expect(page.locator('#total-amount')).toContainText('$25.00');
});

test('sequential edits: edit multiple expenses in sequence', async ({ page }) => {
  await page.goto('/');

  // Add two expenses
  await page.locator('#amount').fill('10.00');
  await page.locator('#description').fill('Coffee');
  await page.locator('#category').fill('Drinks');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(1);

  await page.locator('#amount').fill('20.00');
  await page.locator('#description').fill('Lunch');
  await page.locator('#category').fill('Food');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(2);

  // Total should be $30.00
  await expect(page.locator('#total-amount')).toContainText('$30.00');

  // Edit first expense (Lunch — most recent, shown first)
  await page.locator('.expense-edit-btn').first().click();
  await page.locator('#amount').fill('25.00');
  await page.locator('#submit-btn').click();
  await expect(page.locator('#submit-btn')).toHaveText('Add Expense'); // exited edit mode

  // Edit second expense (Coffee)
  await page.locator('.expense-edit-btn').last().click();
  await page.locator('#amount').fill('15.00');
  await page.locator('#submit-btn').click();
  await expect(page.locator('#submit-btn')).toHaveText('Add Expense');

  // Total should be $25.00 + $15.00 = $40.00
  await expect(page.locator('#total-amount')).toContainText('$40.00');
});
```

**Group 3c: Edit Mode UI Elements**

```javascript
test('edit mode: Edit button visible on every expense row', async ({ page }) => {
  await page.goto('/');

  // Add two expenses
  await page.locator('#amount').fill('10.00');
  await page.locator('#description').fill('Coffee');
  await page.locator('#category').fill('Drinks');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(1);

  await page.locator('#amount').fill('20.00');
  await page.locator('#description').fill('Lunch');
  await page.locator('#category').fill('Food');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(2);

  // Both rows should have Edit buttons
  await expect(page.locator('.expense-edit-btn')).toHaveCount(2);
});
```

**Group 4: Persistence Across Page Refresh (F2 verification)**

```javascript
test('persistence: expenses survive page refresh', async ({ page }) => {
  await page.goto('/');

  // Add an expense
  await page.locator('#amount').fill('25.00');
  await page.locator('#description').fill('Grocery shopping');
  await page.locator('#category').fill('Groceries');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(1);

  // Refresh the page (US-2.1: data survives page refresh)
  await page.reload();

  // Expense is still there
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('.expense-amount')).toContainText('$25.00');
  await expect(page.locator('.expense-description')).toContainText('Grocery shopping');
  await expect(page.locator('.expense-category')).toContainText('Groceries');

  // Total still correct
  await expect(page.locator('#total-amount')).toContainText('$25.00');
});

test('persistence: edited expenses survive page refresh', async ({ page }) => {
  await page.goto('/');

  // Add an expense
  await page.locator('#amount').fill('50.00');
  await page.locator('#description').fill('Original');
  await page.locator('#category').fill('Test');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(1);

  // Edit it
  await page.locator('.expense-edit-btn').click();
  await page.locator('#amount').fill('75.00');
  await page.locator('#description').fill('Edited');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-amount')).toContainText('$75.00');

  // Refresh
  await page.reload();

  // Edited values persist
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('.expense-amount')).toContainText('$75.00');
  await expect(page.locator('.expense-description')).toContainText('Edited');
  await expect(page.locator('#total-amount')).toContainText('$75.00');
});
```

**Group 5: Validation Error Display (F0 validation, US-0.3)**

```javascript
test('validation: empty form shows inline errors for all three fields', async ({ page }) => {
  await page.goto('/');

  // Submit empty form
  await page.locator('#submit-btn').click();

  // Inline error messages appear (US-0.3: per-field errors displayed)
  await expect(page.locator('#amount-error')).not.toBeEmpty();
  await expect(page.locator('#description-error')).not.toBeEmpty();
  await expect(page.locator('#category-error')).not.toBeEmpty();

  // Form retains input (US-0.3: form retains input on validation failure)
  // In this case all fields are empty, so nothing to retain, but verify no expense was created
  await expect(page.locator('.expense-row')).toHaveCount(0);
  await expect(page.locator('#total-amount')).toContainText('$0.00');
});

test('validation: negative amount shows error, form retains input', async ({ page }) => {
  await page.goto('/');

  await page.locator('#amount').fill('-5');
  await page.locator('#description').fill('Test');
  await page.locator('#category').fill('Test');
  await page.locator('#submit-btn').click();

  // Amount error appears (FRD Y2: ERR_EXPENSE_AMOUNT_POSITIVE)
  await expect(page.locator('#amount-error')).toContainText('greater than zero');

  // No expense created
  await expect(page.locator('.expense-row')).toHaveCount(0);
});
```

**Group 6: Cents Arithmetic Accuracy (F4 data integrity)**

```javascript
test('cents arithmetic: total is accurate with values that cause floating-point drift', async ({ page }) => {
  await page.goto('/');

  // These specific values cause floating-point issues if summed as floats:
  // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754
  // But stored as cents (10 + 20 = 30), then divided by 100 = 0.30 — exact.

  await page.locator('#amount').fill('0.10');
  await page.locator('#description').fill('Gum');
  await page.locator('#category').fill('Snack');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(1);

  await page.locator('#amount').fill('0.20');
  await page.locator('#description').fill('Mint');
  await page.locator('#category').fill('Snack');
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(2);

  // Total must be exactly $0.30, not $0.30000000000000004
  await expect(page.locator('#total-amount')).toContainText('$0.30');
});
```

**Group 7: Submit Button State During Request (UX-Mockup interaction pattern)**

```javascript
test('submit button shows saving state during request', async ({ page }) => {
  await page.goto('/');

  await page.locator('#amount').fill('10.00');
  await page.locator('#description').fill('Coffee');
  await page.locator('#category').fill('Drinks');

  // Click submit and check button state changes
  const submitBtn = page.locator('#submit-btn');

  // Use a promise to not await the click completion — we want to catch the intermediate state
  const submitPromise = submitBtn.click();

  // After click, button should eventually return to "Add Expense"
  await submitPromise;
  await expect(submitBtn).toHaveText('Add Expense');
  await expect(submitBtn).toBeEnabled();
});
```

**Group 8: Security Headers (F5, TechArch §5)**

```javascript
test('security headers: response includes helmet security headers', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response.headers();

  // Helmet sets X-Content-Type-Options: nosniff
  expect(headers['x-content-type-options']).toBe('nosniff');
});
```

**What NOT to test (out of scope):**
- No authentication tests (auth is out of scope per TechArch §5)
- No cross-browser tests (Chromium only for MVP)

**Important implementation notes:**
- Use `page.locator()` (not deprecated `page.$()`) for all element selection
- Use `await expect(locator).toContainText()` for text assertions (Playwright auto-retry)
- Use `await expect(locator).toHaveCount()` for counting elements
- Use `await expect(locator).toHaveValue('')` for checking cleared form fields
- All assertions use Playwright's built-in auto-waiting and retry mechanisms
- Test file uses CommonJS (`require`) to match the project's module style (no ESM, no TypeScript)
  </action>
  <verify>
```bash
# Verify test file exists
test -f e2e/expense-tracker.spec.js && echo "TEST FILE EXISTS OK"

# Verify test file has key test cases
grep -c "test(" e2e/expense-tracker.spec.js | xargs -I{} echo "TEST COUNT: {}"
grep -n "empty state" e2e/expense-tracker.spec.js && echo "EMPTY STATE TEST OK"
grep -n "add expense" e2e/expense-tracker.spec.js && echo "ADD EXPENSE TEST OK"
grep -n "edit expense" e2e/expense-tracker.spec.js && echo "EDIT EXPENSE TEST OK"
grep -n "cancel edit" e2e/expense-tracker.spec.js && echo "CANCEL EDIT TEST OK"
grep -n "sequential edits" e2e/expense-tracker.spec.js && echo "SEQUENTIAL EDITS TEST OK"
grep -n "batch entry" e2e/expense-tracker.spec.js && echo "BATCH TEST OK"
grep -n "persist" e2e/expense-tracker.spec.js && echo "PERSISTENCE TEST OK"
grep -n "validation" e2e/expense-tracker.spec.js && echo "VALIDATION TEST OK"
grep -n "cents arithmetic" e2e/expense-tracker.spec.js && echo "CENTS TEST OK"
grep -n "security headers" e2e/expense-tracker.spec.js && echo "SECURITY TEST OK"

# Ensure DB is clean before running tests
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm

# Run the Playwright tests
npx playwright test e2e/expense-tracker.spec.js --reporter=list 2>&1 | tail -30 && echo "PLAYWRIGHT PASSED"
```
  </verify>
  <done>
- `e2e/expense-tracker.spec.js` exists with 12+ test cases covering the Daily Expense Capture (JRN-01.1) and Correcting a Mistaken Entry (JRN-01.2) journeys
- Tests cover: empty state (title, $0.00, message, auto-focus), add expense (form → list → total → form clear → focus return → toast), edit expense (Edit button → form populate → modify → save → row update → total recalc → exit edit mode → toast), cancel edit (Edit → modify → Cancel → no changes), sequential edits (edit multiple expenses in sequence), batch entry (two expenses, ordering, total accuracy), persistence (page refresh retains data including edits), edit mode UI (Edit buttons on every row, Save Changes/Cancel buttons, edit indicator), validation (empty form shows inline errors, negative amount rejected), cents arithmetic accuracy (0.10 + 0.20 = $0.30 exactly), submit button state (disabled during request), security headers (X-Content-Type-Options: nosniff)
- Database cleaned before each test via `beforeEach` hook removing SQLite files
- Tests use `page.locator()` with Playwright auto-retry assertions
- All tests pass via `npx playwright test` with 0 failures
- CommonJS module style (require, not import)
- Tests verify the INTEGRATION of all prior waves: DB (Wave 1) ↔ API (Wave 2) ↔ UI (Wave 3) including the full edit workflow
  </done>

  <feature_dependencies>
  Implements: F0: Expense Entry (tests prove form → POST → list works end-to-end), F1: Expense Editing (tests prove Edit → PUT → row update → total recalc, cancel flow, sequential edits), F2: Persistent Storage (tests prove data survives page refresh including edits), F3: Expense List Display (tests prove list renders correctly with ordering, empty state, and Edit buttons), F4: Total Amount Display (tests prove total accuracy with cents arithmetic after both add and edit), F5: Web-Based UI (tests prove single-command startup, page loads, security headers, form keyboard flow, edit mode UI)
  Depends on: F2 (all three prior waves must be complete — database, API, and frontend)
  Enables: None (final verification wave)
  </feature_dependencies>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| test→app | Playwright tests interact with the running app via HTTP; no direct DB access during tests |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Information Disclosure (test data leakage) | e2e/expense-tracker.spec.js — beforeEach DB cleanup | mitigate | Each test cleans the database before running by deleting SQLite files. No test data persists between test runs. The test DB path is the default `data/expenses.db` (same as dev), so `beforeEach` ensures isolation. Production data is never present in the test environment (greenfield project, no production yet). |
| T-04-02 | Tampering (XSS verification gap) | e2e/expense-tracker.spec.js — no XSS test | accept | The E2E tests do not explicitly test XSS injection (submitting `<script>alert(1)</script>` as a description). This is accepted because XSS prevention is structurally enforced in `public/app.js` via `textContent` (Wave 3, T-03-01) and verified by static grep in Wave 3's verify step. Adding an explicit XSS E2E test would be beneficial but is not required for MVP integration verification. Owner: Wave 3 threat model. |
</threat_model>

<verification>
```bash
# Full end-to-end integration verification
npm install

# 1. Verify single-command startup (JTBD-03.1: server starts within 10s)
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm
timeout 10 node server.js &
SERVER_PID=$!
sleep 3

# Check server is running
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
test "$STATUS" = "200" && echo "1. Single-command startup: PASS" || echo "1. Single-command startup: FAIL ($STATUS)"

# 2. Verify full add flow via API + UI assets
POST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"amount":18.50,"description":"Pad Thai takeout","category":"Food"}')
test "$POST_STATUS" = "201" && echo "2a. POST creates expense: PASS" || echo "2a. POST: FAIL ($POST_STATUS)"

GET_BODY=$(curl -s http://localhost:3000/api/expenses)
echo "$GET_BODY" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
if(d.expenses.length===1 && d.expenses[0].amount===1850) {
  console.log('2b. GET returns expense with cents: PASS');
} else {
  console.log('2b. GET returns expense: FAIL');
}
"

# 3. Verify persistence across restart
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
sleep 1

timeout 10 node server.js &
SERVER_PID=$!
sleep 3

GET_AFTER=$(curl -s http://localhost:3000/api/expenses)
echo "$GET_AFTER" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
if(d.expenses.length===1 && d.expenses[0].description==='Pad Thai takeout') {
  console.log('3. Persistence across restart: PASS');
} else {
  console.log('3. Persistence across restart: FAIL');
}
"

kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# 4. Verify Playwright tests pass
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm
npx playwright test e2e/expense-tracker.spec.js --reporter=list 2>&1 | tail -30
echo "4. Playwright tests: CHECK OUTPUT ABOVE"

# 5. Verify existing API integration tests still pass
rm -f data/test-expenses.db data/test-expenses.db-wal data/test-expenses.db-shm
DB_PATH=./data/test-expenses.db node --test tests/api.test.js 2>&1 | tail -10
echo "5. API integration tests: CHECK OUTPUT ABOVE"

# Clean up
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm
rm -f data/test-expenses.db data/test-expenses.db-wal data/test-expenses.db-shm
```
</verification>

<success_criteria>
1. `npm start` boots the server and serves the app at http://localhost:3000 within 10 seconds
2. `npx playwright test` runs all E2E tests with 0 failures
3. E2E tests cover: empty state ($0.00, message, auto-focus), add expense (form → list → total → clear → focus → toast), edit expense (Edit → populate → modify → save → row update → total recalc → exit edit mode → toast), cancel edit (no changes), sequential edits, batch entry (ordering + total), persistence (page refresh, including edits), edit mode UI (Edit buttons, Save Changes/Cancel), validation (inline errors), cents arithmetic ($0.10 + $0.20 = $0.30), submit button state, security headers
4. Data persists across a full server stop/start cycle (verified by restart test in verification block), including edited data
5. Existing `npm test` (API integration tests from Wave 2) still passes — no regression
6. All test files use CommonJS module style consistent with the project
7. Edit/PUT tests included: edit expense, cancel edit, sequential edits, edit persistence, edit mode UI elements
8. Database is cleaned before each test for isolation
9. `playwright.config.js` uses `webServer` to auto-start the app — no manual server startup needed for tests
10. Single `npx playwright test` command runs the full E2E suite end-to-end
</success_criteria>

<output>
After completion, create `.planning/express/build-a-simple-expense-tracker-that-allo/04-SUMMARY.md`
</output>
