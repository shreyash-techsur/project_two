import { test, expect, Page } from '@playwright/test';
import Database from 'better-sqlite3';
import * as path from 'path';

// ---------------------------------------------------------------------------
// UAT — Expense Tracker. Full scope: all 27 user stories (F0–F5).
// Runs serially (playwright.config.js workers: 1) against ONE shared SQLite DB.
// Isolation strategy: unique descriptions/categories per test + delta assertions
// on the total. Tests that genuinely need an empty DB clear it directly with
// better-sqlite3 (same pattern as e2e/expense-tracker.spec.js).
// ---------------------------------------------------------------------------

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'expenses.db');

/** Wipe every expense row straight out of the SQLite file the server uses. */
function clearDatabase(): void {
  try {
    const db = new Database(DB_PATH);
    db.exec('DELETE FROM expenses');
    db.close();
  } catch {
    // DB may not exist yet on a cold first run — the server creates it.
  }
}

/** Read every expense row straight out of the SQLite file (US-2.2, US-2.5). */
function readDatabaseRows(): any[] {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    return db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all();
  } finally {
    db.close();
  }
}

/** Unique token so each test can assert on its OWN rows, never on list length. */
function uniq(label: string): string {
  return `${label}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/** Open the app and wait until the initial load has settled (total is not "..."). */
async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#total-amount')).not.toHaveText('...', { timeout: 10000 });
}

/** Parse "$1,234.56" (or "—") into cents. Returns NaN for a non-numeric total. */
function totalToCents(text: string | null): number {
  if (!text) return NaN;
  const cleaned = text.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return NaN;
  return Math.round(parseFloat(cleaned) * 100);
}

/** Current on-screen total, in cents. */
async function readTotalCents(page: Page): Promise<number> {
  return totalToCents(await page.locator('#total-amount').textContent());
}

/** Fill the form and submit it, waiting for the matching API round-trip. */
async function submitForm(
  page: Page,
  amount: string,
  description: string,
  category: string,
  method: 'POST' | 'PUT' = 'POST'
) {
  await page.locator('#amount').fill(amount);
  await page.locator('#description').fill(description);
  await page.locator('#category').fill(category);

  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/expenses') && resp.request().method() === method
  );
  await page.locator('#submit-btn').click();
  return responsePromise;
}

/** The row (any depth) whose description matches exactly. */
function rowByDescription(page: Page, description: string) {
  return page.locator('.expense-row').filter({
    has: page.locator('.expense-description', { hasText: new RegExp(`^${description}$`) }),
  });
}

/** Seed one expense straight through the API so a test can start mid-journey. */
async function seedExpense(page: Page, amount: number, description: string, category: string) {
  const response = await page.request.post('/api/expenses', {
    data: { amount, description, category },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).expense;
}

// ===========================================================================
// 1. PRIMARY USER FLOW — JRN-01.1: Daily Expense Capture
// Maya opens the tracker, logs a coffee, sees it land in her list and her
// total move — then spots she typed the wrong amount, edits it, and watches
// the corrected figure and the recalculated total appear.
// One test per user-visible step, in the order a human performs them.
// ===========================================================================

test.describe('1. Primary user flow — JRN-01.1: Daily Expense Capture', () => {
  // A clean slate so the journey reads like a real first session.
  test.beforeEach(() => {
    clearDatabase();
  });

  test('Maya opens the expense tracker in her browser', async ({ page }) => {
    await openApp(page);

    await expect(page.locator('h1')).toHaveText('Expense Tracker');
    await expect(page.locator('#expense-form')).toBeVisible();
    await expect(page.locator('#expense-list')).toBeVisible();
    await expect(page.locator('#total-amount')).toBeVisible();
  });

  test('She sees an empty list inviting her to add her first expense', async ({ page }) => {
    await openApp(page);

    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toHaveText('No expenses yet. Add your first expense above!');
    await expect(page.locator('#total-amount')).toHaveText('$0.00');
  });

  test('She sees the entry form with amount, description and category fields', async ({ page }) => {
    await openApp(page);

    await expect(page.getByLabel('Amount ($)')).toBeVisible();
    await expect(page.getByLabel('Description')).toBeVisible();
    await expect(page.getByLabel('Category')).toBeVisible();
    await expect(page.locator('#submit-btn')).toHaveText('Add Expense');

    // Cursor is already waiting in the amount field — she can just start typing.
    await expect(page.locator('#amount')).toBeFocused();
  });

  test('She types the amount, what she bought, and the category', async ({ page }) => {
    await openApp(page);

    await page.getByLabel('Amount ($)').fill('4.75');
    await page.getByLabel('Description').fill('Morning latte');
    await page.getByLabel('Category').fill('Coffee');

    await expect(page.locator('#amount')).toHaveValue('4.75');
    await expect(page.locator('#description')).toHaveValue('Morning latte');
    await expect(page.locator('#category')).toHaveValue('Coffee');
  });

  test('She clicks Add Expense and her latte appears in the list', async ({ page }) => {
    await openApp(page);

    await submitForm(page, '4.75', 'Morning latte', 'Coffee');

    const row = rowByDescription(page, 'Morning latte');
    await expect(row).toHaveCount(1);
    await expect(row.locator('.expense-amount')).toHaveText('$4.75');
    await expect(row.locator('.expense-category')).toHaveText('Coffee');

    // The invitation to add a first expense is gone.
    await expect(page.locator('.empty-state')).toHaveCount(0);
  });

  test('She sees the running total pick up the new expense', async ({ page }) => {
    await openApp(page);
    const before = await readTotalCents(page);

    await submitForm(page, '4.75', 'Morning latte', 'Coffee');

    await expect(page.locator('#total-amount')).toHaveText('$4.75');
    expect(await readTotalCents(page)).toBe(before + 475);
  });

  test('She gets a confirmation and a cleared form ready for the next entry', async ({ page }) => {
    await openApp(page);

    await submitForm(page, '4.75', 'Morning latte', 'Coffee');

    await expect(page.locator('#toast-container .toast.success')).toHaveText('Expense added!');
    await expect(page.locator('#amount')).toHaveValue('');
    await expect(page.locator('#description')).toHaveValue('');
    await expect(page.locator('#category')).toHaveValue('');
    await expect(page.locator('#amount')).toBeFocused();
  });

  test('Spotting a typo, she clicks Edit and the form fills with the current values', async ({ page }) => {
    await seedExpense(page, 4.75, 'Morning latte', 'Coffee');
    await openApp(page);

    await rowByDescription(page, 'Morning latte').locator('.expense-edit-btn').click();

    await expect(page.locator('#amount')).toHaveValue('4.75');
    await expect(page.locator('#description')).toHaveValue('Morning latte');
    await expect(page.locator('#category')).toHaveValue('Coffee');
  });

  test('She can tell she is editing — the button says Save Changes and Cancel appears', async ({ page }) => {
    await seedExpense(page, 4.75, 'Morning latte', 'Coffee');
    await openApp(page);

    await rowByDescription(page, 'Morning latte').locator('.expense-edit-btn').click();

    await expect(page.locator('#submit-btn')).toHaveText('Save Changes');
    await expect(page.locator('#cancel-btn')).toBeVisible();
    await expect(page.locator('#edit-indicator')).toBeVisible();
    await expect(rowByDescription(page, 'Morning latte')).toHaveClass(/editing-row/);
  });

  test('She corrects the amount, saves, and the row shows the corrected value', async ({ page }) => {
    await seedExpense(page, 4.75, 'Morning latte', 'Coffee');
    await openApp(page);

    await rowByDescription(page, 'Morning latte').locator('.expense-edit-btn').click();
    await submitForm(page, '6.25', 'Morning latte and pastry', 'Coffee', 'PUT');

    const row = rowByDescription(page, 'Morning latte and pastry');
    await expect(row).toHaveCount(1);
    await expect(row.locator('.expense-amount')).toHaveText('$6.25');

    // Corrected in place — not duplicated.
    await expect(page.locator('.expense-row')).toHaveCount(1);
    await expect(page.locator('#expense-list')).not.toContainText('$4.75');
  });

  test('She sees the total recalculate to match the correction', async ({ page }) => {
    await seedExpense(page, 4.75, 'Morning latte', 'Coffee');
    await openApp(page);
    await expect(page.locator('#total-amount')).toHaveText('$4.75');

    await rowByDescription(page, 'Morning latte').locator('.expense-edit-btn').click();
    await submitForm(page, '6.25', 'Morning latte and pastry', 'Coffee', 'PUT');

    // Old amount out, new amount in — $4.75 becomes $6.25, not $11.00.
    await expect(page.locator('#total-amount')).toHaveText('$6.25');
  });

  test('After saving she is confirmed and the form is back to adding new expenses', async ({ page }) => {
    await seedExpense(page, 4.75, 'Morning latte', 'Coffee');
    await openApp(page);

    await rowByDescription(page, 'Morning latte').locator('.expense-edit-btn').click();
    await submitForm(page, '6.25', 'Morning latte and pastry', 'Coffee', 'PUT');

    await expect(page.locator('#toast-container .toast.success')).toHaveText('Expense updated!');
    await expect(page.locator('#submit-btn')).toHaveText('Add Expense');
    await expect(page.locator('#cancel-btn')).toBeHidden();
    await expect(page.locator('#edit-indicator')).toBeHidden();
    await expect(page.locator('#amount')).toHaveValue('');
    await expect(page.locator('#amount')).toBeFocused();
  });
});

// ===========================================================================
// 2. SECONDARY FLOWS — one nested describe per remaining user story,
//    one test per acceptance criterion (grouped where a single user action
//    proves several criteria at once).
// ===========================================================================

test.describe('2. Secondary flows', () => {

  // ---------------------------------------------------------------- Epic 0
  test.describe('US-0.1: Add a New Expense', () => {
    test('The form offers amount, description, category and a submit button', async ({ page }) => {
      await openApp(page);
      await expect(page.getByLabel('Amount ($)')).toBeVisible();
      await expect(page.getByLabel('Description')).toBeVisible();
      await expect(page.getByLabel('Category')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible();
    });

    test('The amount field accepts a value with two decimal places', async ({ page }) => {
      await openApp(page);
      const desc = uniq('two-decimals');
      await submitForm(page, '10.50', desc, 'Food');
      await expect(rowByDescription(page, desc).locator('.expense-amount')).toHaveText('$10.50');
    });

    test('Description accepts up to 500 characters and category up to 100', async ({ page }) => {
      await openApp(page);
      const tag = uniq('maxlen');
      const description = tag + 'x'.repeat(500 - tag.length);
      const category = 'c'.repeat(100);

      await submitForm(page, '1.00', description, category);

      const row = rowByDescription(page, description);
      await expect(row).toHaveCount(1);
      await expect(row.locator('.expense-category')).toHaveText(category);
    });

    test('The form cannot be submitted with any field empty', async ({ page }) => {
      clearDatabase();
      await openApp(page);

      // Description + category filled, amount blank.
      await page.locator('#description').fill(uniq('blank-amount'));
      await page.locator('#category').fill('Food');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount is required');
      await expect(page.locator('.expense-row')).toHaveCount(0);

      // Amount + category filled, description blank.
      await page.locator('#amount').fill('5.00');
      await page.locator('#description').fill('');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#description-error')).toHaveText('Description is required');
      await expect(page.locator('.expense-row')).toHaveCount(0);

      // Amount + description filled, category blank.
      await page.locator('#description').fill(uniq('blank-category'));
      await page.locator('#category').fill('');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#category-error')).toHaveText('Category is required');
      await expect(page.locator('.expense-row')).toHaveCount(0);
    });

    test('A success indicator confirms the expense was saved', async ({ page }) => {
      await openApp(page);
      await submitForm(page, '3.00', uniq('toast-check'), 'Food');
      await expect(page.locator('#toast-container .toast.success')).toHaveText('Expense added!');
    });
  });

  test.describe('US-0.2: Batch-Enter Multiple Expenses', () => {
    test('After each submission the form clears and focus returns to amount', async ({ page }) => {
      await openApp(page);
      await submitForm(page, '2.00', uniq('batch-focus'), 'Snacks');
      await expect(page.locator('#amount')).toHaveValue('');
      await expect(page.locator('#description')).toHaveValue('');
      await expect(page.locator('#category')).toHaveValue('');
      await expect(page.locator('#amount')).toBeFocused();
    });

    test('Twenty expenses entered in sequence all appear in the list with an accurate total', async ({ page }) => {
      clearDatabase();
      await openApp(page);

      const batch = uniq('batch20');
      for (let i = 1; i <= 20; i++) {
        await submitForm(page, '1.11', `${batch}-${i}`, 'Receipts');
        await expect(page.locator('.expense-row')).toHaveCount(i);
        // Total is accurate after EVERY submission, not just at the end.
        expect(await readTotalCents(page)).toBe(i * 111);
      }

      await expect(page.locator('.expense-row')).toHaveCount(20);
      await expect(page.locator('#total-amount')).toHaveText('$22.20');
    });

    test('Each expense is persisted server-side before success is shown (no client-only cache)', async ({ page }) => {
      await openApp(page);
      const desc = uniq('server-persisted');

      const response = await submitForm(page, '9.99', desc, 'Receipts');
      expect(response.status()).toBe(201);

      // The row the UI just showed is already on disk.
      const rows = readDatabaseRows().filter((r) => r.description === desc);
      expect(rows).toHaveLength(1);
      expect(rows[0].amount).toBe(999);
    });

    test('Closing the tab mid-session loses nothing already submitted', async ({ browser }) => {
      const contextA = await browser.newContext();
      const pageA = await contextA.newPage();
      await openApp(pageA);

      const desc = uniq('survives-tab-close');
      await submitForm(pageA, '7.50', desc, 'Receipts');
      await expect(rowByDescription(pageA, desc)).toHaveCount(1);

      // Tab closed abruptly, as if the user hit Cmd-W.
      await contextA.close();

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      await openApp(pageB);
      await expect(rowByDescription(pageB, desc)).toHaveCount(1);
      await expect(rowByDescription(pageB, desc).locator('.expense-amount')).toHaveText('$7.50');
      await contextB.close();
    });
  });

  test.describe('US-0.3: Receive Validation Feedback on Expense Entry', () => {
    test('An empty amount shows "Amount is required"', async ({ page }) => {
      await openApp(page);
      await page.locator('#description').fill(uniq('v-empty-amount'));
      await page.locator('#category').fill('Food');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount is required');
    });

    test('A non-numeric amount shows "Amount must be a valid number"', async ({ page }) => {
      await openApp(page);
      // type=number rejects letters at the DOM level, so drive the server rule
      // through the API the way a manipulated client would.
      const response = await page.request.post('/api/expenses', {
        data: { amount: 'abc', description: uniq('v-nan'), category: 'Food' },
      });
      expect(response.status()).toBe(400);
      const codes = (await response.json()).errors.map((e: any) => e.code);
      expect(codes).toContain('ERR_EXPENSE_INVALID_AMOUNT');
    });

    test('A zero or negative amount shows "Amount must be greater than zero"', async ({ page }) => {
      await openApp(page);

      await page.locator('#amount').fill('0');
      await page.locator('#description').fill(uniq('v-zero'));
      await page.locator('#category').fill('Food');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount must be greater than zero');

      await page.locator('#amount').fill('-12.34');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount must be greater than zero');
    });

    test('An amount above 999,999.99 shows "Amount must not exceed 999,999.99"', async ({ page }) => {
      await openApp(page);
      await page.locator('#amount').fill('1000000');
      await page.locator('#description').fill(uniq('v-too-large'));
      await page.locator('#category').fill('Food');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount must not exceed 999,999.99');
    });

    test('An amount with three decimals shows "Amount must have at most two decimal places"', async ({ page }) => {
      await openApp(page);
      await page.locator('#amount').fill('10.123');
      await page.locator('#description').fill(uniq('v-precision'));
      await page.locator('#category').fill('Food');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount must have at most two decimal places');
    });

    test('An empty description shows "Description is required"', async ({ page }) => {
      await openApp(page);
      await page.locator('#amount').fill('5.00');
      await page.locator('#category').fill('Food');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#description-error')).toHaveText('Description is required');
    });

    test('A description over 500 characters shows "Description must not exceed 500 characters"', async ({ page }) => {
      await openApp(page);
      await page.locator('#amount').fill('5.00');
      // maxlength caps typing, so set the value directly the way a paste/script would.
      await page.locator('#description').evaluate((el: HTMLInputElement) => {
        el.value = 'd'.repeat(501);
      });
      await page.locator('#category').fill('Food');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#description-error')).toHaveText('Description must not exceed 500 characters');
    });

    test('An empty category shows "Category is required"', async ({ page }) => {
      await openApp(page);
      await page.locator('#amount').fill('5.00');
      await page.locator('#description').fill(uniq('v-empty-cat'));
      await page.locator('#submit-btn').click();
      await expect(page.locator('#category-error')).toHaveText('Category is required');
    });

    test('A category over 100 characters shows "Category must not exceed 100 characters"', async ({ page }) => {
      await openApp(page);
      await page.locator('#amount').fill('5.00');
      await page.locator('#description').fill(uniq('v-long-cat'));
      await page.locator('#category').evaluate((el: HTMLInputElement) => {
        el.value = 'c'.repeat(101);
      });
      await page.locator('#submit-btn').click();
      await expect(page.locator('#category-error')).toHaveText('Category must not exceed 100 characters');
    });

    test('The form keeps what the user typed when validation fails', async ({ page }) => {
      await openApp(page);
      const desc = uniq('v-retain');

      await page.locator('#amount').fill('-1');
      await page.locator('#description').fill(desc);
      await page.locator('#category').fill('Transport');
      await page.locator('#submit-btn').click();

      await expect(page.locator('#amount-error')).toHaveText('Amount must be greater than zero');
      await expect(page.locator('#amount')).toHaveValue('-1');
      await expect(page.locator('#description')).toHaveValue(desc);
      await expect(page.locator('#category')).toHaveValue('Transport');
    });

    test('Several invalid fields show all their errors at once', async ({ page }) => {
      await openApp(page);
      await page.locator('#submit-btn').click();

      await expect(page.locator('#amount-error')).toHaveText('Amount is required');
      await expect(page.locator('#description-error')).toHaveText('Description is required');
      await expect(page.locator('#category-error')).toHaveText('Category is required');
    });
  });

  test.describe('US-0.4: Server-Side Validation of Expense Data', () => {
    test('The server applies the same rules the client does, even when the client is bypassed', async ({ request }) => {
      // Each of these passes no client validation at all — posted straight to the API.
      const cases = [
        { data: { description: 'x', category: 'y' }, code: 'ERR_EXPENSE_AMOUNT_REQUIRED' },
        { data: { amount: 'abc', description: 'x', category: 'y' }, code: 'ERR_EXPENSE_INVALID_AMOUNT' },
        { data: { amount: -1, description: 'x', category: 'y' }, code: 'ERR_EXPENSE_AMOUNT_POSITIVE' },
        { data: { amount: 1000000, description: 'x', category: 'y' }, code: 'ERR_EXPENSE_AMOUNT_TOO_LARGE' },
        { data: { amount: 1.234, description: 'x', category: 'y' }, code: 'ERR_EXPENSE_AMOUNT_PRECISION' },
        { data: { amount: 1, category: 'y' }, code: 'ERR_EXPENSE_DESC_REQUIRED' },
        { data: { amount: 1, description: 'd'.repeat(501), category: 'y' }, code: 'ERR_EXPENSE_DESC_TOO_LONG' },
        { data: { amount: 1, description: 'x' }, code: 'ERR_EXPENSE_CAT_REQUIRED' },
        { data: { amount: 1, description: 'x', category: 'c'.repeat(101) }, code: 'ERR_EXPENSE_CAT_TOO_LONG' },
      ];

      for (const testCase of cases) {
        const response = await request.post('/api/expenses', { data: testCase.data });
        expect(response.status(), `expected 400 for ${testCase.code}`).toBe(400);
        const codes = (await response.json()).errors.map((e: any) => e.code);
        expect(codes, `expected ${testCase.code} in ${JSON.stringify(codes)}`).toContain(testCase.code);
      }
    });

    test('Invalid requests get a 400 with structured error codes', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: { amount: -5, description: '', category: '' },
      });
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
      for (const err of body.errors) {
        expect(typeof err.code).toBe('string');
        expect(err.code).toMatch(/^ERR_EXPENSE_/);
        expect(typeof err.message).toBe('string');
      }
    });

    test('Multiple bad fields come back together in one errors array', async ({ request }) => {
      const response = await request.post('/api/expenses', { data: {} });
      expect(response.status()).toBe(400);

      const codes = (await response.json()).errors.map((e: any) => e.code);
      expect(codes).toContain('ERR_EXPENSE_AMOUNT_REQUIRED');
      expect(codes).toContain('ERR_EXPENSE_DESC_REQUIRED');
      expect(codes).toContain('ERR_EXPENSE_CAT_REQUIRED');
      expect(codes.length).toBeGreaterThanOrEqual(3);
    });

    test('Error responses never leak stack traces or internal details', async ({ request }) => {
      const responses = [
        await request.post('/api/expenses', { data: { amount: 'nope', description: 'x', category: 'y' } }),
        await request.put('/api/expenses/99999999', { data: { amount: 5, description: 'x', category: 'y' } }),
        await request.put('/api/expenses/not-an-id', { data: { amount: 5, description: 'x', category: 'y' } }),
      ];

      for (const response of responses) {
        const bodyText = JSON.stringify(await response.json());
        expect(bodyText).not.toContain('at Object');
        expect(bodyText).not.toContain('node_modules');
        expect(bodyText).not.toContain('.js:');
        expect(bodyText).not.toMatch(/\/home\/|\/usr\/|C:\\\\/);
        expect(bodyText.toLowerCase()).not.toContain('stack');
      }
    });
  });

  // ---------------------------------------------------------------- Epic 1
  test.describe('US-1.1: Edit an Existing Expense', () => {
    test('Every expense row offers an Edit button', async ({ page }) => {
      clearDatabase();
      await seedExpense(page, 1.0, uniq('edit-btn-a'), 'Food');
      await seedExpense(page, 2.0, uniq('edit-btn-b'), 'Transport');
      await openApp(page);

      await expect(page.locator('.expense-row')).toHaveCount(2);
      await expect(page.locator('.expense-edit-btn')).toHaveCount(2);
      for (const button of await page.locator('.expense-edit-btn').all()) {
        await expect(button).toBeVisible();
        await expect(button).toHaveText('Edit');
        expect(await button.getAttribute('data-id')).toBeTruthy();
      }
    });

    test('Clicking Edit populates the form with that expense\'s current values', async ({ page }) => {
      const desc = uniq('populate');
      await seedExpense(page, 33.44, desc, 'Utilities');
      await openApp(page);

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();

      await expect(page.locator('#amount')).toHaveValue('33.44');
      await expect(page.locator('#description')).toHaveValue(desc);
      await expect(page.locator('#category')).toHaveValue('Utilities');
    });

    test('Edit mode is clearly signalled — Save Changes label, Cancel button, indicator', async ({ page }) => {
      const desc = uniq('edit-mode-ui');
      await seedExpense(page, 5.0, desc, 'Food');
      await openApp(page);

      await expect(page.locator('#cancel-btn')).toBeHidden();
      await expect(page.locator('#edit-indicator')).toBeHidden();

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();

      await expect(page.locator('#submit-btn')).toHaveText('Save Changes');
      await expect(page.locator('#cancel-btn')).toBeVisible();
      await expect(page.locator('#edit-indicator')).toBeVisible();
      await expect(page.locator('#edit-indicator')).toContainText('Editing expense');
      await expect(rowByDescription(page, desc)).toHaveClass(/editing-row/);
    });

    test('Any combination of the three fields can be changed', async ({ page }) => {
      // Amount only.
      const descA = uniq('change-amount-only');
      await seedExpense(page, 10.0, descA, 'Food');
      await openApp(page);
      await rowByDescription(page, descA).locator('.expense-edit-btn').click();
      await page.locator('#amount').fill('11.00');
      const respA = page.waitForResponse((r) => r.request().method() === 'PUT');
      await page.locator('#submit-btn').click();
      await respA;
      await expect(rowByDescription(page, descA).locator('.expense-amount')).toHaveText('$11.00');
      await expect(rowByDescription(page, descA).locator('.expense-category')).toHaveText('Food');

      // Description + category, amount untouched.
      const descB = uniq('change-text-only');
      const descBNew = uniq('change-text-only-new');
      await seedExpense(page, 20.0, descB, 'Food');
      await openApp(page);
      await rowByDescription(page, descB).locator('.expense-edit-btn').click();
      await page.locator('#description').fill(descBNew);
      await page.locator('#category').fill('Dining');
      const respB = page.waitForResponse((r) => r.request().method() === 'PUT');
      await page.locator('#submit-btn').click();
      await respB;
      const rowB = rowByDescription(page, descBNew);
      await expect(rowB).toHaveCount(1);
      await expect(rowB.locator('.expense-category')).toHaveText('Dining');
      await expect(rowB.locator('.expense-amount')).toHaveText('$20.00');

      // All three at once.
      const descC = uniq('change-all');
      const descCNew = uniq('change-all-new');
      await seedExpense(page, 30.0, descC, 'Food');
      await openApp(page);
      await rowByDescription(page, descC).locator('.expense-edit-btn').click();
      await submitForm(page, '31.50', descCNew, 'Groceries', 'PUT');
      const rowC = rowByDescription(page, descCNew);
      await expect(rowC.locator('.expense-amount')).toHaveText('$31.50');
      await expect(rowC.locator('.expense-category')).toHaveText('Groceries');
    });

    test('Saving an edit applies the same validation rules as adding', async ({ page }) => {
      const desc = uniq('edit-validation');
      await seedExpense(page, 15.0, desc, 'Food');
      await openApp(page);
      const totalBefore = await readTotalCents(page);

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();

      // Zero amount rejected.
      await page.locator('#amount').fill('0');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount must be greater than zero');

      // Over-max rejected.
      await page.locator('#amount').fill('1000000');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount must not exceed 999,999.99');

      // Blank description rejected.
      await page.locator('#amount').fill('15.00');
      await page.locator('#description').fill('');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#description-error')).toHaveText('Description is required');

      // Still in edit mode, nothing stored, total untouched.
      await expect(page.locator('#submit-btn')).toHaveText('Save Changes');
      await expect(page.locator('#edit-indicator')).toBeVisible();
      expect(await readTotalCents(page)).toBe(totalBefore);
    });

    test('On save the row updates immediately and the total recalculates', async ({ page }) => {
      const desc = uniq('save-updates');
      const descNew = uniq('save-updates-new');
      await seedExpense(page, 12.0, desc, 'Food');
      await openApp(page);
      const totalBefore = await readTotalCents(page);

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await submitForm(page, '18.25', descNew, 'Dining', 'PUT');

      const row = rowByDescription(page, descNew);
      await expect(row).toHaveCount(1);
      await expect(row.locator('.expense-amount')).toHaveText('$18.25');
      await expect(rowByDescription(page, desc)).toHaveCount(0);

      // +$6.25 delta: 1200 cents out, 1825 cents in.
      expect(await readTotalCents(page)).toBe(totalBefore + 625);
    });

    test('A success indicator confirms the edit and the form leaves edit mode', async ({ page }) => {
      const desc = uniq('edit-confirm');
      await seedExpense(page, 8.0, desc, 'Food');
      await openApp(page);

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await submitForm(page, '9.00', desc, 'Food', 'PUT');

      await expect(page.locator('#toast-container .toast.success')).toHaveText('Expense updated!');
      await expect(page.locator('#submit-btn')).toHaveText('Add Expense');
      await expect(page.locator('#cancel-btn')).toBeHidden();
      await expect(page.locator('#edit-indicator')).toBeHidden();
      await expect(page.locator('#amount')).toHaveValue('');
      await expect(page.locator('#description')).toHaveValue('');
      await expect(page.locator('#category')).toHaveValue('');
      await expect(page.locator('.editing-row')).toHaveCount(0);
    });
  });

  test.describe('US-1.2: Cancel Editing Without Saving', () => {
    test('A Cancel button is visible whenever the form is in edit mode', async ({ page }) => {
      const desc = uniq('cancel-visible');
      await seedExpense(page, 6.0, desc, 'Food');
      await openApp(page);

      await expect(page.locator('#cancel-btn')).toBeHidden();
      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await expect(page.locator('#cancel-btn')).toBeVisible();
    });

    test('Cancel discards the pending changes without any server request', async ({ page }) => {
      const desc = uniq('cancel-no-request');
      await seedExpense(page, 6.0, desc, 'Food');
      await openApp(page);

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await page.locator('#amount').fill('999.99');
      await page.locator('#description').fill('discard me');

      // Watch the wire while Cancel is clicked — nothing must go out.
      const mutations: string[] = [];
      const listener = (req: any) => {
        const method = req.method();
        if (req.url().includes('/api/expenses') && (method === 'PUT' || method === 'POST')) {
          mutations.push(`${method} ${req.url()}`);
        }
      };
      page.on('request', listener);
      await page.locator('#cancel-btn').click();
      await page.waitForTimeout(500);
      page.off('request', listener);

      expect(mutations).toEqual([]);
    });

    test('The form returns to its add-new state after cancelling', async ({ page }) => {
      const desc = uniq('cancel-resets-form');
      await seedExpense(page, 6.0, desc, 'Food');
      await openApp(page);

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await page.locator('#amount').fill('42.42');
      await page.locator('#cancel-btn').click();

      await expect(page.locator('#submit-btn')).toHaveText('Add Expense');
      await expect(page.locator('#cancel-btn')).toBeHidden();
      await expect(page.locator('#edit-indicator')).toBeHidden();
      await expect(page.locator('#amount')).toHaveValue('');
      await expect(page.locator('#description')).toHaveValue('');
      await expect(page.locator('#category')).toHaveValue('');
      await expect(page.locator('.editing-row')).toHaveCount(0);
    });

    test('The list and total are unchanged and the original values stay intact', async ({ page }) => {
      const desc = uniq('cancel-intact');
      await seedExpense(page, 6.0, desc, 'Food');
      await openApp(page);

      const totalBefore = await readTotalCents(page);
      const rowsBefore = await page.locator('.expense-row').count();

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await page.locator('#amount').fill('999.99');
      await page.locator('#description').fill('should never be stored');
      await page.locator('#category').fill('Bogus');
      await page.locator('#cancel-btn').click();

      expect(await readTotalCents(page)).toBe(totalBefore);
      await expect(page.locator('.expense-row')).toHaveCount(rowsBefore);

      const row = rowByDescription(page, desc);
      await expect(row).toHaveCount(1);
      await expect(row.locator('.expense-amount')).toHaveText('$6.00');
      await expect(row.locator('.expense-category')).toHaveText('Food');
      await expect(page.locator('#expense-list')).not.toContainText('should never be stored');

      // And it survives a reload — nothing was written.
      await page.reload();
      await expect(page.locator('#total-amount')).not.toHaveText('...');
      await expect(rowByDescription(page, desc).locator('.expense-amount')).toHaveText('$6.00');
    });
  });

  test.describe('US-1.3: Edit Multiple Expenses in Sequence', () => {
    test('After saving one edit the user can immediately edit another expense', async ({ page }) => {
      clearDatabase();
      const first = uniq('seq-first');
      const second = uniq('seq-second');
      await seedExpense(page, 10.0, first, 'Food');
      await seedExpense(page, 20.0, second, 'Transport');
      await openApp(page);

      await rowByDescription(page, first).locator('.expense-edit-btn').click();
      await submitForm(page, '11.00', first, 'Food', 'PUT');
      await expect(page.locator('#submit-btn')).toHaveText('Add Expense');

      // Straight into the next edit, no reload in between.
      await rowByDescription(page, second).locator('.expense-edit-btn').click();
      await expect(page.locator('#submit-btn')).toHaveText('Save Changes');
      await expect(page.locator('#description')).toHaveValue(second);
    });

    test('Each edit is persisted independently and the list reflects them all', async ({ page }) => {
      clearDatabase();
      const a = uniq('indep-a');
      const b = uniq('indep-b');
      const c = uniq('indep-c');
      await seedExpense(page, 10.0, a, 'Food');
      await seedExpense(page, 20.0, b, 'Transport');
      await seedExpense(page, 30.0, c, 'Utilities');
      await openApp(page);

      // Edit only b.
      await rowByDescription(page, b).locator('.expense-edit-btn').click();
      await submitForm(page, '25.00', b, 'Travel', 'PUT');

      // a and c untouched.
      await expect(rowByDescription(page, a).locator('.expense-amount')).toHaveText('$10.00');
      await expect(rowByDescription(page, a).locator('.expense-category')).toHaveText('Food');
      await expect(rowByDescription(page, c).locator('.expense-amount')).toHaveText('$30.00');
      await expect(rowByDescription(page, c).locator('.expense-category')).toHaveText('Utilities');
      await expect(rowByDescription(page, b).locator('.expense-amount')).toHaveText('$25.00');
      await expect(rowByDescription(page, b).locator('.expense-category')).toHaveText('Travel');
    });

    test('The running total is correct after several sequential edits', async ({ page }) => {
      clearDatabase();
      const a = uniq('total-seq-a');
      const b = uniq('total-seq-b');
      const c = uniq('total-seq-c');
      await seedExpense(page, 10.0, a, 'Food');
      await seedExpense(page, 20.0, b, 'Transport');
      await seedExpense(page, 30.0, c, 'Utilities');
      await openApp(page);
      await expect(page.locator('#total-amount')).toHaveText('$60.00');

      await rowByDescription(page, a).locator('.expense-edit-btn').click();
      await submitForm(page, '15.50', a, 'Food', 'PUT');
      await expect(page.locator('#total-amount')).toHaveText('$65.50');

      await rowByDescription(page, b).locator('.expense-edit-btn').click();
      await submitForm(page, '5.25', b, 'Transport', 'PUT');
      await expect(page.locator('#total-amount')).toHaveText('$50.75');

      await rowByDescription(page, c).locator('.expense-edit-btn').click();
      await submitForm(page, '100.00', c, 'Utilities', 'PUT');
      await expect(page.locator('#total-amount')).toHaveText('$120.75');

      // And the same total after a fresh load from the store.
      await page.reload();
      await expect(page.locator('#total-amount')).toHaveText('$120.75');
    });
  });

  test.describe('US-1.4: Handle Editing a Non-Existent Expense', () => {
    test('Saving an edit for a vanished expense returns 404 ERR_EXPENSE_NOT_FOUND', async ({ request }) => {
      const response = await request.put('/api/expenses/99999999', {
        data: { amount: 5.0, description: uniq('ghost'), category: 'Food' },
      });
      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.error.code).toBe('ERR_EXPENSE_NOT_FOUND');
      expect(body.error.message).toBe('Expense not found');
    });

    test('The user sees a clear "Expense not found" message', async ({ page }) => {
      const desc = uniq('vanishing-row');
      await seedExpense(page, 9.0, desc, 'Food');
      await openApp(page);

      // Enter edit mode, then the row disappears from the store underneath us.
      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      clearDatabase();

      await page.locator('#amount').fill('12.00');
      const responsePromise = page.waitForResponse((r) => r.request().method() === 'PUT');
      await page.locator('#submit-btn').click();
      const response = await responsePromise;
      expect(response.status()).toBe(404);

      const toast = page.locator('#toast-container .toast.error');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('Expense not found');
    });

    test('The form keeps the typed data on a 404 so it can be re-entered as a new expense', async ({ page }) => {
      // US-1.4 AC: "The form does not clear on a 404 error, allowing the user to
      // re-enter the data as a new expense if desired."
      //
      // KNOWN DEFECT (expected to fail): public/app.js calls exitEditMode() in its
      // 404 branch, which runs form.reset() and wipes the user's input. Both this
      // acceptance criterion and express plan 03 (success criterion 20, "form
      // retains values" — its reference snippet shows only showToast on 404) say
      // the input must survive. Asserting the specified behaviour, not the bug.
      const desc = uniq('404-retain');
      const typed = uniq('404-retain-typed');
      await seedExpense(page, 9.0, desc, 'Food');
      await openApp(page);

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      clearDatabase();

      await page.locator('#amount').fill('13.75');
      await page.locator('#description').fill(typed);
      await page.locator('#category').fill('Dining');

      const responsePromise = page.waitForResponse((r) => r.request().method() === 'PUT');
      await page.locator('#submit-btn').click();
      expect((await responsePromise).status()).toBe(404);

      await expect(page.locator('#toast-container .toast.error')).toContainText('Expense not found');

      // The user's work must still be in the form.
      await expect(page.locator('#amount')).toHaveValue('13.75');
      await expect(page.locator('#description')).toHaveValue(typed);
      await expect(page.locator('#category')).toHaveValue('Dining');
    });

    test('A malformed expense ID returns 400 ERR_EXPENSE_INVALID_ID', async ({ request }) => {
      for (const badId of ['abc', '0', '-1', '1.5', '01', '1abc']) {
        const response = await request.put(`/api/expenses/${badId}`, {
          data: { amount: 5.0, description: 'x', category: 'y' },
        });
        expect(response.status(), `id "${badId}" should be rejected`).toBe(400);
        const body = await response.json();
        expect(body.error.code).toBe('ERR_EXPENSE_INVALID_ID');
      }
    });
  });

  // ---------------------------------------------------------------- Epic 2
  test.describe('US-2.1: Data Survives Page Refresh', () => {
    test('Refreshing the browser still shows every previously entered expense', async ({ page }) => {
      clearDatabase();
      await openApp(page);

      const a = uniq('refresh-a');
      const b = uniq('refresh-b');
      await submitForm(page, '11.11', a, 'Food');
      await submitForm(page, '22.22', b, 'Transport');
      await expect(page.locator('.expense-row')).toHaveCount(2);

      await page.reload();
      await expect(page.locator('#total-amount')).not.toHaveText('...', { timeout: 10000 });

      await expect(page.locator('.expense-row')).toHaveCount(2);
      await expect(rowByDescription(page, a).locator('.expense-amount')).toHaveText('$11.11');
      await expect(rowByDescription(page, b).locator('.expense-amount')).toHaveText('$22.22');
    });

    test('The list is fetched from the server with GET /api/expenses on page load', async ({ page }) => {
      const requestPromise = page.waitForRequest(
        (req) => req.url().includes('/api/expenses') && req.method() === 'GET'
      );
      await page.goto('/');
      const request = await requestPromise;
      expect(request.method()).toBe('GET');

      const response = await request.response();
      expect(response?.status()).toBe(200);
    });

    test('The total after a refresh equals the sum of everything persisted', async ({ page }) => {
      clearDatabase();
      await openApp(page);
      await submitForm(page, '10.01', uniq('sum-a'), 'Food');
      await submitForm(page, '20.02', uniq('sum-b'), 'Food');
      await submitForm(page, '30.03', uniq('sum-c'), 'Food');

      await page.reload();
      await expect(page.locator('#total-amount')).not.toHaveText('...');

      const storedCents = readDatabaseRows().reduce((sum, r) => sum + r.amount, 0);
      expect(storedCents).toBe(6006);
      expect(await readTotalCents(page)).toBe(storedCents);
      await expect(page.locator('#total-amount')).toHaveText('$60.06');
    });

    test('No expense data is kept in localStorage or sessionStorage', async ({ page }) => {
      await openApp(page);
      const desc = uniq('no-browser-storage');
      await submitForm(page, '5.55', desc, 'Food');

      const storage = await page.evaluate(() => ({
        local: JSON.stringify(window.localStorage),
        session: JSON.stringify(window.sessionStorage),
        localLength: window.localStorage.length,
        sessionLength: window.sessionStorage.length,
      }));

      expect(storage.localLength).toBe(0);
      expect(storage.sessionLength).toBe(0);
      expect(storage.local).not.toContain(desc);
      expect(storage.session).not.toContain(desc);
    });
  });

  test.describe('US-2.2: Data Survives Server Restart', () => {
    // The server is NOT killed here — that would end the UAT run. Durability is
    // proven the testable way: everything the UI shows already lives in the
    // on-disk SQLite file, so a restart reading that file recovers it all.
    test('Everything submitted is written to the on-disk SQLite file, not held in memory', async ({ page }) => {
      await openApp(page);
      const desc = uniq('durable-on-disk');
      await submitForm(page, '77.77', desc, 'Receipts');

      // Read the file directly with an independent connection.
      const rows = readDatabaseRows().filter((r) => r.description === desc);
      expect(rows).toHaveLength(1);
      expect(rows[0].amount).toBe(7777);
      expect(rows[0].category).toBe('Receipts');
    });

    test('An edit is written through to disk, so a restart would recover the corrected value', async ({ page }) => {
      const desc = uniq('durable-edit');
      const created = await seedExpense(page, 40.0, desc, 'Food');
      await openApp(page);

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await submitForm(page, '44.44', desc, 'Dining', 'PUT');

      const stored = readDatabaseRows().find((r) => r.id === created.id);
      expect(stored).toBeDefined();
      expect(stored.amount).toBe(4444);
      expect(stored.category).toBe('Dining');
    });

    test('A fresh GET returns exactly what is on disk — the store is the source of truth', async ({ request }) => {
      const apiRows = (await (await request.get('/api/expenses')).json()).expenses;
      const diskRows = readDatabaseRows();

      expect(apiRows.length).toBe(diskRows.length);

      const apiById = new Map(apiRows.map((r: any) => [r.id, r]));
      for (const diskRow of diskRows) {
        const apiRow: any = apiById.get(diskRow.id);
        expect(apiRow, `expense ${diskRow.id} on disk should be served by the API`).toBeDefined();
        expect(apiRow.amount).toBe(diskRow.amount);
        expect(apiRow.description).toBe(diskRow.description);
        expect(apiRow.category).toBe(diskRow.category);
        expect(apiRow.created_at).toBe(diskRow.created_at);
      }
    });

    test('No data corruption — every stored row satisfies the schema constraints', async () => {
      const rows = readDatabaseRows();
      for (const row of rows) {
        expect(Number.isInteger(row.amount)).toBe(true);
        expect(row.amount).toBeGreaterThan(0);
        expect(row.amount).toBeLessThanOrEqual(99999999);
        expect(row.description.trim().length).toBeGreaterThanOrEqual(1);
        expect(row.description.length).toBeLessThanOrEqual(500);
        expect(row.category.trim().length).toBeGreaterThanOrEqual(1);
        expect(row.category.length).toBeLessThanOrEqual(100);
        expect(Number.isInteger(row.id)).toBe(true);
      }
    });
  });

  test.describe('US-2.3: Automatic Storage Initialization', () => {
    test('The storage file was created automatically — no manual DB setup happened', async ({ request }) => {
      // The app is running and serving data, and the file exists on disk.
      const response = await request.get('/api/expenses');
      expect(response.status()).toBe(200);
      expect(Array.isArray((await response.json()).expenses)).toBe(true);

      // Opening the file directly proves it was created and is a valid SQLite DB.
      expect(() => readDatabaseRows()).not.toThrow();
    });

    test('The schema — expenses table plus its created_at index — exists', async () => {
      const db = new Database(DB_PATH, { readonly: true });
      try {
        const table = db
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'")
          .get();
        expect(table).toBeDefined();

        const columns = db.prepare('PRAGMA table_info(expenses)').all() as any[];
        const columnNames = columns.map((c) => c.name);
        expect(columnNames).toEqual(
          expect.arrayContaining(['id', 'amount', 'description', 'category', 'created_at', 'updated_at'])
        );

        const index = db
          .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_expenses_created_at'")
          .get();
        expect(index).toBeDefined();
      } finally {
        db.close();
      }
    });

    test('The running server detected the existing store rather than re-creating it', async ({ page, request }) => {
      // Rows written earlier are still served — initialization did not wipe the file.
      const desc = uniq('survives-init');
      await seedExpense(page, 3.21, desc, 'Food');

      const expenses = (await (await request.get('/api/expenses')).json()).expenses;
      expect(expenses.some((e: any) => e.description === desc)).toBe(true);

      // CREATE TABLE IF NOT EXISTS semantics: the data is still intact on disk.
      expect(readDatabaseRows().some((r) => r.description === desc)).toBe(true);
    });
  });

  test.describe('US-2.4: Write-Before-Acknowledge Guarantee', () => {
    test('A 201 is only returned once the expense is readable from storage', async ({ request }) => {
      const desc = uniq('write-before-ack');
      const response = await request.post('/api/expenses', {
        data: { amount: 13.13, description: desc, category: 'Receipts' },
      });
      expect(response.status()).toBe(201);
      const created = (await response.json()).expense;

      // No waiting, no polling — the row is on disk the instant the 201 lands.
      const stored = readDatabaseRows().find((r) => r.id === created.id);
      expect(stored).toBeDefined();
      expect(stored.amount).toBe(1313);
      expect(stored.description).toBe(desc);
    });

    test('A 200 on update is only returned once the change is readable from storage', async ({ request }) => {
      const desc = uniq('write-before-ack-put');
      const created = (
        await (
          await request.post('/api/expenses', {
            data: { amount: 5.0, description: desc, category: 'Food' },
          })
        ).json()
      ).expense;

      const response = await request.put(`/api/expenses/${created.id}`, {
        data: { amount: 8.88, description: desc, category: 'Dining' },
      });
      expect(response.status()).toBe(200);

      const stored = readDatabaseRows().find((r) => r.id === created.id);
      expect(stored.amount).toBe(888);
      expect(stored.category).toBe('Dining');
    });

    test('A failed save shows "Failed to save expense" and keeps the user\'s input', async ({ page }) => {
      await openApp(page);
      const desc = uniq('storage-failure');

      // Simulate a storage write failure (500 ERR_STORAGE_WRITE) on the create call.
      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'ERR_STORAGE_WRITE', message: 'Failed to save data. Please try again.' },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.locator('#amount').fill('19.99');
      await page.locator('#description').fill(desc);
      await page.locator('#category').fill('Receipts');
      await page.locator('#submit-btn').click();

      const toast = page.locator('#toast-container .toast.error');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('Failed to save expense. Please try again.');

      // Input retained so the user can retry.
      await expect(page.locator('#amount')).toHaveValue('19.99');
      await expect(page.locator('#description')).toHaveValue(desc);
      await expect(page.locator('#category')).toHaveValue('Receipts');

      await page.unroute('**/api/expenses');
    });
  });

  test.describe('US-2.5: Inspect Storage Directly', () => {
    test('Data is stored in a standard, directly-queryable SQLite database', async ({ page }) => {
      const desc = uniq('inspectable');
      await seedExpense(page, 12.34, desc, 'Audit');

      // Query it as any external tool would — plain SQL, no app code involved.
      const db = new Database(DB_PATH, { readonly: true });
      try {
        const row: any = db.prepare('SELECT * FROM expenses WHERE description = ?').get(desc);
        expect(row).toBeDefined();
        expect(row.amount).toBe(1234);
        expect(row.category).toBe('Audit');
      } finally {
        db.close();
      }
    });

    test('The storage file can be copied for backup and the copy still reads', async ({ page }) => {
      const desc = uniq('backup-copy');
      await seedExpense(page, 55.55, desc, 'Audit');

      const fs = require('fs');
      const os = require('os');
      const backupPath = path.join(os.tmpdir(), `expenses-backup-${Date.now()}.db`);

      // A consistent copy: VACUUM INTO folds the WAL in, as a backup tool would.
      const source = new Database(DB_PATH, { readonly: true });
      try {
        source.exec(`VACUUM INTO '${backupPath}'`);
      } finally {
        source.close();
      }

      expect(fs.existsSync(backupPath)).toBe(true);
      expect(fs.statSync(backupPath).size).toBeGreaterThan(0);

      const backup = new Database(backupPath, { readonly: true });
      try {
        const row: any = backup.prepare('SELECT * FROM expenses WHERE description = ?').get(desc);
        expect(row).toBeDefined();
        expect(row.amount).toBe(5555);
      } finally {
        backup.close();
        fs.unlinkSync(backupPath);
      }
    });

    test('Each record holds id, amount, description, category, created_at and updated_at', async ({ page }) => {
      const desc = uniq('record-fields');
      await seedExpense(page, 1.0, desc, 'Audit');

      const row = readDatabaseRows().find((r) => r.description === desc);
      expect(row).toBeDefined();
      for (const field of ['id', 'amount', 'description', 'category', 'created_at', 'updated_at']) {
        expect(row[field], `field ${field} should be present`).not.toBeUndefined();
        expect(row[field], `field ${field} should not be null`).not.toBeNull();
      }
    });

    test('Amounts are stored as integer cents (10.50 becomes 1050)', async ({ page }) => {
      const desc = uniq('cents-on-disk');
      await seedExpense(page, 10.5, desc, 'Audit');

      const row = readDatabaseRows().find((r) => r.description === desc);
      expect(row.amount).toBe(1050);
      expect(Number.isInteger(row.amount)).toBe(true);
      expect(typeof row.amount).toBe('number');
    });

    test('Timestamps are stored in ISO 8601 UTC format', async ({ page }) => {
      const desc = uniq('iso-timestamps');
      await seedExpense(page, 2.0, desc, 'Audit');

      const row = readDatabaseRows().find((r) => r.description === desc);
      const iso8601Utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(row.created_at).toMatch(iso8601Utc);
      expect(row.updated_at).toMatch(iso8601Utc);
      expect(new Date(row.created_at).toISOString()).toBe(row.created_at);
    });
  });

  // ---------------------------------------------------------------- Epic 3
  test.describe('US-3.1: View All Expenses on Page Load', () => {
    test('Opening the page fetches all expenses from the server', async ({ page }) => {
      clearDatabase();
      const a = uniq('load-a');
      const b = uniq('load-b');
      await seedExpense(page, 4.0, a, 'Food');
      await seedExpense(page, 5.0, b, 'Transport');

      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/expenses') && r.request().method() === 'GET'
      );
      await page.goto('/');
      expect((await responsePromise).status()).toBe(200);

      await expect(page.locator('.expense-row')).toHaveCount(2);
      await expect(rowByDescription(page, a)).toHaveCount(1);
      await expect(rowByDescription(page, b)).toHaveCount(1);
    });

    test('Each row shows the amount as currency plus description and category', async ({ page }) => {
      const desc = uniq('row-contents');
      await seedExpense(page, 1234.56, desc, 'Utilities');
      await openApp(page);

      const row = rowByDescription(page, desc);
      await expect(row.locator('.expense-amount')).toHaveText('$1,234.56');
      await expect(row.locator('.expense-description')).toHaveText(desc);
      await expect(row.locator('.expense-category')).toHaveText('Utilities');
    });

    test('Expenses are listed most recent first', async ({ page }) => {
      clearDatabase();
      const first = uniq('order-first');
      const second = uniq('order-second');
      const third = uniq('order-third');

      // Seeded in order, with a gap so created_at strictly increases.
      await seedExpense(page, 1.0, first, 'Food');
      await page.waitForTimeout(10);
      await seedExpense(page, 2.0, second, 'Food');
      await page.waitForTimeout(10);
      await seedExpense(page, 3.0, third, 'Food');

      await openApp(page);
      const descriptions = await page.locator('.expense-description').allTextContents();
      expect(descriptions).toEqual([third, second, first]);
    });

    test('Every row carries an Edit button as the entry point for editing', async ({ page }) => {
      clearDatabase();
      await seedExpense(page, 1.0, uniq('entry-a'), 'Food');
      await seedExpense(page, 2.0, uniq('entry-b'), 'Food');
      await openApp(page);

      const rowCount = await page.locator('.expense-row').count();
      expect(rowCount).toBe(2);
      await expect(page.locator('.expense-edit-btn')).toHaveCount(rowCount);
    });

    test('The list is on the main page — no navigation to a separate screen', async ({ page }) => {
      await seedExpense(page, 1.0, uniq('same-page'), 'Food');
      await openApp(page);

      await expect(page.locator('#expense-list')).toBeVisible();
      await expect(page.locator('.list-section')).toBeVisible();
      // Form and list coexist on one screen.
      await expect(page.locator('#expense-form')).toBeVisible();
      expect(new URL(page.url()).pathname).toBe('/');
    });
  });

  test.describe('US-3.2: See Empty State When No Expenses Exist', () => {
    test.beforeEach(() => {
      clearDatabase();
    });

    test('With no expenses a friendly, non-technical message is shown', async ({ page }) => {
      await openApp(page);

      const emptyState = page.locator('.empty-state');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toHaveText('No expenses yet. Add your first expense above!');

      // Friendly wording — no jargon, no codes.
      const text = (await emptyState.textContent()) ?? '';
      expect(text.toLowerCase()).not.toContain('error');
      expect(text.toLowerCase()).not.toContain('null');
      expect(text).not.toMatch(/ERR_|undefined|\[\]|200|404/);
      await expect(page.locator('.expense-row')).toHaveCount(0);
    });

    test('The form stays visible and usable during the empty state', async ({ page }) => {
      await openApp(page);

      await expect(page.locator('#expense-form')).toBeVisible();
      await expect(page.locator('#amount')).toBeEditable();
      await expect(page.locator('#description')).toBeEditable();
      await expect(page.locator('#category')).toBeEditable();
      await expect(page.locator('#submit-btn')).toBeEnabled();
    });

    test('The total reads $0.00 during the empty state', async ({ page }) => {
      await openApp(page);
      await expect(page.locator('#total-amount')).toHaveText('$0.00');
    });

    test('Adding the first expense replaces the empty state with the list', async ({ page }) => {
      await openApp(page);
      await expect(page.locator('.empty-state')).toBeVisible();

      const desc = uniq('first-ever');
      await submitForm(page, '6.66', desc, 'Food');

      await expect(page.locator('.empty-state')).toHaveCount(0);
      await expect(rowByDescription(page, desc)).toHaveCount(1);
      await expect(page.locator('#total-amount')).toHaveText('$6.66');
    });
  });

  test.describe('US-3.3: List Updates Immediately After Mutations', () => {
    test('A new expense appears without any page reload', async ({ page }) => {
      await openApp(page);
      const countBefore = await page.locator('.expense-row').count();
      const desc = uniq('no-reload-add');

      let reloaded = false;
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) reloaded = true;
      });

      await submitForm(page, '3.33', desc, 'Food');

      await expect(rowByDescription(page, desc)).toHaveCount(1);
      await expect(page.locator('.expense-row')).toHaveCount(countBefore + 1);
      expect(reloaded).toBe(false);
    });

    test('An edited expense shows its new values in the correct row without a reload', async ({ page }) => {
      const desc = uniq('no-reload-edit');
      const descNew = uniq('no-reload-edit-new');
      await seedExpense(page, 14.0, desc, 'Food');
      await openApp(page);

      let reloaded = false;
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) reloaded = true;
      });

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await submitForm(page, '16.00', descNew, 'Dining', 'PUT');

      const row = rowByDescription(page, descNew);
      await expect(row.locator('.expense-amount')).toHaveText('$16.00');
      await expect(row.locator('.expense-category')).toHaveText('Dining');
      expect(reloaded).toBe(false);
    });

    test('Ordering stays most-recent-first after mutations', async ({ page }) => {
      clearDatabase();
      await openApp(page);

      const a = uniq('order-mut-a');
      const b = uniq('order-mut-b');
      await submitForm(page, '1.00', a, 'Food');
      await submitForm(page, '2.00', b, 'Food');

      // Newest first right after adding.
      expect(await page.locator('.expense-description').allTextContents()).toEqual([b, a]);

      // Editing the older one must not reshuffle the list (created_at is immutable).
      await rowByDescription(page, a).locator('.expense-edit-btn').click();
      await submitForm(page, '9.00', a, 'Food', 'PUT');
      expect(await page.locator('.expense-description').allTextContents()).toEqual([b, a]);

      // And the server agrees after a reload.
      await page.reload();
      await expect(page.locator('#total-amount')).not.toHaveText('...');
      expect(await page.locator('.expense-description').allTextContents()).toEqual([b, a]);
    });

    test('No duplicate rows appear after add or edit', async ({ page }) => {
      clearDatabase();
      await openApp(page);

      const desc = uniq('no-dupes');
      await submitForm(page, '4.00', desc, 'Food');
      await expect(rowByDescription(page, desc)).toHaveCount(1);
      await expect(page.locator('.expense-row')).toHaveCount(1);

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await submitForm(page, '4.50', desc, 'Food', 'PUT');

      await expect(rowByDescription(page, desc)).toHaveCount(1);
      await expect(page.locator('.expense-row')).toHaveCount(1);

      // The server holds one row too.
      await page.reload();
      await expect(page.locator('#total-amount')).not.toHaveText('...');
      await expect(page.locator('.expense-row')).toHaveCount(1);
    });
  });

  test.describe('US-3.4: Handle List Loading Errors Gracefully', () => {
    test('A server 500 shows "Failed to load expenses. Please try again."', async ({ page }) => {
      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'ERR_STORAGE_READ', message: 'Failed to retrieve data. Please try again.' },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');
      await expect(page.locator('.list-error')).toBeVisible();
      await expect(page.locator('.list-error')).toContainText('Failed to load expenses. Please try again.');
      await page.unroute('**/api/expenses');
    });

    test('An unreachable network shows "Unable to connect to the server."', async ({ page }) => {
      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });

      await page.goto('/');
      await expect(page.locator('.list-error')).toBeVisible();
      await expect(page.locator('.list-error')).toContainText(
        'Unable to connect to the server. Check your connection and try again.'
      );
      await page.unroute('**/api/expenses');
    });

    test('A Retry option is offered and actually reloads the list', async ({ page }) => {
      const desc = uniq('retry-works');
      await seedExpense(page, 7.0, desc, 'Food');

      let failNext = true;
      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'GET' && failNext) {
          failNext = false;
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: { code: 'ERR_STORAGE_READ', message: 'boom' } }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');
      const retryBtn = page.locator('.list-error .retry-btn');
      await expect(retryBtn).toBeVisible();
      await expect(retryBtn).toHaveText('Retry');

      await retryBtn.click();

      await expect(page.locator('.list-error')).toHaveCount(0);
      await expect(rowByDescription(page, desc)).toHaveCount(1);
      await page.unroute('**/api/expenses');
    });

    test('The error state is explicit — not a silently broken or empty list', async ({ page }) => {
      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');

      await expect(page.locator('.list-error')).toBeVisible();
      // Not mistakable for "you have no expenses".
      await expect(page.locator('.empty-state')).toHaveCount(0);
      await expect(page.locator('.expense-row')).toHaveCount(0);
      await page.unroute('**/api/expenses');
    });
  });

  test.describe('US-3.5: Expense List Performance at Scale', () => {
    test('A list of 500 expenses renders in under a second with correct amounts', async ({ page }) => {
      clearDatabase();

      // Bulk-seed straight into SQLite — far faster than 500 HTTP calls.
      const db = new Database(DB_PATH);
      const insert = db.prepare(
        'INSERT INTO expenses (amount, description, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      );
      const base = Date.parse('2026-01-01T00:00:00.000Z');
      db.transaction(() => {
        for (let i = 0; i < 500; i++) {
          const timestamp = new Date(base + i * 1000).toISOString();
          insert.run(i + 1, `scale-item-${i}`, 'Scale', timestamp, timestamp);
        }
      })();
      db.close();

      const start = Date.now();
      await page.goto('/');
      await expect(page.locator('.expense-row')).toHaveCount(500, { timeout: 10000 });
      const elapsed = Date.now() - start;

      expect(elapsed, `list render took ${elapsed}ms`).toBeLessThan(1000);

      // Cents converted correctly across the whole range: 1c first, 500c last.
      await expect(page.locator('.expense-row').first().locator('.expense-amount')).toHaveText('$5.00');
      await expect(page.locator('.expense-row').last().locator('.expense-amount')).toHaveText('$0.01');

      // Sum of 1..500 cents = 125250 cents = $1,252.50.
      await expect(page.locator('#total-amount')).toHaveText('$1,252.50');
    });

    test('Description and category text is escaped, never executed as HTML', async ({ page }) => {
      clearDatabase();
      const payload = '<img src=x onerror="window.__xss=true">';
      const descPayload = `<script>window.__xss=true</script>${uniq('xss')}`;
      await seedExpense(page, 1.0, descPayload, payload);

      let dialogFired = false;
      page.on('dialog', async (dialog) => {
        dialogFired = true;
        await dialog.dismiss();
      });

      await openApp(page);
      await expect(page.locator('.expense-row')).toHaveCount(1);

      // Rendered as literal text via textContent.
      await expect(page.locator('.expense-description')).toHaveText(descPayload);
      await expect(page.locator('.expense-category')).toHaveText(payload);

      // No injected elements, no executed script.
      expect(await page.locator('#expense-list script').count()).toBe(0);
      expect(await page.locator('#expense-list img').count()).toBe(0);
      expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
      expect(dialogFired).toBe(false);
    });

    test('Many entries stay scrollable without breaking the page layout', async ({ page }) => {
      clearDatabase();
      const db = new Database(DB_PATH);
      const insert = db.prepare(
        'INSERT INTO expenses (amount, description, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      );
      const base = Date.parse('2026-02-01T00:00:00.000Z');
      db.transaction(() => {
        for (let i = 0; i < 200; i++) {
          const timestamp = new Date(base + i * 1000).toISOString();
          insert.run(500, `layout-item-${i}`, 'Layout', timestamp, timestamp);
        }
      })();
      db.close();

      await page.goto('/');
      await expect(page.locator('.expense-row')).toHaveCount(200, { timeout: 10000 });

      // No horizontal overflow — the layout is not blown out sideways.
      const overflowsHorizontally = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(overflowsHorizontally).toBe(false);

      // The page scrolls vertically and the last row is reachable.
      await page.locator('.expense-row').last().scrollIntoViewIfNeeded();
      await expect(page.locator('.expense-row').last()).toBeVisible();

      // Form and total survive the long list.
      await expect(page.locator('#expense-form')).toBeVisible();
      await expect(page.locator('#total-amount')).toHaveText('$1,000.00');
    });
  });

  // ---------------------------------------------------------------- Epic 4
  test.describe('US-4.1: View Running Total of All Expenses', () => {
    test('The total is prominent and visible without scrolling', async ({ page }) => {
      await openApp(page);

      const total = page.locator('#total-amount');
      await expect(total).toBeVisible();
      await expect(page.locator('.total-display')).toBeVisible();

      // In the viewport at the initial scroll position — no scrolling needed.
      const box = await total.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

      // Labelled for the user, not just a bare number.
      await expect(page.locator('.total-label')).toHaveText('Total Expenses');
    });

    test('The total is formatted as currency with a dollar sign and two decimals', async ({ page }) => {
      clearDatabase();
      await seedExpense(page, 1234.56, uniq('fmt-a'), 'Food');
      await openApp(page);

      await expect(page.locator('#total-amount')).toHaveText('$1,234.56');
      expect(await page.locator('#total-amount').textContent()).toMatch(/^\$[\d,]+\.\d{2}$/);
    });

    test('The total is the integer-cents sum of every expense, divided by 100 for display', async ({ page }) => {
      clearDatabase();
      // Values that drift if summed as floats: 0.1 + 0.2 + 0.7 = 0.9999... in IEEE 754.
      await seedExpense(page, 0.1, uniq('cents-sum-a'), 'Food');
      await seedExpense(page, 0.2, uniq('cents-sum-b'), 'Food');
      await seedExpense(page, 0.7, uniq('cents-sum-c'), 'Food');
      await openApp(page);

      await expect(page.locator('#total-amount')).toHaveText('$1.00');

      const storedCents = readDatabaseRows().reduce((sum, r) => sum + r.amount, 0);
      expect(storedCents).toBe(100);
      expect(await readTotalCents(page)).toBe(storedCents);
    });

    test('The total shows $0.00 when no expenses exist', async ({ page }) => {
      clearDatabase();
      await openApp(page);
      await expect(page.locator('#total-amount')).toHaveText('$0.00');
    });
  });

  test.describe('US-4.2: Total Updates After Adding an Expense', () => {
    test('The total increases by exactly the new expense amount, without a reload', async ({ page }) => {
      await openApp(page);
      const before = await readTotalCents(page);

      let reloaded = false;
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) reloaded = true;
      });

      await submitForm(page, '42.42', uniq('total-add'), 'Food');

      expect(await readTotalCents(page)).toBe(before + 4242);
      expect(reloaded).toBe(false);
    });

    test('The updated total is accurate to the cent across repeated adds', async ({ page }) => {
      clearDatabase();
      await openApp(page);

      const amounts = ['0.01', '0.02', '0.03', '19.99', '0.10', '0.20'];
      let expectedCents = 0;
      for (const amount of amounts) {
        expectedCents += Math.round(parseFloat(amount) * 100);
        await submitForm(page, amount, uniq('accurate'), 'Food');
        expect(await readTotalCents(page)).toBe(expectedCents);
      }

      expect(expectedCents).toBe(2035);
      await expect(page.locator('#total-amount')).toHaveText('$20.35');
    });

    test('The currency format is unchanged after an update', async ({ page }) => {
      await openApp(page);
      await submitForm(page, '5.00', uniq('fmt-after-add'), 'Food');
      expect(await page.locator('#total-amount').textContent()).toMatch(/^\$[\d,]+\.\d{2}$/);
    });
  });

  test.describe('US-4.3: Total Updates After Editing an Expense', () => {
    test('Editing an amount swaps the old value out and the new value in, no reload', async ({ page }) => {
      const desc = uniq('total-edit');
      await seedExpense(page, 20.0, desc, 'Food');
      await openApp(page);
      const before = await readTotalCents(page);

      let reloaded = false;
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) reloaded = true;
      });

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await submitForm(page, '12.50', desc, 'Food', 'PUT');

      // -2000 cents, +1250 cents.
      expect(await readTotalCents(page)).toBe(before - 2000 + 1250);
      expect(reloaded).toBe(false);
    });

    test('Editing only the description or category leaves the total untouched', async ({ page }) => {
      const desc = uniq('total-unchanged');
      const descNew = uniq('total-unchanged-new');
      await seedExpense(page, 33.33, desc, 'Food');
      await openApp(page);
      const before = await readTotalCents(page);

      await rowByDescription(page, desc).locator('.expense-edit-btn').click();
      await submitForm(page, '33.33', descNew, 'Dining', 'PUT');

      await expect(rowByDescription(page, descNew).locator('.expense-category')).toHaveText('Dining');
      expect(await readTotalCents(page)).toBe(before);
    });

    test('The total stays correct through several sequential edits', async ({ page }) => {
      clearDatabase();
      const a = uniq('t-seq-a');
      const b = uniq('t-seq-b');
      await seedExpense(page, 10.0, a, 'Food');
      await seedExpense(page, 20.0, b, 'Food');
      await openApp(page);
      await expect(page.locator('#total-amount')).toHaveText('$30.00');

      await rowByDescription(page, a).locator('.expense-edit-btn').click();
      await submitForm(page, '0.01', a, 'Food', 'PUT');
      await expect(page.locator('#total-amount')).toHaveText('$20.01');

      await rowByDescription(page, b).locator('.expense-edit-btn').click();
      await submitForm(page, '0.02', b, 'Food', 'PUT');
      await expect(page.locator('#total-amount')).toHaveText('$0.03');

      await rowByDescription(page, a).locator('.expense-edit-btn').click();
      await submitForm(page, '999.99', a, 'Food', 'PUT');
      await expect(page.locator('#total-amount')).toHaveText('$1,000.01');

      // The store agrees.
      expect(readDatabaseRows().reduce((sum, r) => sum + r.amount, 0)).toBe(100001);
    });
  });

  test.describe('US-4.4: Total Error State', () => {
    test('When the list fails to load the total shows a dash, not a number', async ({ page }) => {
      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');
      await expect(page.locator('.list-error')).toBeVisible();
      await expect(page.locator('#total-amount')).toHaveText('\u2014');
      expect(await page.locator('#total-amount').textContent()).not.toMatch(/\d/);
      await page.unroute('**/api/expenses');
    });

    test('No stale total is left behind after a failed refresh', async ({ page }) => {
      clearDatabase();
      await seedExpense(page, 88.88, uniq('stale-total'), 'Food');

      // First load succeeds — a real number is on screen.
      await openApp(page);
      await expect(page.locator('#total-amount')).toHaveText('$88.88');

      // Now the refresh fails.
      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        } else {
          await route.continue();
        }
      });
      await page.reload();

      await expect(page.locator('#total-amount')).toHaveText('\u2014');
      await expect(page.locator('#total-amount')).not.toHaveText('$88.88');
      await page.unroute('**/api/expenses');
    });

    test('After a successful retry the total displays correctly again', async ({ page }) => {
      clearDatabase();
      await seedExpense(page, 15.15, uniq('retry-total'), 'Food');

      let failNext = true;
      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'GET' && failNext) {
          failNext = false;
          await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');
      await expect(page.locator('#total-amount')).toHaveText('\u2014');

      await page.locator('.list-error .retry-btn').click();

      await expect(page.locator('#total-amount')).toHaveText('$15.15');
      await page.unroute('**/api/expenses');
    });
  });

  // ---------------------------------------------------------------- Epic 5
  test.describe('US-5.1: Access Application via Browser', () => {
    test('The app opens at its URL with no plugin or install step', async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      expect(response?.headers()['content-type']).toContain('text/html');
      await expect(page.locator('h1')).toHaveText('Expense Tracker');
    });

    test('The page renders form, list and total together in one layout', async ({ page }) => {
      await openApp(page);
      await expect(page.locator('#expense-form')).toBeVisible();
      await expect(page.locator('#expense-list')).toBeVisible();
      await expect(page.locator('#total-amount')).toBeVisible();
    });

    test('Only standard web platform features are used — no plugins or embeds', async ({ page }) => {
      await page.goto('/');

      expect(await page.locator('object, embed, applet').count()).toBe(0);

      // Plain scripts and stylesheets, served from the app's own origin.
      const scriptSources = await page.locator('script[src]').evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLScriptElement).getAttribute('src') ?? '')
      );
      for (const src of scriptSources) {
        expect(src.startsWith('http')).toBe(false);
      }
    });

    test('The app works end to end in this browser engine', async ({ page }) => {
      // A full add cycle proves the rendering engine executes the app correctly.
      await openApp(page);
      const desc = uniq(`browser-${test.info().project.name || 'default'}`);
      await submitForm(page, '2.50', desc, 'Cross-browser');
      await expect(rowByDescription(page, desc).locator('.expense-amount')).toHaveText('$2.50');
    });
  });

  test.describe('US-5.2: Single-Page Layout with Clear Hierarchy', () => {
    test('The form sits prominently near the top of the page', async ({ page }) => {
      await openApp(page);

      const formBox = await page.locator('.form-section').boundingBox();
      const listBox = await page.locator('.list-section').boundingBox();
      expect(formBox).not.toBeNull();
      expect(listBox).not.toBeNull();
      expect(formBox!.y).toBeLessThan(listBox!.y);
    });

    test('The list sits below the form', async ({ page }) => {
      await seedExpense(page, 1.0, uniq('layout-order'), 'Food');
      await openApp(page);

      const formBox = await page.locator('.form-section').boundingBox();
      const listBox = await page.locator('.list-section').boundingBox();
      expect(listBox!.y).toBeGreaterThanOrEqual(formBox!.y + formBox!.height - 1);
      await expect(page.locator('.list-section')).toBeVisible();
    });

    test('The total is visible at the initial scroll position, above the form', async ({ page }) => {
      await openApp(page);

      const totalBox = await page.locator('.total-display').boundingBox();
      const formBox = await page.locator('.form-section').boundingBox();
      const viewport = page.viewportSize();

      expect(totalBox!.y).toBeGreaterThanOrEqual(0);
      expect(totalBox!.y + totalBox!.height).toBeLessThanOrEqual(viewport!.height);
      expect(totalBox!.y).toBeLessThan(formBox!.y);
    });

    test('Form, list and total are reachable with no tabs, menus or page transitions', async ({ page }) => {
      await openApp(page);

      await expect(page.locator('.form-section')).toBeVisible();
      await expect(page.locator('.list-section')).toBeVisible();
      await expect(page.locator('.total-display')).toBeVisible();

      // No navigation chrome at all.
      expect(await page.locator('nav').count()).toBe(0);
      expect(await page.locator('[role="tablist"], [role="tab"]').count()).toBe(0);
      expect(await page.locator('a[href]:not([href^="#"])').count()).toBe(0);
    });

    test('Each section is a distinct, labelled region', async ({ page }) => {
      await openApp(page);

      await expect(page.locator('section[aria-label="Total expenses"]')).toBeVisible();
      await expect(page.locator('section[aria-label="Add or edit expense"]')).toBeVisible();
      await expect(page.locator('section[aria-label="Expense list"]')).toBeVisible();
      await expect(page.locator('.app-header h1')).toHaveText('Expense Tracker');
    });
  });

  test.describe('US-5.3: Single-Command Server Startup', () => {
    test('`npm start` is the single documented command and it runs the server', async ({ request }) => {
      const pkg = require(path.join(__dirname, '..', '..', 'package.json'));
      expect(pkg.scripts.start).toBe('node server.js');

      // And that server is answering right now.
      expect((await request.get('/')).status()).toBe(200);
    });

    test('One origin serves both the static UI and the API', async ({ request }) => {
      const html = await request.get('/');
      expect(html.status()).toBe(200);
      expect(await html.text()).toContain('Expense Tracker');

      const css = await request.get('/style.css');
      expect(css.status()).toBe(200);

      const js = await request.get('/app.js');
      expect(js.status()).toBe(200);

      const api = await request.get('/api/expenses');
      expect(api.status()).toBe(200);
      expect(Array.isArray((await api.json()).expenses)).toBe(true);
    });

    test('No build step, migration command or config file is needed first', async ({ request }) => {
      const pkg = require(path.join(__dirname, '..', '..', 'package.json'));
      expect(pkg.scripts.build).toBeUndefined();
      expect(pkg.scripts.migrate).toBeUndefined();
      expect(pkg.scripts.prestart).toBeUndefined();

      // The schema is created by the app itself on boot, so the API just works.
      expect((await request.get('/api/expenses')).status()).toBe(200);
    });

    test('Navigating to the URL immediately shows a working application', async ({ page }) => {
      await openApp(page);
      const desc = uniq('immediately-functional');
      await submitForm(page, '1.25', desc, 'Food');
      await expect(rowByDescription(page, desc)).toHaveCount(1);
    });

    test('PORT is configurable via environment variable and defaults to 3000', async () => {
      const fs = require('fs');
      const serverSource = fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8');
      expect(serverSource).toContain('process.env.PORT');
      expect(serverSource).toMatch(/\|\|\s*3000/);
    });
  });

  test.describe('US-5.4: Responsive and Keyboard-Accessible Interface', () => {
    test('The layout is usable at desktop size', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await seedExpense(page, 1.0, uniq('desktop'), 'Food');
      await openApp(page);

      await expect(page.locator('#expense-form')).toBeVisible();
      await expect(page.locator('#expense-list')).toBeVisible();
      await expect(page.locator('#total-amount')).toBeVisible();

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(overflows).toBe(false);
    });

    test('The layout stays functional on tablet and phone widths', async ({ page }) => {
      for (const viewport of [
        { width: 768, height: 1024, label: 'tablet' },
        { width: 375, height: 667, label: 'phone' },
      ]) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openApp(page);

        await expect(page.locator('#amount'), viewport.label).toBeVisible();
        await expect(page.locator('#description'), viewport.label).toBeVisible();
        await expect(page.locator('#category'), viewport.label).toBeVisible();
        await expect(page.locator('#submit-btn'), viewport.label).toBeVisible();
        await expect(page.locator('#total-amount'), viewport.label).toBeVisible();

        const overflows = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(overflows, `${viewport.label} should not overflow horizontally`).toBe(false);

        // Still actually usable, not just visible.
        const desc = uniq(`responsive-${viewport.label}`);
        await submitForm(page, '1.00', desc, 'Mobile');
        await expect(rowByDescription(page, desc)).toHaveCount(1);
      }
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('Focus order runs amount, description, category, then submit', async ({ page }) => {
      await openApp(page);

      await expect(page.locator('#amount')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#description')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#category')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#submit-btn')).toBeFocused();
    });

    test('The whole add flow can be driven from the keyboard alone', async ({ page }) => {
      await openApp(page);
      const desc = uniq('keyboard-only');

      await page.keyboard.type('8.80');
      await page.keyboard.press('Tab');
      await page.keyboard.type(desc);
      await page.keyboard.press('Tab');
      await page.keyboard.type('Keyboard');
      await page.keyboard.press('Tab');

      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/expenses') && r.request().method() === 'POST'
      );
      await page.keyboard.press('Enter');
      expect((await responsePromise).status()).toBe(201);

      await expect(rowByDescription(page, desc).locator('.expense-amount')).toHaveText('$8.80');
    });

    test('Pressing Enter in a field submits the form', async ({ page }) => {
      await openApp(page);
      const desc = uniq('enter-submits');

      await page.locator('#amount').fill('3.30');
      await page.locator('#description').fill(desc);
      await page.locator('#category').fill('Keyboard');

      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/expenses') && r.request().method() === 'POST'
      );
      await page.locator('#category').press('Enter');
      expect((await responsePromise).status()).toBe(201);

      await expect(rowByDescription(page, desc)).toHaveCount(1);
    });

    test('The Edit and Cancel buttons are reachable and operable by keyboard', async ({ page }) => {
      const desc = uniq('keyboard-edit');
      await seedExpense(page, 4.0, desc, 'Food');
      await openApp(page);

      const editBtn = rowByDescription(page, desc).locator('.expense-edit-btn');
      await editBtn.focus();
      await expect(editBtn).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(page.locator('#submit-btn')).toHaveText('Save Changes');

      const cancelBtn = page.locator('#cancel-btn');
      await cancelBtn.focus();
      await expect(cancelBtn).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(page.locator('#submit-btn')).toHaveText('Add Expense');
    });
  });

  test.describe('US-5.5: Graceful Error Handling in the UI', () => {
    test('Validation errors appear inline next to the field they concern', async ({ page }) => {
      await openApp(page);
      await page.locator('#submit-btn').click();

      // Each message sits inside the same form-group as its input.
      for (const field of ['amount', 'description', 'category']) {
        const errorEl = page.locator(`#${field}-error`);
        await expect(errorEl).toBeVisible();
        await expect(errorEl).not.toBeEmpty();
        await expect(errorEl).toHaveAttribute('role', 'alert');

        const sharesGroup = await page.evaluate((name) => {
          const input = document.getElementById(name);
          const error = document.getElementById(`${name}-error`);
          return !!input && !!error && input.parentElement === error.parentElement;
        }, field);
        expect(sharesGroup, `${field} error should sit beside its input`).toBe(true);
      }
    });

    test('A server 500 shows "Failed to save expense. Please try again."', async ({ page }) => {
      await openApp(page);

      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        } else {
          await route.continue();
        }
      });

      await page.locator('#amount').fill('5.00');
      await page.locator('#description').fill(uniq('server-500'));
      await page.locator('#category').fill('Food');
      await page.locator('#submit-btn').click();

      await expect(page.locator('#toast-container .toast.error')).toContainText(
        'Failed to save expense. Please try again.'
      );
      await page.unroute('**/api/expenses');
    });

    test('A network failure shows "Unable to connect to the server."', async ({ page }) => {
      await openApp(page);

      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'POST') {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });

      await page.locator('#amount').fill('5.00');
      await page.locator('#description').fill(uniq('network-fail'));
      await page.locator('#category').fill('Food');
      await page.locator('#submit-btn').click();

      await expect(page.locator('#toast-container .toast.error')).toContainText(
        'Unable to connect to the server. Check your connection and try again.'
      );
      await page.unroute('**/api/expenses');
    });

    test('An unexpected script error shows "Something went wrong. Please refresh the page."', async ({ page }) => {
      await openApp(page);

      // Trigger an uncaught runtime error the way a real bug would.
      await page.evaluate(() => {
        setTimeout(() => {
          throw new Error('simulated runtime failure');
        }, 0);
      });

      const banner = page.locator('.global-error');
      await expect(banner).toBeVisible();
      await expect(banner).toHaveText('Something went wrong. Please refresh the page.');
    });

    test('No error message shown to the user exposes technical details', async ({ page }) => {
      await openApp(page);

      // Validation messages.
      await page.locator('#submit-btn').click();
      const inlineMessages = await page.locator('.error-message').allTextContents();

      // A server failure toast.
      await page.route('**/api/expenses', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: { code: 'ERR_STORAGE_WRITE', message: 'Failed to save data.' } }),
          });
        } else {
          await route.continue();
        }
      });
      await page.locator('#amount').fill('5.00');
      await page.locator('#description').fill(uniq('no-tech-details'));
      await page.locator('#category').fill('Food');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#toast-container .toast.error')).toBeVisible();
      const toastMessages = await page.locator('#toast-container .toast').allTextContents();

      for (const message of [...inlineMessages, ...toastMessages].filter(Boolean)) {
        expect(message, `"${message}" leaks an error code`).not.toMatch(/ERR_[A-Z_]+/);
        expect(message).not.toContain('at Object');
        expect(message).not.toContain('node_modules');
        expect(message).not.toMatch(/\.js:\d+/);
        expect(message).not.toMatch(/\bstack\b/i);
      }

      await page.unroute('**/api/expenses');
    });
  });
});

