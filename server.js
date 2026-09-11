'use strict';

const express = require('express');
const path = require('path');
const database = require('./db/database');

// Initialize storage — MUST succeed or server exits
try {
  database.initialize();
} catch (err) {
  console.error('Failed to initialize storage:', err.message);
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// Middleware
app.use(express.json());

// Static file serving (public/ directory, for Wave 3)
app.use(express.static(path.join(__dirname, 'public')));

// Placeholder for API routes (Wave 2 will mount routes here)
// app.use('/api/expenses', expensesRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Expense Tracker running on http://localhost:${PORT}`);
});

module.exports = app;
