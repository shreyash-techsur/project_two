# Requirements Traceability Matrix: Expense Tracker

**Version:** 1.0
**Project:** Expense Tracker
**Generated:** 2026-09-11
**Sources:** PRD-ExpenseTracker.md v1.0, FRD-ExpenseTracker.md v1.0, TechArch-ExpenseTracker.md v1.0, UserStories-ExpenseTracker.md v1.0, PROJECT.md

---

## 1. Overview

This Requirements Traceability Matrix (RTM) provides bidirectional traceability between all Expense Tracker specification documents. It establishes a clear chain from high-level product requirements through functional specifications, technical architecture, and user stories, ensuring every requirement is accounted for, implemented, and testable.

The Expense Tracker is a single-user, web-based application for recording, editing, and viewing personal expenses with persistent storage. All six features (F0--F5) are P0 (Critical -- MVP requirement), reflecting the focused, minimal scope of the project. This RTM traces 6 PRD features through their corresponding FRD functional requirements, TechArch specifications, and 27 user stories across 6 epics.

**Traceability Levels:**

This RTM provides four levels of traceability. The **Product Level** links PROJECT.md active requirements to PRD features, confirming that every stated project goal has a corresponding feature specification. The **Functional Level** maps PRD features to FRD functional requirements and cross-feature specifications (Y0--Y3), ensuring that each feature has detailed behavioral definitions including process flows, inputs, outputs, validation rules, and error states. The **Technical Level** traces FRD requirements to TechArch component specifications, covering backend components, frontend components, data model, API design, and security architecture. The **Story Level** maps each technical specification to user stories with acceptance criteria, providing the basis for implementation tasks and test case development.

---

## 2. Requirements Summary

### By Source Document

- **PROJECT.md**: 5 active requirements defining the core value proposition
- **PRD-ExpenseTracker.md**: 6 features (F0--F5), all P0 priority; 7 non-functional requirements
- **FRD-ExpenseTracker.md**: 6 feature specifications (F0--F5) with detailed process flows, validation rules, error catalogs; 4 cross-feature specifications (Y0--Y3)
- **TechArch-ExpenseTracker.md**: 7 sections covering architecture, components, data model, API design, security, technology stack, and integration points
- **UserStories-ExpenseTracker.md**: 27 user stories across 6 epics, all P0 priority, 3 personas

### By Category

- **Core Functionality (F0, F1, F3, F4)**: 4 features covering expense entry, editing, list display, and total display -- the primary user-facing capabilities
- **Infrastructure (F2)**: 1 feature covering persistent storage -- the foundational reliability requirement
- **Platform (F5)**: 1 feature covering the web-based user interface -- the delivery mechanism
- **Cross-Feature (Y0--Y3)**: 4 specifications covering database schema, REST API endpoints, error catalog, and integration points

### By Priority

- **P0 (Critical -- MVP)**: 6 features, 27 user stories -- every requirement is essential for the minimum viable product
- **P1--P3**: None -- all future enhancements (delete, filtering, charts, export, multi-user) are explicitly out of scope

---

## 3. Traceability Matrix

### 3.1 PROJECT.md to PRD Feature Mapping

| PROJECT.md Requirement | PRD Feature | Priority | Status |
|------------------------|-------------|----------|--------|
| User can enter a new expense with amount, description, and category | F0: Expense Entry | P0 | Specified |
| User can edit an existing expense (amount, description, category) | F1: Expense Editing | P0 | Specified |
| Expenses are stored persistently (survive page refresh / server restart) | F2: Persistent Storage | P0 | Specified |
| User can view a list of all saved expenses | F3: Expense List Display | P0 | Specified |
| The total amount of all stored expenses is displayed | F4: Total Amount Display | P0 | Specified |
| Web UI required (implicit platform requirement) | F5: Web-Based User Interface | P0 | Specified |

### 3.2 Full Bidirectional Traceability: PRD -> FRD -> TechArch -> User Stories

