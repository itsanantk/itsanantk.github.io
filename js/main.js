/* ============================================================
   Anant Khanna — Portfolio interactions
   Vanilla JS. Everything degrades gracefully and respects
   prefers-reduced-motion. The 3D figure viewport lives in
   hero3d.js and is driven from here via the "ak:shape" event.
   ============================================================ */
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- theme ---------- */
  const themeToggle = document.getElementById("themeToggle");
  const applyTheme = theme => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ak-theme", theme);
    themeToggle.textContent = theme === "dark" ? "☀" : "☾";
    themeToggle.setAttribute("aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    window.dispatchEvent(new CustomEvent("ak:theme"));
  };
  applyTheme(localStorage.getItem("ak-theme") || "light");
  themeToggle.addEventListener("click", () =>
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark")
  );

  /* ---------- nav: scrolled state ---------- */
  const nav = document.getElementById("nav");
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 24);
  }, { passive: true });

  /* ---------- mobile menu ---------- */
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  });
  links.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    })
  );

  /* ---------- figure viewport: cycle shapes + captions ---------- */
  const figures = [
    { shape: "stack", id: "FIG. A", name: "Order & pricing systems", ctx: "Software Engineer — Agriprix" },
    { shape: "atom", id: "FIG. B", name: "Computer engineering", ctx: "BASc — UBC, Dean's List" },
    { shape: "drone", id: "FIG. C", name: "Autonomous vision", ctx: "ML Lead — UBC UAS" },
    { shape: "chip", id: "FIG. D", name: "Neural-net accelerator", ctx: "Verilog — DE1-SoC FPGA" },
    { shape: "pin", id: "FIG. E", name: "Live campus map", ctx: "Co-founder — UBC Finds" },
    { shape: "gamepad", id: "FIG. F", name: "Games", ctx: "2× top-5 game jams" }
  ];
  const viewport = document.getElementById("figViewport");
  const caption = document.getElementById("figCaption");
  const figId = document.getElementById("figId");
  const figName = document.getElementById("figName");
  const figCtx = document.getElementById("figCtx");
  if (viewport && !reducedMotion) {
    let idx = 0, cycleTimer;
    const show = i => {
      idx = i % figures.length;
      const f = figures[idx];
      window.dispatchEvent(new CustomEvent("ak:shape", { detail: { shape: f.shape } }));
      caption.classList.add("fading");
      setTimeout(() => {
        figId.textContent = f.id;
        figName.textContent = f.name;
        figCtx.textContent = f.ctx;
        caption.classList.remove("fading");
      }, 300);
    };
    const schedule = () => {
      clearInterval(cycleTimer);
      cycleTimer = setInterval(() => show(idx + 1), 4600);
    };
    viewport.addEventListener("click", () => { show(idx + 1); schedule(); });
    viewport.setAttribute("title", "Click to advance");
    schedule();
  }

  /* ---------- reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });
  document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

  /* ---------- animated stat counters ---------- */
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      countObserver.unobserve(el);
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      if (reducedMotion) { el.textContent = target + suffix; return; }
      const dur = 1200, start = performance.now();
      const step = now => {
        const t = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(easeOut(t) * target) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll(".stat-num").forEach(el => countObserver.observe(el));

  /* ---------- scroll-spy ---------- */
  const navAnchors = Array.from(document.querySelectorAll(".nav-links a[data-section]"));
  const spyObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navAnchors.forEach(a =>
        a.classList.toggle("active", a.dataset.section === entry.target.id)
      );
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach(s => spyObserver.observe(s));

  /* ---------- terminal ---------- */
  const termBody = document.getElementById("termBody");
  const termInput = document.getElementById("termInput");
  if (termBody && termInput) {
    const termLine = termInput.closest(".term-line");
    const history = [];
    let histIdx = -1;
    const print = (html, cls = "term-out") => {
      const div = document.createElement("div");
      div.className = cls;
      div.innerHTML = html;
      termBody.insertBefore(div, termLine);
    };
    const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const goTo = id => {
      print(`cd /${id} — scrolling…`);
      document.getElementById(id).scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    };
    const sections = ["about", "experience", "projects", "skills", "contact"];
    const GITLOG = [
      ["a1f9c3e", "(HEAD -&gt; main) feat: WhatsApp AI assistant on Business Cloud API"],
      ["5d0e21b", "feat: Stripe authorize-and-capture checkout + idempotency keys"],
      ["c7b4a10", "fix: eliminate overselling races via row-level locking"],
      ["99ac0d4", "security: audit surfaces 67 vulns (5 critical) — all patched"],
      ["41f0aa2", "feat: hybrid intent router, automatic failover across 5 LLM providers"],
      ["2b8f5c1", "test: 15-case Playwright E2E suite, supplier → buyer journey"],
      ["7e3d901", "feat: campus utility map, Supabase realtime sync (UBC Finds)"],
      ["c04f882", "perf: TensorRT FP16 quantization, 50% less memory bandwidth (UBC UAS)"],
      ["918aa3f", "feat: real-time YOLOv11 detection @ 50km/h, 98% accuracy (UBC UAS)"],
      ["5a2e7b0", "feat: Verilog neural-net accelerator, 300% speedup (FPGA project)"],
      ["0c1d4e6", "chore: enrolled, Computer Engineering @ UBC"]
    ].map(([hash, msg]) => `<span class='term-cmd'>${hash}</span> ${msg}`).join("\n");
    const commands = {
      help: () => print(
        [
          "available commands:",
          "  <span class='term-cmd'>neofetch</span>      the fun one",
          "  <span class='term-cmd'>whoami</span>        who is this guy",
          "  <span class='term-cmd'>ls</span> [-la]      list sections",
          "  <span class='term-cmd'>cd</span> &lt;section&gt;  go there — cd projects",
          "  <span class='term-cmd'>experience</span>    the work history",
          "  <span class='term-cmd'>skills</span>        print the toolbox",
          "  <span class='term-cmd'>stats</span>         the numbers behind the résumé",
          "  <span class='term-cmd'>git log</span>       career, as commits",
          "  <span class='term-cmd'>resume</span>        open the résumé (pdf)",
          "  <span class='term-cmd'>contact</span>       email + socials",
          "  <span class='term-cmd'>theme</span> &lt;light|dark&gt;",
          "  <span class='term-cmd'>clear</span>         wipe the screen",
          "  <span class='term-cmd'>sudo hire-anant</span>",
          "…plus pwd, echo, man, history, date, uptime. tab-completes, too."
        ].join("\n")
      ),
      whoami: () => print(
        "Anant Khanna — Software Engineer @ Agriprix · Computer Engineering @ UBC.\n" +
        "Builds intelligent systems from silicon up: FPGA gates → neural nets → full-stack apps."
      ),
      ls: () => print("about/   experience/   projects/   skills/   contact/"),
      "ls -la": () => print(
        "total 6\n" +
        "drwxr-xr-x  2 anant eng   4096 about/\n" +
        "drwxr-xr-x  4 anant eng   4096 experience/\n" +
        "drwxr-xr-x  6 anant eng   4096 projects/\n" +
        "drwxr-xr-x  4 anant eng   4096 skills/\n" +
        "drwxr-xr-x  2 anant eng   4096 contact/\n" +
        "-rw-r--r--  1 anant eng   129k Anant_Khanna_Resume.pdf"
      ),
      "ls -l": () => commands["ls -la"](),
      "ls -a": () => commands["ls -la"](),
      ll: () => commands["ls -la"](),
      pwd: () => print("/home/anant/portfolio"),
      date: () => print(new Date().toString()),
      cd: () => {
        print("cd ~ — back to top");
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      },
      history: () => print(
        history.length > 1
          ? history.slice(1).reverse().map((h, i) => `  ${i + 1}  ${esc(h)}`).join("\n")
          : "history: empty (you just got here)"
      ),
      resume: () => {
        print("opening Anant_Khanna_Resume.pdf…");
        window.open("Anant_Khanna_Resume.pdf", "_blank", "noopener");
      },
      "cat resume": () => commands.resume(),
      "open resume": () => commands.resume(),
      contact: () => print(
        "email:    <a href='mailto:itsanantk@gmail.com'>itsanantk@gmail.com</a>\n" +
        "github:   <a href='https://github.com/itsanantk' target='_blank' rel='noopener'>github.com/itsanantk</a>\n" +
        "linkedin: <a href='https://www.linkedin.com/in/itsanantk/' target='_blank' rel='noopener'>linkedin.com/in/itsanantk</a>\n" +
        "itch.io:  <a href='https://antgenix.itch.io/' target='_blank' rel='noopener'>antgenix.itch.io</a>"
      ),
      skills: () => print(
        "hardware:   Verilog, SystemVerilog, ARM SoCs\n" +
        "languages:  Python, C/C++, C#, Java, JS/TS, SQL\n" +
        "frameworks: Django, FastAPI, React, Next.js, PyTorch, TensorFlow, TensorRT\n" +
        "cloud:      GCP, Docker, PostgreSQL, Supabase, Stripe, Playwright"
      ),
      experience: () => {
        const rows = [
          ["Software Engineer", "Agriprix", "May 2026 — Present"],
          ["ML SWE Team Lead", "UBC UAS", "Sept 2024 — Present"],
          ["Co-founder & Lead Dev", "UBC Finds", "Oct 2025 — Present"],
          ["Programming Instructor", "Code Ninjas", "May 2025 — Aug 2025"]
        ];
        const w1 = Math.max(...rows.map(r => r[0].length)) + 2;
        const w2 = Math.max(...rows.map(r => r[1].length)) + 2;
        print(
          rows.map(r => esc(r[0].padEnd(w1)) + esc(r[1].padEnd(w2)) + esc(r[2])).join("\n") +
          "\n\ntype <span class='term-cmd'>cd experience</span> for the full write-up"
        );
      },
      stats: () => print(
        "98%    detection accuracy — UBC UAS vision pipeline\n" +
        "300%   speedup — FPGA neural-net accelerator\n" +
        "120+   students taught to code — Code Ninjas\n" +
        "2×     top-5 game jam finishes\n" +
        "67     vulnerabilities patched in one security audit (5 critical)\n" +
        "5      LLM providers, automatic failover across all of them"
      ),
      uptime: () => print("up since 2022 · shipping continuously · 0 known regressions (today)"),
      neofetch: () => print(
        [
          "   ╔══════════════╗",
          "   ║   &lt;AK/&gt;      ║",
          "   ╚══════════════╝",
          "",
          "<span class='term-cmd'>anant</span>@<span class='term-cmd'>portfolio</span>",
          "──────────────────",
          "OS:         Human, v24 (Vancouver, BC)",
          "Role:       Software Engineer @ Agriprix",
          "Education:  BASc Computer Engineering — UBC (Dean's List)",
          "Also:       ML Lead @ UBC UAS · Co-founder @ UBC Finds",
          "Stack:      Python · TypeScript · C++ · Verilog",
          "Shell:      AetherShell-lite (tribute build)",
          "Status:     <span class='term-cmd'>open to opportunities</span>"
        ].join("\n")
      ),
      fetch: () => commands.neofetch(),
      "git log": () => print(GITLOG),
      "git log --oneline": () => print(GITLOG),
      "git blame": () => print("Anant Khanna 100.0% — (it's all his fault, in the best way)"),
      "git status": () => print(
        "On branch main\nnothing to commit, working tree clean\n(this portfolio ships fast)"
      ),
      "sudo rm -rf /": () => print("nice try. this is a read-only filesystem (and my résumé)."),
      "curl resume": () => commands.resume(),
      "wget resume": () => commands.resume(),
      theme: () => print(
        "usage: theme &lt;light|dark&gt; — current: " +
        (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light")
      ),
      "theme dark": () => { applyTheme("dark"); print("theme → dark"); },
      "theme light": () => { applyTheme("light"); print("theme → light"); },
      clear: () => {
        termBody.querySelectorAll(".term-out, .term-echo").forEach(el => el.remove());
      },
      "sudo hire-anant": () => {
        print("[sudo] permission granted ✔");
        const line = document.createElement("div");
        line.className = "term-out";
        line.textContent = "excellent choice. drafting offer letter…";
        termBody.insertBefore(line, termLine);
        termBody.scrollTop = termBody.scrollHeight;
        setTimeout(() => {
          line.innerHTML =
            "excellent choice. drafting offer letter… just kidding. " +
            "<a href='mailto:itsanantk@gmail.com'>email me</a> and let's talk.";
          termBody.scrollTop = termBody.scrollHeight;
        }, 1400);
      },
      "hire-anant": () => print(
        "hire-anant: permission denied (are you root?) — try <span class='term-cmd'>sudo hire-anant</span>"
      ),
      vim: () => print("no exit route found. you'd be stuck here forever — try <span class='term-cmd'>help</span> instead."),
      exit: () => print("nice try. this shell is load-bearing."),
      echo: () => print("usage: echo &lt;text&gt; — try <span class='term-cmd'>echo hello world</span>"),
      man: () => print("usage: man &lt;command&gt; — try <span class='term-cmd'>man help</span>")
    };
    const MANUAL = {
      help: "help — list available commands",
      whoami: "whoami — print who's running this shell",
      ls: "ls [-la] — list portfolio sections",
      cd: "cd &lt;section&gt; — jump to a section (about, experience, projects, skills, contact)",
      skills: "skills — print the toolbox",
      resume: "resume — open the résumé (pdf) in a new tab",
      contact: "contact — print email + socials",
      clear: "clear — wipe the terminal output",
      echo: "echo &lt;text&gt; — print text back",
      history: "history — list commands run this session",
      pwd: "pwd — print working directory",
      date: "date — print the current date and time",
      man: "man &lt;command&gt; — show what a command does",
      "hire-anant": "hire-anant — requires elevated privileges, see: sudo hire-anant",
      "sudo hire-anant": "sudo hire-anant — the fastest path to a yes. try it and see.",
      experience: "experience — print the work history as a table",
      stats: "stats — the numbers behind the résumé",
      uptime: "uptime — how long this has been running",
      neofetch: "neofetch — system info, portfolio edition",
      fetch: "fetch — alias for neofetch",
      git: "git log | git blame | git status — career, git-flavored",
      theme: "theme &lt;light|dark&gt; — switch the site's theme"
    };
    const run = raw => {
      const cmd = raw.trim();
      print(`<span class="term-prompt">$</span>${esc(cmd)}`, "term-echo");
      if (!cmd) return;
      history.unshift(cmd);
      histIdx = -1;
      const key = cmd.toLowerCase().replace(/\s+/g, " ");
      const handler = commands[key];
      if (handler) { handler(); return; }
      if (key.startsWith("echo ")) { print(esc(cmd.trim().slice(5))); return; }
      if (key.startsWith("man ")) {
        const topic = key.slice(4).trim();
        print(MANUAL[topic]
          ? `<span class='term-cmd'>${esc(topic)}</span>(1)\n    ${MANUAL[topic]}`
          : `no manual entry for ${esc(topic)} — try <span class='term-cmd'>man help</span>`);
        return;
      }
      if (key.startsWith("sudo ")) {
        print("sudo: refusing to run: only <span class='term-cmd'>sudo hire-anant</span> is on the whitelist.");
        return;
      }
      /* navigation — "cd about", "cd /about", "about/", "/about",
         "open projects", "cd ..", "cd ~" all work */
      const m = key.match(/^(?:cd|open|goto) \/?([a-z~.]+)\/?$|^\/?([a-z]+)\/?$/);
      const target = m ? (m[1] || m[2]) : null;
      if (target) {
        if (["~", "..", "home", "top"].includes(target)) {
          print("cd / — back to top");
          window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
          return;
        }
        if (sections.includes(target)) { goTo(target); return; }
        if (/^(cd|open|goto) /.test(key)) { print(`cd: no such directory: ${esc(target)}`); return; }
      }
      print(`command not found: ${esc(cmd)} — try <span class='term-cmd'>help</span>`);
    };
    const COMPLETIONS = [
      "help", "whoami", "ls", "cd", "experience", "skills", "stats", "resume",
      "contact", "clear", "pwd", "date", "history", "man", "echo", "neofetch",
      "fetch", "git", "theme", "uptime", "sudo", "vim", "exit"
    ];
    termInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        run(termInput.value);
        termInput.value = "";
        termBody.scrollTop = termBody.scrollHeight;
      } else if (e.key === "Tab") {
        e.preventDefault();
        const val = termInput.value.toLowerCase();
        if (!val) return;
        const matches = COMPLETIONS.filter(c => c.startsWith(val));
        if (matches.length === 1) {
          termInput.value = matches[0] + " ";
        } else if (matches.length > 1) {
          let prefix = matches[0];
          matches.slice(1).forEach(m => {
            while (!m.startsWith(prefix)) prefix = prefix.slice(0, -1);
          });
          if (prefix.length > val.length) termInput.value = prefix;
          else print(matches.join("   "));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (histIdx < history.length - 1) termInput.value = history[++histIdx] || "";
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (histIdx > 0) termInput.value = history[--histIdx];
        else { histIdx = -1; termInput.value = ""; }
      }
    });
    termBody.addEventListener("click", e => {
      if (!e.target.closest("a")) termInput.focus({ preventScroll: true });
    });

    /* ---------- floating launcher: pop the terminal up from anywhere ---------- */
    const terminalEl = document.getElementById("terminal");
    const launcher = document.getElementById("termLauncher");
    const floatClose = document.getElementById("termFloatClose");
    if (terminalEl && launcher) {
      const setFloating = on => {
        terminalEl.classList.toggle("terminal--floating", on);
        launcher.classList.toggle("is-open", on);
        launcher.setAttribute("aria-expanded", String(on));
        if (on) termInput.focus({ preventScroll: true });
      };
      launcher.addEventListener("click", () =>
        setFloating(!terminalEl.classList.contains("terminal--floating"))
      );
      floatClose?.addEventListener("click", () => setFloating(false));
      document.addEventListener("keydown", e => {
        if (e.key === "Escape" && terminalEl.classList.contains("terminal--floating")) setFloating(false);
      });

      /* ---------- command palette: ⌘K / Ctrl+K ---------- */
      const scrim = document.getElementById("paletteScrim");
      const paletteInput = document.getElementById("paletteInput");
      const paletteList = document.getElementById("paletteList");
      const paletteHint = document.getElementById("paletteHint");
      if (scrim && paletteInput && paletteList && paletteHint) {
        const runInTerminal = cmd => {
          setFloating(true);
          run(cmd);
          termBody.scrollTop = termBody.scrollHeight;
        };
        const items = [
          { label: "Go to About", hint: "section", run: () => goTo("about") },
          { label: "Go to Experience", hint: "section", run: () => goTo("experience") },
          { label: "Go to Projects", hint: "section", run: () => goTo("projects") },
          { label: "Go to Skills", hint: "section", run: () => goTo("skills") },
          { label: "Go to Contact", hint: "section", run: () => goTo("contact") },
          { label: "Open résumé (PDF)", hint: "resume", run: () => window.open("Anant_Khanna_Resume.pdf", "_blank", "noopener") },
          { label: "Email Anant", hint: "itsanantk@gmail.com", run: () => { location.href = "mailto:itsanantk@gmail.com"; } },
          { label: "Open GitHub", hint: "github.com/itsanantk", run: () => window.open("https://github.com/itsanantk", "_blank", "noopener") },
          { label: "Open LinkedIn", hint: "linkedin.com/in/itsanantk", run: () => window.open("https://www.linkedin.com/in/itsanantk/", "_blank", "noopener") },
          { label: "Open itch.io", hint: "antgenix.itch.io", run: () => window.open("https://antgenix.itch.io/", "_blank", "noopener") },
          {
            label: "Switch to dark mode", hint: "theme",
            showIf: () => document.documentElement.getAttribute("data-theme") !== "dark",
            run: () => applyTheme("dark")
          },
          {
            label: "Switch to light mode", hint: "theme",
            showIf: () => document.documentElement.getAttribute("data-theme") === "dark",
            run: () => applyTheme("light")
          },
          { label: "Open terminal", hint: "AetherShell-lite", run: () => setFloating(true) },
          { label: "Run: neofetch", hint: "terminal", run: () => runInTerminal("neofetch") },
          { label: "Run: git log", hint: "terminal", run: () => runInTerminal("git log") },
          { label: "Run: sudo hire-anant", hint: "terminal", run: () => runInTerminal("sudo hire-anant") }
        ];

        let visible = items;
        let activeIdx = 0;

        const renderList = () => {
          paletteList.innerHTML = "";
          if (!visible.length) {
            paletteList.innerHTML = "<li class='palette-empty'>no matches — try projects, resume, theme…</li>";
            return;
          }
          activeIdx = Math.min(activeIdx, visible.length - 1);
          visible.forEach((item, i) => {
            const li = document.createElement("li");
            li.className = "palette-item" + (i === activeIdx ? " active" : "");
            li.setAttribute("role", "option");
            li.innerHTML = `<span>${item.label}</span><span class="palette-item-hint">${item.hint || ""}</span>`;
            li.addEventListener("mouseenter", () => {
              activeIdx = i;
              paletteList.querySelectorAll(".palette-item").forEach((el, j) =>
                el.classList.toggle("active", j === i)
              );
            });
            li.addEventListener("click", () => { closePalette(); item.run(); });
            paletteList.appendChild(li);
          });
        };

        const filter = () => {
          const q = paletteInput.value.trim().toLowerCase();
          visible = items
            .filter(it => !it.showIf || it.showIf())
            .filter(it => !q || it.label.toLowerCase().includes(q) || (it.hint || "").toLowerCase().includes(q));
        };

        let lastFocused = null;
        const openPalette = () => {
          lastFocused = document.activeElement;
          scrim.hidden = false;
          document.body.style.overflow = "hidden";
          paletteInput.value = "";
          activeIdx = 0;
          filter();
          renderList();
          paletteInput.focus();
        };
        const closePalette = () => {
          scrim.hidden = true;
          document.body.style.overflow = "";
          if (lastFocused && lastFocused.focus) lastFocused.focus();
        };

        paletteHint.addEventListener("click", openPalette);
        scrim.addEventListener("click", e => { if (e.target === scrim) closePalette(); });
        paletteInput.addEventListener("input", () => { activeIdx = 0; filter(); renderList(); });
        paletteInput.addEventListener("keydown", e => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            activeIdx = Math.min(activeIdx + 1, visible.length - 1);
            renderList();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIdx = Math.max(activeIdx - 1, 0);
            renderList();
          } else if (e.key === "Enter") {
            e.preventDefault();
            const item = visible[activeIdx];
            if (item) { closePalette(); item.run(); }
          } else if (e.key === "Escape") {
            closePalette();
          }
        });
        document.addEventListener("keydown", e => {
          const mod = e.metaKey || e.ctrlKey;
          if (mod && e.key.toLowerCase() === "k") {
            e.preventDefault();
            if (scrim.hidden) openPalette(); else closePalette();
          }
        });
      }
    }
  }
})();
