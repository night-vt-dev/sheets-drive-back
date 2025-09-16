const { sheetsClient } = require('./sheets');

const headerCache = new Map();

const toKey = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const colToA1 = n => { let s=''; while (n>0){const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26);} return s; };

async function getHeaderMap({ spreadsheetId, sheetName}){
    const key = `${spreadsheetId}::${sheetName}`;
    const cached = headerCache.get(key);
    if (cached) return cached.map;

    const sheets = sheetsClient();
    const resp = await sheets.spreadsheets.values.get({spreadsheetId, range:`${sheetName}!1:1`});
    const headers = resp.data.values?.[0] || [];
    const map = new Map(headers.map((h,i) => [toKey(h), i + 1]));
    headerCache.set(key, {headers, map});
    return map;
}

async function findRowByFormResponseId({ spreadsheetId, sheetName, formResponseId, idHeader = 'FormResponseID'}) {
    const sheets = sheetsClient();
    const map = await getHeaderMap({spreadsheetId,sheetName});
    const idCol = map.get(toKey(idHeader));

    if(!idCol) throw new Error(`Header "${idHeader}" not found`);

    const colLetter = colToA1(idCol);

    const colResp = await sheets.spreadsheets.values.get({
        spreadsheetId, range: `${sheetName}!${colLetter}2:${colLetter}`, majorDimension: 'COLUMNS',
    });

    const ids = colResp.data.values?.[0] || [];
    const pos = ids.findIndex(v => v === formResponseId);
    return pos === -1 ? null : pos + 2;
}

async function updateColumnsByHeaderName({spreadsheetId, sheetName, locator, updates}) {
    const sheets = sheetsClient();
    let row;
    if(locator?.rowNumber){
        row = Number(locator.rowNumber);
    } else if (locator?.formResponseId) {
        row = await findRowByFormResponseId({spreadsheetId, sheetName, formResponseId: locator.formResponseId});
    }
    if (!row) throw new Error("Target row not found");

    const map = await getHeaderMap({spreadsheetId, sheetName});
    const data = [];

    for (const [header, value] of Object.entries(updates || {})){
        const col = map.get(toKey(header));
        if(!col) continue;
        const a1 = `${sheetName}!${colToA1(col)}${row}`;
        data.push({range: a1, values: [[value]]});
    }
    if (!data.length) return { row, updated: 0};
    const resp = await sheets.spreadhseets.values.batchUpdate({spreadsheetId, requestBody: { valueInputOption: 'USER_ENTERED', data},});

    return { row, updated: data.length, result: resp.data };
}

module.exports = { updateColumnsByHeaderName };