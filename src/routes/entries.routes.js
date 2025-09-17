const express = require('express');
const ctrl = require('../controllers/entries.controller');

const router = express.Router();

// Protected by auth middleware (mounted at /api in app.js)
router.get('/entries', ctrl.listEntries);
router.get('/entries/:id', ctrl.getEntry);

router.patch('/entries/:id', ctrl.patchEntry);

router.patch('/entries/:id/validate', ctrl.validateEntry);
router.patch('/entries/:id/refuse', ctrl.refuseEntry);

module.exports = router;
