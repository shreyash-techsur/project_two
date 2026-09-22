'use strict';

const database = require('../db/database');

/**
 * Authentication middleware.
 * Extracts the JWT access token from the Authorization header,
 * verifies it, and attaches req.user if valid.
 * Returns 401 if no valid token is found.
 *
 * The client is responsible for refreshing expired access tokens
 * via POST /api/auth/refresh before retrying.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'ERR_NOT_AUTHENTICATED', message: 'Authentication required' }
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = database.verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({
      error: { code: 'ERR_TOKEN_EXPIRED', message: 'Access token expired or invalid. Please refresh.' }
    });
  }

  // Attach user to request for downstream handlers
  req.user = { id: payload.userId, username: payload.username };
  next();
}

module.exports = { requireAuth };