| PRD Feature | FRD Specification | TechArch Component(s) | User Stories |
|-------------|-------------------|----------------------|--------------|
| F0: Expense Entry | F0: Expense Entry; Y1: POST /api/expenses; Y2: Expense Validation Errors | API Router (createExpense handler); Validation Middleware (validate.js); Frontend (Expense Form, app.js); POST /api/expenses endpoint spec | US-0.1, US-0.2, US-0.3, US-0.4 |
| F1: Expense Editing | F1: Expense Editing; Y1: PUT /api/expenses/:id; Y2: Resource Errors, Expense Validation Errors | API Router (updateExpense handler); Validation Middleware (validate.js); Frontend (Expense Form edit mode, app.js); PUT /api/expenses/:id endpoint spec | US-1.1, US-1.2, US-1.3, US-1.4 |
| F2: Persistent Storage | F2: Persistent Storage; Y0: Database Schema (expenses table); Y2: Storage Errors | Storage Layer (db/database.js); SQLite Database (data/expenses.db); Server Entry Point (initialization sequence); Data Model (expenses table DDL) | US-2.1, US-2.2, US-2.3, US-2.4, US-2.5 |
| F3: Expense List Display | F3: Expense List Display; Y1: GET /api/expenses; Y2: Storage Errors, Client-Side Errors | API Router (listExpenses handler); Storage Layer (getAllExpenses); Frontend (Expense List, app.js); GET /api/expenses endpoint spec | US-3.1, US-3.2, US-3.3, US-3.4, US-3.5 |
| F4: Total Amount Display | F4: Total Amount Display; Y1: GET /api/expenses (data source) | Frontend (Total Display, app.js client-side calculation); Cents arithmetic (integer math before display conversion) | US-4.1, US-4.2, US-4.3, US-4.4 |
| F5: Web-Based User Interface | F5: Web-Based User Interface; Y3: Integration Points | Frontend (index.html, style.css, app.js); Static File Middleware; Server Entry Point (single-command startup); Deployment Topology | US-5.1, US-5.2, US-5.3, US-5.4, US-5.5 |

### 3.3 FRD Cross-Feature Specifications Traceability

| FRD Spec | Description | TechArch Coverage | Related Features |
|----------|-------------|-------------------|------------------|
| Y0: Database Schema | expenses table DDL, column specs, indexes, initialization | Section 3: Data Model -- complete DDL with CHECK constraints, column specifications, initialization sequence, sample queries | F0, F1, F2, F3, F4 |
| Y1: REST API Endpoints | GET, POST, PUT endpoint definitions with request/response schemas | Section 4: API Design -- TypeScript interfaces, endpoint specifications, request/response flow diagram | F0, F1, F3, F4, F5 |
| Y2: Error Catalog | All error codes (ERR_EXPENSE_*, ERR_STORAGE_*), client-side errors | Section 4: API Design (error responses per endpoint); Section 2: Error Handler middleware | F0, F1, F2, F3, F4, F5 |
| Y3: Integration Points | Internal boundaries, environment config, future considerations | Section 7: Integration Points -- external dependencies, internal boundaries, environment variables, future integration matrix | F2, F5 |

### 3.4 TechArch Component to Feature Mapping

| TechArch Component | Type | Features Served |
|--------------------|------|-----------------|
| Server Entry Point (server.js) | Backend | F0, F1, F2, F3, F4, F5 |
| Static File Middleware | Backend | F5 |
| API Router (routes/expenses.js) | Backend | F0, F1, F3 |
| Validation Middleware (middleware/validate.js) | Backend | F0, F1 |
| Storage Layer (db/database.js) | Backend | F0, F1, F2, F3, F4 |
| Error Handler (middleware/errorHandler.js) | Backend | F0, F1, F2, F3, F5 |
| HTML Structure (public/index.html) | Frontend | F0, F1, F3, F4, F5 |
| Styles (public/style.css) | Frontend | F5 |
| Application Logic (public/app.js) | Frontend | F0, F1, F3, F4, F5 |
| SQLite Database (data/expenses.db) | Data | F2 |

---

## 4. Requirements Detail

### F0: Expense Entry

**PRD Description:** Users can create a new expense by providing an amount, description, and category through a web form.

**FRD Functional Requirements:**
- Numeric input field for expense amount (supports dollars and cents, max 999,999.99)
- Free-text input field for description (1--500 characters)
- Free-text input field for category (1--100 characters)
- Client-side and server-side validation with identical rules
- Form clears after successful submission
- New expense appended to list without page reload
- Running total recalculated after submission
- Success and error feedback to the user
- Server converts dollar amounts to integer cents for storage
- API: POST /api/expenses (201 Created on success)

