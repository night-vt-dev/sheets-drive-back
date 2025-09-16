require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});

// graceful shutdown for Cloud Run
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server…');
  server.close(() => process.exit(0));
});