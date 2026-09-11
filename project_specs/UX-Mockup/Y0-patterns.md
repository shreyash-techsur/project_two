---

## Interaction Patterns

### Pattern: Form Submission with Inline Validation

**When to use:** Every form submit action (add expense, save edit)
**User Stories:** US-0.3, US-5.5
**Behavior:**

1. User clicks submit (or presses Enter).
2. Client-side validation runs on all fields simultaneously.
3. If any field is invalid:
   - The field's border changes to red.
   - An error message appears directly below the field in red text (e.g., "Amount is required").
   - Multiple errors can appear at once (all invalid fields show their respective messages).
   - The form retains all entered values — nothing is cleared.
   - Focus moves to the first invalid field.
4. If all fields are valid:
   - The submit button becomes disabled and shows a loading indicator (e.g., "Saving..." or a small spinner).
   - The request is sent to the server.
   - On success: form clears, list updates, total updates, success toast appears.
   - On server error: error message appears (toast or banner), form retains values for retry.
5. The submit button re-enables after the server responds (success or error).

**Validation error messages** (from FRD Y2 Error Catalog):

| Field | Condition | Message |
|-------|-----------|---------|
| Amount | Empty | "Amount is required" |
| Amount | Not numeric | "Amount must be a valid number" |
| Amount | Zero or negative | "Amount must be greater than zero" |
| Amount | Exceeds 999,999.99 | "Amount must not exceed 999,999.99" |
| Amount | More than 2 decimals | "Amount must have at most two decimal places" |
| Description | Empty | "Description is required" |
| Description | Over 500 chars | "Description must not exceed 500 characters" |
| Category | Empty | "Category is required" |
| Category | Over 100 chars | "Category must not exceed 100 characters" |

---

### Pattern: Form Mode Toggle (Add ↔ Edit)

**When to use:** Switching between adding a new expense and editing an existing one
**User Stories:** US-1.1, US-1.2
**Behavior:**

1. **Entering edit mode:**
   - User clicks "Edit" on an expense row.
   - The form fields populate with the expense's current values (amount in dollars, description, category).
   - The submit button label changes from "Add Expense" to "Save Changes".
   - A "Cancel" button appears next to "Save Changes".
   - A visual indicator appears (e.g., a colored left border on the form or a small "Editing expense" banner at the top of the form).
   - The corresponding expense row in the list gets a subtle highlight (e.g., light background color) to show which entry is being edited.
   - Focus moves to the amount field.

2. **Exiting edit mode (save):**
   - After a successful save, the form clears and returns to add mode.
   - The submit button label reverts to "Add Expense".
   - The "Cancel" button disappears.
   - The edit indicator disappears.
   - The row highlight is removed and the row shows updated values.

3. **Exiting edit mode (cancel):**
   - No server request is made.
   - The form clears and returns to add mode.
   - The expense list and total remain unchanged.
   - All visual edit indicators are removed.

4. **Switching between edits:**
   - If the user clicks "Edit" on a different row while already in edit mode, the form updates to the new expense's values without requiring a cancel first. No changes to the previously selected expense are saved.

---

### Pattern: Optimistic List Update

**When to use:** After successful add or edit operations
**User Stories:** US-3.3, US-4.2, US-4.3
**Behavior:**

1. The server responds with the full expense object (including `id`, `created_at`, `updated_at`).
2. For **add**: The new expense is prepended to the top of the list (most recent first ordering). The total increases by the new amount.
3. For **edit**: The existing row updates in-place with the new values. No row moves position (the list order is by `created_at` which doesn't change on edit). The total adjusts by the difference between old and new amounts.
4. The DOM update happens without a full page reload. No additional GET request is required.
5. If the list was previously showing the empty state, it transitions to showing the first expense row.

---

### Pattern: Success Toast

**When to use:** After successful add or edit operations
**User Stories:** US-0.1, US-1.1
**Behavior:**

1. A small toast notification appears in the top-right corner of the viewport.
2. The toast has a green/success color scheme.
3. **Add:** Message reads "Expense added!"
4. **Edit:** Message reads "Expense updated!"
5. The toast auto-dismisses after 2 seconds (slides out or fades).
6. The toast does NOT steal focus — the user can continue typing in the form immediately.
7. Multiple toasts stack if the user submits rapidly (but practically, this is unlikely given the 2-second timeout).
8. The toast is decorative/informational — it does not require user interaction to dismiss.

---

### Pattern: Error Display

**When to use:** Server errors (500), network errors, not-found errors (404)
**User Stories:** US-2.4, US-3.4, US-4.4, US-5.5, US-1.4
**Behavior:**

1. **Save failure (500 on POST/PUT):**
   - A red/error toast or inline banner appears with: "Failed to save expense. Please try again."
   - The form retains all entered values so the user can retry.
   - The submit button re-enables for retry.

2. **List load failure (500 on GET):**
   - The list area shows an error message: "Failed to load expenses. Please try again."
   - A "Retry" button appears below the message.
   - The total display shows "—" instead of a number.
   - The form remains visible and functional.

3. **Network failure (fetch error):**
   - Similar to load failure but with message: "Unable to connect to the server. Check your connection and try again."
   - "Retry" button present.

4. **Not found (404 on PUT):**
   - An error message appears: "Expense not found."
   - The form remains in edit mode with the user's values so they can choose to re-enter as a new expense or cancel.

5. **JavaScript runtime error:**
   - A global error handler catches unhandled exceptions.
   - A fallback message appears: "Something went wrong. Please refresh the page."

**Error messages never expose:**
- Stack traces
- Error codes (codes are in API responses for developers, not shown in UI)
- Internal implementation details

---

### Pattern: Currency Formatting

**When to use:** Displaying any monetary amount (total, expense row amounts)
**User Stories:** US-4.1, US-3.1
**Behavior:**

1. All amounts stored as integer cents are divided by 100 for display.
2. Format: `$X,XXX.XX` (dollar sign, comma-separated thousands, exactly two decimal places).
3. Examples:
   - 1050 cents → `$10.50`
   - 100 cents → `$1.00`
   - 99999999 cents → `$999,999.99`
   - 0 cents → `$0.00`
4. The total always shows exactly two decimal places (never `$10.5` or `$10`).
5. Amounts in the expense list use the same formatting as the total.

---

### Pattern: Focus Management

**When to use:** After any state transition that changes available interactive elements
**User Stories:** US-0.2, US-5.4
**Behavior:**

1. **Page load:** Amount field receives auto-focus.
2. **After successful add:** Amount field receives focus (supports batch entry rhythm).
3. **After entering edit mode:** Amount field receives focus (pre-populated value is selected for easy overwrite).
4. **After successful edit save:** Amount field receives focus (add mode restored).
5. **After cancel edit:** Amount field receives focus (add mode restored).
6. **After validation error:** First invalid field receives focus.
7. **Tab order within form:** Amount → Description → Category → Submit button (→ Cancel button if in edit mode).
8. **Tab order in list:** Each expense row's Edit button is focusable in the tab sequence.