**FRD Error Codes:** ERR_EXPENSE_AMOUNT_REQUIRED, ERR_EXPENSE_INVALID_AMOUNT, ERR_EXPENSE_AMOUNT_POSITIVE, ERR_EXPENSE_AMOUNT_TOO_LARGE, ERR_EXPENSE_AMOUNT_PRECISION, ERR_EXPENSE_DESC_REQUIRED, ERR_EXPENSE_DESC_TOO_LONG, ERR_EXPENSE_CAT_REQUIRED, ERR_EXPENSE_CAT_TOO_LONG, ERR_STORAGE_WRITE

**User Stories (4):** US-0.1 (Add a New Expense), US-0.2 (Batch-Enter Multiple Expenses), US-0.3 (Receive Validation Feedback), US-0.4 (Server-Side Validation)

---

### F1: Expense Editing

**PRD Description:** Users can modify any previously entered expense, changing amount, description, and/or category.

**FRD Functional Requirements:**
- Each expense row displays an Edit button/link
- Clicking Edit loads current values into the form (edit mode)
- Visual indicator distinguishing edit mode from add mode
- Same validation rules as F0 apply to edited values
- Save persists changes and refreshes list/total immediately
- Cancel discards changes without server call
- Expense ID must reference an existing record
- API: PUT /api/expenses/:id (200 OK on success, 404 on not found)

**FRD Error Codes:** ERR_EXPENSE_NOT_FOUND, ERR_EXPENSE_INVALID_ID, all F0 validation errors, ERR_STORAGE_WRITE

**User Stories (4):** US-1.1 (Edit an Existing Expense), US-1.2 (Cancel Editing Without Saving), US-1.3 (Edit Multiple Expenses in Sequence), US-1.4 (Handle Editing a Non-Existent Expense)

---

### F2: Persistent Storage

**PRD Description:** All expense data is stored in a persistent backend store that survives page refreshes, browser closures, and server restarts.

**FRD Functional Requirements:**
- Server-side persistent store (SQLite recommended; JSON file acceptable)
- Automatic schema initialization on first run
- Write-before-acknowledge: server confirms persistence before success response
- Data survives page refresh, browser closure, and server restart
- Each record: id, amount (cents), description, category, created_at, updated_at
- Safe sequential access for single-user scenario
- Schema integrity check on startup
- Durable writes confirmed before API response

**FRD Error Codes:** ERR_STORAGE_WRITE, ERR_STORAGE_READ

**User Stories (5):** US-2.1 (Data Survives Page Refresh), US-2.2 (Data Survives Server Restart), US-2.3 (Automatic Storage Initialization), US-2.4 (Write-Before-Acknowledge Guarantee), US-2.5 (Inspect Storage Directly)

---

### F3: Expense List Display

**PRD Description:** The application displays a list of all saved expenses in the web UI.

**FRD Functional Requirements:**
- Fetch and display all expenses on page load via GET /api/expenses
- Each row shows: amount (formatted as currency), description, category
- Each row includes an Edit button (entry point for F1)
- List updates immediately after create or edit (no page reload)
- Empty state message when no expenses exist
- Expenses in reverse chronological order (created_at descending)
- Proper currency formatting (two decimal places, dollar sign)
- XSS prevention when rendering free-text fields

**FRD Error Codes:** ERR_STORAGE_READ, client-side network error handling

**User Stories (5):** US-3.1 (View All Expenses on Page Load), US-3.2 (See Empty State), US-3.3 (List Updates Immediately After Mutations), US-3.4 (Handle List Loading Errors Gracefully), US-3.5 (Expense List Performance at Scale)

---

### F4: Total Amount Display

**PRD Description:** The application calculates and prominently displays the total amount of all stored expenses.

**FRD Functional Requirements:**
- Total calculated from all stored expenses (client-side from GET /api/expenses response)
- Prominently displayed, always visible in the UI
- Updates immediately after create or edit
- Currency formatting with two decimal places and currency symbol (e.g., $1,234.56)
- Shows $0.00 when no expenses exist
- Calculation uses integer cents to prevent floating-point errors
- Divide by 100 only for display conversion

**FRD Error Codes:** Total area shows "---" or "Error loading total" on data load failure

**User Stories (4):** US-4.1 (View Running Total), US-4.2 (Total Updates After Adding), US-4.3 (Total Updates After Editing), US-4.4 (Total Error State)

---

### F5: Web-Based User Interface

**PRD Description:** The entire application is accessed through a web browser with a single-page layout.

