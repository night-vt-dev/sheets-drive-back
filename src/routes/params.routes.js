const express = require('express');
const ctrl = require('../controllers/params.controller');

const router = express.Router();

// Protected by auth middleware (mounted at /api in app.js)
router.get('/params', ctrl.getParams);

router.get('/params/sheets', ctrl.getSheets);

router.put('/params', ctrl.updatePrefs);

module.exports = router;
