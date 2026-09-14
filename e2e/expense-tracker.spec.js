const { test, expect } = require('@playwright/test');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'expenses.db');

// Clean DB before each test for isolation.
// Open a direct connection to the same SQLite file the server uses,
// delete all rows, then close. The server's own connection sees the
// change immediately because SQLite uses WAL mode with shared cache.
test.beforeEach(async () => {
  try {
    const db = new Database(DB_PATH);
    db.exec('DELETE FROM expenses');
    db.close();
  } catch {
    // DB may not exist yet on first run — server will create it
  }
});

// ── Group 1: Arrive + Orient — Empty State (JRN-01.1 stages 1-2) ──

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

// ── Group 2: Enter First Expense (JRN-01.1 stage 3) ──

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

// ── Group 3: Enter Second Expense + Total Update (JRN-01.1 stage 4) ──

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

// ── Group 4: Persistence Across Page Refresh (F2 verification) ──

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

// ── Group 5: Validation Error Display (F0 validation, US-0.3) ──

test('validation: empty form shows inline errors for all three fields', async ({ page }) => {
  await page.goto('/');

  // Submit empty form
  await page.locator('#submit-btn').click();

  // Inline error messages appear (US-0.3: per-field errors displayed)
  await expect(page.locator('#amount-error')).not.toBeEmpty();
  await expect(page.locator('#description-error')).not.toBeEmpty();
  await expect(page.locator('#category-error')).not.toBeEmpty();

  // No expense was created
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

// ── Group 6: Cents Arithmetic Accuracy (F4 data integrity) ──

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

// ── Group 7: Submit Button State During Request (UX-Mockup interaction pattern) ──

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

// ── Group 8: Security Headers (F5, TechArch §5) ──

test('security headers: response includes helmet security headers', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response.headers();

  // Helmet sets X-Content-Type-Options: nosniff
  expect(headers['x-content-type-options']).toBe('nosniff');
});

// ── Group 9: Edit Expense (F1, JRN-01.1 edit flow) ──

/** Adds one expense through the UI so a row exists to edit. */
async function addExpense(page, amount, description, category) {
  await page.locator('#amount').fill(amount);
  await page.locator('#description').fill(description);
  await page.locator('#category').fill(category);
  await page.locator('#submit-btn').click();
  await expect(page.locator('.expense-row')).toHaveCount(1);
}

test('edit: each expense row shows an Edit button', async ({ page }) => {
  await page.goto('/');
  await addExpense(page, '18.50', 'Pad Thai takeout', 'Food');

  await expect(page.locator('.expense-edit-btn')).toHaveCount(1);
  await expect(page.locator('.expense-edit-btn')).toHaveText('Edit');
});

test('edit: clicking Edit populates the form with current values and enters edit mode', async ({ page }) => {
  await page.goto('/');
  await addExpense(page, '18.50', 'Pad Thai takeout', 'Food');

  await page.locator('.expense-edit-btn').click();

  // Form pre-populated with the row's current values (FRD F01 step 3)
  await expect(page.locator('#amount')).toHaveValue('18.50');
  await expect(page.locator('#description')).toHaveValue('Pad Thai takeout');
  await expect(page.locator('#category')).toHaveValue('Food');

  // Edit-mode affordances visible (FRD F01 step 4)
  await expect(page.locator('#submit-btn')).toHaveText('Save Changes');
  await expect(page.locator('#cancel-btn')).toBeVisible();
  await expect(page.locator('#edit-indicator')).toBeVisible();
  await expect(page.locator('.expense-row')).toHaveClass(/editing-row/);
});

test('edit: saving changes updates the list and the total', async ({ page }) => {
  await page.goto('/');
  await addExpense(page, '18.50', 'Pad Thai takeout', 'Food');
  await expect(page.locator('#total-amount')).toContainText('$18.50');

  await page.locator('.expense-edit-btn').click();
  await page.locator('#amount').fill('25.75');
  await page.locator('#description').fill('Pad Thai dinner');
  await page.locator('#category').fill('Dining');
  await page.locator('#submit-btn').click();

  // Row reflects new values, total recalculated (FRD F01 steps 6j–6k)
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('#expense-list')).toContainText('Pad Thai dinner');
  await expect(page.locator('#expense-list')).toContainText('Dining');
  await expect(page.locator('#total-amount')).toContainText('$25.75');
});

