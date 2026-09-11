---

### Flow 1: Edit an Existing Expense

**Trigger:** User clicks the "Edit" button on an expense row in the list
**User Stories:** US-1.1, US-1.2, US-1.3, US-1.4
**Journeys:** JRN-01.2 (Maya correcting a mistake), JRN-02.2 (Tom post-batch correction)

```
[User viewing expense list]
    │
    ▼
[Clicks "Edit" on an expense row]
    │
    ▼
[Form enters EDIT MODE]
  - Amount, description, category pre-populated with current values
  - Submit button label changes to "Save Changes"
  - "Cancel" button appears
  - Edit mode indicator visible (e.g., highlighted form border or banner)
    │
    ▼
[User modifies one or more fields]
    │
    ├── User clicks "Cancel" ──▶ [Discard changes, no server call]
    │                                  │
    │                                  ▼
    │                            [Form returns to ADD mode (empty)]
    │                            [List and total unchanged]
    │
    └── User clicks "Save Changes" or presses Enter
             │
             ▼
        [Client-side validation]
             │
             ├── Fails ──▶ [Inline errors; form retains edited values]
             │                    │
             │                    └──▶ [User corrects and re-saves]
             │
             └── Passes ──▶ [PUT /api/expenses/:id]
                                  │
                                  ├── 200 OK ──▶ [Update expense row in list with new values]
                                  │                    │
                                  │                    ▼
                                  │              [Recalculate running total]
                                  │                    │
                                  │                    ▼
                                  │              [Show success toast ("Expense updated!")]
                                  │                    │
                                  │                    ▼
                                  │              [Exit edit mode — form returns to ADD mode]
                                  │                    │
                                  │                    ▼
                                  │              [User can click Edit on another row]
                                  │
                                  ├── 400 Bad Request ──▶ [Inline validation errors]
                                  │                            [Form retains values in edit mode]
                                  │
                                  ├── 404 Not Found ──▶ [Show "Expense not found" error]
                                  │                          [Form retains values so user
                                  │                           can re-enter as new expense]
                                  │
                                  └── 500 Server Error ──▶ [Show "Failed to update expense.
                                                             Please try again." error]
                                                                [Form retains values in edit mode]
```

**Steps:**

1. **Initiate edit** — User scans the expense list and clicks the "Edit" button on the row they want to modify. The Edit button is always visible on every expense row (no hover-reveal or hidden menu).

2. **Form transitions to edit mode** — The expense form at the top of the page populates with the selected expense's current amount, description, and category. The form visually changes to indicate edit mode:
   - The submit button label changes from "Add Expense" to "Save Changes"
   - A "Cancel" button appears next to "Save Changes"
   - The form area gets a subtle visual indicator (e.g., a colored left border or a "Editing expense" label)

3. **User modifies fields** — Any combination of the three fields can be changed. The same validation rules as adding apply.

4. **Save or cancel** — User either saves (click "Save Changes" or Enter) or cancels (click "Cancel"). Cancel makes no server call and returns the form to its empty add-new state.

5. **Successful save** — The expense row in the list updates in-place with the new values. The running total recalculates (e.g., if amount changed from $8.50 to $5.80, total decreases by $2.70). A success toast confirms the edit. The form exits edit mode and returns to add-new state.

6. **Sequential edits** — After saving, the user can immediately click Edit on another expense row (US-1.3, JRN-02.2). Each edit is independent and persisted separately.

