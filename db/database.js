'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile, execSync } = require('child_process');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');

let db;
let dbPath;

// --- JWT Configuration ---
// Secret is generated once per server lifetime and stored in the DB.
// On workspace rebuild, a new secret is generated — old JWTs become invalid,
// but users can re-login (their password hashes survive in the persisted DB).
const JWT_ACCESS_EXPIRY = '15m';    // Access tokens expire in 15 minutes
const JWT_REFRESH_EXPIRY = '7d';    // Refresh tokens expire in 7 days
let jwtSecret = null;

/**
 * Get or create the JWT secret.
 * Stored in a `config` table so it persists as long as the DB file does.
 * If the DB is lost and recreated, a new secret is generated automatically.
 */
function getOrCreateJwtSecret() {
  // Create config table if needed
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
  `);

  const row = db.prepare(`SELECT value FROM config WHERE key = 'jwt_secret'`).get();
  if (row) {
    return row.value;
  }

  // Generate a new 256-bit secret
  const secret = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO config (key, value) VALUES ('jwt_secret', ?)`).run(secret);
  console.log('[auth] Generated new JWT secret');
  return secret;
}

/**
 * Prevent git from ever trying to open /dev/tty to prompt for credentials,
 * which would fail with "No such device or address" in a background process.
 * Instead git will fail fast with a clear auth error.
 *
 * Set directly on process.env (rather than a frozen snapshot) so that:
 *  - All child processes inherit it automatically (no need for `env:` option).
 *  - Late-injected platform credentials (env vars, credential helpers, etc.)
 *    remain visible to child processes — a frozen `{ ...process.env }` taken at
 *    module-load time would miss anything the platform adds after startup.
 */
process.env.GIT_TERMINAL_PROMPT = '0';

/**
 * Build child-process options for git commands that explicitly anchor Git to
 * the repository's .git directory via the GIT_DIR environment variable.
 *
 * Root cause context:  The sandbox platform (Daytona) injects the GitHub
 * OAuth credential as a URL-scoped `http.https://github.com/.extraheader`
 * in `.git/config` (local scope).  When a child process's working directory
 * doesn't match the repo root — or when git fails to discover `.git` for any
 * other reason — the local config (and the credential in it) is invisible,
 * producing `could not read Username for 'https://github.com'`.
 *
 * Setting GIT_DIR to the absolute path of the .git directory guarantees git
 * always reads the correct local config regardless of the cwd the Node
 * process happens to be in.
 *
 * The returned object merges with process.env at call time (not at module
 * load) so that late-injected env vars (e.g. GIT_TERMINAL_PROMPT) are
 * inherited.  No GIT_WORK_TREE is set — git infers it from GIT_DIR.
 *
 * @param {string} repoRoot - Absolute path to the repository root.
 * @param {object} [extra]  - Additional options (timeout, stdio, etc.)
 * @returns {object} Options suitable for execFile / execSync.
 */
function _gitOpts(repoRoot, extra) {
  return Object.assign(
    {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GIT_DIR: path.join(repoRoot, '.git'),
      }),
    },
    extra
  );
}

/**
 * Verify that git has working authentication for the remote.
 *
 * Instead of extracting / decoding / re-embedding tokens (which is fragile and
 * can accidentally expose credentials), we rely on the sandbox platform
 * (Daytona/Pivota) to inject credentials via whichever mechanism it uses
 * (http.extraheader, credential helper, etc.).
 *
 * This function verifies that `git ls-remote` can reach the remote.
 * If it can, git already has working auth — no further action needed.
 *
 * GIT_TERMINAL_PROMPT=0 (set on process.env) ensures git exits immediately instead
 * of hanging on /dev/tty if auth is missing.
 *
 * The verification result is cached for AUTH_CACHE_TTL_MS to avoid hitting
 * GitHub on every write, but expires so that token rotation or expiry
 * (GitHub App `gho_` tokens are typically valid for ~1 hour) is detected.
 *
 * Called before each persist operation and at startup.
 */
