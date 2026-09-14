'use strict';

/**
 * Validation middleware for POST /api/expenses.
 * Checks amount, description, and category against FRD Y2 error catalog.
 * Collects ALL errors and returns them simultaneously.
 */
function validateExpenseInput(req, res, next) {
  const errors = [];
  const { amount, description, category } = req.body || {};

  // --- Amount validation ---
  if (amount === undefined || amount === null || amount === '') {
    errors.push({ code: 'ERR_EXPENSE_AMOUNT_REQUIRED', message: 'Amount is required' });
  } else if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push({ code: 'ERR_EXPENSE_INVALID_AMOUNT', message: 'Amount must be a valid number' });
  } else {
    if (amount <= 0) {
      errors.push({ code: 'ERR_EXPENSE_AMOUNT_POSITIVE', message: 'Amount must be greater than zero' });
    }
    if (amount > 999999.99) {
      errors.push({ code: 'ERR_EXPENSE_AMOUNT_TOO_LARGE', message: 'Amount must not exceed 999,999.99' });
    }
    // Precision check: more than 2 decimal places
    const amountStr = String(amount);
    const decimalIndex = amountStr.indexOf('.');
    if (decimalIndex !== -1 && amountStr.length - decimalIndex - 1 > 2) {
      errors.push({ code: 'ERR_EXPENSE_AMOUNT_PRECISION', message: 'Amount must have at most two decimal places' });
    }
  }

  // --- Description validation ---
  if (description === undefined || description === null || description === '') {
    errors.push({ code: 'ERR_EXPENSE_DESC_REQUIRED', message: 'Description is required' });
  } else if (typeof description !== 'string') {
    errors.push({ code: 'ERR_EXPENSE_DESC_REQUIRED', message: 'Description is required' });
  } else {
    if (description.trim().length === 0) {
      errors.push({ code: 'ERR_EXPENSE_DESC_REQUIRED', message: 'Description is required' });
    }
    if (description.length > 500) {
      errors.push({ code: 'ERR_EXPENSE_DESC_TOO_LONG', message: 'Description must not exceed 500 characters' });
    }
  }

  // --- Category validation ---
  if (category === undefined || category === null || category === '') {
    errors.push({ code: 'ERR_EXPENSE_CAT_REQUIRED', message: 'Category is required' });
  } else if (typeof category !== 'string') {
    errors.push({ code: 'ERR_EXPENSE_CAT_REQUIRED', message: 'Category is required' });
  } else {
    if (category.trim().length === 0) {
      errors.push({ code: 'ERR_EXPENSE_CAT_REQUIRED', message: 'Category is required' });
    }
    if (category.length > 100) {
      errors.push({ code: 'ERR_EXPENSE_CAT_TOO_LONG', message: 'Category must not exceed 100 characters' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
}

module.exports = { validateExpenseInput };