**FRD Functional Requirements:**
- Single-page layout with form, list, and total visible simultaneously
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive layout (desktop primary; tablet/phone functional)
- Clear visual hierarchy: form prominently placed, list below, total always visible
- No external plugins or installations required
- Accessible via URL (localhost:3000 default)
- Single-command startup (npm start or equivalent)
- Static assets served by the same server as the API (same-origin)
- Keyboard-accessible interactive elements
- XSS prevention via DOM sanitization

**FRD Error Codes:** JS runtime error fallback, network unreachable handling

**User Stories (5):** US-5.1 (Access via Browser), US-5.2 (Single-Page Layout), US-5.3 (Single-Command Startup), US-5.4 (Responsive and Keyboard-Accessible), US-5.5 (Graceful Error Handling)

---

## 5. Test Case Coverage

### 5.1 Test Case Mapping by Feature

Each test case is derived from user story acceptance criteria. Test case IDs follow the pattern TEST-{Epic}.{Story}.{Criterion}.

| Test ID | Description | User Story | Feature | Type |
|---------|-------------|------------|---------|------|
| TEST-0.1.01 | Expense form displays amount, description, category fields and submit button | US-0.1 | F0 | UI |
| TEST-0.1.02 | Amount field accepts numeric values with up to two decimal places | US-0.1 | F0 | Validation |
| TEST-0.1.03 | Description field accepts free-text up to 500 characters | US-0.1 | F0 | Validation |
| TEST-0.1.04 | Category field accepts free-text up to 100 characters | US-0.1 | F0 | Validation |
| TEST-0.1.05 | All three fields are required -- form cannot submit with empty fields | US-0.1 | F0 | Validation |
| TEST-0.1.06 | Form clears all fields after successful submission | US-0.1 | F0 | UI |
| TEST-0.1.07 | New expense appears in list without page reload | US-0.1 | F0 | Integration |
| TEST-0.1.08 | Running total updates to include new expense amount | US-0.1 | F0 | Integration |
| TEST-0.1.09 | Success indicator displayed after save | US-0.1 | F0 | UI |
| TEST-0.2.01 | Form clears and focus returns to amount field after each submission | US-0.2 | F0 | UI |
| TEST-0.2.02 | Each expense persisted to server before success response | US-0.2 | F0, F2 | Integration |
| TEST-0.2.03 | 20 sequential entries all appear in expense list | US-0.2 | F0 | Functional |
| TEST-0.2.04 | Running total accurate after each sequential submission | US-0.2 | F0, F4 | Functional |
| TEST-0.2.05 | Previously submitted entries persist after browser tab close | US-0.2 | F0, F2 | Persistence |
| TEST-0.3.01 | Empty amount shows "Amount is required" | US-0.3 | F0 | Validation |
| TEST-0.3.02 | Non-numeric amount shows "Amount must be a valid number" | US-0.3 | F0 | Validation |
| TEST-0.3.03 | Zero/negative amount shows "Amount must be greater than zero" | US-0.3 | F0 | Validation |
| TEST-0.3.04 | Amount > 999,999.99 shows appropriate error | US-0.3 | F0 | Validation |
| TEST-0.3.05 | Amount with > 2 decimal places shows precision error | US-0.3 | F0 | Validation |
| TEST-0.3.06 | Empty description shows "Description is required" | US-0.3 | F0 | Validation |
| TEST-0.3.07 | Description > 500 chars shows length error | US-0.3 | F0 | Validation |
| TEST-0.3.08 | Empty category shows "Category is required" | US-0.3 | F0 | Validation |
| TEST-0.3.09 | Category > 100 chars shows length error | US-0.3 | F0 | Validation |
| TEST-0.3.10 | Form retains input on validation failure | US-0.3 | F0 | UI |
| TEST-0.3.11 | Multiple validation errors displayed simultaneously | US-0.3 | F0 | Validation |
| TEST-0.4.01 | Server validates all fields independently of client | US-0.4 | F0 | API |
| TEST-0.4.02 | Invalid requests return 400 with structured error codes | US-0.4 | F0 | API |
| TEST-0.4.03 | Multiple errors returned in errors array | US-0.4 | F0 | API |
| TEST-0.4.04 | Server responses never expose stack traces | US-0.4 | F0 | Security |
| TEST-0.4.05 | Server rejects manipulated requests that bypass client validation | US-0.4 | F0 | Security |
| TEST-1.1.01 | Each expense row displays an Edit button | US-1.1 | F1 | UI |
| TEST-1.1.02 | Edit populates form with current expense values | US-1.1 | F1 | UI |
| TEST-1.1.03 | UI indicates edit mode (button label, Cancel button) | US-1.1 | F1 | UI |
| TEST-1.1.04 | User can modify any combination of fields | US-1.1 | F1 | Functional |
| TEST-1.1.05 | F0 validation rules applied during edit | US-1.1 | F1 | Validation |
| TEST-1.1.06 | Expense list row updates with new values after save | US-1.1 | F1 | Integration |
| TEST-1.1.07 | Running total recalculates after edit | US-1.1 | F1, F4 | Integration |
| TEST-1.1.08 | Success indicator shown after edit save | US-1.1 | F1 | UI |
| TEST-1.1.09 | Form exits edit mode after save | US-1.1 | F1 | UI |
| TEST-1.2.01 | Cancel button visible in edit mode | US-1.2 | F1 | UI |
| TEST-1.2.02 | Cancel discards changes without server request | US-1.2 | F1 | Functional |
| TEST-1.2.03 | Form returns to add-new state after cancel | US-1.2 | F1 | UI |
| TEST-1.2.04 | List and total unchanged after cancel | US-1.2 | F1 | Functional |
| TEST-1.2.05 | Original expense values intact in list after cancel | US-1.2 | F1 | Functional |
| TEST-1.3.01 | Can immediately edit another expense after saving one | US-1.3 | F1 | Functional |
| TEST-1.3.02 | Each edit persisted independently | US-1.3 | F1 | Persistence |
| TEST-1.3.03 | List reflects all sequential edits accurately | US-1.3 | F1 | Functional |
| TEST-1.3.04 | Running total correct after multiple sequential edits | US-1.3 | F1, F4 | Functional |
| TEST-1.4.01 | 404 response for non-existent expense ID | US-1.4 | F1 | API |
| TEST-1.4.02 | "Expense not found" error displayed in UI | US-1.4 | F1 | UI |
| TEST-1.4.03 | Form does not clear on 404 error | US-1.4 | F1 | UI |
| TEST-1.4.04 | 400 response for invalid/malformed IDs | US-1.4 | F1 | API |
| TEST-2.1.01 | Expenses survive browser page refresh | US-2.1 | F2 | Persistence |
| TEST-2.1.02 | List loads via GET /api/expenses from server storage | US-2.1 | F2, F3 | Integration |
| TEST-2.1.03 | Running total matches persisted data after refresh | US-2.1 | F2, F4 | Persistence |
| TEST-2.1.04 | No data stored only in browser storage | US-2.1 | F2 | Architecture |
| TEST-2.2.01 | Expenses persist across server stop/start cycle | US-2.2 | F2 | Persistence |
| TEST-2.2.02 | GET /api/expenses returns all data after restart | US-2.2 | F2 | API |
| TEST-2.2.03 | Running total correct after server restart | US-2.2 | F2, F4 | Persistence |
| TEST-2.2.04 | No data corruption during stop/start cycle | US-2.2 | F2 | Persistence |
| TEST-2.3.01 | Storage created automatically on first run | US-2.3 | F2 | Initialization |
| TEST-2.3.02 | Schema (tables, indexes) created during initialization | US-2.3 | F2 | Initialization |
| TEST-2.3.03 | Server logs storage initialization confirmation | US-2.3 | F2 | Observability |
| TEST-2.3.04 | Subsequent starts skip re-creation | US-2.3 | F2 | Initialization |
| TEST-2.3.05 | Schema integrity compromise triggers repair attempt | US-2.3 | F2 | Resilience |
| TEST-2.4.01 | Server confirms persistence before 201/200 response | US-2.4 | F2 | Persistence |
| TEST-2.4.02 | Write failure returns 500 ERR_STORAGE_WRITE | US-2.4 | F2 | Error Handling |
| TEST-2.4.03 | Client shows storage failure message | US-2.4 | F2 | UI |
| TEST-2.4.04 | Form retains input on storage failure | US-2.4 | F2 | UI |
| TEST-2.5.01 | Data stored in standard format (SQLite or JSON) | US-2.5 | F2 | Architecture |
| TEST-2.5.02 | Storage file can be copied for backup | US-2.5 | F2 | Architecture |
| TEST-2.5.03 | Records contain id, amount, description, category, timestamps | US-2.5 | F2 | Data Model |
| TEST-2.5.04 | Amounts stored as integer cents | US-2.5 | F2 | Data Model |
| TEST-2.5.05 | Timestamps in ISO 8601 UTC format | US-2.5 | F2 | Data Model |
| TEST-3.1.01 | All expenses fetched on page load | US-3.1 | F3 | Integration |
| TEST-3.1.02 | Each row shows currency-formatted amount, description, category | US-3.1 | F3 | UI |
| TEST-3.1.03 | Expenses ordered most recent first | US-3.1 | F3 | Functional |
| TEST-3.1.04 | Each row includes Edit button | US-3.1 | F3, F1 | UI |
| TEST-3.1.05 | List visible without separate navigation | US-3.1 | F3 | UI |
| TEST-3.2.01 | Empty state message displayed when zero expenses | US-3.2 | F3 | UI |
| TEST-3.2.02 | Empty state message is friendly and non-technical | US-3.2 | F3 | UI |
| TEST-3.2.03 | Form visible and functional during empty state | US-3.2 | F3 | UI |
| TEST-3.2.04 | Total shows $0.00 during empty state | US-3.2 | F3, F4 | UI |
| TEST-3.2.05 | First expense replaces empty state with list | US-3.2 | F3 | UI |
| TEST-3.3.01 | New expense appears in list without page reload | US-3.3 | F3 | Integration |
| TEST-3.3.02 | Edited values appear in correct row without reload | US-3.3 | F3 | Integration |
| TEST-3.3.03 | List maintains ordering after mutations | US-3.3 | F3 | Functional |
| TEST-3.3.04 | No duplicate entries after add/edit | US-3.3 | F3 | Functional |
| TEST-3.4.01 | 500 error shows "Failed to load expenses" message | US-3.4 | F3 | Error Handling |
| TEST-3.4.02 | Network unreachable shows connection error message | US-3.4 | F3 | Error Handling |
| TEST-3.4.03 | Retry option provided on load failure | US-3.4 | F3 | UI |
| TEST-3.4.04 | Error state is intentional and clear, not broken UI | US-3.4 | F3 | UI |
| TEST-3.5.01 | List renders within 1 second for 1,000 expenses | US-3.5 | F3 | Performance |
| TEST-3.5.02 | Amounts correctly converted from cents to display | US-3.5 | F3 | Functional |
| TEST-3.5.03 | Text fields sanitized to prevent XSS | US-3.5 | F3 | Security |
| TEST-3.5.04 | List scrollable with many entries, layout intact | US-3.5 | F3 | UI |
| TEST-4.1.01 | Total displayed prominently, always visible without scrolling | US-4.1 | F4 | UI |
| TEST-4.1.02 | Total formatted as currency ($X,XXX.XX) | US-4.1 | F4 | UI |
| TEST-4.1.03 | Total calculated using integer cents arithmetic | US-4.1 | F4 | Functional |
| TEST-4.1.04 | Cent sum divided by 100 for display | US-4.1 | F4 | Functional |
| TEST-4.1.05 | Total shows $0.00 when no expenses exist | US-4.1 | F4 | UI |
| TEST-4.2.01 | Total increases by new expense amount after add | US-4.2 | F4 | Functional |
| TEST-4.2.02 | Total updates without page reload | US-4.2 | F4 | Integration |
| TEST-4.2.03 | Updated total accurate to the cent | US-4.2 | F4 | Functional |
| TEST-4.2.04 | Total format consistent after update | US-4.2 | F4 | UI |
| TEST-4.3.01 | Total adjusts after editing expense amount | US-4.3 | F4 | Functional |
| TEST-4.3.02 | Total updates without page reload after edit | US-4.3 | F4 | Integration |
| TEST-4.3.03 | Non-amount edit does not change total | US-4.3 | F4 | Functional |
| TEST-4.3.04 | Total correct after multiple sequential edits | US-4.3 | F4 | Functional |
| TEST-4.4.01 | Total shows error indicator on data load failure | US-4.4 | F4 | Error Handling |
| TEST-4.4.02 | Total never displays stale value after failed refresh | US-4.4 | F4 | Error Handling |
| TEST-4.4.03 | Total displays correctly after successful retry | US-4.4 | F4 | Error Handling |
| TEST-5.1.01 | Application accessible via URL (localhost:3000) | US-5.1 | F5 | Integration |
| TEST-5.1.02 | Page renders form, list, and total in single-page layout | US-5.1 | F5 | UI |
| TEST-5.1.03 | No browser plugins or extensions required | US-5.1 | F5 | Compatibility |
| TEST-5.1.04 | Works in Chrome, Firefox, Safari, and Edge | US-5.1 | F5 | Compatibility |
| TEST-5.2.01 | Expense form prominently placed (top or left) | US-5.2 | F5 | UI |
| TEST-5.2.02 | List visible below or beside the form | US-5.2 | F5 | UI |
| TEST-5.2.03 | Total always visible without scrolling | US-5.2 | F5 | UI |
| TEST-5.2.04 | No tabs, navigation menus, or page transitions needed | US-5.2 | F5 | UI |
| TEST-5.2.05 | Clear visual hierarchy between sections | US-5.2 | F5 | UI |
| TEST-5.3.01 | Application starts with single command | US-5.3 | F5, F2 | Setup |
| TEST-5.3.02 | Server serves static UI and API on same origin | US-5.3 | F5 | Architecture |
| TEST-5.3.03 | No build step or migration required before first run | US-5.3 | F5, F2 | Setup |
| TEST-5.3.04 | Functional application after navigating to URL | US-5.3 | F5 | Integration |
| TEST-5.3.05 | PORT configurable via environment variable (default 3000) | US-5.3 | F5 | Configuration |
| TEST-5.4.01 | Layout usable on desktop screen sizes | US-5.4 | F5 | UI |
| TEST-5.4.02 | Layout functional on tablet/phone sizes | US-5.4 | F5 | UI |
| TEST-5.4.03 | All elements accessible via keyboard tab navigation | US-5.4 | F5 | Accessibility |
| TEST-5.4.04 | Form submittable by pressing Enter | US-5.4 | F5 | Accessibility |
| TEST-5.4.05 | Logical focus order: amount, description, category, submit | US-5.4 | F5 | Accessibility |
| TEST-5.5.01 | Validation errors appear inline next to fields | US-5.5 | F5 | UI |
| TEST-5.5.02 | 500 errors show user-friendly retry message | US-5.5 | F5 | Error Handling |
| TEST-5.5.03 | Network errors show connection error message | US-5.5 | F5 | Error Handling |
| TEST-5.5.04 | JS runtime errors caught with fallback message | US-5.5 | F5 | Error Handling |
| TEST-5.5.05 | Error messages do not expose technical details | US-5.5 | F5 | Security |

