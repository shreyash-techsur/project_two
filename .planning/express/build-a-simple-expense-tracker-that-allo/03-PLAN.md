---
phase: express-build
plan: 03
type: execute
wave: 3
depends_on: [2]
files_modified:
  - public/index.html
  - public/style.css
  - public/app.js
autonomous: true

features:
  implements: ["F0", "F1", "F3", "F4", "F5"]
  depends_on: ["F2"]
  enables: ["F0", "F1", "F3", "F4", "F5"]

must_haves:
  truths:
    - "User can open http://localhost:3000 and see a single-page layout with form, total, and list"
    - "User can fill in amount, description, category and submit to create an expense"
    - "After successful submission, the form clears, expense appears in list, total updates, and focus returns to amount field"
    - "Expense list displays all expenses in reverse-chronological order with currency-formatted amounts"
    - "Each expense row has an Edit button that populates the form with current values"
    - "Edit mode shows Save Changes + Cancel buttons, visual edit indicator, and pre-populated form"
    - "Cancel edit discards changes without server call and returns form to add mode"
    - "After successful edit, list row updates in-place, total recalculates, form returns to add mode"
    - "Empty state shows 'No expenses yet. Add your first expense above!' and total shows $0.00"
    - "Client-side validation shows inline error messages matching FRD Y2 error catalog"
    - "Server error responses display user-friendly messages without exposing technical details"
    - "Total is always visible and uses cents arithmetic (integer sum / 100) to avoid floating-point errors"
    - "All user-provided text is rendered via textContent (never innerHTML) to prevent XSS"
    - "Layout is responsive — functional on desktop, tablet, and phone screen sizes"
  artifacts:
    - path: "public/index.html"
      provides: "Single-page HTML structure with form, total display, and expense list sections"
      contains: "expense-form"
    - path: "public/style.css"
      provides: "Responsive styles with visual hierarchy, validation error states, and toast notifications"
      contains: "expense"
    - path: "public/app.js"
      provides: "Client-side logic: API calls, form handling, list rendering, total calculation, validation, error display"
      contains: "fetch"
  key_links:
    - from: "public/app.js"
      to: "/api/expenses"
      via: "fetch() GET on page load and POST on form submit"
      pattern: "fetch.*api/expenses"
    - from: "public/app.js"
      to: "public/index.html"
      via: "DOM manipulation — getElementById, textContent, createElement"
      pattern: "document\\.getElementById"
    - from: "public/index.html"
      to: "public/style.css"
      via: "link rel stylesheet"
      pattern: "style\\.css"
    - from: "public/index.html"
      to: "public/app.js"
      via: "script tag (defer)"
      pattern: "app\\.js"

integration_contracts:
  requires:
    - from_plan: "02"
      artifact: "routes/expenses.js"
      exports: ["router"]
      verify: "grep -n 'router.get' routes/expenses.js && grep -n 'router.post' routes/expenses.js && grep -n 'router.put' routes/expenses.js && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "server.js"
      exports: ["app with helmet, routes, errorHandler mounted"]
      verify: "grep -n 'helmet' server.js && grep -n 'api/expenses' server.js && grep -n 'express.static' server.js && echo CONTRACT_OK"
    - from_plan: "02"
      artifact: "middleware/validate.js"
      exports: ["validateExpenseInput"]
      verify: "grep -n 'validateExpenseInput' middleware/validate.js && echo CONTRACT_OK"
  provides:
    - artifact: "public/index.html"
      exports: ["HTML page with expense-form, expense-list, total-display sections"]
      shape: |
        Single-page layout with:
          - Header: "Expense Tracker" title
          - Total Display: #total-amount element showing formatted currency
          - Expense Form: #expense-form with amount/description/category inputs + submit button
          - Expense List: #expense-list container with rows or empty state message
          - Toast container: #toast-container for success/error notifications
      verify: "grep -n 'expense-form' public/index.html && grep -n 'expense-list' public/index.html && grep -n 'total-amount' public/index.html && echo CONTRACT_OK"
    - artifact: "public/app.js"
      exports: ["loadExpenses()", "handleSubmit()", "renderExpenses()", "updateTotal()", "validateForm()", "enterEditMode()", "exitEditMode()", "handleCancel()"]
      shape: |
        On DOMContentLoaded:
          1. Call loadExpenses() → GET /api/expenses → render list + update total
          2. Attach submit handler to #expense-form → validateForm() → POST or PUT /api/expenses
          3. On add success: clear form, prepend to list, update total, show toast, focus amount
          4. On edit success: update row in-place, recalculate total, exit edit mode, show toast
          5. On cancel: discard changes, exit edit mode, no server call
          6. On error: show inline validation errors or error toast
        Edit mode: Edit button per row → enterEditMode(id) populates form → Save Changes or Cancel
        Amount display: cents / 100, formatted with Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
        XSS: All user text inserted via textContent, never innerHTML
      verify: "grep -n 'loadExpenses\\|handleSubmit\\|renderExpenses\\|updateTotal\\|enterEditMode\\|exitEditMode' public/app.js && grep -n 'textContent' public/app.js && grep -n 'fetch.*api/expenses' public/app.js && echo CONTRACT_OK"
    - artifact: "public/style.css"
      exports: ["Responsive layout styles"]
      shape: |
        CSS for: .app-header, .total-display, .expense-form, .expense-list, .expense-row,
        .error-message (inline validation), .toast (success/error notifications),
        responsive breakpoints for tablet/phone
      verify: "grep -n 'expense-form' public/style.css && grep -n 'expense-list' public/style.css && grep -n '@media' public/style.css && echo CONTRACT_OK"
---

<objective>
Build the single-page web UI for the Expense Tracker: expense entry form with client-side validation, edit mode (Edit button per row, form pre-populates, Save Changes/Cancel buttons), expense list with currency-formatted amounts and empty state, running total display with cents arithmetic, responsive layout, and error handling.

Purpose: Deliver the user-facing frontend (F0, F1, F3, F4, F5) that consumes the REST API from Wave 2. After this wave, a user can open the app in a browser, add expenses, edit them in place, see them listed in reverse-chronological order, and view a running total — completing both the Daily Expense Capture (JRN-01.1) and Correcting a Mistaken Entry (JRN-01.2) journeys.

