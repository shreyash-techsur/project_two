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
 * Environment variables passed to ALL git child processes.
 * GIT_TERMINAL_PROMPT=0 prevents git from ever trying to open /dev/tty to prompt
 * for credentials, which would fail with "No such device or address" in a
 * background process. Instead git will fail fast with a clear auth error.
 */
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

/**
 * Ensure git has working authentication for the remote.
 *
 * Token discovery order (first non-empty wins):
 *  1. `http.<url>.extraheader` in local git config — injected by Daytona/Pivota
 *     at clone time via `git clone -c …`.
 *  2. Token already embedded in the remote URL from a previous session's
 *     `_ensureGitAuth` call (survives sandbox restarts but not full rebuilds).
 *  3. `.git/pivota-credentials` store file (belt-and-suspenders, same lifetime
 *     as the URL approach).
 *
 * Once a token is found, this function:
 *  a. Embeds it directly in the remote push URL so git never falls through to
 *     an interactive credential prompt (which fails with "No such device or
 *     address" in a background process).
 *  b. Writes it to `.git/pivota-credentials` and configures
 *     `credential.helper store` so fetch/pull also authenticate.
 *  c. Sets `GIT_TERMINAL_PROMPT=0` (via GIT_ENV) so that if auth still fails,
 *     git exits immediately instead of hanging on /dev/tty.
 *
 * Called once on startup and again before each persist operation.
 */
let _gitAuthConfigured = false;

