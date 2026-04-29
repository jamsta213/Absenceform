/**
 * netlify/functions/getStaff.js
 *
 * Reads staff names & sites from your Google Sheet's "Staff Data" tab.
 * Mirrors the original getStaffData() Apps Script function.
 *
 * Required environment variables (set in Netlify → Site settings → Env vars):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — the full JSON key for your service account
 *   SPREADSHEET_ID               — the ID portion of your spreadsheet URL
 */

const { google } = require('googleapis');

exports.handler = async function (event, context) {
  /* Only allow GET */
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    /* ── Auth ─────────────────────────────────────────────── */
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    /* ── Fetch "Staff Data" sheet ─────────────────────────── */
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.1hH2ZFhpFMA-gsiW3qxAvXBzp846HDAo6nexFYk8Gyhk,
      range: 'Staff Data',  // Reads the whole sheet
    });

    const rows = response.data.values || [];

    /* ── Build staff list ─────────────────────────────────── */
    // Original code: name = column index 31 (AH), site = column index 30 (AG)
    const staffList = [];

    for (let i = 1; i < rows.length; i++) {       // skip header row
      const row = rows[i];
      const name = row[31] || '';
      const site = row[30] || '';
      if (name) {
        staffList.push({ name, site });
      }
    }

    staffList.sort((a, b) => a.name.localeCompare(b.name));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffList),
    };

  } catch (err) {
    console.error('getStaff error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
