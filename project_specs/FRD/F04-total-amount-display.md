## F04: Total Amount Display

**Description:** The application calculates and prominently displays the total of all stored expense amounts. The total gives the user an at-a-glance spending summary. It updates immediately when an expense is added or edited and displays $0.00 when no expenses exist. All arithmetic is performed on integer cents to avoid floating-point rounding errors.

**Terminology:**
- **Running total:** The sum of all expense amounts currently in storage, displayed as a formatted currency value.
- **Cents arithmetic:** Summation is performed on integer cent values; the result is divided by 100 only for display.

**Sub-features:**
- Total calculated from all stored expenses
- Prominently displayed in the UI (always visible, not hidden or scrolled out of view)
- Updates immediately after create (F00) or edit (F01) — no manual refresh
- Formatted as currency with two decimal places and currency symbol (e.g., `$1,234.56`)
- Shows `$0.00` when no expenses exist
- Calculation uses integer cents to prevent floating-point errors

**Process:**
1. On page load, after the expense list is fetched (`GET /api/expenses`), the client calculates the total:
   a. Sum all `amount` values (integers in cents) from the response array.
   b. Divide the sum by 100 to get the display value.
   c. Format with currency symbol and two decimal places.
   d. Render in the designated total display area.
2. If the expense array is empty, display `$0.00`.
3. After a successful create (F00):
   a. Add the new expense's amount (cents) to the current total.
   b. Re-render the formatted total.
4. After a successful edit (F01):
   a. Subtract the old amount (cents) and add the new amount (cents) to the current total.
   b. Alternatively, recalculate by summing all displayed expenses.
   c. Re-render the formatted total.
5. The total display area is always visible on the page (not behind a scroll or a tab).

**Inputs:**
- Expense amount values from the `GET /api/expenses` response (or from individual mutation responses).

**Outputs:**
- A single formatted currency string representing the sum of all expense amounts.
- Displayed in a prominent, always-visible location in the UI.

**Validation:**
- Total must never show more or fewer than two decimal places.
- Total must never be negative (all expense amounts are positive by F00 validation).
- Total must use integer arithmetic (cents) before converting to display format to avoid floating-point drift.
- If the expense list fetch fails, the total should either show a loading/error state or retain the last known value — never display a stale incorrect number.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Cannot calculate (list fetch failed) | — | — | Total area shows "—" or "Error loading total" |

**API Surface (this feature):** The total is calculated client-side from the `GET /api/expenses` response. No dedicated total endpoint is required (though one could be added as an optimization in the future). See `Y1-api.md` §List Expenses.

**Schema Surface (this feature):** Reads the `amount` column from the `expenses` table — see `Y0-schema.md`.

---