function _ensureGitAuth(repoRoot) {
  // Fast path: skip expensive work if we already succeeded in this process
  if (_gitAuthConfigured) return;

  try {
    let token = null;

    // --- Source 1: Daytona-injected http.extraheader ---
    try {
      const header = execSync(
        'git config --local --get http.https://github.com/.extraheader',
        { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV }
      ).toString().trim();
      // Format: "AUTHORIZATION: Basic <base64(x-access-token:TOKEN)>"
      const b64 = header.replace(/^AUTHORIZATION:\s*Basic\s*/i, '');
      const decoded = Buffer.from(b64, 'base64').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length >= 2 && parts.slice(1).join(':').length > 0) {
        token = parts.slice(1).join(':');
      }
    } catch {
      // No extraheader — try next source
    }

    // --- Source 2: token already embedded in the remote URL ---
    const currentUrl = execSync('git remote get-url origin', {
      cwd: repoRoot, stdio: 'pipe', env: GIT_ENV
    }).toString().trim();

    if (!token) {
      const urlMatch = currentUrl.match(/:\/\/x-access-token:([^@]+)@/);
      if (urlMatch && urlMatch[1].length > 0) {
        token = urlMatch[1];
      }
    }

    // --- Source 3: .git/pivota-credentials store file ---
    if (!token) {
      const credFile = path.join(repoRoot, '.git', 'pivota-credentials');
      try {
        const credContent = fs.readFileSync(credFile, 'utf8').trim();
        const credMatch = credContent.match(/:\/\/x-access-token:([^@\s]+)@/);
        if (credMatch && credMatch[1].length > 0) {
          token = credMatch[1];
        }
      } catch {
        // File doesn't exist — try next source
      }
    }

    // --- No token found from any source ---
    if (!token) {
      console.warn('[persist] no git auth token found (extraheader / remote URL / credential store) — push will require platform-injected credentials');
      return;
    }

    // --- Apply token: embed in remote URL ---
    if (!currentUrl.includes('@github.com')) {
      const authUrl = currentUrl.replace(
        'https://github.com/',
        `https://x-access-token:${token}@github.com/`
      );
      execSync(`git remote set-url origin "${authUrl}"`, {
        cwd: repoRoot, stdio: 'pipe', env: GIT_ENV
      });
      console.log('[persist] embedded auth token in remote URL');
    }

    // --- Apply token: credential store (for fetch/pull) ---
    const credFile = path.join(repoRoot, '.git', 'pivota-credentials');
    const credEntry = `https://x-access-token:${token}@github.com`;
    try {
      fs.writeFileSync(credFile, credEntry + '\n', { mode: 0o600 });
      execSync(`git config --local credential.helper "store --file=${credFile}"`, {
        cwd: repoRoot, stdio: 'pipe', env: GIT_ENV
      });
    } catch {
      // Non-fatal — URL-embedded auth is the primary mechanism
    }

    _gitAuthConfigured = true;
  } catch (err) {
    console.warn('[persist] git auth setup failed (non-fatal):', (err.message || '').split('\n')[0]);
  }
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
    execSync('git rev-parse --git-dir', { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV });
    const remoteOut = execSync('git remote -v', { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV }).toString();
    if (!remoteOut.includes('fetch')) {
      console.log('[persist] no git fetch remote — skipping restore');
      return;
    }

    // Ensure git auth is configured before any remote operations
    _ensureGitAuth(repoRoot);

    // Fetch the latest state from remote
    try {
      execSync('git fetch origin', { cwd: repoRoot, stdio: 'pipe', timeout: 30000, env: GIT_ENV });
    } catch (fetchErr) {
      console.warn('[persist] git fetch failed (will use local data):', (fetchErr.message || '').split('\n')[0]);
      return;
    }

    // Check if the remote branch has commits ahead of local
    try {
      const behind = execSync('git rev-list HEAD..origin/main --count', { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV })
        .toString().trim();
      if (behind === '0') {
        console.log('[persist] local branch is up-to-date with remote');
        return;
      }
      console.log(`[persist] remote is ${behind} commit(s) ahead — pulling latest data`);
    } catch {
      // If rev-list fails, try the pull anyway
    }

    // Pull with rebase to integrate remote data commits
    // Use --autostash in case there are local uncommitted changes to the db
    try {
      execSync('git pull --rebase --autostash origin main', { cwd: repoRoot, stdio: 'pipe', timeout: 30000, env: GIT_ENV });
      console.log('[persist] restored latest database from git remote');
    } catch (pullErr) {
      // If pull fails due to conflict, abort the rebase and continue with local data
      console.warn('[persist] git pull failed (will use local data):', (pullErr.message || '').split('\n')[0]);
      try {
        execSync('git rebase --abort', { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV });
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
 * Logs warnings if data won't survive workspace rebuilds.
 */
function verifyGitPersistence() {
  const repoRoot = path.resolve(__dirname, '..');
  try {
    execSync('git rev-parse --git-dir', { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV });
    const remoteOut = execSync('git remote -v', { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV }).toString();
    if (remoteOut.includes('push')) {
      const pushUrl = execSync('git remote get-url --push origin', {
        cwd: repoRoot, stdio: 'pipe', env: GIT_ENV
      }).toString().trim();
      if (pushUrl.includes('@github.com')) {
        console.log('[persist] git remote available — data will auto-save to git on writes');
      } else {
        // Auth wasn't set up (no token found anywhere). Try one more time in case
        // restoreFromGit ran before the platform finished injecting credentials.
        _ensureGitAuth(repoRoot);
        const retryUrl = execSync('git remote get-url --push origin', {
          cwd: repoRoot, stdio: 'pipe', env: GIT_ENV
        }).toString().trim();
        if (retryUrl.includes('@github.com')) {
          console.log('[persist] git remote available — data will auto-save to git on writes');
        } else {
          console.log('[persist] git remote available — data will auto-save to git on writes (WARNING: no push credentials found — push may fail)');
        }
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
    execSync('git config user.email', { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV });
  } catch {
    try {
      execSync('git config user.email "expense-tracker@localhost"', { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV });
      execSync('git config user.name "Expense Tracker"', { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV });
    } catch (cfgErr) {
      console.error('[persist] git config failed:', cfgErr.message);
    }
  }

  // Ensure auth is set up (may be first persist after startup)
  _ensureGitAuth(repoRoot);

  // Run git add + commit + push in the background
  try {
    execFile('git', ['add', '--force', relDbPath], { cwd: repoRoot, timeout: 15000, env: GIT_ENV }, (addErr, addOut, addStderr) => {
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
          { cwd: repoRoot, timeout: 15000, env: GIT_ENV },
          (commitErr, commitOut, commitStderr) => {
            try {
              if (commitErr) {
                // Exit code 1 with "nothing to commit" is fine — means no actual change
                lastPersistStatus = { success: true, timestamp: new Date().toISOString(), error: null };
                persistInProgress = false;
                return;
              }
              console.log('[persist] database committed to git');
              // Push to remote — this is the critical step for cross-sandbox persistence.
              // A push failure means data will NOT survive a sandbox rebuild.
              _pushToRemote(repoRoot, 0, (pushOk, pushErrMsg) => {
                if (pushOk) {
                  console.log('[persist] database pushed to remote');
                  lastPersistStatus = { success: true, timestamp: new Date().toISOString(), error: null };
                } else {
                  console.error('[persist] git push FAILED — data will NOT survive sandbox rebuild:', pushErrMsg);
                  lastPersistStatus = { success: false, timestamp: new Date().toISOString(), error: 'git push failed: ' + pushErrMsg };
                }
                persistInProgress = false;
              });
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
 * Push to remote with retry and pull-rebase on rejection.
 * Retries up to MAX_PUSH_RETRIES times. On the first rejection (e.g. remote
 * has commits from another sandbox), performs a pull --rebase before retrying.
 * @param {string} repoRoot - Path to the git repository root
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Function} cb - Callback: cb(success: boolean, errorMsg?: string)
 */
const MAX_PUSH_RETRIES = 2;

function _pushToRemote(repoRoot, attempt, cb) {
  execFile('git', ['push'], { cwd: repoRoot, timeout: 30000, env: GIT_ENV }, (pushErr, pushOut, pushStderr) => {
    try {
      if (!pushErr) {
        cb(true);
        return;
      }

      const stderr = (pushStderr || pushErr.message || String(pushErr));
      const firstLine = stderr.split('\n')[0];

      // If rejected because remote has diverged, try pull --rebase then retry
      if (attempt < MAX_PUSH_RETRIES && (stderr.includes('rejected') || stderr.includes('non-fast-forward') || stderr.includes('fetch first'))) {
        console.warn(`[persist] push rejected (attempt ${attempt + 1}/${MAX_PUSH_RETRIES + 1}) — pulling remote changes`);
        execFile('git', ['pull', '--rebase', '--autostash', 'origin', 'main'], { cwd: repoRoot, timeout: 30000, env: GIT_ENV }, (pullErr) => {
          try {
            if (pullErr) {
              // Pull/rebase failed — abort rebase and report failure
              try { execSync('git rebase --abort', { cwd: repoRoot, stdio: 'pipe', env: GIT_ENV }); } catch { /* no rebase in progress */ }
              cb(false, 'pull --rebase failed before retry: ' + (pullErr.message || '').split('\n')[0]);
              return;
            }
            // Retry push after successful pull
            _pushToRemote(repoRoot, attempt + 1, cb);
          } catch (e) {
            cb(false, 'unexpected error during pull: ' + (e.message || ''));
          }
        });
        return;
      }

      // If it's an auth error, report clearly — do not retry endlessly
      if (stderr.includes('Authentication') || stderr.includes('403') || stderr.includes('401') || stderr.includes('could not read Username')) {
        cb(false, 'authentication failed — GitHub token may have expired');
        return;
      }

      cb(false, firstLine);
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
