/* ============================================================
   Visit + terminal-command logging. Posts small events to a
   Google Apps Script web app that appends them to a Sheet
   (see telemetry/apps-script.gs). No-op until ENDPOINT is set.
   ============================================================ */
(() => {
  "use strict";

  const ENDPOINT = "https://script.google.com/macros/s/AKfycbyp5h6sjVgz6SmVLBnsU_66z7NSqeugNUWVuzgC3FJaH0fksF6cLODmw9fKlGwLv5ac6g/exec";

  const sid = (() => {
    try {
      let id = sessionStorage.getItem("ak-sid");
      if (!id) {
        id = Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem("ak-sid", id);
      }
      return id;
    } catch (_) { return "nosession"; }
  })();

  const log = (type, text = "") => {
    if (!ENDPOINT) return;
    const body = JSON.stringify({
      type,
      text: String(text).slice(0, 200),
      sid,
      path: location.pathname,
      ref: document.referrer.slice(0, 200),
      lang: navigator.language
    });
    // text/plain keeps this a "simple" request, so no CORS preflight
    fetch(ENDPOINT, { method: "POST", mode: "no-cors", body, keepalive: true }).catch(() => {});
  };

  window.akLog = log;
  log("visit");
})();
