'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const database = require('./db/database');

// Prevent unhandled async errors (e.g. from git push callbacks) from crashing the server.
// EADDRINUSE is NOT caught here — it's handled on the server 'error' event below.
process.on('uncaughtException', (err) => {
  if (err.code === 'EADDRINUSE') {
    // Let this propagate — the server error handler will deal with it
    console.error(`[server] FATAL: port already in use — exiting so process manager can retry`);
    process.exit(1);
  }
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
   * Kill any stale process listening on the target port.
   * Prevents EADDRINUSE when nodemon/Pivota restarts the server before
   * the previous process has fully released the socket.
   */
  function killStaleProcess(port) {
    try {
      const { execSync } = require('child_process');
      const out = execSync(`lsof -ti tcp:${port}`, { stdio: 'pipe' }).toString().trim();
      if (out) {
        const pids = out.split('\n').filter(p => p && parseInt(p, 10) !== process.pid);
        for (const pid of pids) {
          try {
            process.kill(parseInt(pid, 10), 'SIGTERM');
            console.log(`[server] killed stale process ${pid} on port ${port}`);
          } catch { /* already gone */ }
        }
        // Brief pause to let the OS release the socket
        if (pids.length > 0) {
          execSync('sleep 0.5', { stdio: 'pipe' });
        }
      }
    } catch {
      // lsof not available or no process found — both OK
    }
  }

  function startServer(retryCount) {
    const server = app.listen(PORT, '0.0.0.0');

    server.on('listening', () => {
      console.log(`Expense Tracker running on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && retryCount < 1) {
        console.warn(`[server] port ${PORT} in use — killing stale process and retrying`);
        killStaleProcess(PORT);
        setTimeout(() => startServer(retryCount + 1), 1000);
      } else if (err.code === 'EADDRINUSE') {
        console.error(`[server] FATAL: port ${PORT} still in use after retry — exiting`);
        process.exit(1);
      } else {
        console.error('[server] listen error:', err.message);
        process.exit(1);
      }
    });
  }

  startServer(0);

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
