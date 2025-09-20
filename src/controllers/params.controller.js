const { sheets } = require("googleapis/build/src/apis/sheets");
const { db } = require("../services/firestore");
const logger = require("../utils/logger");


function sanitizeUsername(x) {
    if (typeof x !== 'string') return null;
    const trimmed = x.trim();
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(trimmed)) return null; // adjust rules as you like
    return trimmed;
}

function sanitizeSheetId(x) {
    if (typeof x !== 'string') return null;
    const trimmed = x.trim();
    // Basic sanity: Google Sheet IDs are base64ish-ish; don't over-validate
    if (!/^[A-Za-z0-9-_]{20,}$/.test(trimmed)) return null;
    return trimmed;
}


/**
 * returns parameters for the current user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.getParams = async (req, res, next) => {
    try {
        const uid = req.user.sub;
        const params = db.collection('users').doc(uid);
        const snap = await params.get();

        if (!snap.exists) {
            return res.json({
                userId: uid,
                email: req.user.email,
                username: '',
                defaultSpreadsheetId: '',
            });
        }

        const d = snap.data();

        return res.json({
            userId: uid,
            email: req.user.email,
            username: d.username || '',
            defaultSpreadsheetId: d.defaultSpreadsheetId || '',
        }); ß
    } catch (error) {
        next(error);
    }
};

exports.updatePrefs = async (req, res, next) => {
    try {
        const uid = req.user.sub;
        const ref = db.collection('users').doc(uid);

        const updates = {};
        if ('username' in req.body) {
            const u = sanitizeUsername(req.body.username);
            if (req.body.username && !u) return res.status(400).json({ error: 'Invalid username' });
            updates.username = u || '';
        }
        if ('defaultSpreadsheetId' in req.body) {
            const s = sanitizeSheetId(req.body.defaultSpreadsheetId);
            if (req.body.defaultSpreadsheetId && !s) return res.status(400).json({ error: 'Invalid spreadsheet ID' });
            updates.defaultSpreadsheetId = s || '';
        }

        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No updatable fields' });

        const now = Date.now();
        await ref.set({ ...updates, updatedAt: now, createdAt: now }, { merge: true });
        const fresh = await ref.get();
        const d = fresh.data() || {};
        res.json({
            userId: uid,
            email: req.user.email,
            username: d.username || '',
            defaultSpreadsheetId: d.defaultSpreadsheetId || '',
        });
    } catch (e) { next(e); }
};

exports.getSheets = async (req, res, next) => {
    try {
        const ref = db.collection('entries').select('sheetId', 'sheetName').orderBy('sheetId').orderBy('sheetName');

        const snap = await ref.get();

        const resp = [];

        for(const doc of snap.docs){
            const sheet = {sheetId: doc.data().sheetId, sheetName: doc.data().sheetName};
            resp.push(sheet);
        }

        res.json({
            sheets: onlyUnique(resp, 'sheetId'),
        });
    } catch (error) {
        next(error);
    }
}

function onlyUnique(arr, prop) {
  return arr.filter((item, index) => {

    return arr.findIndex(obj => obj[prop] === item[prop]) === index;

  });
}