// ===========================================================================
// 3. TECHNICAL CHECKS — everything that is not a user action:
//    API schema shapes, error codes, integer-cents storage, XSS, edge/scale.
// ===========================================================================

test.describe('3. Technical checks', () => {

  test.describe('API response schemas', () => {
    test('GET /api/expenses returns 200 with { expenses: [...] }', async ({ request }) => {
      const response = await request.get('/api/expenses');
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const body = await response.json();
      expect(body).toHaveProperty('expenses');
      expect(Array.isArray(body.expenses)).toBe(true);
    });

    test('POST /api/expenses returns 201 with a fully-shaped { expense: {...} }', async ({ request }) => {
      const desc = uniq('post-shape');
      const response = await request.post('/api/expenses', {
        data: { amount: 7.25, description: desc, category: 'Technical' },
      });
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(Object.keys(body)).toEqual(['expense']);
      const expense = body.expense;
      expect(Object.keys(expense).sort()).toEqual(
        ['amount', 'category', 'created_at', 'description', 'id', 'updated_at'].sort()
      );
      expect(typeof expense.id).toBe('number');
      expect(expense.amount).toBe(725);
      expect(expense.description).toBe(desc);
      expect(expense.category).toBe('Technical');
      expect(typeof expense.created_at).toBe('string');
      expect(typeof expense.updated_at).toBe('string');
    });

    test('PUT /api/expenses/:id returns 200 with the updated { expense: {...} }', async ({ request }) => {
      const desc = uniq('put-shape');
      const created = (
        await (
          await request.post('/api/expenses', {
            data: { amount: 1.0, description: desc, category: 'Technical' },
          })
        ).json()
      ).expense;

      const response = await request.put(`/api/expenses/${created.id}`, {
        data: { amount: 2.5, description: `${desc}-updated`, category: 'Updated' },
      });
      expect(response.status()).toBe(200);

      const expense = (await response.json()).expense;
      expect(expense.id).toBe(created.id);
      expect(expense.amount).toBe(250);
      expect(expense.description).toBe(`${desc}-updated`);
      expect(expense.category).toBe('Updated');
      // created_at is immutable; updated_at moves forward.
      expect(expense.created_at).toBe(created.created_at);
      expect(Date.parse(expense.updated_at)).toBeGreaterThanOrEqual(Date.parse(created.updated_at));
    });

    test('Error responses use { errors: [...] } for validation and { error: {...} } otherwise', async ({ request }) => {
      const validation = await request.post('/api/expenses', { data: {} });
      expect(validation.status()).toBe(400);
      const validationBody = await validation.json();
      expect(Array.isArray(validationBody.errors)).toBe(true);

      const notFound = await request.put('/api/expenses/99999999', {
        data: { amount: 1, description: 'x', category: 'y' },
      });
      expect(notFound.status()).toBe(404);
      const notFoundBody = await notFound.json();
      expect(notFoundBody.error).toBeDefined();
      expect(typeof notFoundBody.error.code).toBe('string');
      expect(typeof notFoundBody.error.message).toBe('string');
    });
  });

  test.describe('Error codes', () => {
    test('Every field rule maps to its documented ERR_EXPENSE_* code', async ({ request }) => {
      const expectations: Array<[string, any]> = [
        ['ERR_EXPENSE_AMOUNT_REQUIRED', { description: 'x', category: 'y' }],
        ['ERR_EXPENSE_INVALID_AMOUNT', { amount: 'abc', description: 'x', category: 'y' }],
        ['ERR_EXPENSE_AMOUNT_POSITIVE', { amount: 0, description: 'x', category: 'y' }],
        ['ERR_EXPENSE_AMOUNT_TOO_LARGE', { amount: 1000000, description: 'x', category: 'y' }],
        ['ERR_EXPENSE_AMOUNT_PRECISION', { amount: 1.005, description: 'x', category: 'y' }],
        ['ERR_EXPENSE_DESC_REQUIRED', { amount: 1, description: '   ', category: 'y' }],
        ['ERR_EXPENSE_DESC_TOO_LONG', { amount: 1, description: 'd'.repeat(501), category: 'y' }],
        ['ERR_EXPENSE_CAT_REQUIRED', { amount: 1, description: 'x', category: '   ' }],
        ['ERR_EXPENSE_CAT_TOO_LONG', { amount: 1, description: 'x', category: 'c'.repeat(101) }],
      ];

      for (const [code, data] of expectations) {
        const response = await request.post('/api/expenses', { data });
        expect(response.status(), code).toBe(400);
        const codes = (await response.json()).errors.map((e: any) => e.code);
        expect(codes, `expected ${code}, got ${JSON.stringify(codes)}`).toContain(code);
      }
    });

    test('404 ERR_EXPENSE_NOT_FOUND for a well-formed but unknown id', async ({ request }) => {
      const response = await request.put('/api/expenses/99999999', {
        data: { amount: 1, description: 'x', category: 'y' },
      });
      expect(response.status()).toBe(404);
      expect((await response.json()).error.code).toBe('ERR_EXPENSE_NOT_FOUND');
    });

    test('400 ERR_EXPENSE_INVALID_ID takes precedence over body validation', async ({ request }) => {
      // Both the id and the body are invalid — the id error must win.
      const response = await request.put('/api/expenses/abc', { data: {} });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('ERR_EXPENSE_INVALID_ID');
      expect(body.errors).toBeUndefined();
    });

    test('All validation failures come back in one pass, not one at a time', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: { amount: -1000000.123, description: 'd'.repeat(501), category: 'c'.repeat(101) },
      });
      expect(response.status()).toBe(400);

      const codes = (await response.json()).errors.map((e: any) => e.code);
      expect(codes).toContain('ERR_EXPENSE_AMOUNT_POSITIVE');
      expect(codes).toContain('ERR_EXPENSE_AMOUNT_PRECISION');
      expect(codes).toContain('ERR_EXPENSE_DESC_TOO_LONG');
      expect(codes).toContain('ERR_EXPENSE_CAT_TOO_LONG');
    });
  });

  test.describe('Integer cents storage', () => {
    test('Dollar amounts convert to integer cents without floating-point drift', async ({ request }) => {
      const cases: Array<[number, number]> = [
        [10.5, 1050],
        [0.01, 1],
        [0.1, 10],
        [1.1, 110],
        [2.675, 268], // rounds, but 2.675 has 3 decimals so it is rejected — see below
      ];

      // The first four are valid two-decimal amounts.
      for (const [dollars, cents] of cases.slice(0, 4)) {
        const response = await request.post('/api/expenses', {
          data: { amount: dollars, description: uniq(`cents-${dollars}`), category: 'Technical' },
        });
        expect(response.status()).toBe(201);
        const expense = (await response.json()).expense;
        expect(expense.amount, `${dollars} should store as ${cents}`).toBe(cents);
        expect(Number.isInteger(expense.amount)).toBe(true);
      }

      // Three-decimal input never reaches storage at all.
      const rejected = await request.post('/api/expenses', {
        data: { amount: 2.675, description: uniq('cents-precision'), category: 'Technical' },
      });
      expect(rejected.status()).toBe(400);
    });

    test('The maximum allowed amount stores as 99,999,999 cents', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: { amount: 999999.99, description: uniq('max-amount'), category: 'Technical' },
      });
      expect(response.status()).toBe(201);
      expect((await response.json()).expense.amount).toBe(99999999);
    });

    test('Stored cents round-trip back to the same dollars on the API and on disk', async ({ request }) => {
      const desc = uniq('roundtrip');
      const created = (
        await (
          await request.post('/api/expenses', {
            data: { amount: 123.45, description: desc, category: 'Technical' },
          })
        ).json()
      ).expense;

      const fetched = (await (await request.get('/api/expenses')).json()).expenses.find(
        (e: any) => e.id === created.id
      );
      expect(fetched.amount).toBe(12345);
      expect(fetched.amount / 100).toBe(123.45);

      expect(readDatabaseRows().find((r) => r.id === created.id).amount).toBe(12345);
    });
  });

  test.describe('Input normalisation', () => {
    test('Description and category are trimmed before storage', async ({ request }) => {
      const desc = uniq('trim-me');
      const response = await request.post('/api/expenses', {
        data: { amount: 1.0, description: `   ${desc}   `, category: '  Spaces  ' },
      });
      expect(response.status()).toBe(201);

      const expense = (await response.json()).expense;
      expect(expense.description).toBe(desc);
      expect(expense.category).toBe('Spaces');
    });

    test('A whitespace-only description or category is rejected, not trimmed into empty', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: { amount: 1.0, description: '     ', category: '     ' },
      });
      expect(response.status()).toBe(400);

      const codes = (await response.json()).errors.map((e: any) => e.code);
      expect(codes).toContain('ERR_EXPENSE_DESC_REQUIRED');
      expect(codes).toContain('ERR_EXPENSE_CAT_REQUIRED');
    });
  });

  test.describe('XSS sanitization', () => {
    test('Script and image payloads in stored text render as inert text', async ({ page }) => {
      clearDatabase();
      const payloads = [
        '<script>window.__xssA=1</script>',
        '<img src=x onerror="window.__xssB=1">',
        '"><svg onload="window.__xssC=1">',
        "javascript:window.__xssD=1",
      ];

      for (const payload of payloads) {
        await seedExpense(page, 1.0, payload, payload);
      }

      let dialogFired = false;
      page.on('dialog', async (d) => {
        dialogFired = true;
        await d.dismiss();
      });

      await openApp(page);
      await expect(page.locator('.expense-row')).toHaveCount(payloads.length);

      // Payloads are present as visible text...
      const rendered = await page.locator('.expense-description').allTextContents();
      for (const payload of payloads) {
        expect(rendered).toContain(payload);
      }

      // ...but never as live DOM, and nothing executed.
      expect(await page.locator('#expense-list script, #expense-list img, #expense-list svg').count()).toBe(0);
      const flags = await page.evaluate(() => ({
        a: (window as any).__xssA,
        b: (window as any).__xssB,
        c: (window as any).__xssC,
        d: (window as any).__xssD,
      }));
      expect(flags).toEqual({ a: undefined, b: undefined, c: undefined, d: undefined });
      expect(dialogFired).toBe(false);
    });

    test('A payload entered through the form is equally inert', async ({ page }) => {
      clearDatabase();
      await openApp(page);

      const payload = `<b>bold</b>${uniq('form-xss')}`;
      await submitForm(page, '1.00', payload, '<i>cat</i>');

      await expect(page.locator('.expense-description')).toHaveText(payload);
      expect(await page.locator('#expense-list b, #expense-list i').count()).toBe(0);
    });

    test('Security headers are present on the served page', async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.headers()['x-content-type-options']).toBe('nosniff');
    });
  });

  test.describe('Edge cases and scale', () => {
    test('An empty store returns an empty array rather than null or an error', async ({ request }) => {
      clearDatabase();
      const response = await request.get('/api/expenses');
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.expenses).toEqual([]);
    });

    test('Boundary lengths and amounts are accepted at the limit and rejected past it', async ({ request }) => {
      // Exactly at the limits — accepted.
      const accepted = await request.post('/api/expenses', {
        data: {
          amount: 999999.99,
          description: 'd'.repeat(500),
          category: 'c'.repeat(100),
        },
      });
      expect(accepted.status()).toBe(201);

      // One past each limit — rejected.
      const rejected = await request.post('/api/expenses', {
        data: {
          amount: 1000000.0,
          description: 'd'.repeat(501),
          category: 'c'.repeat(101),
        },
      });
      expect(rejected.status()).toBe(400);

      // The smallest valid amount.
      const smallest = await request.post('/api/expenses', {
        data: { amount: 0.01, description: uniq('smallest'), category: 'Edge' },
      });
      expect(smallest.status()).toBe(201);
      expect((await smallest.json()).expense.amount).toBe(1);
    });

    test('Unicode and emoji survive a round trip intact', async ({ page, request }) => {
      const desc = `日本語 ñ é 🧾 ${uniq('unicode')}`;
      const response = await request.post('/api/expenses', {
        data: { amount: 1.0, description: desc, category: 'Ünïcodé 💸' },
      });
      expect(response.status()).toBe(201);
      expect((await response.json()).expense.description).toBe(desc);

      await openApp(page);
      const row = rowByDescription(page, desc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      await expect(row.locator('.expense-category')).toHaveText('Ünïcodé 💸');
    });

    test('A malformed JSON body does not crash the server', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        headers: { 'Content-Type': 'application/json' },
        data: '{ this is not json',
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(600);

      // Still serving afterwards.
      expect((await request.get('/api/expenses')).status()).toBe(200);
    });

    test('Concurrent creates are all persisted with distinct ids', async ({ request }) => {
      clearDatabase();
      const batch = uniq('concurrent');

      const responses = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          request.post('/api/expenses', {
            data: { amount: 1.0, description: `${batch}-${i}`, category: 'Concurrency' },
          })
        )
      );

      for (const response of responses) {
        expect(response.status()).toBe(201);
      }

      const ids = await Promise.all(responses.map(async (r) => (await r.json()).expense.id));
      expect(new Set(ids).size).toBe(10);

      const stored = readDatabaseRows().filter((r) => r.description.startsWith(batch));
      expect(stored).toHaveLength(10);
    });

    test('1,000 expenses are served and rendered without breaking', async ({ page }) => {
      clearDatabase();

      const db = new Database(DB_PATH);
      const insert = db.prepare(
        'INSERT INTO expenses (amount, description, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      );
      const base = Date.parse('2026-03-01T00:00:00.000Z');
      db.transaction(() => {
        for (let i = 0; i < 1000; i++) {
          const timestamp = new Date(base + i * 1000).toISOString();
          insert.run(100, `bulk-${i}`, 'Bulk', timestamp, timestamp);
        }
      })();
      db.close();

      const start = Date.now();
      await page.goto('/');
      await expect(page.locator('.expense-row')).toHaveCount(1000, { timeout: 15000 });
      const elapsed = Date.now() - start;

      expect(elapsed, `1000-row render took ${elapsed}ms`).toBeLessThan(1000);
      await expect(page.locator('#total-amount')).toHaveText('$1,000.00');

      clearDatabase();
    });
  });
});
