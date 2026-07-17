/* ============================================================
   FIG. G — the toolbox as a rotating constellation.
   Text sprites on a fibonacci sphere; drag with inertia.
   Colors follow the site theme (ink & blueprint blue).
   ============================================================ */
import * as THREE from "three";

(() => {
  "use strict";

  const canvas = document.getElementById("skillsGlobe");
  const viewport = document.getElementById("globeViewport");
  if (!canvas || !viewport) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // [name, tone] — 0 ink, 1 blue, 2 soft ink
  const SKILLS = [
    ["Python", 0], ["C++", 0], ["C", 0], ["C#", 0], ["Java", 0], ["TypeScript", 0], ["SQL", 0],
    ["PyTorch", 1], ["TensorFlow", 1], ["TensorRT", 1], ["YOLO", 1], ["OpenCV", 1],
    ["Django", 2], ["FastAPI", 2], ["React", 2], ["Next.js", 2], ["Celery", 2],
    ["Verilog", 1], ["SystemVerilog", 1], ["FPGA", 1], ["ARM", 1], ["RISC-V", 1], ["Embedded", 1],
    ["GCP", 2], ["Docker", 2], ["PostgreSQL", 2], ["Supabase", 2], ["Stripe", 2],
    ["Playwright", 2], ["Git", 0], ["Linux", 0], ["Unity", 1]
  ];

  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const tones = () => [
    cssVar("--fig-ink") || "#241f17",
    cssVar("--fig-core") || "#24418c",
    cssVar("--fig-soft") || "#5a5243"
  ];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  } catch {
    canvas.hidden = true;
    return;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
  camera.position.z = 4.1;

  const group = new THREE.Group();
  scene.add(group);

  /* ---------- text sprites on a fibonacci sphere ---------- */
  const FONT = "500 40px 'IBM Plex Mono', monospace";
  const drawLabel = (ctx, c, text, color) => {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, c.width / 2, 30);
  };
  const makeSprite = (text, tone, palette) => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    ctx.font = FONT;
    const w = Math.ceil(ctx.measureText(text).width) + 24;
    c.width = w; c.height = 56;
    drawLabel(ctx, c, text, palette[tone]);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 2;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.88, depthTest: false });
    const s = new THREE.Sprite(mat);
    const scale = 0.0031;
    s.scale.set(w * scale, 56 * scale, 1);
    s.userData = { canvas: c, ctx, text, tone };
    return s;
  };

  const R = 1.28;
  const GA = Math.PI * (3 - Math.sqrt(5)); // golden angle
  const palette = tones();
  SKILLS.forEach(([name, tone], i) => {
    const y = 1 - (i / (SKILLS.length - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = GA * i;
    const s = makeSprite(name, tone, palette);
    s.position.set(Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R);
    group.add(s);
  });

  // faint geodesic core so the sphere reads as an object
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(R * 0.72, 1),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(palette[1]), wireframe: true, transparent: true, opacity: 0.07 })
  );
  group.add(core);

  /* repaint labels + core when the theme flips */
  window.addEventListener("ak:theme", () => {
    const p = tones();
    group.children.forEach(o => {
      if (!o.isSprite) return;
      drawLabel(o.userData.ctx, o.userData.canvas, o.userData.text, p[o.userData.tone]);
      o.material.map.needsUpdate = true;
    });
    core.material.color.set(p[1]);
    if (reducedMotion || !running) renderer.render(scene, camera);
  });

  /* ---------- sizing ---------- */
  const resize = () => {
    const w = canvas.clientWidth || 320, h = canvas.clientHeight || 320;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); renderer.render(scene, camera); }, 150);
  });
  resize();

  /* reduced motion: one static frame, no spin or drag */
  let running = false;
  if (reducedMotion) {
    group.rotation.x = 0.15;
    renderer.render(scene, camera);
    return;
  }

  /* ---------- drag with inertia + hover ---------- */
  const IDLE = 0.0032;
  const clampX = () => {
    group.rotation.x = Math.max(-0.9, Math.min(0.9, group.rotation.x));
  };
  let vx = IDLE, vy = 0.001;
  let dragging = false, px = 0, py = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;

  const clearHover = () => {
    if (hovered) { hovered.material.opacity = 0.88; hovered.scale.multiplyScalar(1 / 1.16); hovered = null; }
  };

  canvas.addEventListener("pointerdown", e => {
    dragging = true;
    canvas.classList.add("dragging");
    px = e.clientX; py = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", e => {
    if (dragging) {
      vx = (e.clientX - px) * 0.0026;
      vy = (e.clientY - py) * 0.0026;
      group.rotation.y += vx;
      group.rotation.x += vy;
      clampX();               // clamp while dragging too — no snap on release
      px = e.clientX; py = e.clientY;
    } else {
      const r = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(group.children.filter(o => o.isSprite));
      const next = hits.length ? hits[0].object : null;
      if (hovered !== next) {
        clearHover();
        if (next) { next.material.opacity = 1; next.scale.multiplyScalar(1.16); hovered = next; }
      }
    }
  });
  const endDrag = () => { dragging = false; canvas.classList.remove("dragging"); };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", clearHover);

  /* ---------- loop (paused offscreen) ---------- */
  const frame = () => {
    if (!running) return;
    if (!dragging) {
      group.rotation.y += vx;
      group.rotation.x += vy;
      clampX();
      // spin settles into idle in whatever direction it was thrown
      const dir = vx < 0 ? -1 : 1;
      vx += (IDLE * dir - vx) * 0.015;
      vy += (0 - vy) * 0.03;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };

  new IntersectionObserver(entries => {
    const visible = entries[0].isIntersecting;
    if (visible && !running) { running = true; requestAnimationFrame(frame); }
    else if (!visible) running = false;
  }).observe(viewport);
})();
