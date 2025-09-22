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
    sheetName = safeSheetName(sheetName)
    console.log("headers.js:",locator, updates, spreadsheetId, sheetName)
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
    data.forEach(d => console.log(d.values));
    if (!data.length) return { row, updated: 0};
    console.log(data);
    assertBatchData(data);
    const respData = batchWriteValues({spreadsheetId, data});
    //const resp = await sheets.spreadhseets.values.batchUpdate({spreadsheetId, requestBody: { valueInputOption: 'USER_ENTERED', data},});

    return { row, updated: data.length, result: respData };
}

const util = require('node:util');

function assertValuesBatchData(data) {
  if (!Array.isArray(data) || data.length === 0)
    throw new Error('requestBody.data must be a non-empty array');
  data.forEach((d, i) => {
    if (!d || typeof d !== 'object') throw new Error(`data[${i}] is not an object`);
    if (typeof d.range !== 'string' || !d.range.includes('!'))
      throw new Error(`data[${i}].range must include sheet name, got: ${d && d.range}`);
    if (!Array.isArray(d.values) || !Array.isArray(d.values[0]))
      throw new Error(`data[${i}].values must be 2D array, got: ${util.inspect(d && d.values, {depth:5})}`);
  });
}



async function batchWriteValues({ spreadsheetId, data, valueInputOption = 'RAW' }) {
  if (!spreadsheetId) throw new Error('spreadsheetId is required');
  assertValuesBatchData(data.filter(Boolean)); // filter out holes just in case

  const sheets = sheetsClient();
  const req = {
    spreadsheetId,
    requestBody: { valueInputOption, data },
  };

  // Optional: print first item fully (no [Array] elision)
  // console.log('batchUpdate first item:', util.inspect(data[0], { depth: 10 }));

  const resp = await sheets.spreadsheets.values.batchUpdate(req);
  return resp.data;
}




module.exports = { updateColumnsByHeaderName };

function assertBatchData(data) {
  if (!Array.isArray(data)) throw new Error('data must be an array');
  data.forEach((d, i) => {
    if (!d || typeof d !== 'object') throw new Error(`data[${i}] not an object`);
    if (typeof d.range !== 'string') throw new Error(`data[${i}].range missing`);
    if (!Array.isArray(d.values) || !Array.isArray(d.values[0])) {
      throw new Error(`data[${i}].values must be 2D array`);
    }
  });
}

function safeSheetName(name) {
  // wrap in single quotes and escape any single quotes inside
  return `'${String(name).replace(/'/g, "''")}'`;
}