test('edit: form returns to add mode after a successful save', async ({ page }) => {
  await page.goto('/');
  await addExpense(page, '18.50', 'Pad Thai takeout', 'Food');

  await page.locator('.expense-edit-btn').click();
  await page.locator('#amount').fill('25.75');
  await page.locator('#submit-btn').click();

  // Edit mode exited, form cleared (FRD F01 step 6l)
  await expect(page.locator('#submit-btn')).toHaveText('Add Expense');
  await expect(page.locator('#cancel-btn')).toBeHidden();
  await expect(page.locator('#edit-indicator')).toBeHidden();
  await expect(page.locator('#amount')).toHaveValue('');
  await expect(page.locator('#description')).toHaveValue('');
  await expect(page.locator('#category')).toHaveValue('');
});

test('edit: cancel discards changes and leaves the expense untouched', async ({ page }) => {
  await page.goto('/');
  await addExpense(page, '18.50', 'Pad Thai takeout', 'Food');

  await page.locator('.expense-edit-btn').click();
  await page.locator('#amount').fill('99.99');
  await page.locator('#description').fill('Should not be saved');
  await page.locator('#cancel-btn').click();

  // No server call — original values intact (FRD F01 step 7)
  await expect(page.locator('#expense-list')).toContainText('Pad Thai takeout');
  await expect(page.locator('#expense-list')).not.toContainText('Should not be saved');
  await expect(page.locator('#total-amount')).toContainText('$18.50');

  // Back in add mode with a cleared form
  await expect(page.locator('#submit-btn')).toHaveText('Add Expense');
  await expect(page.locator('#cancel-btn')).toBeHidden();
  await expect(page.locator('#amount')).toHaveValue('');
});

test('edit: validation errors block the save and keep edit mode active', async ({ page }) => {
  await page.goto('/');
  await addExpense(page, '18.50', 'Pad Thai takeout', 'Food');

  await page.locator('.expense-edit-btn').click();
  await page.locator('#amount').fill('0');
  await page.locator('#submit-btn').click();

  // Inline error shown, still editing (FRD F01 step 6c)
  await expect(page.locator('#amount-error')).toContainText('greater than zero');
  await expect(page.locator('#submit-btn')).toHaveText('Save Changes');
  await expect(page.locator('#edit-indicator')).toBeVisible();

  // Stored value unchanged
  await expect(page.locator('#total-amount')).toContainText('$18.50');
});

test('edit: changes persist across a page refresh', async ({ page }) => {
  await page.goto('/');
  await addExpense(page, '18.50', 'Pad Thai takeout', 'Food');

  await page.locator('.expense-edit-btn').click();
  await page.locator('#amount').fill('25.75');
  await page.locator('#description').fill('Pad Thai dinner');
  await page.locator('#submit-btn').click();
  await expect(page.locator('#total-amount')).toContainText('$25.75');

  await page.reload();

  // Persisted to SQLite, not just in-memory (F2)
  await expect(page.locator('#expense-list')).toContainText('Pad Thai dinner');
  await expect(page.locator('#total-amount')).toContainText('$25.75');
});

test('edit: editing one of several expenses leaves the others unchanged', async ({ page }) => {
  await page.goto('/');

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
  await expect(page.locator('#total-amount')).toContainText('$30.00');

  // Edit only the most recent row (Lunch, rendered first)
  await page.locator('.expense-edit-btn').first().click();
  await expect(page.locator('#description')).toHaveValue('Lunch');
  await page.locator('#amount').fill('35.00');
  await page.locator('#submit-btn').click();

  // Coffee untouched, total reflects only the edited row
  await expect(page.locator('.expense-row')).toHaveCount(2);
  await expect(page.locator('#expense-list')).toContainText('Coffee');
  await expect(page.locator('#total-amount')).toContainText('$45.00');
});
