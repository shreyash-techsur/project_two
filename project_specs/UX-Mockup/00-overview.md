# UX Mockup

**Project:** Expense Tracker
**Generated:** 2026-09-11
**Based on:** UserStories-ExpenseTracker.md, PRD-ExpenseTracker.md, FRD-ExpenseTracker.md, JOURNEYS-ExpenseTracker.md

---

## Overview

The Expense Tracker is a single-page web application with three core UI regions — expense form, expense list, and running total — all visible simultaneously on one screen. The UX is designed around three guiding principles:

1. **Speed of entry:** The primary interaction (adding an expense) must complete in under 15 seconds. The form auto-focuses on the amount field, clears after submission, and returns focus for the next entry. This supports Maya's daily quick entries (JRN-01.1) and Tom's batch sessions of 15+ receipts (JRN-02.1).

2. **Persistent trust:** Every action that modifies data provides immediate visual confirmation — the expense appears in the list, the total updates, and a success indicator fires. No data lives only in the browser. This addresses the core anxiety shared by all three personas (Cross-Journey Patterns).

3. **Single-glance comprehension:** The total is always visible without scrolling. The form's mode (add vs. edit) is unambiguous. Error states are inline and specific. The user never needs to navigate away from the page to accomplish any task.

### Design Principles

- **One page, zero navigation:** All features are accessible without tabs, menus, or page transitions (US-5.2)
- **Form-first layout:** The expense form occupies the top of the page — it's the first thing users see and interact with (US-5.2, JRN-01.1)
- **Always-visible total:** The running total is positioned so it remains visible regardless of scroll position (US-4.1, JRN-02.2)
- **Inline feedback:** Validation errors appear next to the field that caused them; success/error toasts appear briefly and auto-dismiss (US-0.3, US-5.5)
- **Keyboard-first flow:** Tab order follows amount → description → category → submit; Enter submits the form (US-5.4)

---

## Navigation Map

Since the Expense Tracker is a single-page application with no routing, all functionality lives on one screen. There are no separate pages to navigate between.

| Screen | Route | Reached from | Nav element |
|--------|-------|--------------|-------------|
| Main Dashboard | `/` | Direct URL (bookmark, address bar) | N/A — this is the only screen; it is the app shell |

**Invariant — no orphan screens:** The application has exactly one screen (`/`). All features (form, list, total, edit mode) are regions within this single page, not separate screens. No navigation links are needed because there is nowhere else to go.