Output: `public/index.html` (page structure with edit mode elements), `public/style.css` (responsive styles including edit mode), `public/app.js` (client-side logic for form handling, edit mode, API calls, list rendering, total calculation, validation, and error display).
</objective>

<feature_dependencies>
Implements: F0: Expense Entry (web form with client-side validation, POST to API, form clears on success), F1: Expense Editing (Edit button per row, form pre-populates with current values, PUT to API, Save Changes/Cancel, visual edit indicator), F3: Expense List Display (fetch and render all expenses, empty state, XSS-safe rendering, Edit button per row), F4: Total Amount Display (cents arithmetic sum, currency formatting, always visible, $0.00 default, recalculates on edit), F5: Web-Based UI (single-page layout, responsive, keyboard accessible, error handling)
Depends on: F2: Persistent Storage (via API — GET /api/expenses, POST /api/expenses, PUT /api/expenses/:id from Wave 2)
Enables: F0, F1, F3, F4, F5 (completes the frontend for both primary and edit journeys; Wave 4 integration tests verify end-to-end)
</feature_dependencies>

<context>
@project_specs/TechArch-ExpenseTracker.md (Section 2: Frontend Components — index.html, style.css, app.js; Section 5: XSS prevention)
@project_specs/FRD-ExpenseTracker.md (F0 process steps 6-13, F3 process, F4 process, F5 process, Y2 Error Catalog)
@project_specs/UX-Mockup-ExpenseTracker.md (Screen Designs — all layout states, Interaction Patterns)
@project_specs/UserStories-ExpenseTracker.md (US-0.1, US-0.2, US-0.3, US-3.1–3.5, US-4.1–4.4, US-5.1–5.5)
@.planning/express/build-a-simple-expense-tracker-that-allo/02-PLAN.md (Wave 2 integration contracts — API response shapes)
@.planning/express/build-a-simple-expense-tracker-that-allo/SCOPE-DECISION.md (F1 deferred — no edit buttons, no edit mode)
</context>

<tasks>

<task type="auto">
  <name>Task 1: HTML structure and CSS styles</name>
  <files>public/index.html, public/style.css</files>
  <action>
**1. Create `public/index.html`** — the single-page layout from TechArch §2 and UX-Mockup Screen Designs.

The HTML structure must match the UX-Mockup layout hierarchy (top to bottom):
1. App header with "Expense Tracker" title
2. Total Display section (always visible, prominent)
3. Expense Form section (add mode only — no edit mode, deferred, out of scope)
4. Expense List section (with empty state placeholder)
5. Toast notification container

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expense Tracker</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app-container">
    <!-- App Header -->
    <header class="app-header">
      <h1>Expense Tracker</h1>
    </header>

    <!-- Total Display — US-4.1: always visible, prominent -->
    <section class="total-display" aria-label="Total expenses">
      <span class="total-label">Total Expenses</span>
      <span class="total-amount" id="total-amount">$0.00</span>
    </section>

    <!-- Expense Form — US-0.1: add mode, US-1.1: edit mode -->
    <section class="form-section" aria-label="Add or edit expense">
      <!-- Edit mode indicator — hidden by default, shown when editing -->
      <div class="edit-indicator" id="edit-indicator" aria-live="polite" style="display: none;">
        <span>Editing expense</span>
      </div>
      <form id="expense-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="amount">Amount ($)</label>
            <input type="number" id="amount" name="amount" step="0.01" min="0.01" placeholder="0.00" required autocomplete="off">
            <span class="error-message" id="amount-error" role="alert"></span>
          </div>
          <div class="form-group">
            <label for="description">Description</label>
            <input type="text" id="description" name="description" maxlength="500" placeholder="What did you spend on?" required autocomplete="off">
            <span class="error-message" id="description-error" role="alert"></span>
          </div>
          <div class="form-group">
            <label for="category">Category</label>
            <input type="text" id="category" name="category" maxlength="100" placeholder="e.g., Food, Transport" required autocomplete="off">
            <span class="error-message" id="category-error" role="alert"></span>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" id="submit-btn">Add Expense</button>
          <button type="button" id="cancel-btn" aria-label="Cancel editing" style="display: none;">Cancel</button>
        </div>
      </form>
    </section>

    <!-- Expense List — US-3.1, US-3.2 -->
    <section class="list-section" aria-label="Expense list">
      <div id="expense-list">
        <!-- Populated by app.js; shows empty state or expense rows -->
        <p class="empty-state" id="empty-state">No expenses yet. Add your first expense above!</p>
      </div>
    </section>
  </div>

  <!-- Toast notifications — positioned fixed, top-right -->
  <div id="toast-container" aria-live="polite"></div>

  <script src="app.js" defer></script>
</body>
</html>
```

Key HTML decisions:
- `novalidate` on form: We handle validation in JS to show custom error messages matching FRD Y2 exactly (not browser defaults)
- `role="alert"` on error spans: Screen readers announce validation errors (US-5.4 accessibility)
- `aria-label` on sections: Semantic landmarks for accessibility
- `aria-live="polite"` on toast container and edit indicator: Screen readers announce state changes without interrupting
- `defer` on script tag: HTML parses first, then JS runs (no blocking)
- Tab order follows: amount → description → category → submit button → cancel button (if in edit mode) (US-5.4)
- Edit indicator (`#edit-indicator`) hidden by default, shown with `display: block` when editing (US-1.1)
- Cancel button (`#cancel-btn`) hidden by default, shown in edit mode (US-1.2)
- Edit buttons are added dynamically per expense row in app.js (US-1.1)

**2. Create `public/style.css`** — clean, responsive styles from UX-Mockup design principles.

The CSS must implement:
- **Visual hierarchy:** Total prominent at top, form below, list below form (UX-Mockup Information Hierarchy)
- **Responsive layout:** Desktop primary (form fields in a row), tablet/phone (form fields stack vertically) (US-5.4)
- **Form states:** Normal, error (red border + error message), submitting (disabled button)
- **Expense rows:** Clear visual separation, currency amount prominent
- **Empty state:** Centered, friendly message (UX-Mockup Empty State layout)
- **Toast notifications:** Fixed top-right, green for success, red for errors, auto-dismiss animation
- **Validation errors:** Red text below the invalid field (UX-Mockup Validation Error State)

