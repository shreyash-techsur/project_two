'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const database = require('./db/database');
const expensesRouter = require('./routes/expenses');
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

// API routes
app.use('/api/expenses', expensesRouter);

// Global error handler — MUST be after routes
app.use(errorHandler);

// Start server — bind to 0.0.0.0 for container/sandbox access
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Expense Tracker running on http://localhost:${PORT}`);
});

module.exports = app;
