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

  const SYSTEM =
    "You are the assistant inside Anant Khanna's portfolio terminal. " +
    "Answer in 1-3 short plain sentences, in third person, using ONLY the facts below. " +
    "If the answer is not in the facts, say you don't know and suggest emailing itsanantk@gmail.com. " +
    "Never invent employers, dates, numbers or projects.\n\nFACTS:\n" + [
      "Anant Khanna studies BASc Computer Engineering (co-op) at UBC, Vancouver, and is on the Dean's List.",
      "He signed on as a Design Verification Engineering intern at AMD (NBIO team, chiplet interconnect), May-Dec 2027.",
      "He was Founding Software Engineer at Agriprix (May-Aug 2026): WhatsApp AI assistant on the Business Cloud API, Stripe authorize-and-capture checkout, row-level locking to stop overselling, a security audit that patched 67 vulnerabilities (5 critical), a hybrid intent router with failover across 5 LLM providers, and a 15-case Playwright E2E suite.",
      "He is Machine Learning Team Lead at UBC UAS (since Sept 2024): real-time YOLOv11 detection at 50 km/h on a Jetson Orin Nano with 95% accuracy, TensorRT FP16 quantization cutting memory bandwidth 50%.",
      "He is Lead Developer of UBC Finds (since Oct 2025), a campus utility map using Supabase realtime sync.",
      "He was a Programming Instructor at Code Ninjas (May-Aug 2025) and taught 120+ students.",
      "FPGA project: a pipelined SystemVerilog MAC accelerator doing 3,000 inferences/sec, 300% faster than ARM-only; he found a pipeline-drain bug through waveform analysis.",
      "He measured 7,277 fps with MIGraphX FP16 on an AMD MI300X (batch 8). He has two top-5 game jam finishes.",
      "Hardware skills: SystemVerilog, Verilog, Quartus, QuestaSim, ARM SoCs. Verification: self-checking testbenches, reference models, waveform debug, UVM fundamentals.",
      "Languages: Python, C/C++, C#, Java, JS/TS, SQL. GPU/ML: PyTorch, TensorFlow, CUDA/TensorRT, ROCm/MIGraphX, YOLO. Frameworks: Django, FastAPI, React, Next.js. Cloud: GCP, Docker, PostgreSQL, Supabase, Stripe, Playwright.",
      "Contact: itsanantk@gmail.com, github.com/itsanantk, linkedin.com/in/itsanantk, itch.io antgenix.",
      "AetherShell is his AI shell assistant project; this terminal is a tribute build of it."
    ].join("\n");

  const ai = {
    state: "off",        // off | waiting | loading | ready | error
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

  const FIRST_ASK_TIMEOUT_MS = 60000; // first run compiles GPU shaders
  const ASK_TIMEOUT_MS = 25000;
  let warm = false;
  let worker = null;
  let nextId = 1;
  const pending = new Map();

  const fail = () => {
    ai.state = "error";
    if (worker) { worker.terminate(); worker = null; }
    pending.forEach(p => p.resolve("that took too long — try a simpler question, or type help."));
    pending.clear();
  };

  // Kill switch: the model produced gibberish and froze the page on the first
  // real-hardware test. Flip to true to re-enable preloading.
  const ENABLED = false;

  const start = async () => {
    if (!ENABLED || !(await capable())) return;
    ai.state = "waiting";
    const begin = async () => {
      ai.state = "loading";
      try {
        worker = new Worker("js/ai-worker.js", { type: "module" });
      } catch (_) { ai.state = "error"; return; }
      worker.onerror = () => fail();
      worker.onmessage = ({ data }) => {
        if (data.type === "progress") ai.progress = data.value;
        else if (data.type === "ready") { ai.state = "ready"; ai.progress = 100; }
        else if (data.type === "error") fail();
        else if (data.type === "answer") {
          const p = pending.get(data.id);
          if (!p) return;
          pending.delete(data.id);
          clearTimeout(p.timer);
          warm = true;
          p.resolve(data.error ? "the assistant hiccuped — try help" : (data.text || "no answer."));
        }
      };
      worker.postMessage({ type: "load" });
      ai.ask = question => {
        if (pending.size) return Promise.resolve("one question at a time, please.");
        return new Promise(resolve => {
          const id = nextId++;
          // a stuck generation kills the worker so it can't keep eating the GPU
          const timer = setTimeout(fail, warm ? ASK_TIMEOUT_MS : FIRST_ASK_TIMEOUT_MS);
          pending.set(id, { resolve, timer });
          worker.postMessage({
            type: "ask",
            id,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: String(question).slice(0, 300) }
            ]
          });
        });
      };
    };
    // wait for the page to settle so the portfolio itself loads first
    if ("requestIdleCallback" in window) requestIdleCallback(begin, { timeout: 4000 });
    else setTimeout(begin, 2500);
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