const AUTH_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let _gitAuthVerifiedAt = 0;   // timestamp of last successful verification

function _isAuthCacheValid() {
  return _gitAuthVerifiedAt > 0 && (Date.now() - _gitAuthVerifiedAt) < AUTH_CACHE_TTL_MS;
}

function _invalidateAuthCache() {
  _gitAuthVerifiedAt = 0;
}

/**
 * Test remote authentication via git ls-remote.
 * @param {string} repoRoot
 * @param {boolean} [quiet=false] - suppress success log (used on retries)
 * @returns {boolean} true if authentication succeeded
 */
function _verifyGitAuth(repoRoot, quiet) {
  try {
    execSync('git ls-remote --quiet --exit-code origin HEAD',
      _gitOpts(repoRoot, { stdio: 'pipe', timeout: 15000 })
    );
    _gitAuthVerifiedAt = Date.now();
    if (!quiet) console.log('[persist] git remote authentication verified (platform-injected credentials working)');
    return true;
  } catch (err) {
    // Exit code 2 from ls-remote means "remote found but ref not found" — auth is still working
    if (err.status === 2) {
      _gitAuthVerifiedAt = Date.now();
      if (!quiet) console.log('[persist] git remote authentication verified (remote reachable)');
      return true;
    }
    const msg = (err.message || '').split('\n')[0];
    console.warn('[persist] git remote authentication check failed — push may not work:', msg);
    _invalidateAuthCache();
    return false;
  }
}

function _ensureGitAuth(repoRoot) {
  if (_isAuthCacheValid()) return;
  _verifyGitAuth(repoRoot, false);
}

/**
 * Pull the latest database file from the git remote.
 * Called BEFORE opening the database so that a new sandbox gets the most
 * recent data that was pushed by a previous sandbox.
 * Runs synchronously at startup — acceptable because it only happens once.
 */
function restoreFromGit() {
  if (process.env.NODE_ENV === 'test' || process.env.DB_PATH?.includes('test')) {
    return;
  }
  const repoRoot = path.resolve(__dirname, '..');
  try {
    // Verify this is a git repo with a remote
    execSync('git rev-parse --git-dir', _gitOpts(repoRoot, { stdio: 'pipe' }));
    const remoteOut = execSync('git remote -v', _gitOpts(repoRoot, { stdio: 'pipe' })).toString();
    if (!remoteOut.includes('fetch')) {
      console.log('[persist] no git fetch remote — skipping restore');
      return;
    }

    // Ensure git auth is configured before any remote operations
    _ensureGitAuth(repoRoot);

    // Fetch the latest state from remote
    try {
      execSync('git fetch origin', _gitOpts(repoRoot, { stdio: 'pipe', timeout: 30000 }));
    } catch (fetchErr) {
      console.warn('[persist] git fetch failed (will use local data):', (fetchErr.message || '').split('\n')[0]);
      return;
    }

    // Check if the remote branch has commits ahead of local
    let needsPull = false;
    try {
      const behind = execSync('git rev-list HEAD..origin/main --count', _gitOpts(repoRoot, { stdio: 'pipe' }))
        .toString().trim();
      if (behind !== '0') {
        console.log(`[persist] remote is ${behind} commit(s) ahead — pulling latest data`);
        needsPull = true;
      }
    } catch {
      // If rev-list fails, try the pull anyway
      needsPull = true;
    }

    // Even if the branch is up-to-date, the database file may be missing from
    // the working tree (e.g. after a sandbox rebuild that cloned the repo but
    // the DB was deleted or replaced by an empty one before this runs).
    // Restore the tracked DB file from HEAD if it exists in git but is missing
    // or empty on disk.
    if (!needsPull) {
      const dbFilePath = process.env.DB_PATH || './data/expenses.db';
      const relDbPath = path.relative(repoRoot, path.resolve(dbFilePath));
      try {
        // Check if git tracks this file
        execSync(`git cat-file -e HEAD:"${relDbPath}"`, _gitOpts(repoRoot, { stdio: 'pipe' }));
        // Git has the file — check if it exists on disk with real content
        let diskSize = 0;
        try { diskSize = fs.statSync(path.resolve(repoRoot, relDbPath)).size; } catch { /* missing */ }
        if (diskSize === 0 || !fs.existsSync(path.resolve(repoRoot, relDbPath))) {
          console.log('[persist] database file missing or empty on disk — restoring from git HEAD');
          execSync(`git checkout HEAD -- "${relDbPath}"`, _gitOpts(repoRoot, { stdio: 'pipe' }));
          console.log('[persist] restored database from git HEAD');
        } else {
          console.log('[persist] local branch is up-to-date with remote');
        }
      } catch {
        // File not tracked in git — nothing to restore (fresh project)
        console.log('[persist] local branch is up-to-date with remote');
      }
      return;
    }

    // Pull with rebase to integrate remote data commits
    // Use --autostash in case there are local uncommitted changes to the db
    try {
      execSync('git pull --rebase --autostash origin main', _gitOpts(repoRoot, { stdio: 'pipe', timeout: 30000 }));
      console.log('[persist] restored latest database from git remote');
    } catch (pullErr) {
      // If pull fails due to conflict, abort the rebase and continue with local data
      console.warn('[persist] git pull failed (will use local data):', (pullErr.message || '').split('\n')[0]);
      try {
        execSync('git rebase --abort', _gitOpts(repoRoot, { stdio: 'pipe' }));
      } catch {
        // No rebase in progress — that's fine
      }
    }
  } catch {
    // Not a git repo or git unavailable — skip restore
  }
}

