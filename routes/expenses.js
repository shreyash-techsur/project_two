'use strict';

const express = require('express');
const router = express.Router();
const database = require('../db/database');
const { validateExpenseInput } = require('../middleware/validate');

// GET /api/expenses — List all expenses (most recent first)
// FRD Y1: Response 200 OK with { expenses: [...] }
router.get('/', (req, res, next) => {
  try {
    const expenses = database.getAllExpenses();
    res.status(200).json({ expenses });
  } catch (err) {
    err.message = 'read: ' + err.message; // Tag for error handler
    next(err);
  }
});

// POST /api/expenses — Create a new expense
// FRD Y1: Request { amount (dollars), description, category }
// Response 201 Created with { expense: {...} }
router.post('/', validateExpenseInput, (req, res, next) => {
  try {
    const { amount, description, category } = req.body;

    // Convert dollar amount to integer cents (TechArch §3, FRD F0 step 9)
    // Math.round handles floating-point edge cases (e.g., 10.50 * 100 = 1049.9999...)
    const amountCents = Math.round(parseFloat(amount) * 100);

    // Trim description and category before storage (FRD §Y0 Data Integrity Rules)
    const trimmedDescription = description.trim();
    const trimmedCategory = category.trim();

    const expense = database.createExpense({
      amount: amountCents,
      description: trimmedDescription,
      category: trimmedCategory
    });

    res.status(201).json({ expense });
    // Persist DB to git in the background (non-blocking)
    database.persistToGit();
  } catch (err) {
    next(err);
  }
});

// Validates the :id path parameter as a positive integer (FRD F01, Y1 400 ERR_EXPENSE_INVALID_ID).
// Runs BEFORE body validation so a malformed ID reports as an invalid ID rather than
// being masked by body-validation errors.
function validateExpenseId(req, res, next) {
  const raw = req.params.id;
  const id = parseInt(raw, 10);

  // String(id) !== raw rejects non-canonical forms like "01", "1.5", "1abc"
  if (isNaN(id) || id <= 0 || String(id) !== raw) {
    return res.status(400).json({
      error: { code: 'ERR_EXPENSE_INVALID_ID', message: 'Invalid expense ID' }
    });
  }

  req.expenseId = id;
  next();
}

// PUT /api/expenses/:id — Update an existing expense
// FRD F1: Request { amount (dollars), description, category }
// Response 200 OK with { expense: {...} }, 404 if not found, 400 if ID/body invalid
router.put('/:id', validateExpenseId, validateExpenseInput, (req, res, next) => {
  try {
    const { amount, description, category } = req.body;

    // Convert dollar amount to integer cents (same convention as POST)
    const amountCents = Math.round(parseFloat(amount) * 100);

    const trimmedDescription = description.trim();
    const trimmedCategory = category.trim();

    const expense = database.updateExpense(req.expenseId, {
      amount: amountCents,
      description: trimmedDescription,
      category: trimmedCategory
    });

    // Storage layer returns null when no row matched the ID
    if (expense === null) {
      return res.status(404).json({
        error: { code: 'ERR_EXPENSE_NOT_FOUND', message: 'Expense not found' }
      });
    }

    res.status(200).json({ expense });
    // Persist DB to git in the background (non-blocking)
    database.persistToGit();
  } catch (err) {
    next(err);
  }
});

// POST /api/expenses/import — Bulk import expenses from client backup
// Used to restore data after workspace rebuilds
router.post('/import', (req, res, next) => {
  try {
    const { expenses } = req.body;
    if (!Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({
        error: { code: 'ERR_IMPORT_INVALID', message: 'Request body must contain a non-empty expenses array' }
      });
    }

    // Cap at 1000 to prevent abuse
    if (expenses.length > 1000) {
      return res.status(400).json({
        error: { code: 'ERR_IMPORT_TOO_LARGE', message: 'Cannot import more than 1000 expenses at once' }
      });
    }

    const inserted = database.bulkImport(expenses);
    const allExpenses = database.getAllExpenses();

    res.status(200).json({ imported: inserted, expenses: allExpenses });

    // Persist after import
    if (inserted > 0) {
      database.persistToGit();
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
