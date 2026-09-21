'use strict';

const database = require('../db/database');

/**
 * Authentication middleware.
 * Extracts the Bearer token from the Authorization header,
 * validates it, and attaches req.user if valid.
 * Returns 401 if no valid session is found.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'ERR_NOT_AUTHENTICATED', message: 'Authentication required' }
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const user = database.getSessionUser(token);

  if (!user) {
    return res.status(401).json({
      error: { code: 'ERR_NOT_AUTHENTICATED', message: 'Invalid or expired session' }
    });
  }

  // Attach user to request for downstream handlers
  req.user = user;
  next();
}

module.exports = { requireAuth };
