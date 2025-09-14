const express = require('express');
const ctrl = require('../controllers/webhook.controller');

const router = express.Router();

// From Apps Script (installable trigger → UrlFetchApp)
router.post('/new-rows', ctrl.handleNewRows);

// From Drive push notifications (files.watch webhook)
router.post('/notify', ctrl.handleDriveNotify);

module.exports = router;
