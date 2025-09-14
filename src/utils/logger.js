// Tiny logger wrapper (optional). morgan already logs requests.
// Use this for app-level logs with consistent formatting.

const levels = ['debug', 'info', 'warn', 'error'];

function log(level, msg, meta) {
  const ts = new Date().toISOString();
  const base = `[${ts}] ${level.toUpperCase()}: ${msg}`;
  // Avoid JSON dumping huge objects by default
  if (meta) {
    try {
      console.log(base, JSON.stringify(meta));
    } catch {
      console.log(base, meta);
    }
  } else {
    console.log(base);
  }
}

module.exports = {
  debug: (m, meta) => log('debug', m, meta),
  info: (m, meta) => log('info', m, meta),
  warn: (m, meta) => log('warn', m, meta),
  error: (m, meta) => log('error', m, meta),
};