CSS structure:

```css
/* Reset and base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }

/* App container — centered, max width */
.app-container { max-width: 800px; margin: 0 auto; padding: 20px; }

/* Header */
.app-header { text-align: center; margin-bottom: 24px; }
.app-header h1 { font-size: 1.8rem; color: #2c3e50; }

/* Total Display — prominent, always visible (US-4.1) */
.total-display {
  background: #2c3e50; color: white; padding: 20px 24px;
  border-radius: 8px; display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px;
}
.total-label { font-size: 1.1rem; font-weight: 500; }
.total-amount { font-size: 1.8rem; font-weight: 700; }

/* Form section */
.form-section { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 24px; }

/* Form row — horizontal on desktop, vertical on mobile */
.form-row { display: flex; gap: 16px; margin-bottom: 16px; }
.form-group { flex: 1; display: flex; flex-direction: column; }
.form-group label { font-weight: 600; margin-bottom: 4px; font-size: 0.9rem; color: #555; }
.form-group input {
  padding: 10px 12px; border: 2px solid #ddd; border-radius: 6px;
  font-size: 1rem; transition: border-color 0.2s;
}
.form-group input:focus { border-color: #3498db; outline: none; }
.form-group input.input-error { border-color: #e74c3c; }

/* Validation error messages */
.error-message { color: #e74c3c; font-size: 0.8rem; min-height: 1.2em; margin-top: 4px; }

/* Form actions — button row */
.form-actions { display: flex; gap: 12px; }

/* Submit button */
#submit-btn {
  background: #27ae60; color: white; border: none; padding: 12px 24px;
  border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer;
  transition: background 0.2s; flex: 1;
}
#submit-btn:hover { background: #219a52; }
#submit-btn:disabled { background: #95a5a6; cursor: not-allowed; }

/* Cancel button — edit mode only */
#cancel-btn {
  background: #95a5a6; color: white; border: none; padding: 12px 24px;
  border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer;
  transition: background 0.2s;
}
#cancel-btn:hover { background: #7f8c8d; }

/* Edit mode indicator */
.edit-indicator {
  background: #ebf5fb; border-left: 4px solid #3498db; padding: 8px 12px;
  margin-bottom: 16px; border-radius: 0 4px 4px 0; font-size: 0.9rem; color: #2980b9;
}

/* Edit mode — form section border change */
.form-section.editing { border-left: 4px solid #3498db; }

/* Expense List section */
.list-section { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }

/* Individual expense row */
.expense-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; border-bottom: 1px solid #eee;
}
.expense-row:last-child { border-bottom: none; }
.expense-amount { font-weight: 700; font-size: 1.1rem; color: #2c3e50; min-width: 100px; }
.expense-description { flex: 1; margin: 0 16px; color: #555; }
.expense-category { color: #7f8c8d; font-size: 0.9rem; font-style: italic; min-width: 80px; text-align: right; }
.expense-edit-btn {
  background: none; border: 1px solid #3498db; color: #3498db; padding: 4px 12px;
  border-radius: 4px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; margin-left: 12px;
}
.expense-edit-btn:hover { background: #3498db; color: white; }
.expense-row.editing-row { background: #ebf5fb; }

/* Empty state */
.empty-state { text-align: center; padding: 40px 20px; color: #95a5a6; font-size: 1rem; }

/* Loading state */
.loading-state { text-align: center; padding: 40px 20px; color: #7f8c8d; }

/* Error state in list */
.list-error { text-align: center; padding: 40px 20px; color: #e74c3c; }
.retry-btn { background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 12px; font-size: 0.9rem; }
.retry-btn:hover { background: #2980b9; }

/* Toast notifications — fixed top-right (UX-Mockup Success Toast pattern) */
#toast-container { position: fixed; top: 20px; right: 20px; z-index: 1000; }
.toast {
  padding: 12px 20px; border-radius: 6px; color: white; font-weight: 500;
  margin-bottom: 8px; opacity: 0; transform: translateX(100%);
  animation: slideIn 0.3s forwards;
  max-width: 300px;
}
.toast.success { background: #27ae60; }
.toast.error { background: #e74c3c; }
@keyframes slideIn { to { opacity: 1; transform: translateX(0); } }
@keyframes slideOut { to { opacity: 0; transform: translateX(100%); } }

/* Responsive — tablet and phone (US-5.4) */
@media (max-width: 768px) {
  .form-row { flex-direction: column; gap: 12px; }
  .app-container { padding: 12px; }
  .total-display { flex-direction: column; text-align: center; gap: 8px; }
  .expense-row { flex-wrap: wrap; gap: 8px; }
  .expense-description { flex-basis: 100%; order: 3; margin: 0; }
  .expense-category { order: 2; }
}
```

Key CSS decisions:
- System font stack (no web fonts to load — US-5.1 no plugins/extensions)
- `max-width: 800px` centers content on desktop, fills on mobile
- No `X-Frame-Options` or CSP `frame-ancestors` in HTML meta (constraint: sandbox preview proxy must be able to frame it — helmet handles security headers server-side, and we do NOT add restrictive framing headers in the HTML)
- Edit mode styles included: `.edit-indicator`, `.form-section.editing`, `#cancel-btn`, `.expense-edit-btn`, `.expense-row.editing-row`
  </action>
  <verify>
```bash
# Verify files exist
test -f public/index.html && test -f public/style.css && echo "FILES EXIST OK"

# Verify key HTML elements
grep -n 'expense-form' public/index.html && \
grep -n 'expense-list' public/index.html && \
grep -n 'total-amount' public/index.html && \
grep -n 'amount-error' public/index.html && \
grep -n 'app.js' public/index.html && \
grep -n 'style.css' public/index.html && \
echo "HTML STRUCTURE OK"

# Verify edit-related elements present
grep -n 'edit-indicator' public/index.html && \
grep -n 'cancel-btn' public/index.html && \
echo "EDIT ELEMENTS IN HTML OK"

# Verify CSS has responsive breakpoint
grep -n '@media' public/style.css && echo "RESPONSIVE OK"

# Verify CSS has key classes
grep -n 'expense-form\|form-section' public/style.css && \
grep -n 'expense-list\|list-section' public/style.css && \
grep -n 'total-display\|total-amount' public/style.css && \
grep -n 'error-message' public/style.css && \
grep -n 'toast' public/style.css && \
echo "CSS CLASSES OK"

# Verify no restrictive framing headers in HTML
! grep -i 'frame-ancestors\|X-Frame-Options' public/index.html && echo "NO FRAME RESTRICTIONS IN HTML OK"
```
  </verify>
  <done>
