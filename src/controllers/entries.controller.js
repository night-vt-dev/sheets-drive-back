// CRUD for Firestore-stored intermediary data + optional write-back to Sheets

const { db } = require('../services/firestore');
const { sheetsClient } = require('../services/sheets');
const { foldValues } = require('../utils/standardize');

/**
 * GET /api/entries?sheetId=...&status=...&limit=100&after=42
 * Lists entries for a sheet, ordered by rowIndex.
 */
exports.listEntries = async (req, res, next) => {
  try {
    const { sheetId, processed, validated, limit = 100, after } = req.query;
    if (!sheetId) return res.status(400).json({ error: 'sheetId is required' });

    let q = db.collection('entries').where('sheetId', '==', sheetId);

    if (processed) q = q.where('processed', '==', processed);
    if (validated) q = q.where('validated', '==', validated);

    // Order by rowIndex for stable pagination
    q = q.orderBy('rowIndex').limit(Math.min(Number(limit) || 100, 500));

    // Simple "after" pagination using rowIndex (numeric)
    if (after) {
      const afterNum = Number(after);
      q = q.startAfter(afterNum);
    }

    const snap = await q.get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.json({ items, nextAfter: items.length ? items[items.length - 1].rowIndex : null });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/entries/:id
 */
exports.getEntry = async (req, res, next) => {
  try {
    const ref = db.collection('entries').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.sendStatus(404);
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/entries/:id
 * Body can include: { processed, validated }
 */
exports.patchEntry = async (req, res, next) => {
  try {
    const ref = db.collection('entries').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.sendStatus(404);

    const updates = {};
    if (req.body.processed) updates.row.processed = req.body.processed;
    if (req.body.validated) updates.row.processed = req.body.validated;
    updates.updatedAt = Date.now();

    await ref.set(updates, { merge: true });
    const fresh = await ref.get();
    res.json({ id: fresh.id, ...fresh.data() });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/entries/:id/sheets
 * Write back this entry to the spreadsheet.
 * Body: { range?: "Sheet1!A42:C42", values?: string[][] }
 * If values not provided, we'll map entry.normalized → single row values.
 */
exports.writeBackToSheet = async (req, res, next) => {
  try {
    const ref = db.collection('entries').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.sendStatus(404);
    const entry = doc.data();

    const range =`${entry.sheetName}!A${entry.rowIndex}:L${entry.rowIndex}`;

    const values = foldValues(entry.row);

    const sheets = sheetsClient();
    const resp = await sheets.spreadsheets.values.update({
      spreadsheetId: entry.sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    // Mark as processed/updated in Firestore
    await ref.set({ updatedAt: Date.now() }, { merge: true });

    res.json({ ok: true, updatedRange: range, result: resp.data });
  } catch (err) {
    next(err);
  }
};

/**
 * (Optional) POST /api/entries/ingest (manual test)
 * Body: { sheetId, sheetName, startRow, rows: string[][] }
 */
exports.ingestManual = async (req, res, next) => {
  try {
    const { sheetId, sheetName = 'Sheet1', startRow = 2, rows = [] } = req.body || {};
    if (!sheetId || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'sheetId and rows[] required' });
    }
    const batch = db.batch();
    const now = Date.now();
    rows.forEach((r, i) => {
      const rowIndex = Number(startRow) + i;
      const id = `${sheetId}:${rowIndex}`;
      batch.set(
        db.collection('entries').doc(id),
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
    res.json({ ok: true, count: rows.length });
  } catch (err) {
    next(err);
  }
};
