'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Set test DB path before requiring the app
process.env.DB_PATH = './data/test-expenses.db';

const app = require('../server');

let server;
let baseUrl;

/**
 * Helper: make an HTTP request and return { status, headers, body }.
 */
function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Start the test server on a random port
before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

// Shut down server and clean up test DB
after(async () => {
  await new Promise((resolve) => {
    server.close(resolve);
  });
  // Clean up test DB files
  const dbFiles = [
    './data/test-expenses.db',
    './data/test-expenses.db-wal',
    './data/test-expenses.db-shm'
  ];
  for (const f of dbFiles) {
    try { fs.unlinkSync(f); } catch { /* ignore */ }
  }
});

// ============================================================
// GET /api/expenses
// ============================================================

describe('GET /api/expenses', () => {
  it('returns 200 with { expenses: [] } when empty', async () => {
    const res = await request('GET', '/api/expenses');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.expenses));
    assert.equal(res.body.expenses.length, 0);
  });

  it('returns Content-Type application/json', async () => {
    const res = await request('GET', '/api/expenses');
    assert.ok(res.headers['content-type'].includes('application/json'));
  });
});

// ============================================================
// POST /api/expenses — happy path
// ============================================================

describe('POST /api/expenses — happy path', () => {
  it('returns 201 with { expense: {...} } for valid input', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 10.50,
      description: 'Lunch at cafe',
      category: 'Food'
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.expense);
    assert.ok(res.body.expense.id > 0);
  });

  it('converts dollars to cents (10.50 → 1050)', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 10.50,
      description: 'Dollar to cents test',
      category: 'Test'
    });
    assert.equal(res.body.expense.amount, 1050);
  });

  it('trims description and category', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 5.00,
      description: '  Trimmed lunch  ',
      category: '  Food  '
    });
    assert.equal(res.body.expense.description, 'Trimmed lunch');
    assert.equal(res.body.expense.category, 'Food');
  });

  it('includes server-generated id, created_at, updated_at', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 20.00,
      description: 'Fields test',
      category: 'Test'
    });
    const e = res.body.expense;
    assert.ok(typeof e.id === 'number');
    assert.ok(e.created_at);
    assert.ok(e.updated_at);
  });

  it('created_at equals updated_at on new records', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 15.00,
      description: 'Timestamps test',
      category: 'Test'
    });
    assert.equal(res.body.expense.created_at, res.body.expense.updated_at);
  });
});

// ============================================================
// GET /api/expenses — after creating multiple
// ============================================================

describe('GET /api/expenses — ordering', () => {
  it('returns expenses ordered by created_at DESC', async () => {
    const res = await request('GET', '/api/expenses');
    assert.ok(res.body.expenses.length >= 2);
    // Most recent should be first
    const dates = res.body.expenses.map(e => e.created_at);
    for (let i = 0; i < dates.length - 1; i++) {
      assert.ok(dates[i] >= dates[i + 1], `Expected ${dates[i]} >= ${dates[i + 1]}`);
    }
  });

  it('each expense has all required fields', async () => {
    const res = await request('GET', '/api/expenses');
    for (const e of res.body.expenses) {
      assert.ok(typeof e.id === 'number');
      assert.ok(typeof e.amount === 'number');
      assert.ok(typeof e.description === 'string');
      assert.ok(typeof e.category === 'string');
      assert.ok(e.created_at);
      assert.ok(e.updated_at);
    }
  });
});

// ============================================================
// POST /api/expenses — validation errors
// ============================================================

describe('POST /api/expenses — validation errors', () => {
  it('empty body returns 400 with multiple error codes', async () => {
    const res = await request('POST', '/api/expenses', {});
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
    const codes = res.body.errors.map(e => e.code);
    assert.ok(codes.includes('ERR_EXPENSE_AMOUNT_REQUIRED'));
    assert.ok(codes.includes('ERR_EXPENSE_DESC_REQUIRED'));
    assert.ok(codes.includes('ERR_EXPENSE_CAT_REQUIRED'));
  });

  it('negative amount returns ERR_EXPENSE_AMOUNT_POSITIVE', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: -5,
      description: 'Test',
      category: 'Test'
    });
    assert.equal(res.status, 400);
    const codes = res.body.errors.map(e => e.code);
    assert.ok(codes.includes('ERR_EXPENSE_AMOUNT_POSITIVE'));
  });

  it('amount > 999999.99 returns ERR_EXPENSE_AMOUNT_TOO_LARGE', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 1000000,
      description: 'Test',
      category: 'Test'
    });
    assert.equal(res.status, 400);
    const codes = res.body.errors.map(e => e.code);
    assert.ok(codes.includes('ERR_EXPENSE_AMOUNT_TOO_LARGE'));
  });

  it('amount with >2 decimals returns ERR_EXPENSE_AMOUNT_PRECISION', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 10.555,
      description: 'Test',
      category: 'Test'
    });
    assert.equal(res.status, 400);
    const codes = res.body.errors.map(e => e.code);
    assert.ok(codes.includes('ERR_EXPENSE_AMOUNT_PRECISION'));
  });

  it('description > 500 chars returns ERR_EXPENSE_DESC_TOO_LONG', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 10.00,
      description: 'x'.repeat(501),
      category: 'Test'
    });
    assert.equal(res.status, 400);
    const codes = res.body.errors.map(e => e.code);
    assert.ok(codes.includes('ERR_EXPENSE_DESC_TOO_LONG'));
  });

  it('category > 100 chars returns ERR_EXPENSE_CAT_TOO_LONG', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 10.00,
      description: 'Test',
      category: 'x'.repeat(101)
    });
    assert.equal(res.status, 400);
    const codes = res.body.errors.map(e => e.code);
    assert.ok(codes.includes('ERR_EXPENSE_CAT_TOO_LONG'));
  });

  it('non-numeric amount returns ERR_EXPENSE_INVALID_AMOUNT', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 'abc',
      description: 'Test',
      category: 'Test'
    });
    assert.equal(res.status, 400);
    const codes = res.body.errors.map(e => e.code);
    assert.ok(codes.includes('ERR_EXPENSE_INVALID_AMOUNT'));
  });

  it('whitespace-only description returns ERR_EXPENSE_DESC_REQUIRED', async () => {
    const res = await request('POST', '/api/expenses', {
      amount: 10.00,
      description: '   ',
      category: 'Test'
    });
    assert.equal(res.status, 400);
    const codes = res.body.errors.map(e => e.code);
    assert.ok(codes.includes('ERR_EXPENSE_DESC_REQUIRED'));
  });
});

// ============================================================
// Error response format
// ============================================================

describe('Error response format', () => {
  it('validation errors use { errors: [...] } format', async () => {
    const res = await request('POST', '/api/expenses', {});
    assert.ok(Array.isArray(res.body.errors));
  });

  it('each error object has code and message fields', async () => {
    const res = await request('POST', '/api/expenses', {});
    for (const err of res.body.errors) {
      assert.ok(typeof err.code === 'string');
      assert.ok(typeof err.message === 'string');
    }
  });
});

// ============================================================
// Security
// ============================================================

describe('Security', () => {
  it('response headers include X-Content-Type-Options: nosniff', async () => {
    const res = await request('GET', '/api/expenses');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  it('PUT /api/expenses/1 returns 404 (no PUT endpoint)', async () => {
    const res = await request('PUT', '/api/expenses/1', {
      amount: 5,
      description: 'test',
      category: 'test'
    });
    assert.equal(res.status, 404);
  });
});