- `public/index.html` exists with single-page layout: header, total display, expense form (add mode only), expense list, toast container
- Form has amount (type=number, step=0.01), description (type=text, maxlength=500), category (type=text, maxlength=100) inputs with labels
- Each input has a corresponding error-message span with role="alert"
- Tab order: amount → description → category → submit (US-5.4)
- `novalidate` on form — custom validation in JS, not browser defaults
- Edit indicator (`#edit-indicator`) with `aria-live="polite"` — hidden by default
- Cancel button (`#cancel-btn`) with `aria-label="Cancel editing"` — hidden by default
- Form actions container (`.form-actions`) holds submit and cancel buttons
- Script loaded with `defer` — no render blocking
- `public/style.css` exists with responsive layout (flex row on desktop, column on mobile via @media max-width: 768px)
- Total display is prominent (dark background, large font)
- Validation error styles: red border on input, red text below
- Toast styles: fixed top-right, green for success, red for error, slide-in animation
- Empty state styled: centered text, muted color
- Edit mode styles: `.edit-indicator` (blue left border banner), `.form-section.editing` (blue left border), `#cancel-btn` (gray button), `.expense-edit-btn` (blue outline button per row), `.expense-row.editing-row` (light blue background)
- No restrictive framing meta tags (sandbox proxy compatibility)
  </done>

  <feature_dependencies>
  Implements: F5: Web-Based UI (single-page layout, responsive design, keyboard-accessible elements, visual hierarchy), F3: Expense List Display (list container with empty state), F4: Total Amount Display (always-visible total section with $0.00 default), F0: Expense Entry (form structure with validation error placeholders), F1: Expense Editing (edit indicator, cancel button, form actions container — all hidden by default, shown by app.js)
  Depends on: F2 (server.js serves public/ directory via express.static from Wave 1/2)
  Enables: Task 2 of this plan (app.js needs these DOM elements to manipulate)
  </feature_dependencies>
</task>

<task type="auto">
  <name>Task 2: Client-side JavaScript — API calls, form handling, edit mode, list rendering, total calculation, validation, and error display</name>
  <files>public/app.js</files>
  <action>
**Create `public/app.js`** — vanilla JavaScript handling all client-side behavior per TechArch §2 Frontend Components.

This file is the ONLY JavaScript file. No imports, no modules, no build step. It runs in the browser after the DOM is loaded.

The code must implement these responsibilities (from TechArch §2 Application Logic table):

**1. Initialization (DOMContentLoaded):**
```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM references
  const form = document.getElementById('expense-form');
  const amountInput = document.getElementById('amount');
  const descriptionInput = document.getElementById('description');
  const categoryInput = document.getElementById('category');
  const submitBtn = document.getElementById('submit-btn');
  const totalAmountEl = document.getElementById('total-amount');
  const expenseListEl = document.getElementById('expense-list');
  const toastContainer = document.getElementById('toast-container');
  const cancelBtn = document.getElementById('cancel-btn');
  const editIndicator = document.getElementById('edit-indicator');
  const formSection = document.querySelector('.form-section');

  // State — in-memory array of expenses (populated from API)
  let expenses = [];
  let editingExpenseId = null; // null = add mode, number = edit mode

  // Auto-focus amount field on load (UX-Mockup Flow 2, US-5.2)
  amountInput.focus();

  // Load expenses from API
  loadExpenses();

  // Attach form submit handler
  form.addEventListener('submit', handleSubmit);

  // Attach cancel button handler (edit mode)
  cancelBtn.addEventListener('click', exitEditMode);

  // Escape key exits edit mode (UX-Mockup accessibility)
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editingExpenseId !== null) {
      exitEditMode();
    }
  });
  // ... rest of initialization
});
```

**2. API Communication — `loadExpenses()`:**
- Calls `GET /api/expenses` via `fetch()`
- On success (200): Parse response, store `expenses` array in memory, call `renderExpenses()` and `updateTotal()`
- On error (500 or network): Show error state in list area with Retry button (UX-Mockup Error State layout), show "—" for total (US-4.4)
- While loading: Show a loading indicator in the list area (UX-Mockup Loading State)

```javascript
async function loadExpenses() {
  // Show loading state
  expenseListEl.innerHTML = '';
  const loadingEl = document.createElement('p');
  loadingEl.className = 'loading-state';
  loadingEl.textContent = 'Loading expenses...';
  expenseListEl.appendChild(loadingEl);
  totalAmountEl.textContent = '...';

  try {
    const response = await fetch('/api/expenses');
    if (!response.ok) {
      throw new Error('Server error');
    }
    const data = await response.json();
    expenses = data.expenses;
    renderExpenses();
    updateTotal();
  } catch (err) {
    // Show error state (UX-Mockup Error State, US-3.4)
    expenseListEl.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'list-error';

    const errorMsg = document.createElement('p');
    // Distinguish network error from server error (US-5.5)
    errorMsg.textContent = err.message === 'Failed to fetch'
      ? 'Unable to connect to the server. Check your connection and try again.'
      : 'Failed to load expenses. Please try again.';
    errorDiv.appendChild(errorMsg);

    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', loadExpenses);
    errorDiv.appendChild(retryBtn);

    expenseListEl.appendChild(errorDiv);
    totalAmountEl.textContent = '\u2014'; // em dash "—" (US-4.4)
  }
}
```

**3. Form Handling — `handleSubmit(event)`:**
- Prevent default form submission
- Run client-side validation (`validateForm()`)
- If validation fails: show inline errors, focus first invalid field, stop
- If validation passes: disable submit button (show "Saving..."), POST to API
- On 201: clear form, prepend expense to `expenses` array, re-render list, update total, show success toast, focus amount field (US-0.1, US-0.2 batch flow)
- On 400: show server validation errors inline (in case client validation missed something)
- On 500/network: show error toast, retain form values (FRD F0 step 13)

