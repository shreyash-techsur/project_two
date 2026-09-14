'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

let db;

/**
 * Initialize the SQLite database.
 * Creates the data directory, opens the database file, enables WAL mode,
 * and creates the expenses table and index if they don't exist.
 * Must be called once on server startup before any queries.
 */
function initialize() {
  const dbPath = process.env.DB_PATH || './data/expenses.db';
  const dbDir = path.dirname(dbPath);

  // 1. Ensure data directory exists
  fs.mkdirSync(dbDir, { recursive: true });

  // 2. Open SQLite database
  db = new Database(dbPath);

  // 3. Enable WAL mode
  db.pragma('journal_mode = WAL');

  // 4. Create expenses table with CHECK constraints
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        amount      INTEGER NOT NULL CHECK (amount > 0 AND amount <= 99999999),
        description TEXT    NOT NULL CHECK (length(trim(description)) >= 1 AND length(description) <= 500),
        category    TEXT    NOT NULL CHECK (length(trim(category)) >= 1 AND length(category) <= 100),
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL
    );
  `);

  // 5. Create index for default ordering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC);
  `);

  // 6. Log success
  console.log(`Storage initialized: ${dbPath}`);
}

/**
 * Retrieve all expenses ordered by created_at descending (most recent first).
 * @returns {Array<Object>} Array of expense row objects
 */
function getAllExpenses() {
  try {
    const stmt = db.prepare(`
      SELECT id, amount, description, category, created_at, updated_at
      FROM expenses
      ORDER BY created_at DESC
    `);
    return stmt.all();
  } catch (err) {
    const error = new Error(`ERR_STORAGE_READ: Failed to retrieve expenses: ${err.message}`);
    error.code = 'ERR_STORAGE_READ';
    throw error;
  }
}

/**
 * Create a new expense record.
 * @param {Object} data - The expense data
 * @param {number} data.amount - Amount in cents (positive integer)
 * @param {string} data.description - Expense description
 * @param {string} data.category - Expense category
 * @returns {Object} The complete expense record including server-generated fields
 */
function createExpense({ amount, description, category }) {
  try {
    const now = new Date().toISOString();
    const created_at = now;
    const updated_at = now;

    const insertStmt = db.prepare(`
      INSERT INTO expenses (amount, description, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = insertStmt.run(amount, description, category, created_at, updated_at);
    const id = info.lastInsertRowid;

    // Fetch and return the full row
    const selectStmt = db.prepare(`
      SELECT id, amount, description, category, created_at, updated_at
      FROM expenses
      WHERE id = ?
    `);

    return selectStmt.get(id);
  } catch (err) {
    const error = new Error(`ERR_STORAGE_WRITE: Failed to create expense: ${err.message}`);
    error.code = 'ERR_STORAGE_WRITE';
    throw error;
  }
}

/**
 * Update an existing expense record.
 * `created_at` is immutable; `updated_at` is set to the current UTC time.
 * @param {number} id - The ID of the expense to update
 * @param {Object} data - The updated expense data
 * @param {number} data.amount - Amount in cents (positive integer)
 * @param {string} data.description - Expense description
 * @param {string} data.category - Expense category
 * @returns {Object|null} The complete updated record, or null if no expense has that ID
 */
function updateExpense(id, { amount, description, category }) {
  try {
    const updated_at = new Date().toISOString();

    const updateStmt = db.prepare(`
      UPDATE expenses
      SET amount = ?, description = ?, category = ?, updated_at = ?
      WHERE id = ?
    `);

    const info = updateStmt.run(amount, description, category, updated_at, id);

    // No row matched the given ID — caller maps this to a 404
    if (info.changes === 0) {
      return null;
    }

    const selectStmt = db.prepare(`
      SELECT id, amount, description, category, created_at, updated_at
      FROM expenses
      WHERE id = ?
    `);

    return selectStmt.get(id);
  } catch (err) {
    const error = new Error(`ERR_STORAGE_WRITE: Failed to update expense: ${err.message}`);
    error.code = 'ERR_STORAGE_WRITE';
    throw error;
  }
}

module.exports = { initialize, getAllExpenses, createExpense, updateExpense };