/**
 * Initialize the SQLite database.
 * Creates the data directory, opens the database file, enables WAL mode,
 * and creates all tables and indexes if they don't exist.
 * Must be called once on server startup before any queries.
 */
function initialize() {
  dbPath = process.env.DB_PATH || './data/expenses.db';
  const dbDir = path.dirname(dbPath);

  // 1. Ensure data directory exists
  fs.mkdirSync(dbDir, { recursive: true });

  // 1a. Restore latest database from git remote (before opening the DB)
  restoreFromGit();

  // 2. Open SQLite database
  db = new Database(dbPath);

  // 3. Enable WAL mode and foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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

  // 5. Create refresh_tokens table (replaces old sessions table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        token_hash  TEXT    NOT NULL UNIQUE,
        user_id     INTEGER NOT NULL,
        expires_at  TEXT    NOT NULL,
        created_at  TEXT    NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 5a. Create index for cleanup queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens (expires_at);
  `);

  // 5b. Create index for user lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);
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

  // 6b. Migrate from old sessions table to refresh_tokens if needed
  try {
    const hasSessionsTable = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'`
    ).get();
    if (hasSessionsTable) {
      // Old sessions are invalidated — users will need to re-login with JWT
      db.exec(`DROP TABLE IF EXISTS sessions`);
      console.log('[migrate] Dropped legacy sessions table — users will re-login with JWT');
    }
  } catch (e) {
    // Ignore migration errors
  }

  // 7. Create index for default ordering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at DESC);
  `);

  // 7a. Create index for user-scoped queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);
  `);

  // 8. Initialize JWT secret
  jwtSecret = getOrCreateJwtSecret();

  // 9. Clean up expired refresh tokens on startup
  cleanupExpiredTokens();

  // 10. Log success
  console.log(`Storage initialized: ${dbPath}`);

  // 11. Verify git persistence capability on startup
  verifyGitPersistence();
}

/**
 * Verify git remote is available for persistence.
 * Uses _ensureGitAuth to actually test remote connectivity rather than
 * inspecting URLs for embedded tokens.
 * Logs warnings if data won't survive workspace rebuilds.
 */