```javascript
async function handleSubmit(event) {
  event.preventDefault();

  // Clear previous errors
  clearErrors();

  // Client-side validation
  const errors = validateForm();
  if (errors.length > 0) {
    displayErrors(errors);
    return;
  }

  // Disable button during request (UX-Mockup: "Saving..." label)
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const isEditing = editingExpenseId !== null;
  const url = isEditing
    ? '/api/expenses/' + editingExpenseId
    : '/api/expenses';
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(amountInput.value),
        description: descriptionInput.value,
        category: categoryInput.value
      })
    });

    const data = await response.json();

    if (response.status === 201) {
      // Add success — FRD F0 step 12
      expenses.unshift(data.expense); // Prepend (most recent first)
      renderExpenses();
      updateTotal();
      form.reset(); // Clear all fields
      showToast('Expense added!', 'success');
      amountInput.focus(); // Return focus for batch entry (US-0.2)
    } else if (response.status === 200 && isEditing) {
      // Edit success — FRD F1 step 6i
      const idx = expenses.findIndex(e => e.id === editingExpenseId);
      if (idx !== -1) {
        expenses[idx] = data.expense; // Update in-place (row position unchanged)
      }
      renderExpenses();
      updateTotal();
      exitEditMode();
      showToast('Expense updated!', 'success');
      amountInput.focus();
    } else if (response.status === 400 && data.errors) {
      // Server validation errors — display inline
      displayServerErrors(data.errors);
    } else if (response.status === 400 && data.error && data.error.code === 'ERR_EXPENSE_INVALID_ID') {
      showToast('Invalid expense ID.', 'error');
    } else if (response.status === 404 && data.error && data.error.code === 'ERR_EXPENSE_NOT_FOUND') {
      // US-1.4: Expense not found — form retains values for re-entry
      showToast('Expense not found. It may have been deleted.', 'error');
    } else {
      // Unexpected error
      showToast(isEditing ? 'Failed to update expense. Please try again.' : 'Failed to save expense. Please try again.', 'error');
    }
  } catch (err) {
    // Network error — US-5.5
    showToast('Unable to connect to the server. Check your connection and try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEditing ? 'Save Changes' : 'Add Expense';
  }
}
```

**4. Client-Side Validation — `validateForm()`:**
Must match FRD Y2 error catalog EXACTLY (same error messages):

```javascript
function validateForm() {
  const errors = [];
  const amount = amountInput.value.trim();
  const description = descriptionInput.value;
  const category = categoryInput.value;

  // Amount validation
  if (amount === '') {
    errors.push({ field: 'amount', message: 'Amount is required' });
  } else if (isNaN(parseFloat(amount)) || !isFinite(amount)) {
    errors.push({ field: 'amount', message: 'Amount must be a valid number' });
  } else {
    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      errors.push({ field: 'amount', message: 'Amount must be greater than zero' });
    }
    if (numAmount > 999999.99) {
      errors.push({ field: 'amount', message: 'Amount must not exceed 999,999.99' });
    }
    // Precision check — more than 2 decimal places
    const parts = amount.split('.');
    if (parts.length === 2 && parts[1].length > 2) {
      errors.push({ field: 'amount', message: 'Amount must have at most two decimal places' });
    }
  }

  // Description validation
  if (!description || description.trim() === '') {
    errors.push({ field: 'description', message: 'Description is required' });
  } else if (description.length > 500) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  // Category validation
  if (!category || category.trim() === '') {
    errors.push({ field: 'category', message: 'Category is required' });
  } else if (category.length > 100) {
    errors.push({ field: 'category', message: 'Category must not exceed 100 characters' });
  }

  return errors;
}
```

**5. Error Display — `displayErrors()`, `displayServerErrors()`, `clearErrors()`:**

```javascript
function clearErrors() {
  document.querySelectorAll('.error-message').forEach(el => { el.textContent = ''; });
  document.querySelectorAll('.input-error').forEach(el => { el.classList.remove('input-error'); });
}

function displayErrors(errors) {
  errors.forEach(err => {
    const errorEl = document.getElementById(err.field + '-error');
    const inputEl = document.getElementById(err.field);
    if (errorEl) errorEl.textContent = err.message;
    if (inputEl) inputEl.classList.add('input-error');
  });
  // Focus first invalid field (UX-Mockup Interaction Pattern: Form Submission step 3)
  if (errors.length > 0) {
    const firstField = document.getElementById(errors[0].field);
    if (firstField) firstField.focus();
  }
}

function displayServerErrors(serverErrors) {
  // Map server error codes to field names
  const fieldMap = {
    'ERR_EXPENSE_AMOUNT_REQUIRED': 'amount',
    'ERR_EXPENSE_INVALID_AMOUNT': 'amount',
    'ERR_EXPENSE_AMOUNT_POSITIVE': 'amount',
    'ERR_EXPENSE_AMOUNT_TOO_LARGE': 'amount',
    'ERR_EXPENSE_AMOUNT_PRECISION': 'amount',
    'ERR_EXPENSE_DESC_REQUIRED': 'description',
    'ERR_EXPENSE_DESC_TOO_LONG': 'description',
    'ERR_EXPENSE_CAT_REQUIRED': 'category',
    'ERR_EXPENSE_CAT_TOO_LONG': 'category'
  };
  const mappedErrors = serverErrors.map(e => ({
    field: fieldMap[e.code] || 'amount',
    message: e.message
  }));
  displayErrors(mappedErrors);
}
```

**6. List Rendering — `renderExpenses()`:**

