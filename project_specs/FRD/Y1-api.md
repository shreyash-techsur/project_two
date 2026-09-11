## Y1: REST API Endpoints

All API endpoints are served under the `/api` path prefix. The server also serves static UI assets at the root path (`/`). All request and response bodies use `Content-Type: application/json`. Amounts in API payloads are integers representing cents.

### Base URL

- Development: `http://localhost:3000`
- API prefix: `/api`

---

### List Expenses

**`GET /api/expenses`**

Retrieves all expense records, ordered by `created_at` descending (most recent first).

**Request:**
- No request body.
- No query parameters (no pagination or filtering in v1).

**Response — 200 OK:**

```json
{
  "expenses": [
    {
      "id": 1,
      "amount": 1050,
      "description": "Lunch at cafe",
      "category": "Food",
      "created_at": "2026-09-11T12:30:00.000Z",
      "updated_at": "2026-09-11T12:30:00.000Z"
    },
    {
      "id": 2,
      "amount": 4500,
      "description": "Monthly gym",
      "category": "Health",
      "created_at": "2026-09-10T09:00:00.000Z",
      "updated_at": "2026-09-10T09:00:00.000Z"
    }
  ]
}
```

**Response — 200 OK (empty):**

```json
{
  "expenses": []
}
```

**Response — 500 Internal Server Error:**

```json
{
  "error": {
    "code": "ERR_STORAGE_READ",
    "message": "Failed to retrieve data. Please try again."
  }
}
```

---

### Create Expense

**`POST /api/expenses`**

Creates a new expense record.

**Request Body:**

```json
{
  "amount": 1050,
  "description": "Lunch at cafe",
  "category": "Food"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `amount` | integer | Yes | > 0, <= 99999999 (cents) |
| `description` | string | Yes | 1–500 characters (trimmed) |
| `category` | string | Yes | 1–100 characters (trimmed) |

**Response — 201 Created:**

```json
{
  "expense": {
    "id": 3,
    "amount": 1050,
    "description": "Lunch at cafe",
    "category": "Food",
    "created_at": "2026-09-11T14:00:00.000Z",
    "updated_at": "2026-09-11T14:00:00.000Z"
  }
}
```

**Response — 400 Bad Request:**

```json
{
  "error": {
    "code": "ERR_EXPENSE_AMOUNT_REQUIRED",
    "message": "Amount is required"
  }
}
```

Multiple validation errors may be returned as an array:

```json
{
  "errors": [
    { "code": "ERR_EXPENSE_AMOUNT_REQUIRED", "message": "Amount is required" },
    { "code": "ERR_EXPENSE_DESC_REQUIRED", "message": "Description is required" }
  ]
}
```

**Response — 500 Internal Server Error:**

```json
{
  "error": {
    "code": "ERR_STORAGE_WRITE",
    "message": "Failed to save expense. Please try again."
  }
}
```

---

### Update Expense

**`PUT /api/expenses/:id`**

Updates an existing expense record. All fields are required in the request body (full replacement, not partial patch).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | The unique ID of the expense to update |

**Request Body:**

```json
{
  "amount": 1200,
  "description": "Lunch at cafe (corrected)",
  "category": "Food"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `amount` | integer | Yes | > 0, <= 99999999 (cents) |
| `description` | string | Yes | 1–500 characters (trimmed) |
| `category` | string | Yes | 1–100 characters (trimmed) |

**Response — 200 OK:**

```json
{
  "expense": {
    "id": 3,
    "amount": 1200,
    "description": "Lunch at cafe (corrected)",
    "category": "Food",
    "created_at": "2026-09-11T14:00:00.000Z",
    "updated_at": "2026-09-11T15:30:00.000Z"
  }
}
```

**Response — 404 Not Found:**

```json
{
  "error": {
    "code": "ERR_EXPENSE_NOT_FOUND",
    "message": "Expense not found"
  }
}
```

**Response — 400 Bad Request:**

```json
{
  "error": {
    "code": "ERR_EXPENSE_INVALID_ID",
    "message": "Invalid expense ID"
  }
}
```

(Validation errors same format as Create Expense 400 response.)

**Response — 500 Internal Server Error:**

```json
{
  "error": {
    "code": "ERR_STORAGE_WRITE",
    "message": "Failed to update expense. Please try again."
  }
}
```

---

### Endpoint Summary

| Method | Path | Description | Success | Feature |
|--------|------|-------------|---------|---------|
| `GET` | `/api/expenses` | List all expenses | 200 | F03, F04 |
| `POST` | `/api/expenses` | Create a new expense | 201 | F00 |
| `PUT` | `/api/expenses/:id` | Update an existing expense | 200 | F01 |
| `GET` | `/` | Serve the web UI (HTML/CSS/JS) | 200 | F05 |

### Common Response Headers

- `Content-Type: application/json` for all `/api/*` responses.
- `Content-Type: text/html` for the root `/` response.

### Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "ERR_CATEGORY_CODE",
    "message": "Human-readable error message"
  }
}
```

Or, for multiple validation errors:

```json
{
  "errors": [
    { "code": "ERR_CODE_1", "message": "Message 1" },
    { "code": "ERR_CODE_2", "message": "Message 2" }
  ]
}
```

---