function verifyGitPersistence() {
  const repoRoot = path.resolve(__dirname, '..');
  try {
    execSync('git rev-parse --git-dir', _gitOpts(repoRoot, { stdio: 'pipe' }));
    const remoteOut = execSync('git remote -v', _gitOpts(repoRoot, { stdio: 'pipe' })).toString();
    if (remoteOut.includes('push')) {
      // _ensureGitAuth will test actual remote connectivity via ls-remote
      _ensureGitAuth(repoRoot);
      if (_isAuthCacheValid()) {
        console.log('[persist] git remote available — data will auto-save to git on writes');
      } else {
        console.log('[persist] git remote available — data will auto-save to git on writes (WARNING: remote auth check failed — push may fail)');
      }
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
 * Look up a user by ID.
 * @param {number} userId
 * @returns {Object|null} The user object, or null if not found
 */
function getUserById(userId) {
  const stmt = db.prepare(`SELECT id, username, created_at FROM users WHERE id = ?`);
  return stmt.get(userId) || null;
}

// --- JWT Token Management ---

/**
 * Generate a JWT access token for a user.
 * Short-lived (15 minutes). Contains user id and username.
 * @param {Object} user - { id, username }
 * @returns {string} The signed JWT
 */
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, type: 'access' },
    jwtSecret,
    { expiresIn: JWT_ACCESS_EXPIRY }
  );
}

/**
 * Generate a refresh token for a user.
 * Long-lived (7 days). Stored as a hash in the DB so it can be revoked.
 * @param {number} userId
 * @returns {string} The signed JWT refresh token
 */
function generateRefreshToken(userId) {
  const tokenId = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign(
    { userId, tokenId, type: 'refresh' },
    jwtSecret,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );

  // Store hash of the token for revocation lookups
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(tokenHash, userId, expiresAt, now.toISOString());

  return token;
}

/**
 * Verify a JWT access token.
 * @param {string} token - The JWT to verify
 * @returns {Object|null} The decoded payload { userId, username }, or null if invalid
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (decoded.type !== 'access') return null;
    return { userId: decoded.userId, username: decoded.username };
  } catch (err) {
    return null;
  }
}

/**
 * Verify and consume a refresh token. Returns new access + refresh tokens.
 * The old refresh token is revoked (rotation for security).
 * @param {string} token - The refresh JWT
 * @returns {Object|null} { accessToken, refreshToken, user } or null if invalid
 */
function rotateRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (decoded.type !== 'refresh') return null;

    // Check the token hash exists in DB (hasn't been revoked)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const row = db.prepare(`SELECT id, user_id FROM refresh_tokens WHERE token_hash = ?`).get(tokenHash);
    if (!row) return null; // Already revoked or doesn't exist

    // Revoke the old refresh token
    db.prepare(`DELETE FROM refresh_tokens WHERE id = ?`).run(row.id);

    // Look up the user
    const user = getUserById(row.user_id);
    if (!user) return null; // User was deleted

    // Issue new token pair
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    return { accessToken, refreshToken, user: { id: user.id, username: user.username } };
  } catch (err) {
    return null;
  }
}

/**
 * Revoke all refresh tokens for a user (logout from all devices).
 * @param {number} userId
 */
function revokeAllUserTokens(userId) {
  db.prepare(`DELETE FROM refresh_tokens WHERE user_id = ?`).run(userId);
}

/**
 * Revoke a specific refresh token (single-device logout).
 * @param {string} token - The raw refresh token
 */
function revokeRefreshToken(token) {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    db.prepare(`DELETE FROM refresh_tokens WHERE token_hash = ?`).run(tokenHash);
  } catch (e) {
    // Token might be malformed — ignore
  }
}

/**
 * Clean up expired refresh tokens from the database.
 * Called on startup and periodically.
 */
