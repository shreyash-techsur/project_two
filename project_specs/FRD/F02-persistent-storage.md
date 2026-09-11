## F02: Persistent Storage

**Description:** All expense data is stored in a server-side persistent store that survives page refreshes, browser closures, and full server restart cycles. This is the foundational reliability requirement. No mutation (create or update) is reported as successful to the client until the data is confirmed durable on disk. The storage layer must handle sequential read/write operations safely for the single-user scenario.

**Terminology:**
- **Durable write:** A write operation that is confirmed flushed to disk (not just buffered in memory) before the server sends a success response.
- **Storage backend:** The concrete persistence mechanism — SQLite database (recommended) or a JSON file with atomic writes.
- **Record:** A single row/entry in the expenses store, representing one expense.

**Sub-features:**
- Server-side persistent store (SQLite recommended; JSON file acceptable)
- Automatic schema initialization on first run (create tables/files if they do not exist)
- Write-before-acknowledge: server confirms persistence before responding with success
- Data survives: page refresh, browser closure, server restart
- Each expense record contains: `id`, `amount` (cents), `description`, `category`, `created_at`, `updated_at`
- Safe sequential access for single-user scenario (no concurrent-write corruption)

**Process:**
1. On server startup, the storage layer checks whether the persistent store exists.
   a. If it does not exist (first run), create the store (e.g., create SQLite database file + schema, or initialize an empty JSON file).
   b. If it exists, open it and verify schema integrity (table/column existence).
2. On every create operation (`POST /api/expenses`):
   a. Begin a transaction (if using a database).
   b. Insert the new record with a server-generated `id` and `created_at` timestamp.
   c. Commit the transaction / flush to disk.
   d. Only after confirmed persistence, return the success response.
3. On every update operation (`PUT /api/expenses/:id`):
   a. Begin a transaction.
   b. Verify the record exists; if not, return 404 without modifying data.
   c. Update the record's fields and set `updated_at` to the current timestamp.
   d. Commit / flush.
   e. Return the success response.
4. On every read operation (`GET /api/expenses`):
   a. Query all records from the store.
   b. Return the result set. Read operations do not modify data.

**Inputs:**
- Expense data from API requests (validated before reaching the storage layer).

**Outputs:**
- Persisted records retrievable via `GET /api/expenses`.
- Confirmation of successful write (used by API layer to respond with 201/200).

**Validation:**
- Storage layer receives only pre-validated data (validation is the API layer's responsibility — see F00, F01).
- On startup, if the schema is missing or corrupt, the storage layer must create/repair it and log a warning. The server must not crash on first run.
- If a write fails (disk full, permission error, database lock timeout), the storage layer must surface a clear error to the API layer, which translates it to `500 ERR_STORAGE_WRITE`.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Storage file/db cannot be created on first run | — (server fails to start) | — | Server logs: "Failed to initialize storage: {detail}" |
| Write fails (disk full, I/O error) | 500 | ERR_STORAGE_WRITE | "Failed to save data. Please try again." |
| Read fails (db locked, corrupt) | 500 | ERR_STORAGE_READ | "Failed to retrieve data. Please try again." |
| Schema migration/integrity check fails | — (server fails to start) | — | Server logs: "Storage schema integrity check failed: {detail}" |

**API Surface (this feature):** This feature is the backend implementation behind all API endpoints. It does not expose its own endpoint.

**Schema Surface (this feature):** Defines and owns the `expenses` table — see `Y0-schema.md` for full DDL.

---

