## Y0: Database Schema

This section defines the complete database schema for the Expense Tracker. SQLite is the recommended storage engine. If a JSON-file backend is used instead, the field definitions, types, and constraints below still apply to the data structure.

### Table: `expenses`

Stores all expense records. One row per expense.

```sql
CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      INTEGER     NOT NULL,   -- stored in cents (e.g., 1050 = $10.50)
    description TEXT        NOT NULL,
    category    TEXT        NOT NULL,
    created_at  TEXT        NOT NULL,   -- ISO 8601 UTC timestamp
    updated_at  TEXT        NOT NULL    -- ISO 8601 UTC timestamp, same as created_at on insert
);
```

### Column Details

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| `id` | INTEGER | No | Auto-increment | PRIMARY KEY | Server-generated unique identifier |
| `amount` | INTEGER | No | — | > 0, <= 99999999 (i.e., $999,999.99 in cents) | Stored as cents to avoid floating-point errors |
| `description` | TEXT | No | — | Length 1–500 characters | Free-text, user-provided |
| `category` | TEXT | No | — | Length 1–100 characters | Free-text, user-provided |
| `created_at` | TEXT | No | — | Valid ISO 8601 | Set on insert, never modified |
| `updated_at` | TEXT | No | — | Valid ISO 8601 | Set on insert, updated on every edit |

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC);
```

- **`idx_expenses_created_at`**: Supports the default list ordering (most recent first). For the MVP with <= 1,000 records this is optional but good practice.

### Initialization

On server startup:
1. Open (or create) the SQLite database file (e.g., `data/expenses.db`).
2. Execute the `CREATE TABLE IF NOT EXISTS` statement.
3. Execute the `CREATE INDEX IF NOT EXISTS` statement.
4. Log: "Storage initialized successfully" or "Storage already exists, schema verified."

### Data Integrity Rules

- `amount` is always a positive integer (> 0). The API layer converts user-entered dollar values to cents before storage: `Math.round(parseFloat(amount) * 100)`.
- `description` and `category` are stored as-is (trimmed of leading/trailing whitespace by the API layer before storage).
- `created_at` is set once at insert time and never changed.
- `updated_at` is set to `created_at` on insert and updated to the current UTC timestamp on every edit.
- No soft-delete column exists in v1 (delete is out of scope).

### JSON-File Alternative

If SQLite is not used, the JSON file structure is:

```json
{
  "expenses": [
    {
      "id": 1,
      "amount": 1050,
      "description": "Lunch",
      "category": "Food",
      "created_at": "2026-09-11T12:00:00.000Z",
      "updated_at": "2026-09-11T12:00:00.000Z"
    }
  ],
  "next_id": 2
}
```

- `next_id` tracks the next auto-increment value.
- Writes must be atomic: write to a temp file, then rename over the original to prevent corruption on crash.

---