function cleanupExpiredTokens() {
  const now = new Date().toISOString();
  const result = db.prepare(`DELETE FROM refresh_tokens WHERE expires_at < ?`).run(now);
  if (result.changes > 0) {
    console.log(`[auth] Cleaned up ${result.changes} expired refresh token(s)`);
  }
}

// --- Expense CRUD ---

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

// --- Git Persistence ---

/**
 * Persist the database file to git so data survives workspace rebuilds.
 * Runs asynchronously in the background — does not block the API response.
 * Checkpoints WAL first so the main .db file has all data.
 * Debounced: rapid writes within 2s are batched into a single commit+push.
 */
let persistTimer = null;
let persistInProgress = false;
let lastPersistStatus = { success: true, timestamp: null, error: null };

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

  // Prevent overlapping persist operations
  if (persistInProgress) {
    // Re-queue after current operation finishes
    setTimeout(_doPersist, 5000);
    return;
  }
  persistInProgress = true;

  try {
    // Checkpoint WAL into the main DB file so git tracks a single complete file
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {
    persistInProgress = false;
    console.error('[persist] WAL checkpoint failed:', e.message);
    lastPersistStatus = { success: false, timestamp: new Date().toISOString(), error: 'WAL checkpoint failed: ' + e.message };
    return;
  }

  const repoRoot = path.resolve(__dirname, '..');
  const relDbPath = path.relative(repoRoot, path.resolve(dbPath));

  // Ensure git user config is set (preview sandbox may not have it)
  try {
    execSync('git config user.email', _gitOpts(repoRoot, { stdio: 'pipe' }));
  } catch {
    try {
      execSync('git config user.email "expense-tracker@localhost"', _gitOpts(repoRoot, { stdio: 'pipe' }));
      execSync('git config user.name "Expense Tracker"', _gitOpts(repoRoot, { stdio: 'pipe' }));
    } catch (cfgErr) {
      console.error('[persist] git config failed:', cfgErr.message);
    }
  }

  // Ensure auth is set up (may be first persist after startup)
  _ensureGitAuth(repoRoot);

  // Run git add + commit + push in the background
  try {
    execFile('git', ['add', '--force', relDbPath], _gitOpts(repoRoot, { timeout: 15000 }), (addErr, addOut, addStderr) => {
      try {
        if (addErr) {
          console.error('[persist] git add failed:', addErr.message);
          lastPersistStatus = { success: false, timestamp: new Date().toISOString(), error: 'git add failed' };
          persistInProgress = false;
          return;
        }
        execFile(
          'git',
          ['commit', '-m', 'data: auto-save expenses database', '--', relDbPath],
          _gitOpts(repoRoot, { timeout: 15000 }),
          (commitErr, commitOut, commitStderr) => {
            try {
              if (commitErr) {
                // Exit code 1 with "nothing to commit" is fine — means no actual change
                lastPersistStatus = { success: true, timestamp: new Date().toISOString(), error: null };
                persistInProgress = false;
                return;
              }
              console.log('[persist] database committed to git');

              // ── Pre-push diagnostics ──
              // Run the exact same commands that _pushToRemote will use
              // (same cwd, same execFile, no env override) so we can compare
              // ls-remote vs push results if push fails.
              _runPrePushDiagnostics(repoRoot, () => {

              // Push to remote — this is the critical step for cross-sandbox persistence.
              // A push failure means data will NOT survive a sandbox rebuild.
              _pushToRemote(repoRoot, 0, (pushOk, pushErrMsg) => {
                if (pushOk) {
                  console.log('[persist] database pushed to remote');
                  lastPersistStatus = { success: true, timestamp: new Date().toISOString(), error: null };
                } else {
                  console.error('[persist] git push FAILED — data will NOT survive sandbox rebuild:', pushErrMsg);
                  lastPersistStatus = { success: false, timestamp: new Date().toISOString(), error: 'git push failed: ' + pushErrMsg };
                  // Schedule a background retry — the commit is local, so we just
                  // need to push.  Wait 30 s to give the platform time to rotate
                  // credentials if the token was mid-refresh.
                  _scheduleRetryPush(repoRoot);
                }
                persistInProgress = false;
              });

              }); // end _runPrePushDiagnostics callback
            } catch (e) {
              persistInProgress = false;
            }
          }
        );
      } catch (e) {
        persistInProgress = false;
      }
    });
  } catch (spawnErr) {
    persistInProgress = false;
    console.warn('[persist] git operations could not be started (non-fatal)');
  }
}

