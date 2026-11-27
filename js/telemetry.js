(() => {
  "use strict";

  const ENDPOINT = "https://script.google.com/macros/s/AKfycbyp5h6sjVgz6SmVLBnsU_66z7NSqeugNUWVuzgC3FJaH0fksF6cLODmw9fKlGwLv5ac6g/exec";

  const rid = () => Math.random().toString(36).slice(2, 10);
  const store = (area, key, make) => {
    try {
      let v = area.getItem(key);
      if (!v) { v = make(); area.setItem(key, v); }
      return v;
    } catch (_) { return null; }
  };

  const vid = store(localStorage, "ak-vid", rid) || "novisitor";
  let fresh = false;
  const sid = store(sessionStorage, "ak-sid", () => { fresh = true; return rid(); }) || "nosession";

  // visit number for this visitor: bumped once per new session, not per reload
  const visitNo = (() => {
    try {
      let n = parseInt(localStorage.getItem("ak-visits") || "0", 10) || 0;
      if (fresh || n === 0) { n += 1; localStorage.setItem("ak-visits", String(n)); }
      return n;
    } catch (_) { return 0; }
  })();

  const log = (type, text = "") => {
    if (!ENDPOINT) return;
    const body = JSON.stringify({
      type,
      text: String(text).slice(0, 200),
      sid,
      vid,
      visit: visitNo,
      path: location.pathname,
      ref: document.referrer.slice(0, 200),
      lang: navigator.language
    });
    // text/plain keeps this a "simple" request, so no CORS preflight
    fetch(ENDPOINT, { method: "POST", mode: "no-cors", body, keepalive: true }).catch(() => {});
  };

  window.akLog = log;
  log("visit");

  /* ---------- clicks: links, buttons, command-palette items ---------- */
  document.addEventListener("click", e => {
    const el = e.target.closest && e.target.closest("a, button, [role=button], .palette-item");
    if (!el) return;
    const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("href") || "?")
      .replace(/\s+/g, " ").trim().slice(0, 60);
    const where = el.closest("section[id], nav, header, footer");
    const tag = where ? (where.id || where.tagName.toLowerCase()) : "page";
    log("click", `${label} @${tag}`);
  }, { capture: true, passive: true });

  /* ---------- section views ---------- */
  if ("IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (!en.isIntersecting || seen.has(en.target.id)) continue;
        seen.add(en.target.id);
        log("section", en.target.id);
        io.unobserve(en.target);
      }
    }, { threshold: 0.4 });
    const watch = () => document.querySelectorAll("section[id]").forEach(s => io.observe(s));
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch);
    else watch();
  }

  /* ---------- time on site + scroll depth ---------- */
  let active = 0;                               // ms the tab was visible
  let since = document.hidden ? null : Date.now();
  let maxScroll = 0;
  addEventListener("scroll", () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    if (h > 0) maxScroll = Math.max(maxScroll, Math.round((scrollY / h) * 100));
  }, { passive: true });
  const flush = () => {
    if (since !== null) { active += Date.now() - since; since = null; }
    log("leave", `${Math.round(active / 1000)}s active, ${Math.min(maxScroll, 100)}% scrolled`);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flush();
    else since = Date.now();
  });
  // pagehide covers browsers that close without a visibilitychange
  addEventListener("pagehide", () => { if (since !== null) flush(); });
})();