### 5.2 Coverage Summary

| Feature | Priority | User Stories | Test Cases | Coverage |
|---------|----------|-------------|------------|----------|
| F0: Expense Entry | P0 | 4 (US-0.1, US-0.2, US-0.3, US-0.4) | 30 | 100% |
| F1: Expense Editing | P0 | 4 (US-1.1, US-1.2, US-1.3, US-1.4) | 18 | 100% |
| F2: Persistent Storage | P0 | 5 (US-2.1, US-2.2, US-2.3, US-2.4, US-2.5) | 23 | 100% |
| F3: Expense List Display | P0 | 5 (US-3.1, US-3.2, US-3.3, US-3.4, US-3.5) | 22 | 100% |
| F4: Total Amount Display | P0 | 4 (US-4.1, US-4.2, US-4.3, US-4.4) | 15 | 100% |
| F5: Web-Based User Interface | P0 | 5 (US-5.1, US-5.2, US-5.3, US-5.4, US-5.5) | 25 | 100% |
| **Totals** | **All P0** | **27** | **133** | **100%** |

### 5.3 Test Type Distribution

| Test Type | Count | Description |
|-----------|-------|-------------|
| UI | 37 | Visual rendering, layout, user feedback |
| Validation | 15 | Input validation (client and server) |
| Functional | 20 | Core business logic and behavior |
| Integration | 14 | Cross-component and end-to-end flows |
| API | 6 | REST endpoint behavior and response codes |
| Persistence | 10 | Data durability across sessions and restarts |
| Error Handling | 10 | Error states and recovery behavior |
| Security | 5 | XSS prevention, information leakage, injection |
| Initialization | 4 | First-run setup and schema creation |
| Performance | 1 | Load time and rendering speed |
| Compatibility | 2 | Cross-browser support |
| Architecture | 3 | Storage format and deployment model |
| Accessibility | 3 | Keyboard navigation and focus management |
| Setup | 2 | Single-command startup and zero-config |
| Configuration | 1 | Environment variable handling |
| **Total** | **133** | |

