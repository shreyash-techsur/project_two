## F05: Web-Based User Interface

**Description:** The entire application is accessed through a standard web browser. The UI consolidates expense entry (F00), expense editing (F01), the expense list (F03), and the total display (F04) into a single cohesive page. It must be clean, functional, and usable without installation, plugins, or a mobile app. The server serves the UI assets and exposes the REST API on the same origin.

**Terminology:**
- **Single-page layout:** All functionality is available on one page without navigation between separate pages.
- **Same-origin serving:** The web server serves both the HTML/CSS/JS UI files and the `/api/*` endpoints, avoiding CORS issues.
- **Modern browser:** Latest stable versions of Chrome, Firefox, Safari, and Edge.

**Sub-features:**
- Single-page layout with expense form, expense list, and total visible simultaneously
- Works in all modern browsers (Chrome, Firefox, Safari, Edge — latest versions)
- Responsive layout usable on different screen sizes (desktop primary; tablet/phone should be functional but not pixel-perfect)
- Clear visual hierarchy: form prominently placed (top or left), list below or beside, total always visible
- No external plugins, extensions, or installations required by the user
- Accessible via URL (localhost during development; deployable to any static host + API server)
- Server starts with a single command (e.g., `npm start`, `python app.py`, or equivalent)
- Static assets (HTML, CSS, JS) served by the same server that hosts the API

**Process:**
1. User starts the server with a single command (see NFR: single-command startup).
2. User opens a browser and navigates to the application URL (e.g., `http://localhost:3000`).
3. The server responds with the HTML page, which loads CSS and JS assets.
4. On page load, the JavaScript:
   a. Fetches expenses from `GET /api/expenses` (F03).
   b. Renders the expense list.
   c. Calculates and displays the total (F04).
   d. Renders the expense entry form (F00) in its default "add" state.
5. The user interacts with the page (add, edit) without navigating away. All mutations happen via API calls (fetch/XHR) and the DOM updates in place.

**Inputs:**
- User interactions: form input, button clicks, edit/cancel actions.
- No user-provided configuration or setup required.

**Outputs:**
- A rendered web page containing:
  - Expense entry form (amount, description, category, submit button)
  - Expense list (rows with amount, description, category, edit button)
  - Total amount display (formatted currency)
  - Feedback messages (success toasts, validation errors, server errors)

**Validation:**
- The page must load and render correctly with zero expenses (empty state).
- The page must load and render correctly with 1,000 expenses (performance target: under 1 second).
- All interactive elements must be keyboard-accessible (tab order, enter to submit).
- Free-text fields rendered in the list must be sanitized to prevent XSS.
- The UI must not depend on localStorage or sessionStorage for data persistence (server-side persistence only, per F02).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Server not running / unreachable | — | — | Browser shows default connection error; no custom handling needed |
| Static assets fail to load | — | — | Browser shows broken page; ensure assets are bundled with server |
| JS runtime error prevents rendering | — | — | Console error; implement try/catch around init to show fallback message |

**API Surface (this feature):** This feature consumes all API endpoints defined in `Y1-api.md`. It does not define its own endpoints beyond serving static files.

**Schema Surface (this feature):** No direct schema interaction. All data access is through the REST API.

---

