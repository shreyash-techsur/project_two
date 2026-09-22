'use strict';

const express = require('express');
const router = express.Router();
const database = require('../db/database');

// POST /api/auth/register — Create a new user account, issue JWT tokens
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

    // Issue JWT tokens
    const accessToken = database.generateAccessToken(user);
    const refreshToken = database.generateRefreshToken(user.id);

    // Persist DB after registration (new user data)
    database.persistToGit();

    res.status(201).json({
      user: { id: user.id, username: user.username },
      accessToken,
      refreshToken
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

// POST /api/auth/login — Authenticate and get JWT tokens
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

    // Issue JWT tokens
    const accessToken = database.generateAccessToken(user);
    const refreshToken = database.generateRefreshToken(user.id);

    res.status(200).json({
      user: { id: user.id, username: user.username },
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh — Exchange a refresh token for new access + refresh tokens
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({
      error: { code: 'ERR_REFRESH_TOKEN_REQUIRED', message: 'Refresh token is required' }
    });
  }

  const result = database.rotateRefreshToken(refreshToken);

  if (!result) {
    return res.status(401).json({
      error: { code: 'ERR_REFRESH_TOKEN_INVALID', message: 'Refresh token is invalid or expired. Please login again.' }
    });
  }

  res.status(200).json({
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });
});

// POST /api/auth/logout — Revoke the refresh token
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body || {};

  // Revoke the specific refresh token if provided
  if (refreshToken) {
    database.revokeRefreshToken(refreshToken);
  }

  // Also try to revoke by user ID if access token is valid
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const payload = database.verifyAccessToken(token);
    if (payload && !refreshToken) {
      // If no specific refresh token given but access token is valid,
      // revoke all refresh tokens for this user (full logout)
      database.revokeAllUserTokens(payload.userId);
    }
  }

  res.status(200).json({ success: true });
});

// GET /api/auth/me — Check current access token / get user info
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'ERR_NOT_AUTHENTICATED', message: 'Not authenticated' } });
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = database.verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ error: { code: 'ERR_TOKEN_EXPIRED', message: 'Access token expired or invalid' } });
  }

  // Verify user still exists in DB
  const user = database.getUserById(payload.userId);
  if (!user) {
    return res.status(401).json({ error: { code: 'ERR_USER_NOT_FOUND', message: 'User no longer exists' } });
  }

  res.status(200).json({ user: { id: user.id, username: user.username } });
});

module.exports = router;
