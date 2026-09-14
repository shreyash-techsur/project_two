'use strict';

/**
 * Global Express error-handling middleware.
 * Logs full error server-side, returns sanitized JSON response.
 * Never exposes stack traces, file paths, or internal details.
 */
function errorHandler(err, req, res, next) {
  // Log full error server-side (including stack trace)
  console.error('Server error:', err);

  // Determine error code based on context
  const isReadError = err.message && err.message.includes('read');
  const code = isReadError ? 'ERR_STORAGE_READ' : 'ERR_STORAGE_WRITE';
  const message = isReadError
    ? 'Failed to retrieve data. Please try again.'
    : 'Failed to save data. Please try again.';

  // Return sanitized response — NO stack traces, NO internal details
  res.status(500).json({
    error: { code, message }
  });
}

module.exports = { errorHandler };
