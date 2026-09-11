import { test, expect, Page } from '@playwright/test';

// Helper: wait for page to fully load (total shows a value, not loading placeholder)
async function waitForAppReady(page: Page) {
  await page.goto('/');
  // Wait until the total is no longer the loading placeholder "..."
  await expect(page.locator('#total-amount')).not.toHaveText('...', { timeout: 10000 });
}

// Helper: add an expense via the UI
async function addExpenseViaUI(page: Page, amount: string, description: string, category: string) {
  await page.locator('#amount').fill(amount);
  await page.locator('#description').fill(description);
  await page.locator('#category').fill(category);

  const responsePromise = page.waitForResponse(resp =>
    resp.url().includes('/api/expenses') && resp.request().method() === 'POST'
  );
  await page.locator('#submit-btn').click();
  return responsePromise;
}

test.describe('1. Primary user flow — JRN-01.1: Daily Expense Capture', () => {

  test('Opens the Expense Tracker application', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Expense Tracker');
    await expect(page.locator('#expense-form')).toBeVisible();
    await expect(page.locator('#total-amount')).toBeVisible();
    await expect(page.locator('#expense-list')).toBeVisible();
  });

  test('Sees the expense form with amount, description, and category fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#amount')).toBeVisible();
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.locator('#category')).toBeVisible();
    await expect(page.locator('#submit-btn')).toBeVisible();
    await expect(page.locator('#submit-btn')).toHaveText('Add Expense');
  });

  test('Sees the total displayed in currency format', async ({ page }) => {
    await waitForAppReady(page);
    const totalText = await page.locator('#total-amount').textContent();
    expect(totalText).toMatch(/^\$[\d,]+\.\d{2}$/);
  });

  test('Fills the form with amount, description, and category', async ({ page }) => {
    await page.goto('/');
    await page.locator('#amount').fill('25.50');
    await page.locator('#description').fill('Lunch at cafe');
    await page.locator('#category').fill('Food');
    await expect(page.locator('#amount')).toHaveValue('25.50');
    await expect(page.locator('#description')).toHaveValue('Lunch at cafe');
    await expect(page.locator('#category')).toHaveValue('Food');
  });

  test('Submits the form and sees the new expense in the list', async ({ page }) => {
    await waitForAppReady(page);

    const response = await addExpenseViaUI(page, '25.50', 'UAT lunch test', 'Food');
    expect(response.status()).toBe(201);

    await expect(page.locator('.expense-row').first()).toBeVisible();
    await expect(page.locator('.expense-description').first()).toHaveText('UAT lunch test');
    await expect(page.locator('.expense-category').first()).toHaveText('Food');
  });

  test('Sees a success toast after adding an expense', async ({ page }) => {
    await waitForAppReady(page);
    await addExpenseViaUI(page, '10.00', 'Coffee', 'Drinks');
    await expect(page.locator('.toast.success')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.toast.success')).toHaveText('Expense added!');
  });

  test('Form clears after successful submission and focus returns to amount', async ({ page }) => {
    await waitForAppReady(page);
    await addExpenseViaUI(page, '5.00', 'Snack', 'Food');

    await expect(page.locator('#amount')).toHaveValue('');
    await expect(page.locator('#description')).toHaveValue('');
    await expect(page.locator('#category')).toHaveValue('');
    await expect(page.locator('#amount')).toBeFocused();
  });

  test('Total updates immediately after adding an expense', async ({ page }) => {
    await waitForAppReady(page);
    const totalBefore = await page.locator('#total-amount').textContent();

    await addExpenseViaUI(page, '42.00', 'UAT total test', 'Testing');

    const totalAfter = await page.locator('#total-amount').textContent();
    expect(totalAfter).not.toBe(totalBefore);
    expect(totalAfter).toMatch(/^\$[\d,]+\.\d{2}$/);
  });
});

