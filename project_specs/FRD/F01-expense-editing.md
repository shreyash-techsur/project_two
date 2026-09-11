## F01: Expense Editing

**Description:** Users can modify any previously entered expense. Clicking an edit action on an expense row populates a form with the expense's current values. The user can change any combination of amount, description, and category, then save. The same validation rules as expense entry apply. Changes are persisted and the expense list and running total update immediately. The user may also cancel editing to discard changes.

**Terminology:**
- **Edit mode:** The UI state where an existing expense's values are loaded into a form for modification.
- **Cancel:** Discarding pending edits and returning the form to its default (empty / add-new) state.

**Sub-features:**
- Each expense row displays an Edit button/link
- Clicking Edit loads the expense's current values into the expense form (or a dedicated edit form)
- User can modify amount, description, and/or category independently
- Save action persists changes and refreshes the list and total
- Cancel action discards changes without any server call
- Visual indicator that the form is in "edit mode" vs. "add mode"

**Process:**
1. User views the expense list (see F03).
2. User clicks the **Edit** button on a specific expense row.
3. The expense form (or a dedicated edit area) is populated with the selected expense's current `amount`, `description`, and `category`.
4. The UI indicates edit mode (e.g., button label changes from "Add Expense" to "Save Changes"; a "Cancel" button appears).
5. User modifies one or more fields.
6. **Save path:**
   a. User clicks **Save Changes**.
   b. Client performs front-end validation (identical rules to F00 step 6).
   c. If validation fails, display inline errors and stop.
   d. Client sends `PUT /api/expenses/:id` with the updated fields (amount converted to cents).
   e. Server validates the request body (same rules as F00 step 8).
   f. Server verifies the expense with `:id` exists. If not, returns 404.
   g. Server updates the record in persistent storage.
   h. Server confirms persistence.
   i. Server responds with `200 OK` and the full updated expense object.
   j. Client updates the expense row in the list with new values.
   k. Client recalculates and displays the updated total.
   l. Client exits edit mode (form clears or returns to add-new state).
   m. Client shows a brief success indicator.
7. **Cancel path:**
   a. User clicks **Cancel**.
   b. Client discards all pending changes (no server call).
   c. Client exits edit mode (form clears or returns to add-new state).
   d. Expense list and total remain unchanged.

**Inputs:**
- `id` (string or integer, required): The unique identifier of the expense to edit. Supplied via the URL path parameter, not user-entered.
- `amount` (number, required): Same constraints as F00.
- `description` (string, required): Same constraints as F00.
- `category` (string, required): Same constraints as F00.

**Outputs:**
- On success: the updated expense object reflected in the list; recalculated total.
- On validation error: inline error messages (same as F00).
- On not-found: error message indicating the expense no longer exists.
- On server error: general error message.
- On cancel: no change to stored data or UI list.

**Validation:**
- All F00 validation rules apply to the edited values.
- The expense `id` must reference an existing record; if deleted or never existed, return 404.
- If no fields have actually changed, the server may still accept the PUT and return 200 (idempotent update).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Expense not found | 404 | ERR_EXPENSE_NOT_FOUND | "Expense not found" |
| All F00 validation errors | 400 | (same as F00) | (same as F00) |
| Storage write failure | 500 | ERR_STORAGE_WRITE | "Failed to update expense. Please try again." |
| Invalid or malformed ID | 400 | ERR_EXPENSE_INVALID_ID | "Invalid expense ID" |

**API Surface (this feature):** `PUT /api/expenses/:id` — see `Y1-api.md` §Update Expense for full request/response schema.

**Schema Surface (this feature):** Updates the `expenses` table — see `Y0-schema.md` for DDL. The `updated_at` column is set to the current timestamp on every update.

---

