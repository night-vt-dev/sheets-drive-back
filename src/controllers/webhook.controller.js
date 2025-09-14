// Handles incoming notifications:
// - Apps Script → /sheets/new-rows  (actual row data)
// - Drive push → /sheets/notify     (file changed ping)

const { db } = require('../services/firestore');
const { timeSafeEqual } = require('../utils/security');

const SHARED_SECRET = process.env.WEBHOOK_SECRET || '';

/**
 * Apps Script webhook: receives new rows as JSON payload.
 * Body: { spreadsheetId, sheetName, fromRow, toRow, rows, secret? }
 */
exports.handleNewRows = async (req, res, next) => {
  try {
    // 1) Auth via shared secret (header preferred; body fallback)
    const presented =
      req.get('x-shared-secret') ||
      (req.body && typeof req.body.secret === 'string' ? req.body.secret : '');
    if (!presented || !timeSafeEqual(Buffer.from(presented), Buffer.from(SHARED_SECRET))) {
      return res.sendStatus(401);
    }

    const { spreadsheetId, sheetName, fromRow, toRow, formResponseId, rows, namedValues } = req.body || {};
    if (!spreadsheetId || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Missing spreadsheetId or rows[]' });
    }

    // 2) Persist rows to Firestore (id: `${sheetId}:${rowIndex}`)
    const batch = db.batch();
    const now = Date.now();

    rows.forEach((r, i) => {
      const rowIndex = Number(fromRow) + i;
      const id = formResponseId;
      const ref = db.collection('entries').doc(id);
      batch.set(
        ref,
        {
          sheetId: spreadsheetId,
          sheetName: sheetName || 'Sheet1',
          rowIndex: rowIndex,
          createdAt: now,
          updatedAt: now,
          row: namedValues
        },
        { merge: true }
      );
    });

    await batch.commit();
    return res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

/**
 * Drive push notifications: file changed (no row data included).
 * Use this if you prefer Drive webhooks over Apps Script.
 * Headers include: X-Goog-Resource-State, X-Goog-Channel-Id, X-Goog-Resource-Id, X-Goog-Channel-Token, X-Goog-Message-Number
 */
exports.handleDriveNotify = async (req, res, next) => {
  try {
    const info = {
      state: req.get('X-Goog-Resource-State'),
      resourceId: req.get('X-Goog-Resource-Id'),
      channelId: req.get('X-Goog-Channel-Id'),
      token: req.get('X-Goog-Channel-Token'),
      messageNumber: req.get('X-Goog-Message-Number'),
    };
    // Ack quickly; do your diff/fetch in background (queue/worker)
    console.log('[DriveNotify]', info);
    return res.sendStatus(200);
  } catch (err) {
    next(err);
  }
};
