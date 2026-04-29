/**
 * netlify/functions/submitAbsence.js
 *
 * Appends a new absence record to the "Responses" sheet.
 * Mirrors the original submitAbsence() Apps Script function.
 *
 * Required environment variables (set in Netlify → Site settings → Env vars):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — the full JSON key for your service account
 *   SPREADSHEET_ID               — the ID portion of your spreadsheet URL
 */

const { google } = require('googleapis');

/** Format a YYYY-MM-DD string to DD/MM/YYYY */
function formatToUK(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

exports.handler = async function (event, context) {
  /* Only allow POST */
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  try {
    /* ── Auth ─────────────────────────────────────────────── */
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    /* ── Find next free row in column A ───────────────────── */
    const colA = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Responses!A:A',
    });

    const colAValues = colA.data.values || [];
    const nextRow = colAValues.length + 1;   // first empty row (1-indexed)

    /* ── Build row (matches original column layout A–N) ────── */
    const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

    const rowData = [
      [
        timestamp,                    // A: Timestamp
        data.name        || '',       // B: Name
        data.site        || '',       // C: Site
        data.absType     || '',       // D: Absence Type
        data.sickReason  || '',       // E: Sickness Reason
        data.leaveReason || '',       // F: Leave Reason
        data.coverStatus || '',       // G: Cover Status
        data.duties      || '',       // H: Duties
        data.whoCover    || '',       // I: Who is covering
        formatToUK(data.start),       // J: First Day
        formatToUK(data.end),         // K: Last Day
        data.dayType     || '',       // L: Duration Type
        data.timeOut     || '',       // M: Time Out
        data.timeReturn  || '',       // N: Time Return
      ],
    ];

    /* ── Write to sheet ─────────────────────────────────────── */
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `Responses!A${nextRow}:N${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rowData },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };

  } catch (err) {
    console.error('submitAbsence error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
