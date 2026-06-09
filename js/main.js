/* ============================================================
   Anant Khanna — Portfolio interactions
   Vanilla JS. Everything degrades gracefully and respects
   prefers-reduced-motion.
   ============================================================ */
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- nav: scrolled state + hide on scroll down ---------- */
  const nav = document.getElementById("nav");
  let lastY = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 30);
    // hide nav while scrolling down past the hero, reveal on scroll up
    if (y > 400 && y > lastY + 4) nav.classList.add("hidden");
    else if (y < lastY - 4) nav.classList.remove("hidden");
    lastY = y;
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

  /* ---------- scroll progress bar ---------- */
  const progress = document.querySelector(".scroll-progress");
  window.addEventListener("scroll", () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  }, { passive: true });

  /* ---------- cursor glow ---------- */
  if (finePointer && !reducedMotion) {
    const glow = document.querySelector(".cursor-glow");
    window.addEventListener("pointermove", e => {
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
    }, { passive: true });
  }

  /* ---------- typewriter ---------- */
  const roles = [
    "Software Engineer @ Agriprix",
    "Computer Engineering @ UBC",
    "ML Team Lead @ UBC UAS",
    "FPGA & Embedded Developer",
    "Lead Developer @ UBC Finds",
    "Game Developer"
  ];
  const typedEl = document.getElementById("typed");
  if (reducedMotion) {
    typedEl.textContent = roles[0];
  } else {
    let roleIdx = 0, charIdx = 0, deleting = false;
    const tick = () => {
      const word = roles[roleIdx];
      charIdx += deleting ? -1 : 1;
      typedEl.textContent = word.slice(0, charIdx);
      let delay = deleting ? 32 : 62;
      if (!deleting && charIdx === word.length) { delay = 2100; deleting = true; }
      else if (deleting && charIdx === 0) {
        deleting = false;
        roleIdx = (roleIdx + 1) % roles.length;
        delay = 420;
      }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 700);
  }

  /* ---------- reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
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
      const dur = 1400, start = performance.now();
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

  /* ---------- 3D tilt cards ---------- */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll(".tilt").forEach(card => {
      let raf = null;
      card.addEventListener("pointermove", e => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            `perspective(800px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateY(-4px)`;
          raf = null;
        });
      });
      card.addEventListener("pointerleave", () => {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        card.style.transform = "";
        card.style.transition = "transform 0.45s ease";
        setTimeout(() => { card.style.transition = ""; }, 450);
      });
    });
  }

  /* ---------- particle constellation ---------- */
  const canvas = document.getElementById("particles");
  if (canvas && !reducedMotion) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, particles = [], running = true;
    const mouse = { x: null, y: null };
    const LINK_DIST = 130;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.floor((w * h) / 16000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6
      }));
    };

    const frame = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        // gentle drift toward the cursor
        if (mouse.x !== null) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 28000 && d2 > 400) {
            p.x += dx * 0.0024;
            p.y += dy * 0.0024;
          }
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(110, 231, 183, 0.55)";
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(52, 211, 153, ${(1 - dist / LINK_DIST) * 0.16})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    };

    canvas.parentElement.addEventListener("pointermove", e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }, { passive: true });
    canvas.parentElement.addEventListener("pointerleave", () => {
      mouse.x = null; mouse.y = null;
    });

    // pause when hero is offscreen to save battery
    new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(frame); }
      else if (!visible) running = false;
    }).observe(canvas.parentElement);

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    resize();
    requestAnimationFrame(frame);
  }
})();
