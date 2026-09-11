---

### Flow 2: Page Load and Data Retrieval

**Trigger:** User navigates to the application URL or refreshes the page
**User Stories:** US-2.1, US-3.1, US-3.2, US-3.4, US-4.1, US-4.4, US-5.1, US-5.2
**Journeys:** JRN-01.1 (Maya arriving), JRN-02.1 (Tom preparing), JRN-03.1 (Priya accessing UI), JRN-03.2 (Priya cross-device)

```
[User navigates to http://localhost:3000]
    │
    ▼
[Server serves HTML + CSS + JS]
    │
    ▼
[Page renders with skeleton/loading state]
  - Form visible and interactive (can begin typing immediately)
  - List area shows loading indicator
  - Total shows "—" or loading placeholder
    │
    ▼
[JS sends GET /api/expenses]
    │
    ├── 200 OK, expenses.length > 0 ──▶ [Render expense list (most recent first)]
    │                                          │
    │                                          ▼
    │                                    [Calculate total from cents sum]
    │                                          │
    │                                          ▼
    │                                    [Display formatted total (e.g., $487.25)]
    │                                          │
    │                                          ▼
    │                                    [Auto-focus amount field]
    │                                          │
    │                                          ▼
    │                                    [Page fully ready]
    │
    ├── 200 OK, expenses.length === 0 ──▶ [Show empty state message in list area]
    │                                          │
    │                                          ▼
    │                                    [Display total as $0.00]
    │                                          │
    │                                          ▼
    │                                    [Auto-focus amount field]
    │
    ├── 500 Server Error ──▶ [Show error message in list area:
    │                          "Failed to load expenses. Please try again."]
    │                              │
    │                              ▼
    │                        [Show "Retry" button]
    │                              │
    │                              ▼
    │                        [Total shows "—" or "Error loading total"]
    │                              │
    │                              ▼
    │                        [Form still visible and usable — user can
    │                         attempt to add expenses even if list fails to load]
    │
    └── Network Error ──▶ [Show "Unable to connect to the server.
                            Check your connection and try again."]
                                │
                                ▼
                          [Show "Retry" button]
                                │
                                ▼
                          [Total shows "—"]
```

**Steps:**

1. **Navigation** — User opens their browser and navigates to the application URL (bookmarked or typed). The server responds with the HTML page, which loads CSS and JS assets.

2. **Immediate render** — The page renders its structural layout immediately: the expense form appears at the top and is interactive (the user can start typing before data loads). The list area and total show brief loading placeholders.

3. **Data fetch** — JavaScript sends `GET /api/expenses` to load all stored expenses.

4. **Success with data** — The list renders all expenses in rows (most recent first by `created_at`). The total is calculated by summing all `amount` values (cents), dividing by 100, and formatting as currency. Focus moves to the amount field.

5. **Success with no data (empty state)** — The list area shows a friendly message: "No expenses yet. Add your first expense above!" The total displays `$0.00`. The form is visible and ready for the first entry.

6. **Error states** — If the server returns 500 or the network is unreachable, the list area shows an appropriate error message with a "Retry" button. The total shows "—" to avoid displaying a misleading number. The form remains visible and functional.

