// Centralized error handler. Place after all routes.

module.exports = function errorHandler(err, req, res, _next) {
  const status = err.status || err.code || 500;

  // Minimal logging; expand if you use a logger
  console.error('ERROR:', {
    status,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  // Don't leak internals in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(status).json({ error: 'Internal Server Error' });
  }
  return res.status(status).json({ error: err.message || 'Internal Server Error' });
};
