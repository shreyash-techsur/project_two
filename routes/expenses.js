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
  } catch (err) {
    next(err);
  }
});

module.exports = router;
