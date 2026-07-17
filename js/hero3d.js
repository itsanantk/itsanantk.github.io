/* ============================================================
   Figure viewport — a stippled technical drawing in 3D.
   ~4000 ink points morph between the artifacts of the work:
   server stack, atom, drone, FPGA die, map pin, gamepad.
   Driven by main.js via the "ak:shape" event.
   ============================================================ */
import * as THREE from "three";

(() => {
  "use strict";

  const canvas = document.getElementById("hero3d");
  const viewport = document.getElementById("figViewport");
  if (!canvas || !viewport) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  } catch {
    canvas.hidden = true;
    return;
  }
  renderer.setClearColor(0x000000, 0);

  const N = innerWidth < 700 ? 2600 : 4000;

  /* ---------- helpers ---------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const gauss = s => (Math.random() + Math.random() + Math.random() - 1.5) * s;

  const alloc = () => new Float32Array(N * 3);
  const put = (arr, i, x, y, z) => { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; };

  /* ---------- shape generators (all fit ~[-1.3, 1.3]) ---------- */
  const shapes = {};

  shapes.chip = (() => {
    const a = alloc();
    for (let i = 0; i < N; i++) {
      const r = Math.random();
      if (r < 0.5) {
        // die face — gridded silicon
        const gx = Math.floor(rand(0, 12)) / 12 * 2 - 1;
        const gy = Math.floor(rand(0, 12)) / 12 * 2 - 1;
        put(a, i, gx + gauss(0.03), gy + gauss(0.03), 0.06 + gauss(0.015));
      } else if (r < 0.62) {
        // back face
        put(a, i, rand(-1, 1), rand(-1, 1), -0.06 + gauss(0.015));
      } else if (r < 0.76) {
        // raised inner core ridge
        const t = rand(0, 4);
        const e = Math.floor(t), f = t - e;
        const s = 0.52;
        const pts = [[-s, -s, s, -s], [s, -s, s, s], [s, s, -s, s], [-s, s, -s, -s]][e];
        put(a, i, pts[0] + (pts[2] - pts[0]) * f + gauss(0.01), pts[1] + (pts[3] - pts[1]) * f + gauss(0.01), 0.12);
      } else {
        // pins along 4 edges
        const edge = Math.floor(rand(0, 4));
        const p = (Math.floor(rand(0, 9)) / 8) * 1.7 - 0.85;
        const out = rand(1.02, 1.3);
        if (edge === 0) put(a, i, p, out, 0);
        else if (edge === 1) put(a, i, p, -out, 0);
        else if (edge === 2) put(a, i, out, p, 0);
        else put(a, i, -out, p, 0);
      }
    }
    return a;
  })();

  shapes.neural = (() => {
    const a = alloc();
    const xs = [-1.15, -0.4, 0.35, 1.1];
    const counts = [6, 9, 9, 5];
    const nodes = xs.map((x, li) =>
      Array.from({ length: counts[li] }, (_, k) => {
        const ang = (k / counts[li]) * Math.PI * 2 + li * 0.6;
        const rad = counts[li] > 6 ? 0.72 : 0.5;
        return [x, Math.cos(ang) * rad, Math.sin(ang) * rad];
      })
    );
    for (let i = 0; i < N; i++) {
      if (Math.random() < 0.34) {
        const l = Math.floor(rand(0, nodes.length));
        const n = nodes[l][Math.floor(rand(0, nodes[l].length))];
        put(a, i, n[0] + gauss(0.06), n[1] + gauss(0.06), n[2] + gauss(0.06));
      } else {
        const l = Math.floor(rand(0, nodes.length - 1));
        const n1 = nodes[l][Math.floor(rand(0, nodes[l].length))];
        const n2 = nodes[l + 1][Math.floor(rand(0, nodes[l + 1].length))];
        const t = Math.random();
        put(a, i,
          n1[0] + (n2[0] - n1[0]) * t + gauss(0.015),
          n1[1] + (n2[1] - n1[1]) * t + gauss(0.015),
          n1[2] + (n2[2] - n1[2]) * t + gauss(0.015));
      }
    }
    return a;
  })();

  shapes.drone = (() => {
    const a = alloc();
    const arms = [[0.85, 0.85], [0.85, -0.85], [-0.85, 0.85], [-0.85, -0.85]];
    for (let i = 0; i < N; i++) {
      const r = Math.random();
      if (r < 0.2) {
        put(a, i, rand(-0.28, 0.28), rand(-0.09, 0.09), rand(-0.28, 0.28));
      } else if (r < 0.4) {
        const arm = arms[Math.floor(rand(0, 4))];
        const t = Math.random();
        put(a, i, arm[0] * t + gauss(0.02), 0.02 + t * 0.06 + gauss(0.02), arm[1] * t + gauss(0.02));
      } else if (r < 0.9) {
        const arm = arms[Math.floor(rand(0, 4))];
        const ang = rand(0, Math.PI * 2);
        put(a, i, arm[0] + Math.cos(ang) * 0.42 + gauss(0.015), 0.12 + gauss(0.02), arm[1] + Math.sin(ang) * 0.42 + gauss(0.015));
      } else {
        put(a, i, gauss(0.06), -0.18 + gauss(0.05), 0.15 + gauss(0.06));
      }
    }
    return a;
  })();

  shapes.atom = (() => {
    const a = alloc();
    const tilts = [0, Math.PI / 3, -Math.PI / 3];
    for (let i = 0; i < N; i++) {
      if (Math.random() < 0.2) {
        put(a, i, gauss(0.14), gauss(0.14), gauss(0.14));
      } else {
        const k = Math.floor(rand(0, 3));
        const ang = rand(0, Math.PI * 2);
        const x = Math.cos(ang) * 1.05, y = Math.sin(ang) * 1.05;
        const tx = tilts[k];
        const y2 = y * Math.cos(tx), z2 = y * Math.sin(tx);
        const ty = k * (Math.PI / 3);
        const x3 = x * Math.cos(ty) + z2 * Math.sin(ty);
        const z3 = -x * Math.sin(ty) + z2 * Math.cos(ty);
        put(a, i, x3 + gauss(0.02), y2 + gauss(0.02), z3 + gauss(0.02));
      }
    }
    return a;
  })();

  shapes.pin = (() => {
    const a = alloc();
    for (let i = 0; i < N; i++) {
      const r = Math.random();
      if (r < 0.55) {
        // head — spherical shell
        const u = rand(0, Math.PI * 2), v = Math.acos(rand(-1, 1));
        const R = 0.62;
        put(a, i,
          R * Math.sin(v) * Math.cos(u) + gauss(0.015),
          0.38 + R * Math.cos(v) + gauss(0.015),
          R * Math.sin(v) * Math.sin(u) + gauss(0.015));
      } else if (r < 0.9) {
        // tapered stem to the tip
        const t = Math.random();
        const ang = rand(0, Math.PI * 2);
        const rad = t * 0.46;
        put(a, i, Math.cos(ang) * rad + gauss(0.01), -1.2 + t * 1.15 + gauss(0.01), Math.sin(ang) * rad + gauss(0.01));
      } else {
        // inner dot on the head
        put(a, i, gauss(0.07), 0.38 + gauss(0.07), 0.45 + gauss(0.05));
      }
    }
    return a;
  })();

  shapes.gamepad = (() => {
    const a = alloc();
    for (let i = 0; i < N; i++) {
      const r = Math.random();
      if (r < 0.32) {
        // grips — two ellipsoid shells
        const side = Math.random() < 0.5 ? -1 : 1;
        const u = rand(0, Math.PI * 2), v = Math.acos(rand(-1, 1));
        put(a, i,
          side * 0.72 + 0.34 * Math.sin(v) * Math.cos(u),
          -0.08 + 0.46 * Math.cos(v),
          0.28 * Math.sin(v) * Math.sin(u));
      } else if (r < 0.65) {
        // body bar
        put(a, i, rand(-0.75, 0.75), rand(-0.1, 0.3), rand(-0.2, 0.2));
      } else if (r < 0.82) {
        // d-pad cross
        const bar = Math.random() < 0.5;
        put(a, i,
          -0.42 + (bar ? rand(-0.17, 0.17) : gauss(0.035)),
          0.12 + (bar ? gauss(0.035) : rand(-0.17, 0.17)),
          0.24 + gauss(0.015));
      } else {
        // face buttons — 4 dots in a diamond
        const off = [[0, 0.12], [0, -0.12], [0.12, 0], [-0.12, 0]][Math.floor(rand(0, 4))];
        put(a, i, 0.44 + off[0] + gauss(0.03), 0.12 + off[1] + gauss(0.03), 0.24 + gauss(0.015));
      }
    }
    return a;
  })();

  shapes.stack = (() => {
    const a = alloc();
    for (let i = 0; i < N; i++) {
      if (Math.random() < 0.88) {
        // three server slabs
        const layer = Math.floor(rand(0, 3));
        const y = (layer - 1) * 0.55;
        const face = Math.random();
        let x = rand(-1.05, 1.05), z = rand(-0.6, 0.6), yy = y + rand(-0.16, 0.16);
        if (face < 0.4) yy = y + (Math.random() < 0.5 ? -0.16 : 0.16);
        else if (face < 0.7) z = Math.random() < 0.5 ? -0.6 : 0.6;
        else x = Math.random() < 0.5 ? -1.05 : 1.05;
        put(a, i, x, yy, z);
      } else {
        // status LEDs on the front edge
        const layer = Math.floor(rand(0, 3));
        const k = Math.floor(rand(0, 5));
        put(a, i, -0.85 + k * 0.14 + gauss(0.012), (layer - 1) * 0.55 + gauss(0.012), 0.62 + gauss(0.012));
      }
    }
    return a;
  })();

  /* ---------- geometry, colors, material ---------- */
  const positions = new Float32Array(shapes.stack);
  const fromPos = new Float32Array(shapes.stack);
  let targetPos = shapes.stack;

  // mostly ink dots with a scattering of blueprint blue — colors follow the theme
  const colors = new Float32Array(N * 3);
  const isBlue = new Uint8Array(N);
  for (let i = 0; i < N; i++) isBlue[i] = Math.random() < 0.16 ? 1 : 0;
  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const fillColors = () => {
    const cInk = new THREE.Color(cssVar("--fig-ink") || "#33291b");
    const cBlue = new THREE.Color(cssVar("--fig-blue") || "#2b4bb0");
    for (let i = 0; i < N; i++) {
      const c = isBlue[i] ? cBlue : cInk;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
  };
  fillColors();

  const stagger = new Float32Array(N);
  const wobPhase = new Float32Array(N);
  const wobFreq = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    stagger[i] = Math.random() * 0.35;
    wobPhase[i] = Math.random() * Math.PI * 2;
    wobFreq[i] = 0.5 + Math.random() * 1.0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const spriteCanvas = document.createElement("canvas");
  spriteCanvas.width = spriteCanvas.height = 32;
  const sctx = spriteCanvas.getContext("2d");
  sctx.fillStyle = "#fff";
  sctx.beginPath();
  sctx.arc(16, 16, 14, 0, Math.PI * 2);
  sctx.fill();
  const sprite = new THREE.CanvasTexture(spriteCanvas);

  const mat = new THREE.PointsMaterial({
    size: 0.026,
    map: sprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    sizeAttenuation: true
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
  camera.position.z = 3.9;

  const group = new THREE.Group();
  group.add(new THREE.Points(geo, mat));
  scene.add(group);
  group.rotation.x = 0.12;

  /* ---------- morph engine ---------- */
  let morphT = 1;
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const setShape = key => {
    const next = shapes[key];
    if (!next || next === targetPos) return;
    fromPos.set(positions);
    targetPos = next;
    morphT = 0;
  };
  window.addEventListener("ak:shape", e => setShape(e.detail.shape));

  /* ---------- sizing ---------- */
  const resize = () => {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 300;
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

  /* repaint dots when the theme flips */
  window.addEventListener("ak:theme", () => {
    fillColors();
    geo.attributes.color.needsUpdate = true;
    if (reducedMotion) renderer.render(scene, camera);
  });

  /* reduced motion: draw the first figure once, no animation */
  if (reducedMotion) {
    renderer.render(scene, camera);
    return;
  }

  /* ---------- interaction + loop ---------- */
  const parallax = { x: 0, y: 0 };
  viewport.addEventListener("pointermove", e => {
    const r = viewport.getBoundingClientRect();
    parallax.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    parallax.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }, { passive: true });
  viewport.addEventListener("pointerleave", () => { parallax.x = 0; parallax.y = 0; });

  let spin = 0, running = true, lastTime = performance.now();

  const frame = now => {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const time = now / 1000;

    if (morphT < 1) morphT = Math.min(morphT + dt / 1.15, 1);
    const S = 0.35;
    for (let i = 0; i < N; i++) {
      const raw = Math.min(Math.max(morphT * (1 + S) - stagger[i], 0), 1);
      const e = easeInOut(raw);
      const wob = Math.sin(time * wobFreq[i] + wobPhase[i]) * 0.011;
      const j = i * 3;
      positions[j] = fromPos[j] + (targetPos[j] - fromPos[j]) * e + wob;
      positions[j + 1] = fromPos[j + 1] + (targetPos[j + 1] - fromPos[j + 1]) * e + Math.cos(time * wobFreq[i] + wobPhase[i]) * 0.011;
      positions[j + 2] = fromPos[j + 2] + (targetPos[j + 2] - fromPos[j + 2]) * e + wob;
    }
    geo.attributes.position.needsUpdate = true;

    spin += dt * 0.22;
    group.rotation.y = spin + parallax.x * 0.22;
    group.rotation.x += ((0.12 + parallax.y * 0.16) - group.rotation.x) * 0.06;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };

  new IntersectionObserver(entries => {
    const visible = entries[0].isIntersecting;
    if (visible && !running) { running = true; lastTime = performance.now(); requestAnimationFrame(frame); }
    else if (!visible) running = false;
  }).observe(viewport);

  requestAnimationFrame(frame);
})();