```javascript
function renderExpenses() {
  expenseListEl.innerHTML = ''; // Clear current content

  if (expenses.length === 0) {
    // Empty state (US-3.2, UX-Mockup Empty State)
    const emptyEl = document.createElement('p');
    emptyEl.className = 'empty-state';
    emptyEl.textContent = 'No expenses yet. Add your first expense above!';
    expenseListEl.appendChild(emptyEl);
    return;
  }

  // Render each expense as a row (US-3.1)
  expenses.forEach(expense => {
    const row = document.createElement('div');
    row.className = 'expense-row';

    const amountEl = document.createElement('span');
    amountEl.className = 'expense-amount';
    amountEl.textContent = formatCurrency(expense.amount); // cents → $X.XX

    const descEl = document.createElement('span');
    descEl.className = 'expense-description';
    descEl.textContent = expense.description; // textContent for XSS prevention (TechArch §5)

    const catEl = document.createElement('span');
    catEl.className = 'expense-category';
    catEl.textContent = expense.category; // textContent for XSS prevention

    // Edit button (US-1.1)
    const editBtn = document.createElement('button');
    editBtn.className = 'expense-edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', 'Edit expense: ' + expense.description);
    editBtn.addEventListener('click', () => enterEditMode(expense.id));

    row.appendChild(amountEl);
    row.appendChild(descEl);
    row.appendChild(catEl);
    row.appendChild(editBtn);

    // Highlight row if it's being edited
    if (expense.id === editingExpenseId) {
      row.classList.add('editing-row');
    }

    expenseListEl.appendChild(row);
  });
}
```

**CRITICAL: XSS Prevention (TechArch §5):** ALL user-provided text (description, category) MUST be rendered via `textContent`, NEVER `innerHTML`. The `renderExpenses()` function uses `document.createElement()` + `.textContent =` exclusively. Do NOT use template literals with `innerHTML` or `insertAdjacentHTML` for user data.

**7. Total Calculation — `updateTotal()`:**

```javascript
function updateTotal() {
  // Sum all amounts using integer cents arithmetic (US-4.1, FRD F4 process step 1)
  const totalCents = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  totalAmountEl.textContent = formatCurrency(totalCents);
}

function formatCurrency(cents) {
  // Convert cents to dollars and format (US-4.1: $X,XXX.XX)
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars);
}
```

Key: Total calculation uses integer cents arithmetic (sum all `amount` values which are already in cents). Only divide by 100 for display formatting. This avoids floating-point drift (FRD F4, PRD Risk: Floating-point errors).

**8. Toast Notifications — `showToast()`:**

```javascript
function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Auto-dismiss after 2 seconds (UX-Mockup Success Toast pattern)
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
```

Toast does NOT steal focus — the user can continue typing immediately (UX-Mockup Toast pattern requirement 6).

**9. Edit Mode — `enterEditMode(id)` and `exitEditMode()`:**

```javascript
function enterEditMode(id) {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;

  editingExpenseId = id;

  // Populate form with current values (amount in dollars, not cents)
  amountInput.value = (expense.amount / 100).toFixed(2);
  descriptionInput.value = expense.description;
  categoryInput.value = expense.category;

  // UI transitions to edit mode
  submitBtn.textContent = 'Save Changes';
  submitBtn.setAttribute('aria-label', 'Save changes to expense');
  cancelBtn.style.display = 'inline-block';
  editIndicator.style.display = 'block';
  formSection.classList.add('editing');

  // Highlight the row being edited
  renderExpenses();

  // Clear any previous errors
  clearErrors();

  // Focus amount field (UX-Mockup: focus moves to amount on edit)
  amountInput.focus();
  amountInput.select(); // Select value for easy overwrite
}

function exitEditMode() {
  editingExpenseId = null;

  // Reset form to add mode
  form.reset();
  submitBtn.textContent = 'Add Expense';
  submitBtn.removeAttribute('aria-label');
  cancelBtn.style.display = 'none';
  editIndicator.style.display = 'none';
  formSection.classList.remove('editing');

  // Remove row highlight
  renderExpenses();

  // Clear any errors
  clearErrors();

  // Focus amount field
  amountInput.focus();
}
```

Key edit mode behavior:
- `enterEditMode(id)`: Populates the form with the expense's current values (converting cents back to dollars for display). Changes button labels, shows Cancel button and edit indicator. Highlights the row being edited.
- `exitEditMode()`: Clears the form, reverts button labels, hides Cancel button and indicator. Does NOT make any server call (US-1.2).
- If the user clicks Edit on a different row while already editing, `enterEditMode(newId)` is called — it switches to the new expense without requiring Cancel first (UX-Mockup: "Switching between edits").
- Escape key exits edit mode (handled by form keydown listener).

**10. Global Error Handler:**

```javascript
window.addEventListener('error', () => {
  // Fallback for unhandled JS errors (US-5.5)
  const existing = document.querySelector('.global-error');
  if (!existing) {
    const errorBanner = document.createElement('div');
    errorBanner.className = 'global-error';
    errorBanner.textContent = 'Something went wrong. Please refresh the page.';
    errorBanner.style.cssText = 'background:#e74c3c;color:white;padding:12px;text-align:center;position:fixed;top:0;left:0;right:0;z-index:9999;';
    document.body.prepend(errorBanner);
  }
});
```

**All code must be inside the DOMContentLoaded callback** (or defined at module scope and called from it). The entire file should be a self-contained IIFE or DOMContentLoaded handler.
  </action>
  <verify>
