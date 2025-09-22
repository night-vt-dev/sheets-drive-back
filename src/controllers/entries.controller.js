// CRUD for Firestore-stored intermediary data + optional write-back to Sheets

const { db } = require('../services/firestore');
const { updateColumnsByHeaderName } = require('../services/headers');

/**
 * GET /api/entries?sheetId=...&status=...&limit=100&after=42
 * Lists entries for a sheet, ordered by rowIndex.
 */
exports.listEntries = async (req, res, next) => {
    try {
        const { sheetId, processed, validated, limit = 100, after } = req.query;
        if (!sheetId) return res.status(400).json({ error: 'sheetId is required' });

        let q = db.collection('entries').where('sheetId', '==', sheetId);

        if (processed) q = q.where('row.processed', '==', processed === 'TRUE' ? true : false);
        if (validated) q = q.where('row.validated', '==', validated === 'TRUE' ? true : false);

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
 * POST /api/entries/:id/validate
 * @param {*} req contains
 *      params: id
 *      body: -
 * @param {*} res 
 * @param {*} next 
 */
exports.validateEntry = async (req, res, next) => {
    try {
        const ref = db.collection('entries').doc(req.params.id);
        const doc = await ref.get();

        if (!doc.exists) return res.sendStatus(404);
        const updates = {row:{}};

        updates.row["processed"] = true;
        updates.row["validated"] = true;

        await ref.set(updates, { merge: true });

        const fresh = (await ref.get()).data();

        const resp = await writeBackToSheet(req.params.id, fresh.sheetId, fresh.sheetName, fresh.row);

        res.json({ entry: { id: req.params.id, ...fresh}, sheetData: { ...resp } });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/entries/:id/refuse
 * @param {*} req contains
 *      params: id
 *      body: -
 * @param {*} res 
 * @param {*} next 
 */
exports.refuseEntry = async (req, res, next) => {
    try {
        console.log(req.body.updates);
        const { processed, validated, refusal_reason } = req.body.updates;
        const ref = db.collection('entries').doc(req.params.id);
        const doc = await ref.get();

        if (!doc.exists) return res.sendStatus(404);
        const updates = { row: {} };

        console.log(processed, validated, refusal_reason)

        updates.row["processed"] = true;
        updates.row["validated"] = false;
        updates.row["refusal_reason"] = refusal_reason ? refusal_reason : "";

        await ref.set(updates, { merge: true });

        const fresh = (await ref.get()).data();
        console.log("fresh:", fresh);

        const resp = await writeBackToSheet(req.params.id, fresh.sheetId, fresh.sheetName, fresh.row);

        res.json({ entry: { id: req.params.id, ...fresh}, sheetData: { ...resp } });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/entries/:id
 * body can include any fields
 */
exports.patchEntry = async (req, res, next) => {
    try {
        const ref = db.collection('entries').doc(req.params.id);
        const doc = await ref.get();
        if (!doc.exists) return res.sendStatus(404);

        const updates = {};
        if (req.body) {
            for (field in body) {
                updates.row[field] = req.body[field];
            }
        }
        updates.updatedAt = Date.now();

        await ref.set(updates, { merge: true });
        const fresh = (await ref.get()).data();

        const resp = await writeBackToSheet(req.params.id, fresh.sheetId, fresh.sheetName, fresh.row);

        res.json({ entry: { id: fresh.id, ...fresh.data() }, sheetData: { ...resp } });
    } catch (err) {
        next(err);
    }
};

writeBackToSheet = async (id, sheetId, sheetName, row) => {
    const resp = await updateColumnsByHeaderName({
        spreadsheetId: sheetId,
        sheetName: sheetName,
        locator: { formResponseId: id },
        updates: row
    });

    return { ok: true, result: resp.data };
}

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
