# Functional Requirements Document: Expense Tracker

**Version:** 1.0
**Project:** Expense Tracker
**Generated:** 2026-09-11
**Source:** PRD-ExpenseTracker.md v1.0, PROJECT.md

---

## Scope

This FRD specifies the functional behavior of the Expense Tracker application — a single-user, web-based tool for recording, editing, and viewing personal expenses with persistent storage. It covers all six PRD features (F0–F5), the database schema, REST API surface, error catalog, and integration points. Every feature is P0 (Critical — MVP requirement).

## Conventions

- **Feature IDs** follow the PRD: F0 through F5.
- **Process steps** are numbered sequentially; sub-steps use letters (a, b, c).
- **Input fields** specify type, constraints, and whether they are required or optional.
- **Error codes** use the format `ERR_{DOMAIN}_{NAME}` (e.g., `ERR_EXPENSE_INVALID_AMOUNT`).
- **Amounts** are stored as integers representing cents to avoid floating-point errors. Display values divide by 100 and format to two decimal places.
- **Timestamps** use ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`) in UTC.
- **IDs** are server-generated unique identifiers (UUIDs or auto-incrementing integers).

## Table of Contents

### Features
- **F00** — Expense Entry
- **F01** — Expense Editing
- **F02** — Persistent Storage
- **F03** — Expense List Display
- **F04** — Total Amount Display
- **F05** — Web-Based User Interface

### Cross-Feature Specifications
- **Y0** — Database Schema (DDL)
- **Y1** — REST API Endpoints
- **Y2** — Error Catalog
- **Y3** — Integration Points

## Shared Terminology

- **Expense:** A single financial record consisting of an amount, description, category, and metadata (ID, timestamp).
- **Amount (cents):** Integer representation of a monetary value in the smallest currency unit (e.g., 1050 = $10.50). All arithmetic and storage uses cents; display converts to decimal.
- **Category:** A free-text label assigned by the user to classify an expense. Not drawn from a predefined list.
- **Persistence:** Server-side storage that survives page refresh, browser closure, and server restart.
- **Mutation:** Any operation that changes stored data (create or update). Every mutation must be confirmed persisted before the server responds with success.
- **Empty state:** The UI condition when zero expenses exist in storage.

---

