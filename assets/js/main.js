/* ==========================================================================
   Nextendo Network - behaviour
   Canvas signal field, scroll reveal, nav, spotlight, magnetic CTA.
   All motion respects prefers-reduced-motion.
   ========================================================================== */
(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prefersFine = window.matchMedia("(pointer: fine)").matches;

  /* ---- Footer year ---- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ======================================================================
     Canvas signal field — a drifting node mesh with travelling pulses.
     This is the page's hero "imagery": the network, made visible.
     ====================================================================== */
  function createMesh(canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const density = opts.density || 9000;     // 1 node per N css px^2
    const linkDist = opts.linkDist || 132;
    const accentEvery = opts.accentEvery || 7; // 1 in N nodes uses brass
    let nodes = [];
    let w = 0, h = 0, dpr = 1, raf = 0;

    const css = getComputedStyle(document.documentElement);
    const primary = (css.getPropertyValue("--primary") || "oklch(0.73 0.115 222)").trim();
    const accent = (css.getPropertyValue("--accent") || "oklch(0.8 0.115 78)").trim();

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      const count = Math.max(6, Math.min(72, Math.round((w * h) / density)));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 1,
        accent: i % accentEvery === 0,
        // pulse travels 0->1 along a link to a chosen neighbour
        pulse: Math.random(),
        pulseSpeed: 0.0016 + Math.random() * 0.0022
      }));
    }

    function withAlpha(color, a) {
      // color is oklch(...) -> oklch(... / a)
      if (color.startsWith("oklch")) return color.replace(/\)\s*$/, ` / ${a})`);
      return color;
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      // move
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.x = Math.max(0, Math.min(w, n.x));
        n.y = Math.max(0, Math.min(h, n.y));
        n.pulse += n.pulseSpeed;
        if (n.pulse > 1) n.pulse -= 1;
      }

      // links
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > linkDist) continue;
          const t = 1 - d / linkDist;
          ctx.strokeStyle = withAlpha(primary, (0.16 * t).toFixed(3));
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          // travelling pulse dot on the closest links
          if (t > 0.55) {
            const p = a.pulse;
            const px = a.x + (b.x - a.x) * p;
            const py = a.y + (b.y - a.y) * p;
            ctx.fillStyle = withAlpha(a.accent ? accent : primary, (0.5 * t).toFixed(3));
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const col = n.accent ? accent : primary;
        ctx.fillStyle = withAlpha(col, "0.9");
        ctx.shadowColor = withAlpha(col, "0.6");
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function loop() { frame(); raf = requestAnimationFrame(loop); }

    resize();
    if (reduceMotion) {
      frame(); // single static frame
    } else {
      // pause when offscreen to save battery
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { if (!raf) loop(); }
          else { cancelAnimationFrame(raf); raf = 0; }
        }
      }, { threshold: 0 });
      io.observe(canvas);
    }

    let rt;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(resize, 180);
    });
  }

  const meshEl = document.getElementById("mesh");
  if (meshEl) createMesh(meshEl, { density: 8200, linkDist: 142 });
  const cardMeshEl = document.getElementById("cardmesh");
  if (cardMeshEl) createMesh(cardMeshEl, { density: 6500, linkDist: 110, accentEvery: 5 });

  /* ======================================================================
     Sticky nav state
     ====================================================================== */
  const nav = document.getElementById("nav");
  const onScroll = () => { if (nav) nav.classList.toggle("stuck", window.scrollY > 8); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ======================================================================
     Mobile menu
     ====================================================================== */
  const burger = document.getElementById("burger");
  const navlinks = document.getElementById("navlinks");
  if (burger && navlinks) {
    const toggle = (open) => {
      const next = open ?? !navlinks.classList.contains("open");
      navlinks.classList.toggle("open", next);
      burger.setAttribute("aria-expanded", String(next));
    };
    burger.addEventListener("click", () => toggle());
    navlinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => toggle(false)));
  }

  /* ======================================================================
     Scroll reveal (content is visible by default; this enhances)
     ====================================================================== */
  const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));
  const revealAll = () => revealEls.forEach((el) => el.classList.add("in"));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    const ro = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach((el) => ro.observe(el));
    // Safety net: never let content stay hidden if the observer never fires
    // (background tabs, headless renderers). Off-screen reveals are invisible
    // anyway, so this only guarantees nothing ships blank.
    window.addEventListener("load", () => setTimeout(revealAll, 1400));
  }

  /* ======================================================================
     Active nav link by section
     ====================================================================== */
  const linkFor = {};
  document.querySelectorAll('.nav__links a[href^="#"]').forEach((a) => {
    linkFor[a.getAttribute("href").slice(1)] = a;
  });
  const sections = Object.keys(linkFor)
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const a = linkFor[e.target.id];
        if (!a) return;
        if (e.isIntersecting) {
          Object.values(linkFor).forEach((x) => x.classList.remove("active"));
          a.classList.add("active");
        }
      });
    }, { threshold: 0.5, rootMargin: "-20% 0px -55% 0px" });
    sections.forEach((s) => so.observe(s));
  }

  /* ======================================================================
     Spotlight follow on feature cells (pointer only)
     ====================================================================== */
  if (prefersFine) {
    document.querySelectorAll("[data-spotlight]").forEach((cell) => {
      cell.addEventListener("pointermove", (ev) => {
        const r = cell.getBoundingClientRect();
        cell.style.setProperty("--mx", `${ev.clientX - r.left}px`);
        cell.style.setProperty("--my", `${ev.clientY - r.top}px`);
      });
    });
  }

  /* ======================================================================
     Subtle magnetic pull on the primary CTA (rAF, no React/state)
     ====================================================================== */
  if (prefersFine && !reduceMotion) {
    document.querySelectorAll(".btn--primary").forEach((btn) => {
      let tx = 0, ty = 0, cx = 0, cy = 0, frameId = 0;
      const render = () => {
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        btn.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) frameId = requestAnimationFrame(render);
        else frameId = 0;
      };
      const kick = () => { if (!frameId) frameId = requestAnimationFrame(render); };
      btn.addEventListener("pointermove", (ev) => {
        const r = btn.getBoundingClientRect();
        tx = (ev.clientX - (r.left + r.width / 2)) * 0.22;
        ty = (ev.clientY - (r.top + r.height / 2)) * 0.3;
        kick();
      });
      btn.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
    });
  }
})();
