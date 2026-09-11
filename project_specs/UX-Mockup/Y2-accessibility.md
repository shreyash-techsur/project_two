---

## Accessibility Notes

**User Stories:** US-5.4, US-5.5

### Color Contrast

- All text must meet WCAG 2.1 AA contrast ratio of at least 4.5:1 against its background.
- Error messages (red text) must maintain sufficient contrast — avoid pure red on white; use darker red (e.g., `#d32f2f` on `#ffffff` = 5.7:1).
- Success toast (green text/background) must be readable — use dark green text on light green background, or white text on dark green.
- The "—" error state for the total display must be visually distinct from a valid number (not just a color difference — the dash character itself communicates the error state, satisfying non-color-dependent communication).

### Keyboard Navigation

- **Tab order:** Amount field → Description field → Category field → Submit button → (Cancel button if in edit mode) → Expense list rows (Edit buttons)
- **Enter key:** Submits the form when focus is on any form field or the submit button.
- **Escape key (recommended):** Exits edit mode (equivalent to clicking Cancel) when focus is in the form during edit mode.
- **All interactive elements** (buttons, inputs) must be reachable via keyboard Tab navigation.
- **No keyboard traps:** Tab must cycle through all interactive elements and eventually return to the beginning of the page.
- **Focus ring:** All focusable elements must show a visible focus indicator (browser default or custom outline). Do not suppress `outline: none` without providing a visible alternative.

### Screen Reader Considerations

- **Form labels:** Each input field must have an associated `<label>` element (using `for`/`id` pairing or wrapping the input).
  - Amount: `<label for="amount">Amount ($)</label>`
  - Description: `<label for="description">Description</label>`
  - Category: `<label for="category">Category</label>`
- **Error messages:** Validation error messages should use `aria-describedby` linked to the corresponding input so screen readers announce the error when the field is focused. Additionally, use `aria-invalid="true"` on the invalid field.
- **Form mode announcement:** When switching to edit mode, use `aria-live="polite"` on the form mode indicator so screen readers announce "Editing expense" or "Adding new expense."
- **Running total:** The total display area should use `aria-live="polite"` so changes are announced without interrupting the user. Label it with `aria-label="Total expenses"`.
- **Success toast:** Use `role="status"` and `aria-live="polite"` so the confirmation is announced by screen readers.
- **Expense list:** Use semantic HTML:
  - A `<table>` (or `role="table"`) with headers for Amount, Description, Category, and Actions.
  - Each Edit button should include accessible text: `aria-label="Edit expense: [description]"` to distinguish between rows.
- **Empty state:** The "No expenses yet" message should be within the list area so screen readers find it where they'd expect list content.
- **Error states:** Use `role="alert"` for critical error messages (server errors, load failures) so they are immediately announced. Use `aria-live="polite"` for non-critical status changes.

### ARIA Labels Needed

| Element | ARIA Attribute | Value |
|---------|---------------|-------|
| Amount input | `aria-label` or `<label>` | "Amount in dollars" |
| Description input | `aria-label` or `<label>` | "Expense description" |
| Category input | `aria-label` or `<label>` | "Expense category" |
| Submit button (add mode) | `aria-label` | "Add expense" (if button text is not descriptive enough) |
| Submit button (edit mode) | `aria-label` | "Save changes to expense" |
| Cancel button | `aria-label` | "Cancel editing" |
| Edit button (per row) | `aria-label` | "Edit expense: {description}" |
| Retry button | `aria-label` | "Retry loading expenses" |
| Total display | `aria-live="polite"`, `aria-label` | "Total expenses: $X,XXX.XX" |
| Success toast | `role="status"`, `aria-live="polite"` | (content is the message text) |
| Error messages | `role="alert"` | (content is the error text) |
| Form mode indicator | `aria-live="polite"` | "Editing expense" or hidden when in add mode |
| Expense list table | `role="table"` or `<table>` | Table with column headers |
| Validation errors | `aria-describedby` on input | Error message ID linked to the input |
| Invalid fields | `aria-invalid="true"` | Set when validation fails; removed on correction |

### Semantic HTML Guidelines

- Use `<main>` for the primary content area.
- Use `<header>` for the app title.
- Use `<form>` for the expense entry/edit form with proper `<label>` elements.
- Use `<table>` with `<thead>` and `<tbody>` for the expense list (or an equally semantic structure with ARIA roles if using a non-table layout).
- Use `<button>` (not `<div>` or `<span>`) for all clickable actions.
- Use `<input type="number">` for the amount field (provides native numeric keyboard on mobile).
- Use `<h1>` for the app title, `<h2>` for section labels (Total, Add Expense, Expenses) if visible section headings are used, or visually-hidden headings for screen reader landmarks.

