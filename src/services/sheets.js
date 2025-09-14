// services/sheets.js
const { google } = require('googleapis');

let _sheets; // singleton
function sheetsClient() {
  if (_sheets) return _sheets;

  const auth = new google.auth.JWT({
    email: process.env.GSA_CLIENT_EMAIL,
    key: (process.env.GSA_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheets = google.sheets({ version: 'v4', auth });
  return _sheets;
}

module.exports = { sheetsClient };