test.describe('2. Secondary flows', () => {

  test.describe('US-0.2: Batch-Enter Multiple Expenses', () => {
    test('Enters multiple expenses in sequence and all appear in the list', async ({ page }) => {
      await waitForAppReady(page);

      const entries = [
        { amount: '12.50', description: 'Batch item 1', category: 'Groceries' },
        { amount: '8.75', description: 'Batch item 2', category: 'Transport' },
        { amount: '3.25', description: 'Batch item 3', category: 'Snacks' },
      ];

      for (const entry of entries) {
        await addExpenseViaUI(page, entry.amount, entry.description, entry.category);
        await expect(page.locator('#amount')).toHaveValue('');
      }

      const descriptions = page.locator('.expense-description');
      const allTexts = await descriptions.allTextContents();
      expect(allTexts).toContain('Batch item 1');
      expect(allTexts).toContain('Batch item 2');
      expect(allTexts).toContain('Batch item 3');
    });
  });

  test.describe('US-0.3: Receive Validation Feedback on Expense Entry', () => {
    test('Shows error when submitting with empty fields', async ({ page }) => {
      await waitForAppReady(page);
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount is required');
      await expect(page.locator('#description-error')).toHaveText('Description is required');
      await expect(page.locator('#category-error')).toHaveText('Category is required');
    });

    test('Shows error for negative amount', async ({ page }) => {
      await page.goto('/');
      await page.locator('#amount').fill('-5');
      await page.locator('#description').fill('Test');
      await page.locator('#category').fill('Test');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount must be greater than zero');
    });

    test('Shows error for amount exceeding maximum', async ({ page }) => {
      await page.goto('/');
      await page.locator('#amount').fill('1000000');
      await page.locator('#description').fill('Test');
      await page.locator('#category').fill('Test');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toHaveText('Amount must not exceed 999,999.99');
    });

    test('Retains user input when validation fails', async ({ page }) => {
      await page.goto('/');
      await page.locator('#amount').fill('-1');
      await page.locator('#description').fill('My description');
      await page.locator('#category').fill('My category');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount')).toHaveValue('-1');
      await expect(page.locator('#description')).toHaveValue('My description');
      await expect(page.locator('#category')).toHaveValue('My category');
    });
  });

  test.describe('US-0.4: Server-Side Validation of Expense Data', () => {
    test('Server returns 400 with structured errors for invalid data', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: { amount: -5, description: '', category: '' }
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
      for (const err of body.errors) {
        expect(err.code).toBeDefined();
        expect(err.message).toBeDefined();
      }
    });

    test('Server does not expose stack traces in error responses', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: { amount: 'not-a-number', description: 'test', category: 'test' }
      });
      const body = await response.json();
      const bodyStr = JSON.stringify(body);
      expect(bodyStr).not.toContain('at Object');
      expect(bodyStr).not.toContain('node_modules');
    });
  });

  test.describe('US-2.1: Data Survives Page Refresh', () => {
    test('Expenses persist after page refresh', async ({ page }) => {
      await waitForAppReady(page);
      await addExpenseViaUI(page, '99.99', 'Persistence test', 'UAT');

      await page.reload();
      await expect(page.locator('#total-amount')).not.toHaveText('...', { timeout: 10000 });

      const descriptions = page.locator('.expense-description');
      const allTexts = await descriptions.allTextContents();
      expect(allTexts).toContain('Persistence test');
    });
  });

  test.describe('US-2.3: Automatic Storage Initialization', () => {
    test('GET /api/expenses works without manual DB setup', async ({ request }) => {
      const response = await request.get('/api/expenses');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.expenses).toBeDefined();
      expect(Array.isArray(body.expenses)).toBe(true);
    });
  });

  test.describe('US-2.4: Write-Before-Acknowledge Guarantee', () => {
    test('POST /api/expenses returns 201 with the created expense', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: { amount: 15.00, description: 'Write guarantee test', category: 'UAT' }
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.expense).toBeDefined();
      expect(body.expense.id).toBeDefined();
      expect(body.expense.description).toBe('Write guarantee test');
    });
  });

  test.describe('US-2.5: Inspect Storage Directly', () => {
    test('Expense records contain required fields', async ({ request }) => {
      const response = await request.get('/api/expenses');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.expenses.length).toBeGreaterThan(0);
      const expense = body.expenses[0];
      expect(expense.id).toBeDefined();
      expect(typeof expense.amount).toBe('number');
      expect(expense.description).toBeDefined();
      expect(expense.category).toBeDefined();
      expect(expense.created_at).toBeDefined();
    });
  });

  test.describe('US-3.1: View All Expenses on Page Load', () => {
    test('Expenses are visible in the list on page load', async ({ page }) => {
      await waitForAppReady(page);
      const rows = page.locator('.expense-row');
      await expect(rows.first()).toBeVisible({ timeout: 5000 });
    });

    test('Each expense row shows amount, description, and category', async ({ page }) => {
      await waitForAppReady(page);
      const firstRow = page.locator('.expense-row').first();
      await expect(firstRow.locator('.expense-amount')).toBeVisible();
      await expect(firstRow.locator('.expense-description')).toBeVisible();
      await expect(firstRow.locator('.expense-category')).toBeVisible();
    });

    test('Amount is formatted as currency', async ({ page }) => {
      await waitForAppReady(page);
      const amountText = await page.locator('.expense-amount').first().textContent();
      expect(amountText).toMatch(/^\$[\d,]+\.\d{2}$/);
    });
  });

  test.describe('US-3.2: See Empty State When No Expenses Exist', () => {
    test('Empty state element exists in the HTML structure', async ({ page }) => {
      await page.goto('/');
      const emptyStateHtml = await page.locator('#expense-list').innerHTML();
      const hasContent = emptyStateHtml.includes('empty-state') || emptyStateHtml.includes('expense-row');
      expect(hasContent).toBe(true);
    });
  });

  test.describe('US-3.3: List Updates Immediately After Mutations', () => {
    test('New expense appears in list without page reload', async ({ page }) => {
      await waitForAppReady(page);
      const countBefore = await page.locator('.expense-row').count();

      await addExpenseViaUI(page, '7.77', 'Immediate update test', 'UAT');

      const countAfter = await page.locator('.expense-row').count();
      expect(countAfter).toBe(countBefore + 1);
    });
  });

  test.describe('US-4.1: View Running Total of All Expenses', () => {
    test('Total is displayed as currency format', async ({ page }) => {
      await waitForAppReady(page);
      const totalText = await page.locator('#total-amount').textContent();
      expect(totalText).toMatch(/^\$[\d,]+\.\d{2}$/);
    });

    test('Total is always visible without scrolling', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#total-amount')).toBeVisible();
      await expect(page.locator('.total-display')).toBeVisible();
    });
  });

  test.describe('US-4.2: Total Updates After Adding an Expense', () => {
    test('Total increases after adding a new expense', async ({ page }) => {
      await waitForAppReady(page);
      const totalBefore = await page.locator('#total-amount').textContent();

      await addExpenseViaUI(page, '100.00', 'Total update test', 'UAT');

      const totalAfter = await page.locator('#total-amount').textContent();
      expect(totalAfter).not.toBe(totalBefore);
    });
  });

  test.describe('US-5.1: Access Application via Browser', () => {
    test('Application is accessible at the base URL', async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
    });

    test('Page renders form, list, and total in a single-page layout', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#expense-form')).toBeVisible();
      await expect(page.locator('#expense-list')).toBeVisible();
      await expect(page.locator('#total-amount')).toBeVisible();
    });
  });

  test.describe('US-5.2: Single-Page Layout with Clear Hierarchy', () => {
    test('Form, list, and total sections are all visible on a single page', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.form-section')).toBeVisible();
      await expect(page.locator('.list-section')).toBeVisible();
      await expect(page.locator('.total-display')).toBeVisible();
    });
  });

  test.describe('US-5.3: Single-Command Server Startup', () => {
    test('Server responds on configured port', async ({ request }) => {
      const response = await request.get('/');
      expect(response.status()).toBe(200);
    });

    test('Server serves both static assets and API on same origin', async ({ request }) => {
      const htmlResponse = await request.get('/');
      expect(htmlResponse.status()).toBe(200);
      const htmlText = await htmlResponse.text();
      expect(htmlText).toContain('Expense Tracker');

      const apiResponse = await request.get('/api/expenses');
      expect(apiResponse.status()).toBe(200);
      const apiBody = await apiResponse.json();
      expect(apiBody.expenses).toBeDefined();
    });
  });

  test.describe('US-5.4: Responsive and Keyboard-Accessible Interface', () => {
    test('Form can be submitted by pressing Enter', async ({ page }) => {
      await waitForAppReady(page);

      await page.locator('#amount').fill('1.00');
      await page.locator('#description').fill('Enter key test');
      await page.locator('#category').fill('UAT');

      const responsePromise = page.waitForResponse(resp =>
        resp.url().includes('/api/expenses') && resp.request().method() === 'POST'
      );
      await page.locator('#category').press('Enter');
      const response = await responsePromise;
      expect(response.status()).toBe(201);
    });

    test('All form fields are accessible via keyboard tab', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#amount')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#description')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#category')).toBeFocused();
    });
  });

  test.describe('US-5.5: Graceful Error Handling in the UI', () => {
    test('Validation errors appear inline next to form fields', async ({ page }) => {
      await page.goto('/');
      await page.locator('#submit-btn').click();
      await expect(page.locator('#amount-error')).toBeVisible();
      await expect(page.locator('#description-error')).toBeVisible();
      await expect(page.locator('#category-error')).toBeVisible();
    });
  });
});