```bash
# Verify file exists
test -f public/app.js && echo "FILE EXISTS OK"

# Verify key functions exist
grep -n 'loadExpenses\|handleSubmit\|renderExpenses\|updateTotal\|validateForm\|formatCurrency\|showToast\|enterEditMode\|exitEditMode' public/app.js && echo "FUNCTIONS OK"

# Verify XSS prevention — uses textContent, not innerHTML for user data
grep -c 'textContent' public/app.js && echo "TEXTCONTENT USED"
# innerHTML should only appear in clearing operations (expenseListEl.innerHTML = ''), not for user data
grep -n 'innerHTML' public/app.js

# Verify fetch calls to correct API endpoints
grep -n "fetch.*api/expenses" public/app.js && echo "FETCH CALLS OK"

# Verify POST with correct content type
grep -n "Content-Type.*application/json" public/app.js && echo "POST CONTENT TYPE OK"

# Verify PUT/edit references present (F1 included)
grep -n 'PUT\|enterEditMode\|exitEditMode\|editingExpenseId' public/app.js && echo "EDIT CODE PRESENT OK"

# Verify validation messages match FRD Y2 exactly
grep -n 'Amount is required' public/app.js && \
grep -n 'Amount must be a valid number' public/app.js && \
grep -n 'Amount must be greater than zero' public/app.js && \
grep -n 'Description is required' public/app.js && \
grep -n 'Category is required' public/app.js && \
echo "VALIDATION MESSAGES OK"

# Verify cents arithmetic for total (not floating point)
grep -n 'reduce.*amount\|\.amount' public/app.js && echo "CENTS ARITHMETIC OK"

# Verify Intl.NumberFormat for currency formatting
grep -n 'Intl.NumberFormat' public/app.js && echo "CURRENCY FORMAT OK"

# Verify empty state message
grep -n 'No expenses yet' public/app.js && echo "EMPTY STATE OK"

# Verify toast auto-dismiss (2 seconds)
grep -n '2000' public/app.js && echo "TOAST TIMEOUT OK"

# Integration test — start server and verify page loads with JS
npm install 2>/dev/null
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm

timeout 10 node server.js &
SERVER_PID=$!
sleep 2

# Check page loads
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
echo "PAGE STATUS: $HTTP_STATUS"
test "$HTTP_STATUS" = "200" && echo "PAGE LOADS OK"

# Check HTML contains key elements
curl -s http://localhost:3000/ | grep -q 'expense-form' && echo "FORM PRESENT OK"
curl -s http://localhost:3000/ | grep -q 'total-amount' && echo "TOTAL PRESENT OK"

# Check CSS and JS load
CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/style.css)
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/app.js)
echo "CSS: $CSS_STATUS, JS: $JS_STATUS"
test "$CSS_STATUS" = "200" && test "$JS_STATUS" = "200" && echo "ASSETS LOAD OK"

# Test POST via API (verify app.js will work with this contract)
POST_RESULT=$(curl -s -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"amount": 10.50, "description": "Test lunch", "category": "Food"}')
echo "POST RESULT: $POST_RESULT"
echo "$POST_RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('API OK:', d.expense && d.expense.amount === 1050)"

# Test GET (verify list data shape)
GET_RESULT=$(curl -s http://localhost:3000/api/expenses)
echo "$GET_RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('LIST OK:', Array.isArray(d.expenses) && d.expenses.length >= 1)"

kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm

echo "VERIFY COMPLETE"
```
  </verify>
  <done>
- `public/app.js` exists with all client-side logic in a single vanilla JS file (no build step)
- On page load: fetches `GET /api/expenses`, renders list (with Edit buttons per row), calculates total, auto-focuses amount field
- Add mode submit: client-side validation → POST → clear form → prepend to list → update total → show toast ("Expense added!") → focus amount
- Edit mode submit: client-side validation → PUT /api/expenses/:id → update row in-place → recalculate total → exit edit mode → show toast ("Expense updated!") → focus amount
- Edit button per row: clicking Edit populates form with expense's current values (amount in dollars), shows "Save Changes" + "Cancel" buttons, shows edit indicator, highlights row
- Cancel button: discards changes without server call, returns form to add mode, clears form
- Escape key exits edit mode
- Clicking Edit on different row while editing switches to new expense without requiring Cancel first
- Client validation messages match FRD Y2 EXACTLY: "Amount is required", "Amount must be a valid number", "Amount must be greater than zero", "Amount must not exceed 999,999.99", "Amount must have at most two decimal places", "Description is required", "Description must not exceed 500 characters", "Category is required", "Category must not exceed 100 characters"
- Multiple validation errors displayed simultaneously (US-0.3)
- Server validation errors (400) mapped to inline field errors via error code → field mapping
- Submit button disabled with "Saving..." during POST request
- Empty state: "No expenses yet. Add your first expense above!" with $0.00 total
- Loading state: "Loading expenses..." with "..." total
- Error state: friendly message + Retry button, total shows "—"
- Network errors: "Unable to connect to the server. Check your connection and try again."
- Server errors: "Failed to save expense. Please try again." (toast) or "Failed to load expenses. Please try again." (list area)
- Total calculation: integer cents sum via `reduce()`, divided by 100 only for display via `Intl.NumberFormat`
- Currency formatting: `$X,XXX.XX` format via `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`
- XSS prevention: ALL user text rendered via `textContent`, NEVER `innerHTML` (TechArch §5)
- Toast notifications: top-right, green for success ("Expense added!"), red for errors, auto-dismiss after 2 seconds, does not steal focus
- Global error handler: catches unhandled JS errors, shows "Something went wrong. Please refresh the page."
- Keyboard flow: amount → description → category → submit, Enter submits form
- Page loads at http://localhost:3000 with all three assets (HTML, CSS, JS) returning 200
- Edit mode includes: enterEditMode(id) populates form, exitEditMode() clears form, PUT calls for updates, edit indicator banner, Cancel button, row highlight, "Save Changes" label
  </done>

  <feature_dependencies>
  Implements: F0: Expense Entry (form submit handler, POST /api/expenses, client-side validation, form clear, success feedback), F1: Expense Editing (Edit button per row, enterEditMode/exitEditMode, PUT /api/expenses/:id, Save Changes/Cancel buttons, edit indicator, row highlight, 404 handling), F3: Expense List Display (GET /api/expenses on load, render rows with currency amounts and Edit buttons, empty state, error state with retry, XSS-safe rendering), F4: Total Amount Display (cents arithmetic sum, currency formatting via Intl.NumberFormat, $0.00 default, "—" on error, updates after add and edit), F5: Web-Based UI (single-page behavior, keyboard navigation, responsive, graceful error handling, global error handler)
  Depends on: F2 (API endpoints from Wave 2 — GET /api/expenses returns { expenses: [] }, POST /api/expenses returns { expense: {...} }, PUT /api/expenses/:id returns { expense: {...} } or 404)
  Enables: Wave 4 integration testing (Playwright tests can interact with the full UI including edit mode)
  </feature_dependencies>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| API→DOM | Expense data from GET /api/expenses response rendered into the page DOM |
