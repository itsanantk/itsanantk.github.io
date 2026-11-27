// Paste into script.google.com (bound to a Sheet via Extensions > Apps Script).
// Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy.
// (Editing the existing deployment keeps the same /exec URL as js/telemetry.js.)

const SHEET = "log";
const HEADERS = ["time", "type", "text", "session", "path", "referrer", "lang", "visitor", "visit #"];

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  // first row ever, or an older header row missing the newer columns
  if (sheet.getLastRow() === 0 || sheet.getRange(1, HEADERS.length).getValue() !== HEADERS[HEADERS.length - 1]) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  try {
    const d = JSON.parse(e.postData.contents);
    // Sheets treats a leading = + - @ as a formula; defuse visitor-typed text
    const safe = s => /^[=+\-@]/.test(s) ? "'" + s : s;
    sheet.appendRow([new Date(), d.type, safe(d.text || ""), d.sid, d.path, d.ref, d.lang,
                     d.vid || "", d.visit || ""]);
  } catch (err) { /* ignore malformed posts */ }
  return ContentService.createTextOutput("ok");
}

// Run from the editor (select "summary" > Run). Writes a per-visitor table to
// a "summary" tab: visits, total time on site, clicks, sections, last seen.
function summary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rows = ss.getSheetByName(SHEET).getDataRange().getValues().slice(1);

  const visitors = {};
  const sessionSecs = {};           // session -> largest "leave" seconds
  const clicks = {};
  for (const r of rows) {
    const [time, type, text, sid, , , , vid] = r;
    const key = vid || "(before visitor ids) " + sid;
    const v = visitors[key] || (visitors[key] = { sessions: new Set(), clicks: 0, cmds: 0, sections: new Set(), last: time });
    v.sessions.add(sid);
    if (time > v.last) v.last = time;
    if (type === "click") { v.clicks++; clicks[text] = (clicks[text] || 0) + 1; }
    if (type === "cmd") v.cmds++;
    if (type === "section") v.sections.add(text);
    if (type === "leave") {
      const secs = parseInt(String(text), 10) || 0;
      sessionSecs[sid] = Math.max(sessionSecs[sid] || 0, secs);
    }
  }

  const fmt = s => s >= 60 ? Math.floor(s / 60) + "m " + (s % 60) + "s" : s + "s";
  const table = [["visitor", "visits", "total time", "avg time / visit", "clicks", "terminal cmds", "sections seen", "last seen"]];
  Object.keys(visitors)
    .map(k => {
      const v = visitors[k];
      const total = [...v.sessions].reduce((a, s) => a + (sessionSecs[s] || 0), 0);
      return [k, v.sessions.size, fmt(total), fmt(Math.round(total / v.sessions.size)),
              v.clicks, v.cmds, [...v.sections].join(", "), v.last];
    })
    .sort((a, b) => b[7] - a[7])
    .forEach(row => table.push(row));

  table.push([], ["most clicked", "count"]);
  Object.entries(clicks).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(e => table.push(e));

  const width = table[0].length;
  const out = ss.getSheetByName("summary") || ss.insertSheet("summary");
  out.clear();
  out.getRange(1, 1, table.length, width)
     .setValues(table.map(r => r.concat(Array(width - r.length).fill(""))));
}