---

## 6. Non-Functional Requirements Traceability

| NFR (from PRD) | FRD Coverage | TechArch Coverage | Test Cases |
|----------------|-------------|-------------------|------------|
| Performance: Page load < 1s for 1,000 expenses | F3: Performance at scale | Section 6: System requirements | TEST-3.5.01 |
| Reliability: Zero data loss | F2: Write-before-acknowledge | Section 3: Data integrity rules; Section 2: Storage layer | TEST-2.4.01, TEST-2.4.02, TEST-2.2.04 |
| Usability: First expense in < 10 seconds | F0: Fast entry; F5: Clear hierarchy | Section 2: Frontend -- form at top | TEST-0.1.01, TEST-5.2.01 |
| Compatibility: Chrome, Firefox, Safari, Edge | F5: Modern browser support | Section 6: Frontend tech (vanilla HTML/CSS/JS) | TEST-5.1.04 |
| Data Integrity: Two decimal precision, no float errors | F0/F4: Cents arithmetic | Section 1: Cents-based integer arithmetic; Section 3: Column specifications | TEST-4.1.03, TEST-2.5.04 |
| Availability: Single-command startup | F5: Single-command startup | Section 1: Deployment topology; Section 6: Package.json | TEST-5.3.01 |
| Maintainability: Modular codebase | F5: Clean architecture | Section 2: Component architecture; Directory structure | TEST-5.3.03 |