| user input→API | Form field values sent as JSON to POST /api/expenses |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Tampering (XSS via stored data) | public/app.js — renderExpenses() | mitigate | All user-provided text (description, category) inserted into the DOM via `element.textContent = value`, never via `innerHTML`, `insertAdjacentHTML`, or template literals rendered as HTML. The `renderExpenses()` function uses `document.createElement()` + `.textContent` exclusively, including for Edit button aria-labels. Grep for `textContent` confirms; any `innerHTML` usage is limited to clearing containers (`innerHTML = ''`) with no user data. |
| T-03-02 | Information Disclosure (error details in UI) | public/app.js — error handlers | mitigate | Catch blocks in `handleSubmit()` and `loadExpenses()` display only user-friendly messages ("Failed to save expense. Please try again."), never raw error objects, stack traces, or API internals. Error messages match FRD Y2 catalog exactly. |
| T-03-03 | Tampering (client-side validation bypass) | public/app.js — validateForm() | accept | Client-side validation is convenience only (UX). Server-side validation in `middleware/validate.js` (Wave 2) is authoritative and re-checks all rules. A user bypassing client validation via DevTools will be caught by server validation returning 400 with structured errors, which `displayServerErrors()` handles. Owner: TechArch §1 decision "Server-side validation as authority". |
| T-03-04 | Denial of Service (rapid form submission) | public/app.js — handleSubmit() | mitigate | Submit button is disabled (`submitBtn.disabled = true`) during the POST request and re-enabled only after the response is received (in the `finally` block). This prevents double-submission and rapid-fire requests. Combined with server-side single-threaded SQLite writes, this is sufficient for a single-user app. |
</threat_model>

<verification>
```bash
# Full frontend integration verification
npm install 2>/dev/null
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm

# Start server
timeout 20 node server.js &
SERVER_PID=$!
sleep 2

# 1. Page loads with correct status
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
test "$STATUS" = "200" && echo "1. Page loads: PASS" || echo "1. Page loads: FAIL ($STATUS)"

# 2. HTML contains required sections
HTML=$(curl -s http://localhost:3000/)
echo "$HTML" | grep -q 'expense-form' && echo "2a. Form present: PASS" || echo "2a. Form present: FAIL"
echo "$HTML" | grep -q 'total-amount' && echo "2b. Total present: PASS" || echo "2b. Total present: FAIL"
echo "$HTML" | grep -q 'expense-list' && echo "2c. List present: PASS" || echo "2c. List present: FAIL"
echo "$HTML" | grep -q 'Expense Tracker' && echo "2d. Title present: PASS" || echo "2d. Title present: FAIL"

# 3. CSS and JS assets load
CSS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/style.css)
JS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/app.js)
test "$CSS" = "200" && test "$JS" = "200" && echo "3. Assets load: PASS" || echo "3. Assets load: FAIL (CSS=$CSS, JS=$JS)"

# 4. API still works (POST + GET round-trip)
POST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"amount":25.50,"description":"Grocery shopping","category":"Food"}')
test "$POST_STATUS" = "201" && echo "4a. POST works: PASS" || echo "4a. POST works: FAIL ($POST_STATUS)"

GET_BODY=$(curl -s http://localhost:3000/api/expenses)
echo "$GET_BODY" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
if(d.expenses.length===1 && d.expenses[0].amount===2550 && d.expenses[0].description==='Grocery shopping') {
  console.log('4b. GET returns correct data: PASS');
} else {
  console.log('4b. GET returns correct data: FAIL');
}
"

# 5. Validation still works (POST with empty body)
VAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' -d '{}')
test "$VAL_STATUS" = "400" && echo "5. Validation returns 400: PASS" || echo "5. Validation returns 400: FAIL ($VAL_STATUS)"

# 6. Edit mode references present in frontend files
grep -q 'enterEditMode\|editingExpenseId' public/app.js && echo "6. Edit mode code present: PASS" || echo "6. Edit mode code: FAIL"
grep -q 'cancel-btn\|edit-indicator' public/index.html && echo "6b. Edit HTML elements present: PASS" || echo "6b. Edit HTML elements: FAIL"

# 7. XSS prevention — textContent used for user data
grep -c 'textContent' public/app.js | xargs -I{} test {} -ge 5 && echo "7. XSS prevention (textContent): PASS" || echo "7. XSS prevention: CHECK MANUALLY"

# 8. Security headers present on HTML page
HEADERS=$(curl -sI http://localhost:3000/)
echo "$HEADERS" | grep -qi "x-content-type-options" && echo "8. Security headers: PASS" || echo "8. Security headers: FAIL"

kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
rm -f data/expenses.db data/expenses.db-wal data/expenses.db-shm

echo "VERIFICATION COMPLETE"
```
</verification>

<success_criteria>
1. `public/index.html` serves at `http://localhost:3000/` with 200 status
2. `public/style.css` and `public/app.js` load successfully (200 status each)
3. Page displays "Expense Tracker" header, total display ($0.00 default), expense form, and expense list (empty state)
4. User can enter amount, description, category and submit — expense appears in list, total updates, form clears, focus returns to amount
5. Expense list shows items in reverse-chronological order with currency-formatted amounts ($X,XXX.XX)
6. Client-side validation shows all 9 error messages from FRD Y2 inline below the respective field
7. Server validation errors (400) are correctly mapped to inline field errors
8. Empty state shows "No expenses yet. Add your first expense above!" and total shows $0.00
9. Error state shows friendly message + Retry button, total shows "—"
10. Toast notifications appear top-right: green "Expense added!" for success, red for errors, auto-dismiss after 2 seconds
11. Total uses cents arithmetic (integer sum / 100) via `Intl.NumberFormat` — no floating-point drift
12. All user text rendered via `textContent` (never `innerHTML`) for XSS prevention
13. Layout is responsive: form fields in row on desktop, stacked on mobile (≤768px)
14. Keyboard navigation: amount → description → category → submit, Enter submits
15. Edit button on each expense row, clicking Edit populates form with current values and switches to edit mode
16. Edit mode: "Save Changes" button, "Cancel" button, edit indicator banner, highlighted row
17. Cancel button exits edit mode without server call, form returns to add mode
18. Escape key exits edit mode
19. PUT /api/expenses/:id called on edit save, response updates row in-place, total recalculates
20. 404 on PUT shows "Expense not found" toast, form retains values
21. Submit button disabled with "Saving..." during API request
22. Global error handler catches unhandled JS errors with fallback message
</success_criteria>

<output>
After completion, create `.planning/express/build-a-simple-expense-tracker-that-allo/03-SUMMARY.md`
</output>
