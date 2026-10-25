/* ============================================================
   Optional in-browser assistant. Quietly preloads a small
   open model (transformers.js + WebGPU) after the page is idle,
   only on capable desktop connections. The terminal uses it as a
   fallback when no command or rule matches; until it is ready the
   terminal behaves exactly as before. Weights come from the
   Hugging Face CDN and are cached by the browser after first load.
   ============================================================ */
(() => {
  "use strict";

  const INSTRUCTIONS =
    "You are the assistant inside Anant Khanna's portfolio terminal. " +
    "Answer in ONE short sentence, in third person, by copying wording and numbers from the facts below. " +
    "Do not add any detail that is not written in the facts. " +
    "If the facts do not answer the question, reply only: I don't know - email itsanantk@gmail.com.\n\nFACTS:\n";

  // Each fact names its subject explicitly, and carries keywords for retrieval.
  const FACTS = [
    [["study", "school", "university", "ubc", "degree", "education", "student", "major", "college", "bachelor", "basc", "dean"],
      "Anant studies for a Bachelor of Applied Science (BASc) in Computer Engineering, co-op program, at UBC in Vancouver. He is on the Dean's List."],
    [["amd", "intern", "internship", "verification", "dv", "2027", "nbio", "chiplet", "upcoming", "incoming", "future", "summer"],
      "Anant signed on as an incoming Design Verification Engineering intern at AMD (NBIO team, chiplet interconnect), in Vancouver, May to December 2027."],
    [["agriprix", "founding", "whatsapp", "stripe", "checkout", "security", "vulnerab", "llm", "router", "playwright", "oversell", "startup"],
      "At Agriprix (May to August 2026) Anant was Founding Software Engineer. He built a WhatsApp AI assistant on the Business Cloud API, Stripe authorize-and-capture checkout, row-level locking to stop overselling, a hybrid intent router with failover across 5 LLM providers, and a 15-case Playwright E2E suite. A security audit found 67 vulnerabilities (5 critical), all patched."],
    [["uas", "yolo", "jetson", "drone", "vision", "detection", "tensorrt", "ml", "machine", "learning", "orin"],
      "Anant is Machine Learning Team Lead at UBC UAS since September 2024. His team runs real-time YOLOv11 detection at 50 km/h on a Jetson Orin Nano with 95% accuracy, and TensorRT FP16 quantization cut memory bandwidth by 50%."],
    [["finds", "map", "campus", "supabase", "realtime", "utility"],
      "Anant is Lead Developer of UBC Finds since October 2025, a campus utility map using Supabase realtime sync."],
    [["ninjas", "teach", "instructor", "taught", "students", "programming"],
      "Anant was a Programming Instructor at Code Ninjas (May to August 2025) and taught 120+ students."],
    [["fpga", "systemverilog", "accelerator", "mac", "pipeline", "inference", "neural", "waveform", "arm", "hardware"],
      "Anant built a pipelined SystemVerilog MAC accelerator on FPGA running 3,000 inferences per second, 300% faster than ARM-only. He found a pipeline-drain bug through waveform analysis."],
    [["mi300x", "migraphx", "fps", "rocm", "game", "jam", "itch"],
      "Anant measured 7,277 fps with MIGraphX FP16 on an AMD MI300X (batch 8). He has two top-5 game jam finishes."],
    [["skill", "tool", "language", "stack", "python", "c++", "java", "typescript", "react", "framework", "cloud", "sql", "docker", "pytorch"],
      "Anant's hardware skills: SystemVerilog, Verilog, Quartus, QuestaSim, ARM SoCs. Verification: self-checking testbenches, reference models, waveform debug, UVM fundamentals. Languages: Python, C/C++, C#, Java, JS/TS, SQL. GPU/ML: PyTorch, TensorFlow, CUDA/TensorRT, ROCm/MIGraphX, YOLO. Frameworks: Django, FastAPI, React, Next.js. Cloud: GCP, Docker, PostgreSQL, Supabase, Stripe, Playwright."],
    [["contact", "email", "reach", "github", "linkedin", "hire", "talk"],
      "Contact Anant at itsanantk@gmail.com, github.com/itsanantk, or linkedin.com/in/itsanantk."],
    [["aethershell", "aether", "shell", "terminal", "assistant", "site", "website", "portfolio"],
      "AetherShell is Anant's own personal side project, an AI shell assistant. It is not related to Agriprix or any employer. This terminal is a tribute build of it."]
  ];

  // No fact matched: chat casually, but never make claims about Anant.
  const CHAT_PROMPT =
    "You are AetherShell-lite, a friendly, slightly witty assistant living in a terminal on Anant Khanna's portfolio website. " +
    "Reply to casual conversation in ONE short, lowercase, casual sentence. " +
    "You know nothing about Anant beyond this site: if asked about him, say to type help. " +
    "Never state facts, numbers, names or dates about any person.";

  // Casual chat should contain no numbers and no proper nouns except our own names.
  const CHAT_CAPS = new Set(["i", "i'm", "i'll", "i've", "i'd", "aethershell", "aethershell-lite", "anant", "khanna"]);
  // Every name in FACTS (Agriprix, AMD, UBC, Stripe, ...), derived automatically
  // so it can never go stale: a word counts as a name if it has a capital that is
  // not just a sentence start. Matched case-insensitively, since the model writes
  // in lowercase. Our own names stay allowed.
  const FACT_NAMES = (() => {
    const names = new Set();
    for (const [, text] of FACTS) {
      for (const m of text.matchAll(/[A-Za-z0-9+#][A-Za-z0-9+#.'-]*/g)) {
        const w = m[0].replace(/[.'-]+$/, "");
        const sentenceStart = /(^|[.!?]\s+)$/.test(text.slice(0, m.index));
        if (/[A-Z]/.test(w.slice(1)) || (/^[A-Z]/.test(w) && !sentenceStart)) names.add(w.toLowerCase());
      }
    }
    ["anant", "khanna", "aethershell", "aethershell-lite", "i"].forEach(n => names.delete(n));
    return names;
  })();

  const chatSafe = text => {
    const t = String(text).trim();
    if (!t || t.length > 220 || /\d/.test(t)) return false;
    if ((t.toLowerCase().match(/[a-z0-9+#]+/g) || []).some(w => FACT_NAMES.has(w))) return false;
    const stripped = t.replace(/(^|[.!?]\s+)([A-Z])/g, (_, a, b) => a + b.toLowerCase());
    return !(stripped.match(/\b[A-Z][A-Za-z'-]*/g) || []).some(w => !CHAT_CAPS.has(w.toLowerCase()));
  };

  const OFF_TOPIC ="I only know about Anant's background — try <span class='term-cmd'>help</span>, or email itsanantk@gmail.com.";

  const words = s => String(s).toLowerCase().match(/[a-z0-9+#.]+/g) || [];

  // Pick the facts that best match the question; a short, focused prompt is
  // both much faster to process and far less likely to confuse a small model.
  // Short keywords must match a whole word; longer ones match as a prefix.
  const retrieve = question => {
    const qw = words(question);
    return FACTS
      .map(([keys, text], i) => ({
        i, text,
        score: keys.reduce((n, k) => n + (qw.some(w => k.length < 4 ? w === k : w.startsWith(k)) ? 1 : 0), 0)
      }))
      .filter(f => f.score > 0)
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, 3);
  };

  const buildSystem = chosen => INSTRUCTIONS + chosen.map(f => "- " + f.text).join("\n");

  // A 0.5B model sometimes keeps writing past the facts. Accept its answer only
  // if its numbers and capitalised names appear in the facts and most of its
  // content words are grounded in the facts or the question; otherwise the
  // caller shows the matching fact verbatim.
  const SAFE_CAPS = new Set(["anant", "he", "his", "the", "at", "in", "yes", "no", "i", "it", "a", "an", "and", "to", "for", "of", "on", "is", "was", "has", "also"]);
  const grounded = (answer, chosen, question) => {
    const source = (chosen.map(f => f.text).join(" ") + " " + question).toLowerCase();
    const sourceWords = new Set(words(source));
    const claims = (String(answer).match(/\d[\d,.]*|\b[A-Z][A-Za-z0-9+#]*/g) || [])
      .filter(t => !SAFE_CAPS.has(t.toLowerCase()));
    if (claims.some(t => !source.includes(t.toLowerCase().replace(/[.,]+$/, "")))) return false;
    const content = words(answer).filter(w => w.length > 3);
    if (!content.length) return false;
    const hits = content.filter(w => sourceWords.has(w) || [...sourceWords].some(s => s.length >= 4 && s.slice(0, 4) === w.slice(0, 4)));
    return hits.length / content.length >= 0.7;
  };

  const ai = {
    state: "off",        // off | idle | loading | ready | asleep | error
    progress: 0,
    ask: async () => { throw new Error("assistant not ready"); }
  };
  window.akAI = ai;

  const capable = async () => {
    if (!navigator.gpu) return false;
    const conn = navigator.connection;
    if (conn && (conn.saveData || conn.type === "cellular" || /(^|-)[23]g$/.test(conn.effectiveType || ""))) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
    if (window.matchMedia("(pointer: coarse)").matches) return false; // phones / tablets
    try {
      const adapter = await navigator.gpu.requestAdapter();
      // a software adapter would run the model on the CPU and crawl
      return !!adapter && !adapter.isFallbackAdapter && !(adapter.info && adapter.info.isFallbackAdapter);
    } catch (_) { return false; }
  };

  const FIRST_ASK_TIMEOUT_MS = 45000;
  const ASK_TIMEOUT_MS = 30000;
  let warm = false;
  let worker = null;
  let nextId = 1;
  const pending = new Map();

  // 3D scenes (hero3d / skills3d) pause while this is true: GPU init and
  // generation are the heavy moments, and they share one integrated GPU
  const setBusy = () => {
    window.akBusy = (ai.state === "loading" && ai.progress >= 99) || pending.size > 0;
  };

  // give the memory back after a few idle minutes; wake() reloads from cache
  const IDLE_UNLOAD_MS = 4 * 60 * 1000;
  let idleTimer = null;
  const touch = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (pending.size) { touch(); return; }
      if (worker) { worker.terminate(); worker = null; }
      ai.state = "asleep";
      setBusy();
    }, IDLE_UNLOAD_MS);
  };

  const fail = () => {
    ai.state = "error";
    clearTimeout(idleTimer);
    if (worker) { worker.terminate(); worker = null; }
    pending.forEach(p => p.resolve({ mode: "error", text: "that took too long — try a simpler question, or type help." }));
    pending.clear();
    setBusy();
  };

  const init = async () => {
    if (!(await capable())) return;
    ai.state = "idle"; // capable, but nothing downloads until someone goes near the terminal
    const begin = async () => {
      ai.state = "loading";
      try {
        worker = new Worker("js/ai-worker.js", { type: "module" });
      } catch (_) { ai.state = "error"; return; }
      worker.onerror = () => fail();
      worker.onmessage = ({ data }) => {
        if (data.type === "progress") { ai.progress = data.value; setBusy(); }
        else if (data.type === "ready") { ai.state = "ready"; ai.progress = 100; setBusy(); touch(); }
        else if (data.type === "error") fail();
        else if (data.type === "answer") {
          const p = pending.get(data.id);
          if (!p) return;
          pending.delete(data.id);
          clearTimeout(p.timer);
          warm = true;
          setBusy();
          touch();
          if (data.error) { p.resolve({ mode: "error", text: "the assistant hiccuped — try help" }); return; }
          const answer = (data.text || "").trim();
          if (!p.chosen.length) {
            p.resolve(chatSafe(answer)
              ? { mode: "chat", text: answer }
              : { mode: "offtopic", text: OFF_TOPIC, html: true });
            return;
          }
          p.resolve(answer && grounded(answer, p.chosen, p.question)
            ? { mode: "model", text: answer }
            : { mode: "fact", text: p.chosen[0].text });
        }
      };
      worker.postMessage({ type: "load" });
      ai.ask = question => {
        if (pending.size) return Promise.resolve({ mode: "busy", text: "one question at a time, please." });
        const chosen = retrieve(question);
        return new Promise(resolve => {
          const id = nextId++;
          // a stuck generation kills the worker so it can't keep eating the GPU
          const timer = setTimeout(fail, warm ? ASK_TIMEOUT_MS : FIRST_ASK_TIMEOUT_MS);
          pending.set(id, { resolve, timer, chosen, question });
          setBusy();
          worker.postMessage({
            type: "ask",
            id,
            messages: [
              { role: "system", content: chosen.length ? buildSystem(chosen) : CHAT_PROMPT },
              { role: "user", content: String(question).slice(0, 300) }
            ]
          });
        });
      };
    };
    ai.wake = () => {
      if (ai.state !== "asleep") return;
      ai.progress = 0;
      warm = false;
      begin();
    };
    ai.start = () => { if (ai.state === "idle") begin(); };

    // Lazy load: most visitors never touch the terminal, so only start the
    // download when one gets close to it (scroll near it, or hover/click the
    // launcher, or focus the input). Rules answer in the meantime.
    const arm = () => ai.start();
    const terminal = document.getElementById("terminal");
    if (terminal && "IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) arm();
      }, { rootMargin: "300px" }).observe(terminal);
    }
    const launcher = document.getElementById("termLauncher");
    ["pointerenter", "focus", "click"].forEach(ev => launcher && launcher.addEventListener(ev, arm, { once: true }));
    const input = document.getElementById("termInput");
    if (input) input.addEventListener("focus", arm, { once: true });
  };

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();