/**
 * Run diagnostic git commands immediately before _pushToRemote, using the
 * identical child-process mechanism (execFile, same cwd, no env override).
 * Logs results so we can compare ls-remote vs push if push fails.
 */
function _runPrePushDiagnostics(repoRoot, done) {
  const redact = _redactForLog;

  const results = {};

  const opts = (extra) => _gitOpts(repoRoot, extra);

  // 1. git rev-parse --show-toplevel
  execFile('git', ['rev-parse', '--show-toplevel'], opts({ timeout: 5000 }),
    (err, out, stderr) => {
      results.toplevel = err ? `ERR(${err.code}): ${(stderr||err.message).split('\n')[0]}` : out.trim();

      // 2. git remote -v
      execFile('git', ['remote', '-v'], opts({ timeout: 5000 }),
        (err2, out2, stderr2) => {
          results.remote = err2 ? `ERR: ${(stderr2||'').split('\n')[0]}` : redact(out2.trim().split('\n')[0]);

          // 3. git config --local --get-regexp '^http\.'
          execFile('git', ['config', '--local', '--get-regexp', '^http\\.'], opts({ timeout: 5000 }),
            (err3, out3, stderr3) => {
              if (err3 && err3.code === 1) {
                results.httpConfig = '(none)';
              } else if (err3) {
                results.httpConfig = `ERR(${err3.code}): ${(stderr3||err3.message).split('\n')[0]}`;
              } else {
                results.httpConfig = redact(out3.trim());
              }

              // 4. git ls-remote --quiet --exit-code origin HEAD
              execFile('git', ['ls-remote', '--quiet', '--exit-code', 'origin', 'HEAD'],
                opts({ timeout: 15000 }),
                (err4, out4, stderr4) => {
                  if (!err4) {
                    results.lsRemote = `OK (exit 0)`;
                  } else {
                    results.lsRemote = `FAIL (exit ${err4.code}): ${redact((stderr4||err4.message).split('\n')[0])}`;
                  }

                  // 5. git push --dry-run origin HEAD
                  execFile('git', ['push', '--dry-run', 'origin', 'HEAD'],
                    opts({ timeout: 30000 }),
                    (err5, out5, stderr5) => {
                      if (!err5) {
                        results.pushDryRun = `OK: ${(stderr5||out5||'').trim().split('\n')[0]}`;
                      } else {
                        results.pushDryRun = `FAIL (exit ${err5.code}): ${redact((stderr5||err5.message).split('\n')[0])}`;
                      }

                      // Log all results
                      console.log('[persist][diag] pre-push diagnostics:');
                      console.log('[persist][diag]   GIT_DIR:', path.join(repoRoot, '.git'));
                      console.log('[persist][diag]   toplevel:', results.toplevel);
                      console.log('[persist][diag]   remote:', results.remote);
                      console.log('[persist][diag]   http config:', results.httpConfig);
                      console.log('[persist][diag]   ls-remote:', results.lsRemote);
                      console.log('[persist][diag]   push --dry-run:', results.pushDryRun);

                      done();
                    });
                });
            });
        });
    });
}

/**
 * Schedule a background retry of git push for unpushed local commits.
 * Uses exponential backoff: 30 s, 60 s, 120 s (3 attempts).
 * This catches the case where a push failed due to a transient auth issue
 * (e.g. platform token rotation) and no new writes happen to trigger another
 * persist cycle.
 */
