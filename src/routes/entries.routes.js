const express = require('express');
const ctrl = require('../controllers/entries.controller');

const router = express.Router();

// Protected by auth middleware (mounted at /api in app.js)
router.get('/entries', ctrl.listEntries);
router.get('/entries/:id', ctrl.getEntry);
router.patch('/entries/:id', ctrl.patchEntry);
router.post('/entries/:id/sheets', ctrl.writeBackToSheet);

// Optional helper for testing ingestion without Apps Script
router.post('/entries/ingest', ctrl.ingestManual);

module.exports = router;
