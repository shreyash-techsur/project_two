---

## User Flows

### Flow 0: Add a New Expense

**Trigger:** User wants to record a purchase (page load auto-focuses the amount field)
**User Stories:** US-0.1, US-0.2, US-0.3, US-0.4
**Journeys:** JRN-01.1 (Maya daily capture), JRN-02.1 (Tom batch entry)

```
[Page Load — Form visible, amount field focused]
    │
    ▼
[User types amount, description, category]
    │
    ▼
[User clicks "Add Expense" or presses Enter]
    │
    ▼
[Client-side validation]
    │
    ├── Validation fails ──▶ [Show inline errors next to invalid fields]
    │                              │
    │                              ▼
    │                        [Form retains input; user corrects and re-submits]
    │                              │
    │                              └──▶ [Back to client-side validation]
    │
    └── Validation passes ──▶ [POST /api/expenses]
                                   │
                                   ├── 201 Created ──▶ [Clear form fields]
                                   │                        │
                                   │                        ▼
                                   │                  [Prepend expense to list]
                                   │                        │
                                   │                        ▼
                                   │                  [Update running total]
                                   │                        │
                                   │                        ▼
                                   │                  [Show success toast (2s)]
                                   │                        │
                                   │                        ▼
                                   │                  [Focus returns to amount field]
                                   │                        │
                                   │                        ▼
                                   │                  [Ready for next entry ──▶ repeat]
                                   │
                                   ├── 400 Bad Request ──▶ [Show server validation errors inline]
                                   │                              │
                                   │                              ▼
                                   │                        [Form retains input for correction]
                                   │
                                   └── 500 Server Error ──▶ [Show "Failed to save expense.
                                                              Please try again." error banner]
                                                                   │
                                                                   ▼
                                                             [Form retains input for retry]
```

**Steps:**

1. **Page loads** — The expense form is visible at the top of the page. The amount field receives auto-focus. If expenses already exist, they appear in the list below with the running total above the list.

2. **User enters data** — Types a dollar amount (e.g., `18.50`), a description (e.g., `Pad Thai takeout`), and a category (e.g., `Food`). Tab moves focus through the fields in order: amount → description → category.

3. **User submits** — Clicks the "Add Expense" button or presses Enter. The button shows a brief loading state (disabled + spinner or "Saving..." label) while the request is in flight.

4. **Client validates** — If any field fails validation, an inline error message appears directly below the offending field in red text. The form retains all entered values. Multiple errors can appear simultaneously.

5. **Server processes** — On successful persistence, the server returns the full expense object with server-generated `id` and `created_at`.

6. **UI updates** — The form clears all three fields. The new expense is prepended to the top of the expense list (most recent first). The running total increments by the new amount. A green success toast appears briefly ("Expense added!") and auto-dismisses after 2 seconds.

7. **Ready for next** — Focus returns to the amount field. Tom can immediately begin entering the next receipt in his batch session (US-0.2). The cycle repeats without page reload.