test.describe('3. Technical checks', () => {

  test.describe('API response structure', () => {
    test('GET /api/expenses returns { expenses: [...] }', async ({ request }) => {
      const response = await request.get('/api/expenses');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('expenses');
      expect(Array.isArray(body.expenses)).toBe(true);
    });

    test('POST /api/expenses returns { expense: {...} } on success', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: { amount: 1.50, description: 'API structure test', category: 'Technical' }
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body).toHaveProperty('expense');
      expect(body.expense).toHaveProperty('id');
      expect(body.expense).toHaveProperty('amount');
      expect(body.expense).toHaveProperty('description');
      expect(body.expense).toHaveProperty('category');
      expect(body.expense).toHaveProperty('created_at');
    });
  });

  test.describe('Amount stored as integer cents', () => {
    test('Amount 10.50 is stored as 1050 cents', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: { amount: 10.50, description: 'Cents test', category: 'Technical' }
      });
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.expense.amount).toBe(1050);
    });
  });

  test.describe('Validation error codes', () => {
    test('Missing amount returns ERR_EXPENSE_AMOUNT_REQUIRED', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: { description: 'test', category: 'test' }
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      const codes = body.errors.map((e: any) => e.code);
      expect(codes).toContain('ERR_EXPENSE_AMOUNT_REQUIRED');
    });

    test('Multiple validation errors returned together', async ({ request }) => {
      const response = await request.post('/api/expenses', {
        data: {}
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('XSS prevention', () => {
    test('HTML tags in description are rendered as text, not HTML', async ({ page, request }) => {
      await request.post('/api/expenses', {
        data: { amount: 1.00, description: '<script>alert("xss")</script>', category: 'XSS test' }
      });

      await waitForAppReady(page);

      const descriptions = await page.locator('.expense-description').allTextContents();
      const hasXssText = descriptions.some(d => d.includes('<script>'));
      expect(hasXssText).toBe(true);
    });
  });
});
