const crypto = require('crypto');

/**
 * Constant-time comparison for secrets/tokens.
 * Returns false if Buffers have different lengths (avoids leaks).
 */
exports.timeSafeEqual = (a, b) => {
  if (!Buffer.isBuffer(a)) a = Buffer.from(String(a || ''), 'utf8');
  if (!Buffer.isBuffer(b)) b = Buffer.from(String(b || ''), 'utf8');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};
