## F03: Expense List Display

**Description:** The application displays all saved expenses in a list within the web UI. The list is the primary view for reviewing spending history and the entry point for editing individual expenses. It loads all expenses on page load and updates in real-time after any mutation (create or edit) without requiring a manual page refresh.

**Terminology:**
- **Expense row:** A single visual row in the list representing one expense record.
- **Empty state:** The UI shown when zero expenses exist — a friendly message instead of a blank area.
- **Real-time update:** The list reflects mutations immediately via the API response data, without a full page reload.

**Sub-features:**
- Fetch and display all expenses on page load
- Each expense row shows: amount (formatted as currency), description, category
- Each expense row includes an Edit button (entry point for F01)
- List updates immediately after adding (F00) or editing (F01) an expense
- Empty state message when no expenses exist
- Expenses displayed in a consistent order (most recent first recommended, or chronological)
- Proper currency formatting for amount values (two decimal places, dollar sign or locale symbol)

**Process:**
1. On page load, client sends `GET /api/expenses`.
2. Server queries the persistent store for all expense records.
3. Server responds with `200 OK` and an array of expense objects, ordered by `created_at` descending (most recent first).
4. Client renders the expense list:
   a. If the array is empty, display the empty state message (e.g., "No expenses yet. Add your first expense above!").
   b. If the array has items, render each expense as a row showing:
      - Amount formatted as currency (e.g., `$10.50`)
      - Description text
      - Category text
      - Edit button
5. After a successful create (F00 step 12) or edit (F01 step 6j), the client updates the list in place using the response data — no additional `GET` request is required (though a full refresh is also acceptable).
6. The list remains visible at all times (not hidden behind tabs or navigation).

**Inputs:**
- None from the user for list display (data comes from the API).

**Outputs:**
- Rendered list of all expenses with amount, description, category, and Edit action per row.
- Empty state message when no expenses exist.
- Expense count (optional but recommended — e.g., "Showing 12 expenses").

**Validation:**
- Client must handle an empty array gracefully (show empty state, not a broken UI).
- Client must handle amounts stored as cents by dividing by 100 for display.
- Client must escape or sanitize description and category text to prevent XSS (since they are free-text user input rendered in HTML).
- If the `GET /api/expenses` request fails, display an error message and offer a retry option.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Failed to retrieve expenses | 500 | ERR_STORAGE_READ | "Failed to load expenses. Please try again." |
| Network error (client-side) | — | — | "Unable to connect to the server. Check your connection and try again." |

**API Surface (this feature):** `GET /api/expenses` — see `Y1-api.md` §List Expenses for full response schema.

**Schema Surface (this feature):** Reads from the `expenses` table — see `Y0-schema.md` for DDL.

---

