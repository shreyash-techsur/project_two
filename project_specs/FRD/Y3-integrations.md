## Y3: Integration Points

The Expense Tracker is a self-contained, single-user application with no external service dependencies in v1. This section documents the integration boundaries for completeness and to guide future expansion.

### External Dependencies

**None.** The application has zero external runtime dependencies:

- No external databases — uses embedded SQLite (or a local JSON file).
- No external APIs — no third-party services called at runtime.
- No authentication providers — single-user, no auth required.
- No email or notification services.
- No cloud storage or CDN.

### Internal Integration Boundaries

| Boundary | From | To | Protocol | Notes |
|----------|------|----|----------|-------|
| Browser → Server | Web UI (HTML/JS) | Backend server | HTTP (same-origin) | All `/api/*` calls and static asset serving |
| Server → Storage | Backend server | SQLite file (or JSON file) | File system I/O | Direct file access on the same machine |

### Future Integration Considerations

The following integrations are out of scope for v1 but may be relevant in future iterations. The current architecture should not preclude them:

- **Authentication provider** (e.g., OAuth, session-based auth): Would require adding an auth middleware layer and a `users` table.
- **Cloud database** (e.g., PostgreSQL, MySQL): Would require swapping the storage layer implementation; the API layer should be storage-agnostic.
- **Export service** (CSV/PDF generation): Would add new API endpoints (e.g., `GET /api/expenses/export?format=csv`).
- **Backup/sync service**: Would read from the SQLite file or database and push to remote storage.

### Environment Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | HTTP port the server listens on | `3000` | No |
| `DB_PATH` | Path to the SQLite database file | `./data/expenses.db` | No |

- No API keys, secrets, or credentials are needed for v1.
- Configuration is via environment variables with sensible defaults. The application must run with zero configuration.

---