let _retryPushTimer = null;
let _retryPushCount = 0;
const MAX_RETRY_PUSH = 3;
const RETRY_PUSH_BASE_DELAY = 30000; // 30 seconds

function _scheduleRetryPush(repoRoot) {
  if (_retryPushTimer) return; // already scheduled
  if (_retryPushCount >= MAX_RETRY_PUSH) {
    console.warn(`[persist] giving up on push after ${MAX_RETRY_PUSH} background retries — data is committed locally but NOT pushed`);
    return;
  }
  const delay = RETRY_PUSH_BASE_DELAY * Math.pow(2, _retryPushCount);
  console.log(`[persist] scheduling push retry in ${delay / 1000}s (attempt ${_retryPushCount + 1}/${MAX_RETRY_PUSH})`);
  _retryPushTimer = setTimeout(() => {
    _retryPushTimer = null;
    _retryPushCount++;

    // Check if there are actually unpushed commits
    try {
      const ahead = execSync('git rev-list origin/main..HEAD --count',
        _gitOpts(repoRoot, { stdio: 'pipe', timeout: 10000 })
      ).toString().trim();
      if (ahead === '0') {
        console.log('[persist] no unpushed commits — skipping retry');
        _retryPushCount = 0;
        return;
      }
    } catch {
      // Can't check — try the push anyway
    }

    _invalidateAuthCache();
    _ensureGitAuth(repoRoot);

    console.log('[persist] retrying push (background)');
    _pushToRemote(repoRoot, 0, (ok, errMsg) => {
      if (ok) {
        console.log('[persist] background push succeeded — data is now safe on remote');
        lastPersistStatus = { success: true, timestamp: new Date().toISOString(), error: null };
        _retryPushCount = 0;
      } else {
        console.error('[persist] background push failed:', errMsg);
        lastPersistStatus = { success: false, timestamp: new Date().toISOString(), error: 'background push failed: ' + errMsg };
        _scheduleRetryPush(repoRoot);
      }
    });
  }, delay);
}

/**
 * Push to remote with retry and pull-rebase on rejection.
 * Retries up to MAX_PUSH_RETRIES times. On the first rejection (e.g. remote
 * has commits from another sandbox), performs a pull --rebase before retrying.
 * @param {string} repoRoot - Path to the git repository root
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Function} cb - Callback: cb(success: boolean, errorMsg?: string)
 */
const MAX_PUSH_RETRIES = 2;

/**
 * Redact sensitive values from git config output (tokens, Authorization headers).
 */
function _redactForLog(s) {
  return (s || '')
    .replace(/AUTHORIZATION[^\n]*/gi, 'AUTHORIZATION: <REDACTED>')
    .replace(/x-access-token:[^@\s]+/gi, 'x-access-token:***')
    .replace(/Basic [A-Za-z0-9+/=]+/gi, 'Basic ***');
}

