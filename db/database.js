'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile, execSync } = require('child_process');
const Database = require('better-sqlite3');

let db;
let dbPath;

/**
 * Initialize the SQLite database.
 * Creates the data directory, opens the database file, enables WAL mode,
 * and creates the expenses table and index if they don't exist.
 * Must be called once on server startup before any queries.
 */
function initialize() {
  dbPath = process.env.DB_PATH || './data/expenses.db';
  const dbDir = path.dirname(dbPath);

  // 1. Ensure data directory exists
  fs.mkdirSync(dbDir, { recursive: true });

  // 2. Open SQLite database
  db = new Database(dbPath);

  // 3. Enable WAL mode
  db.pragma('journal_mode = WAL');

  // 4. Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
        password    TEXT    NOT NULL,
        salt        TEXT    NOT NULL,
        created_at  TEXT    NOT NULL
    );
  `);

  // 5. Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        token       TEXT    PRIMARY KEY,
        user_id     INTEGER NOT NULL,
        created_at  TEXT    NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 6. Create expenses table with CHECK constraints and user_id foreign key
  //    user_id is nullable to support migration of existing data
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER,
        amount      INTEGER NOT NULL CHECK (amount > 0 AND amount <= 99999999),
        description TEXT    NOT NULL CHECK (length(trim(description)) >= 1 AND length(description) <= 500),
        category    TEXT    NOT NULL CHECK (length(trim(category)) >= 1 AND length(category) <= 100),
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 6a. Add user_id column to expenses if it doesn't exist (migration for existing DBs)
  try {
    db.exec(`ALTER TABLE expenses ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
    console.log('[migrate] Added user_id column to expenses table');
  } catch (e) {
    // Column already exists — expected after first migration
  }

  // 7. Create index for default ordering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC);
  `);

  // 7a. Create index for user-scoped queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);
  `);

  // 6. Log success
  console.log(`Storage initialized: ${dbPath}`);

  // 7. Verify git persistence capability on startup
  try {
    execSync('git rev-parse --git-dir', { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });
    const remoteOut = execSync('git remote -v', { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' }).toString();
    if (remoteOut.includes('push')) {
      console.log('[persist] git remote available — data will auto-save to git on writes');
    } else {
      console.log('[persist] WARNING: no git push remote — data will NOT survive rebuilds');
    }
  } catch {
    console.log('[persist] WARNING: not a git repo or git unavailable — data will NOT survive rebuilds');
  }
}

// --- Authentication helpers ---

/**
 * Hash a password with a salt using PBKDF2.
 * @param {string} password - The plaintext password
 * @param {string} salt - The hex-encoded salt
 * @returns {string} The hex-encoded hash
 */
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Register a new user.
 * @param {string} username
 * @param {string} password
 * @returns {Object} The created user (id, username, created_at)
 * @throws if username already taken
 */
function createUser(username, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const now = new Date().toISOString();

  try {
    const stmt = db.prepare(`
      INSERT INTO users (username, password, salt, created_at)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(username.trim(), hash, salt, now);
    return { id: info.lastInsertRowid, username: username.trim(), created_at: now };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      const error = new Error('Username already taken');
      error.code = 'ERR_USERNAME_TAKEN';
      throw error;
    }
    throw err;
  }
}

/**
 * Verify a user's credentials.
 * @param {string} username
 * @param {string} password
 * @returns {Object|null} The user object if valid, null otherwise
 */
function verifyUser(username, password) {
  const stmt = db.prepare(`SELECT id, username, password, salt, created_at FROM users WHERE username = ?`);
  const user = stmt.get(username.trim());
  if (!user) return null;

  const hash = hashPassword(password, user.salt);
  if (hash !== user.password) return null;

  return { id: user.id, username: user.username, created_at: user.created_at };
}

/**
 * Create a session token for a user.
 * @param {number} userId
 * @returns {string} The session token
 */
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const stmt = db.prepare(`INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)`);
  stmt.run(token, userId, now);
  return token;
}

/**
 * Validate a session token and return the associated user.
 * @param {string} token
 * @returns {Object|null} The user object, or null if invalid/expired
 */
function getSessionUser(token) {
  if (!token) return null;
  const stmt = db.prepare(`
    SELECT u.id, u.username, u.created_at
    FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `);
  return stmt.get(token) || null;
}

/**
 * Delete a session token (logout).
 * @param {string} token
 */
function deleteSession(token) {
  const stmt = db.prepare(`DELETE FROM sessions WHERE token = ?`);
  stmt.run(token);
}

/**
 * Retrieve all expenses for a specific user, ordered by created_at descending.
 * @param {number} userId - The user's ID
 * @returns {Array<Object>} Array of expense row objects
 */
function getAllExpenses(userId) {
  try {
    const stmt = db.prepare(`
      SELECT id, amount, description, category, created_at, updated_at
      FROM expenses
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(userId);
  } catch (err) {
    const error = new Error(`ERR_STORAGE_READ: Failed to retrieve expenses: ${err.message}`);
    error.code = 'ERR_STORAGE_READ';
    throw error;
  }
}

/**
 * Create a new expense record for a specific user.
 * @param {number} userId - The user's ID
 * @param {Object} data - The expense data
 * @param {number} data.amount - Amount in cents (positive integer)
 * @param {string} data.description - Expense description
 * @param {string} data.category - Expense category
 * @returns {Object} The complete expense record including server-generated fields
 */
function createExpense(userId, { amount, description, category }) {
  try {
    const now = new Date().toISOString();
    const created_at = now;
    const updated_at = now;

    const insertStmt = db.prepare(`
      INSERT INTO expenses (user_id, amount, description, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = insertStmt.run(userId, amount, description, category, created_at, updated_at);
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
 * Update an existing expense record, scoped to a specific user.
 * `created_at` is immutable; `updated_at` is set to the current UTC time.
 * @param {number} userId - The user's ID (ensures user can only update their own expenses)
 * @param {number} id - The ID of the expense to update
 * @param {Object} data - The updated expense data
 * @param {number} data.amount - Amount in cents (positive integer)
 * @param {string} data.description - Expense description
 * @param {string} data.category - Expense category
 * @returns {Object|null} The complete updated record, or null if no expense has that ID
 */
function updateExpense(userId, id, { amount, description, category }) {
  try {
    const updated_at = new Date().toISOString();

    const updateStmt = db.prepare(`
      UPDATE expenses
      SET amount = ?, description = ?, category = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `);

    const info = updateStmt.run(amount, description, category, updated_at, id, userId);

    // No row matched the given ID + user — caller maps this to a 404
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

/**
 * Persist the database file to git so data survives workspace rebuilds.
 * Runs asynchronously in the background — does not block the API response.
 * Checkpoints WAL first so the main .db file has all data.
 * Debounced: rapid writes within 2s are batched into a single commit+push.
 */
let persistTimer = null;

function persistToGit() {
  // Skip in test environments
  if (process.env.NODE_ENV === 'test' || process.env.DB_PATH?.includes('test')) {
    return;
  }

  // Debounce: wait 2s after last write before committing
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(_doPersist, 2000);
}

function _doPersist() {
  persistTimer = null;

  try {
    // Checkpoint WAL into the main DB file so git tracks a single complete file
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {
    console.error('[persist] WAL checkpoint failed:', e.message);
    return;
  }

  const repoRoot = path.resolve(__dirname, '..');
  const relDbPath = path.relative(repoRoot, path.resolve(dbPath));

  // Ensure git user config is set (preview sandbox may not have it)
  try {
    execSync('git config user.email >/dev/null 2>&1', { cwd: repoRoot });
  } catch {
    try {
      execSync('git config user.email "expense-tracker@localhost"', { cwd: repoRoot });
      execSync('git config user.name "Expense Tracker"', { cwd: repoRoot });
    } catch (cfgErr) {
      console.error('[persist] git config failed:', cfgErr.message);
    }
  }

  // Run git add + commit + push in the background (fire-and-forget)
  execFile('git', ['add', '--force', relDbPath], { cwd: repoRoot }, (addErr, addOut, addStderr) => {
    if (addErr) {
      console.error('[persist] git add failed:', addErr.message, addStderr);
      return;
    }
    execFile(
      'git',
      ['commit', '-m', 'data: auto-save expenses database', '--', relDbPath],
      { cwd: repoRoot },
      (commitErr, commitOut, commitStderr) => {
        if (commitErr) {
          // Exit code 1 with "nothing to commit" is fine — means no actual change
          if (commitErr.code === 1) return;
          console.error('[persist] git commit failed:', commitErr.message, commitStderr);
          return;
        }
        console.log('[persist] database saved to git');
        // Push to remote so data survives full workspace rebuilds
        execFile('git', ['push'], { cwd: repoRoot, timeout: 30000 }, (pushErr, pushOut, pushStderr) => {
          if (pushErr) {
            console.error('[persist] git push failed:', pushErr.message, pushStderr);
            return;
          }
          console.log('[persist] database pushed to remote');
        });
      }
    );
  });
}

/**
 * Bulk import expenses for a specific user (used to restore from client-side backup).
 * Inserts expenses that don't already exist (matched by created_at + description + user_id).
 * Runs inside a transaction for atomicity.
 * @param {number} userId - The user's ID
 * @param {Array<Object>} items - Array of expense objects with amount, description, category, created_at, updated_at
 * @returns {number} Number of expenses actually inserted (skips duplicates)
 */
function bulkImport(userId, items) {
  const insertStmt = db.prepare(`
    INSERT INTO expenses (user_id, amount, description, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const checkStmt = db.prepare(`
    SELECT COUNT(*) as cnt FROM expenses
    WHERE user_id = ? AND created_at = ? AND description = ? AND amount = ?
  `);

  let inserted = 0;

  const runImport = db.transaction((rows) => {
    for (const row of rows) {
      // Skip duplicates (same user + timestamp + description + amount)
      const existing = checkStmt.get(userId, row.created_at, row.description, row.amount);
      if (existing.cnt > 0) continue;

      insertStmt.run(
        userId,
        row.amount,
        row.description,
        row.category,
        row.created_at,
        row.updated_at || row.created_at
      );
      inserted++;
    }
  });

  runImport(items);
  return inserted;
}

/**
 * Delete an expense record by ID, scoped to a specific user.
 * @param {number} userId - The user's ID (ensures user can only delete their own expenses)
 * @param {number} id - The ID of the expense to delete
 * @returns {boolean} true if a row was deleted, false if no expense has that ID
 */
function deleteExpense(userId, id) {
  try {
    const deleteStmt = db.prepare(`DELETE FROM expenses WHERE id = ? AND user_id = ?`);
    const info = deleteStmt.run(id, userId);
    return info.changes > 0;
  } catch (err) {
    const error = new Error(`ERR_STORAGE_WRITE: Failed to delete expense: ${err.message}`);
    error.code = 'ERR_STORAGE_WRITE';
    throw error;
  }
}

module.exports = {
  initialize,
  // Auth
  createUser, verifyUser, createSession, getSessionUser, deleteSession,
  // Expenses
  getAllExpenses, createExpense, updateExpense, deleteExpense, persistToGit, bulkImport
};
