// Paste into script.google.com (bound to a Sheet via Extensions > Apps Script).
// Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
// Copy the /exec URL into ENDPOINT in js/telemetry.js.

const SHEET = "log";
const HEADERS = ["time", "type", "text", "session", "path", "referrer", "lang"];

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  try {
    const d = JSON.parse(e.postData.contents);
    // Sheets treats a leading = + - @ as a formula; defuse visitor-typed text
    const safe = s => /^[=+\-@]/.test(s) ? "'" + s : s;
    sheet.appendRow([new Date(), d.type, safe(d.text || ""), d.sid, d.path, d.ref, d.lang]);
  } catch (err) { /* ignore malformed posts */ }
  return ContentService.createTextOutput("ok");
}

// Optional: run from the editor for a quick summary (View > Logs).
function summary() {
  const rows = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET).getDataRange().getValues().slice(1);
  const visits = rows.filter(r => r[1] === "visit");
  Logger.log("visits: " + visits.length + ", unique sessions: " + new Set(visits.map(r => r[3])).size);
  const counts = {};
  rows.filter(r => r[1] === "cmd").forEach(r => counts[r[2]] = (counts[r[2]] || 0) + 1);
  Logger.log(JSON.stringify(counts, null, 1));
}