---

## 7. Change Management

### Change Log

| Version | Date | Author | Change Description | Affected Sections |
|---------|------|--------|--------------------|-------------------|
| 1.0 | 2026-09-11 | Pivota Spec Framework | Initial RTM generation from PRD v1.0, FRD v1.0, TechArch v1.0, UserStories v1.0 | All |

### Change Impact Assessment Process

When a requirement changes, the following documents must be reviewed for impact:

1. **PRD change** -- Assess impact on FRD specifications, TechArch components, UserStories, and this RTM
2. **FRD change** -- Assess impact on TechArch implementation, UserStories acceptance criteria, and test cases
3. **TechArch change** -- Assess impact on FRD feasibility and UserStories implementation approach
4. **UserStory change** -- Assess impact on test case coverage and FRD completeness

---

## 8. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Technical Lead | | | |
| QA Lead | | | |
| Project Manager | | | |

---

## Appendix A: ID Convention Reference

| Prefix | Level | Format | Example | Source Document |
|--------|-------|--------|---------|-----------------|
| F | PRD Feature | F{N} | F0, F1, F2, F3, F4, F5 | PRD-ExpenseTracker.md |
| Y | FRD Cross-Feature Spec | Y{N} | Y0, Y1, Y2, Y3 | FRD-ExpenseTracker.md |
| ERR_ | Error Code | ERR_{DOMAIN}_{NAME} | ERR_EXPENSE_AMOUNT_REQUIRED | FRD-ExpenseTracker.md (Y2) |
| US- | User Story | US-{Epic}.{Seq} | US-0.1, US-1.2 | UserStories-ExpenseTracker.md |
| PER- | Persona | PER-{NN} | PER-01, PER-02, PER-03 | UserStories-ExpenseTracker.md |
| TEST- | Test Case | TEST-{Epic}.{Story}.{NN} | TEST-0.1.01 | RTM-ExpenseTracker.md |

## Appendix B: Validation Self-Check

| Check | Status |
|-------|--------|
| All PROJECT.md requirements traced to PRD features | Yes -- 5 active requirements + 1 implicit platform requirement mapped to F0--F5 |
| All PRD features have FRD specifications | Yes -- F0--F5 fully specified with process flows, validation, errors |
| All FRD specifications have TechArch coverage | Yes -- All features mapped to backend/frontend components, API endpoints, data model |
| All features have user stories | Yes -- 27 stories across 6 epics covering all features |
| All user stories have test cases | Yes -- 133 test cases derived from acceptance criteria |
| IDs follow established conventions | Yes -- F, Y, ERR_, US-, PER-, TEST- prefixes consistent |
| Non-functional requirements traced | Yes -- 7 NFRs mapped to FRD, TechArch, and test cases |
| Bidirectional traceability established | Yes -- Forward (PRD->FRD->TechArch->Stories) and backward links documented |
| No orphaned requirements | Yes -- Every requirement has at least one upstream and downstream link |
| Approval section included | Yes -- Section 8 with sign-off table |

---

*Generated by Pivota Spec RTM Generator*
*Requirements Traceability Matrix v1.0 -- 2026-09-11*
