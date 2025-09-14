const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const auth = require('./middleware/auth');
const webhookRoutes = require('./routes/webhook.routes');
const entriesRoutes = require('./routes/entries.routes');
const errorHandler = require('./middleware/error');

const app = express();
app.set('trust proxy', true);                 // recommended on Cloud Run
app.use(cors({ origin: ['http://localhost:5173', 'https://your-frontend.example'] }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/sheets', webhookRoutes);            // webhook endpoints (shared secret)
app.use('/api', auth, entriesRoutes);         // protected API for GUI

app.use(errorHandler);
module.exports = app;
