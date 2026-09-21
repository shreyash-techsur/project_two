'use strict';

const express = require('express');
const router = express.Router();
const database = require('../db/database');

// POST /api/auth/register — Create a new user account
router.post('/register', (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    // Validate inputs
    const errors = [];
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      errors.push({ code: 'ERR_USERNAME_REQUIRED', message: 'Username is required' });
    } else if (username.trim().length < 3) {
      errors.push({ code: 'ERR_USERNAME_TOO_SHORT', message: 'Username must be at least 3 characters' });
    } else if (username.trim().length > 50) {
      errors.push({ code: 'ERR_USERNAME_TOO_LONG', message: 'Username must not exceed 50 characters' });
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errors.push({ code: 'ERR_USERNAME_INVALID', message: 'Username can only contain letters, numbers, and underscores' });
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      errors.push({ code: 'ERR_PASSWORD_REQUIRED', message: 'Password is required' });
    } else if (password.length < 4) {
      errors.push({ code: 'ERR_PASSWORD_TOO_SHORT', message: 'Password must be at least 4 characters' });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Create user
    const user = database.createUser(username.trim(), password);

    // Auto-login: create session
    const token = database.createSession(user.id);

    res.status(201).json({
      user: { id: user.id, username: user.username },
      token
    });
  } catch (err) {
    if (err.code === 'ERR_USERNAME_TAKEN') {
      return res.status(409).json({
        errors: [{ code: 'ERR_USERNAME_TAKEN', message: 'Username already taken' }]
      });
    }
    next(err);
  }
});

// POST /api/auth/login — Authenticate and get a session token
router.post('/login', (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        errors: [{ code: 'ERR_CREDENTIALS_REQUIRED', message: 'Username and password are required' }]
      });
    }

    const user = database.verifyUser(username, password);
    if (!user) {
      return res.status(401).json({
        errors: [{ code: 'ERR_INVALID_CREDENTIALS', message: 'Invalid username or password' }]
      });
    }

    // Create session
    const token = database.createSession(user.id);

    res.status(200).json({
      user: { id: user.id, username: user.username },
      token
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout — Destroy the current session
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    database.deleteSession(token);
  }
  res.status(200).json({ success: true });
});

// GET /api/auth/me — Check current session / get user info
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = database.getSessionUser(token);

  if (!user) {
    return res.status(401).json({ error: { code: 'ERR_NOT_AUTHENTICATED', message: 'Not authenticated' } });
  }

  res.status(200).json({ user: { id: user.id, username: user.username } });
});

module.exports = router;