function _pushToRemote(repoRoot, attempt, cb) {
  const opts = (extra) => _gitOpts(repoRoot, extra);

  execFile('git', ['push', 'origin', 'main'], opts({ timeout: 30000 }), (pushErr, pushOut, pushStderr) => {
    try {
      if (!pushErr) {
        cb(true);
        return;
      }

      const stderr = (pushStderr || pushErr.message || String(pushErr));

      // Always log the raw stderr so operators can diagnose — redact any
      // embedded tokens that might appear in URL-based error messages.
      const safeStderr = _redactForLog(stderr);
      console.warn(`[persist] push attempt ${attempt + 1}/${MAX_PUSH_RETRIES + 1} failed (GIT_DIR=${path.join(repoRoot, '.git')}):`, safeStderr.split('\n')[0]);

      // --- Rejected (remote diverged) → pull --rebase then retry ---
      if (attempt < MAX_PUSH_RETRIES && (stderr.includes('rejected') || stderr.includes('non-fast-forward') || stderr.includes('fetch first'))) {
        console.warn('[persist] remote has diverged — pulling before retry');
        execFile('git', ['pull', '--rebase', '--autostash', 'origin', 'main'], opts({ timeout: 30000 }), (pullErr) => {
          try {
            if (pullErr) {
              try { execSync('git rebase --abort', opts({ stdio: 'pipe' })); } catch { /* no rebase in progress */ }
              cb(false, 'pull --rebase failed before retry: ' + (pullErr.message || '').split('\n')[0]);
              return;
            }
            _pushToRemote(repoRoot, attempt + 1, cb);
          } catch (e) {
            cb(false, 'unexpected error during pull: ' + (e.message || ''));
          }
        });
        return;
      }

      // --- Authentication / credential error → classify precisely ---
      const isCredentialMissing = stderr.includes('could not read Username')
        || stderr.includes('terminal prompts disabled');
      const isAuthRejected = stderr.includes('Authentication') || stderr.includes('403')
        || stderr.includes('401');
      const isAuthErr = isCredentialMissing || isAuthRejected;

      if (isAuthErr) {
        _invalidateAuthCache();

        if (attempt < MAX_PUSH_RETRIES) {
          // Wait 2s then re-verify and retry — gives the platform time to
          // refresh the token if it was in the middle of rotating credentials.
          console.warn('[persist] auth/credential error on push — waiting 2 s then retrying');
          setTimeout(() => {
            const canRead = _verifyGitAuth(repoRoot, true);
            if (canRead) {
              console.warn('[persist] ls-remote succeeded after delay — retrying push');
              _pushToRemote(repoRoot, attempt + 1, cb);
            } else {
              cb(false, 'authentication failed — platform-injected GitHub token has expired or been revoked (ls-remote also fails); the sandbox platform needs to refresh it');
            }
          }, 2000);
          return;
        }

        // All retries exhausted — provide specific diagnostic based on the
        // actual failure mode (not a generic "token scope" guess).
        const canRead = _verifyGitAuth(repoRoot, true);
        const rawError = safeStderr.split('\n')[0];
        if (isCredentialMissing) {
          // The git process could not find credentials at all — this is NOT
          // a token-scope problem, it's a credential-delivery problem.
          if (canRead) {
            cb(false, `git push could not locate credentials ("${rawError}") but ls-remote works — the push child process may not be reading .git/config correctly (check cwd and GIT_DIR)`);
          } else {
            cb(false, `git could not locate credentials for push or ls-remote ("${rawError}") — platform-injected credential may have expired or the .git/config extraheader is missing`);
          }
        } else {
          // 401/403/Authentication — the credential was found but rejected.
          if (canRead) {
            cb(false, `git push authentication rejected ("${rawError}") but read access works — the token may have been rotated mid-operation or lacks push permission`);
          } else {
            cb(false, `git authentication failed for both push and ls-remote ("${rawError}") — platform-injected GitHub token has expired or been revoked; the sandbox platform needs to refresh it`);
          }
        }
        return;
      }

      // --- Any other error ---
      cb(false, safeStderr.split('\n')[0]);
    } catch (e) {
      cb(false, 'unexpected error: ' + (e.message || ''));
    }
  });
}

/**
 * Get the current persistence status for health checks.
 * @returns {Object} { success, timestamp, error }
 */
function getPersistenceStatus() {
  return { ...lastPersistStatus };
}

module.exports = {
  initialize,
  // Auth - password
  createUser, verifyUser, getUserById,
  // Auth - JWT
  generateAccessToken, generateRefreshToken,
  verifyAccessToken, rotateRefreshToken,
  revokeRefreshToken, revokeAllUserTokens,
  cleanupExpiredTokens,
  // Expenses
  getAllExpenses, createExpense, updateExpense, deleteExpense, persistToGit, bulkImport,
  // Health
  getPersistenceStatus
};
