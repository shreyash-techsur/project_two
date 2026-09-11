## Y2: Error Catalog

This section consolidates all error codes used across the Expense Tracker application. Each error code is unique and follows the `ERR_{DOMAIN}_{NAME}` convention.

### Expense Validation Errors (HTTP 400)

| Error Code | Message | Trigger | Feature(s) |
|------------|---------|---------|------------|
| ERR_EXPENSE_AMOUNT_REQUIRED | "Amount is required" | Amount field missing or empty in request body | F00, F01 |
| ERR_EXPENSE_INVALID_AMOUNT | "Amount must be a valid number" | Amount is not a valid integer (or non-numeric before conversion) | F00, F01 |
| ERR_EXPENSE_AMOUNT_POSITIVE | "Amount must be greater than zero" | Amount <= 0 | F00, F01 |
| ERR_EXPENSE_AMOUNT_TOO_LARGE | "Amount must not exceed 999,999.99" | Amount > 99999999 (cents) | F00, F01 |
| ERR_EXPENSE_AMOUNT_PRECISION | "Amount must have at most two decimal places" | Client sends a decimal amount with > 2 decimal places (pre-conversion check) | F00, F01 |
| ERR_EXPENSE_DESC_REQUIRED | "Description is required" | Description field missing, empty, or whitespace-only | F00, F01 |
| ERR_EXPENSE_DESC_TOO_LONG | "Description must not exceed 500 characters" | Description exceeds 500 characters | F00, F01 |
| ERR_EXPENSE_CAT_REQUIRED | "Category is required" | Category field missing, empty, or whitespace-only | F00, F01 |
| ERR_EXPENSE_CAT_TOO_LONG | "Category must not exceed 100 characters" | Category exceeds 100 characters | F00, F01 |
| ERR_EXPENSE_INVALID_ID | "Invalid expense ID" | ID path parameter is not a valid positive integer | F01 |

### Resource Errors (HTTP 404)

| Error Code | Message | Trigger | Feature(s) |
|------------|---------|---------|------------|
| ERR_EXPENSE_NOT_FOUND | "Expense not found" | PUT request references an ID that does not exist in storage | F01 |

### Storage Errors (HTTP 500)

| Error Code | Message | Trigger | Feature(s) |
|------------|---------|---------|------------|
| ERR_STORAGE_WRITE | "Failed to save data. Please try again." | Disk I/O error, database lock, or other write failure | F00, F01, F02 |
| ERR_STORAGE_READ | "Failed to retrieve data. Please try again." | Database read error, corrupt data, or lock timeout | F02, F03 |

### Client-Side Errors (No HTTP Status)

These errors are displayed in the UI and do not correspond to server responses:

| Error Condition | Message | Feature(s) |
|-----------------|---------|------------|
| Network failure / server unreachable | "Unable to connect to the server. Check your connection and try again." | F03, F05 |
| Total cannot be calculated | Total area shows "—" or "Error loading total" | F04 |
| JavaScript runtime error | Fallback message: "Something went wrong. Please refresh the page." | F05 |

### Error Handling Guidelines

- **Server validation is authoritative.** Client-side validation is a UX convenience; the server must re-validate all inputs and return appropriate error codes.
- **Multiple errors per request.** When multiple validation rules fail simultaneously (e.g., missing amount AND missing description), the server should return all errors in the `errors` array format, not just the first one found.
- **No stack traces in responses.** Server errors (500) must never include stack traces or internal details in the API response. Internal details should be logged server-side only.
- **Retry guidance.** Storage errors (500) include "Please try again" to indicate the operation is retryable. Validation errors (400) do not, because the same input will fail again.

---

