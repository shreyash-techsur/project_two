'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const database = require('./db/database');

// Prevent unhandled async errors (e.g. from git push callbacks) from crashing
// the server.  Git persistence runs fire-and-forget child processes whose
// errors surface as uncaughtException / unhandledRejection — these must NEVER
// take the Express server down.
process.on('uncaughtException', (err) => {
  console.error('[server] uncaught exception (non-fatal):', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection (non-fatal):', reason);
});
const authRouter = require('./routes/auth');
const expensesRouter = require('./routes/expenses');
const { requireAuth } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Initialize storage — MUST succeed or server exits
try {
  database.initialize();
} catch (err) {
  console.error('Failed to initialize storage:', err.message);
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// Security headers (TechArch §5)
// frameguard: false and contentSecurityPolicy: false to allow preview iframe embedding
app.use(helmet({ frameguard: false, contentSecurityPolicy: false }));

// Body parsing
app.use(express.json());

// Static file serving (public/ directory)
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to login if no auth (handled client-side, but also serve login.html for /login)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Auth routes (public — no auth required)
app.use('/api/auth', authRouter);

// API routes (protected — auth required)
app.use('/api/expenses', requireAuth, expensesRouter);

// Persistence health check endpoint (public — for client-side monitoring)
app.get('/api/health/persistence', (req, res) => {
  const status = database.getPersistenceStatus();
  res.status(200).json(status);
});

// Global error handler — MUST be after routes
app.use(errorHandler);

// Periodic cleanup of expired refresh tokens (every hour)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
let cleanupTimer = null;

if (require.main === module) {
  /**
   * Kill any stale process bound to the target port.
   * Uses `ss` (always available on Linux) to find the PID, then kills it.
   * Falls back to fuser / lsof if available.
   */
  function killStaleProcess(port) {
    const { execSync } = require('child_process');
    try {
      // ss -tlnp shows listening sockets with PIDs.  Extract PIDs for our port.
      // Output format: "LISTEN  0  511  0.0.0.0:3000  ... users:(("node",pid=1234,fd=22))"
      const ssOut = execSync(`ss -tlnp 'sport = :${port}' 2>/dev/null || true`, { stdio: 'pipe' }).toString();
      const pidMatches = ssOut.matchAll(/pid=(\d+)/g);
      const pids = [];
      for (const m of pidMatches) {
        const pid = parseInt(m[1], 10);
        if (pid && pid !== process.pid) pids.push(pid);
      }

      if (pids.length === 0) return; // No stale process

      for (const pid of pids) {
        try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ }
      }
      // Wait for the OS to release the socket after SIGKILL
      execSync('sleep 1', { stdio: 'pipe' });
      console.log(`[server] killed stale process(es) on port ${port}: ${pids.join(', ')}`);
    } catch {
      // ss unavailable or parsing failed — try fuser/lsof as fallback
      try {
        execSync(`fuser -k ${port}/tcp 2>/dev/null || lsof -ti tcp:${port} | xargs -r kill -9 2>/dev/null`, {
          stdio: 'pipe', timeout: 3000
        });
        execSync('sleep 1', { stdio: 'pipe' });
      } catch { /* nothing to kill */ }
    }
  }

  // Kill any leftover server from a previous nodemon/Pivota restart BEFORE
  // we try to bind.  This prevents EADDRINUSE entirely rather than reacting
  // to it after the fact.
  killStaleProcess(PORT);

  const server = app.listen(PORT, '0.0.0.0');

  server.on('listening', () => {
    console.log(`Expense Tracker running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // The pre-emptive kill didn't work (race condition or different process).
      // Exit cleanly so nodemon / Pivota can retry after a delay.
      console.error(`[server] port ${PORT} is still in use — exiting so process manager can retry`);
      process.exit(1);
    }
    console.error('[server] listen error:', err.message);
    process.exit(1);
  });

  // Graceful shutdown: close the HTTP server so the port is released
  // before nodemon spawns the replacement process.
  function shutdown(signal) {
    console.log(`[server] ${signal} received — shutting down`);
    server.close(() => process.exit(0));
    // Force-exit after 3 s if connections are stuck
    setTimeout(() => process.exit(0), 3000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Start periodic token cleanup
  cleanupTimer = setInterval(() => {
    try {
      database.cleanupExpiredTokens();
    } catch (err) {
      console.error('[cleanup] Failed to clean expired tokens:', err.message);
    }
  }, CLEANUP_INTERVAL);

  // Don't let the cleanup timer keep the process alive
  if (cleanupTimer.unref) cleanupTimer.unref();
}

module.exports = app;

