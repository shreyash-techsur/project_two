## F00: Expense Entry

**Description:** Users create a new expense by filling out a web form with amount, description, and category. On submission the expense is validated, persisted to the server-side store, and immediately reflected in both the expense list and the running total. This is the primary interaction point of the application and must be fast, intuitive, and reliable.

**Terminology:**
- **Expense form:** The HTML form containing amount, description, and category input fields plus a submit button.
- **Submission:** The act of sending the form data to the server for validation and persistence.

**Sub-features:**
- Numeric input field for expense amount (supports dollars and cents)
- Free-text input field for description
- Free-text input field for category
- Client-side and server-side validation
- Immediate UI feedback on success or error
- Form clears after successful submission
- New expense appended to expense list without page reload
- Running total recalculated after successful submission

**Process:**
1. User navigates to the application URL; the expense form is visible on load.
2. User enters a value in the **amount** field.
3. User enters text in the **description** field.
4. User enters text in the **category** field.
5. User clicks the **Submit** (or **Add Expense**) button.
6. Client performs front-end validation:
   a. Amount is present, numeric, and greater than zero.
   b. Description is present and non-empty after trimming whitespace.
   c. Category is present and non-empty after trimming whitespace.
   d. If any validation fails, display an inline error message next to the offending field and stop submission.
7. Client sends a `POST /api/expenses` request with the validated data (amount converted to cents).
8. Server performs back-end validation (same rules as step 6, plus max-length checks).
9. Server writes the expense record to persistent storage.
10. Server confirms the write completed successfully (data is durable).
11. Server responds with `201 Created` and the full expense object (including server-generated `id` and `created_at`).
12. Client receives the response:
    a. Clears all form fields.
    b. Appends the new expense to the displayed expense list.
    c. Recalculates and updates the displayed total.
    d. Shows a brief success indicator (e.g., green flash or toast message).
13. If the server responds with an error (4xx or 5xx), the client displays the error message and does **not** clear the form, so the user can correct and retry.

**Inputs:**
- `amount` (number, required): The expense amount in dollars/cents. Must be a positive number greater than 0. Maximum value: 999,999.99. Precision: up to two decimal places. Sent to server as integer cents (e.g., user enters 10.50 → API receives 1050).
- `description` (string, required): Free-text description of the expense. Min length: 1 character (after trim). Max length: 500 characters.
- `category` (string, required): Free-text category label. Min length: 1 character (after trim). Max length: 100 characters.

**Outputs:**
- On success: the created expense object (`{ id, amount, description, category, created_at }`) displayed in the expense list; updated total.
- On validation error: inline error messages next to the invalid field(s).
- On server error: a general error message displayed to the user.

**Validation:**
- Amount must be a number (reject alphabetic, special characters, empty).
- Amount must be > 0 (reject zero and negative values).
- Amount must be <= 999,999.99 (reject unreasonably large values).
- Amount precision must not exceed two decimal places (reject 10.123).
- Description must not be empty after trimming whitespace.
- Description must not exceed 500 characters.
- Category must not be empty after trimming whitespace.
- Category must not exceed 100 characters.
- All validation rules are enforced on both client and server. Server validation is authoritative.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Amount missing or empty | 400 | ERR_EXPENSE_AMOUNT_REQUIRED | "Amount is required" |
| Amount not a valid number | 400 | ERR_EXPENSE_INVALID_AMOUNT | "Amount must be a valid number" |
| Amount <= 0 | 400 | ERR_EXPENSE_AMOUNT_POSITIVE | "Amount must be greater than zero" |
| Amount > 999999.99 | 400 | ERR_EXPENSE_AMOUNT_TOO_LARGE | "Amount must not exceed 999,999.99" |
| Amount has > 2 decimal places | 400 | ERR_EXPENSE_AMOUNT_PRECISION | "Amount must have at most two decimal places" |
| Description missing or empty | 400 | ERR_EXPENSE_DESC_REQUIRED | "Description is required" |
| Description > 500 chars | 400 | ERR_EXPENSE_DESC_TOO_LONG | "Description must not exceed 500 characters" |
| Category missing or empty | 400 | ERR_EXPENSE_CAT_REQUIRED | "Category is required" |
| Category > 100 chars | 400 | ERR_EXPENSE_CAT_TOO_LONG | "Category must not exceed 100 characters" |
| Storage write failure | 500 | ERR_STORAGE_WRITE | "Failed to save expense. Please try again." |

**API Surface (this feature):** `POST /api/expenses` — see `Y1-api.md` §Create Expense for full request/response schema.

**Schema Surface (this feature):** Writes to the `expenses` table — see `Y0-schema.md` for DDL.

---

