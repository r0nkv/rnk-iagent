(function () {
  function rgba(cache, hex, a) {
    let p = cache[hex];
    if (!p) {
      let h = String(hex).replace('#', '');
      if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      p = cache[hex] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + Math.max(0, Math.min(1, a)) + ')';
  }

  class HeroNetwork {
    constructor(canvas, cfg) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cfg = Object.assign({
        accent: '#5f8cff',
        accentAlt: '#9a6cff',
        density: 1,
        speed: 1,
        intensity: 0.45,
        glyphs: true
      }, cfg);
      this._colorCache = {};
      this.frame = this.frame.bind(this);
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    start() {
      this.t0 = performance.now();
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.canvas.parentNode);
      this.onVis = () => {
        if (document.hidden) {
          cancelAnimationFrame(this.raf);
          this.raf = null;
        } else if (!this.raf) {
          this.last = performance.now();
          this.raf = requestAnimationFrame(this.frame);
        }
      };
      document.addEventListener('visibilitychange', this.onVis);
      this.resize();
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }

    resize() {
      const c = this.canvas;
      const r = c.parentNode.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = Math.max(320, r.width);
      this.h = Math.max(320, r.height);
      c.width = Math.round(this.w * dpr);
      c.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.build();
    }

    build() {
      const { density, glyphs } = this.cfg;
      const W = this.w, H = this.h;
      const narrow = W < 720;
      const target = Math.round((W * H) / (narrow ? 24000 : 15000) * density);
      const n = Math.max(9, Math.min(narrow ? 34 : 90, target));

      const cols = Math.max(2, Math.round(Math.sqrt(n * (W / H))));
      const rows = Math.max(2, Math.ceil(n / cols));
      const cw = W / cols, ch = H / rows;
      const nodes = [];
      const cx = W / 2, cy = H / 2;
      const guard = Math.min(W, H) * (narrow ? 0.3 : 0.26);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = cw * (i + 0.5) + (Math.random() - 0.5) * cw * 0.62;
          const y = ch * (j + 0.5) + (Math.random() - 0.5) * ch * 0.62;
          if (Math.hypot(x - cx, y - cy) < guard) continue;
          nodes.push({
            bx: x, by: y, x, y,
            r: 1.3 + Math.random() * 1.5,
            ph: Math.random() * Math.PI * 2,
            sp: 0.05 + Math.random() * 0.06,
            amp: 5 + Math.random() * 11,
            glow: Math.random() * Math.PI * 2,
            kind: null
          });
        }
      }
      if (glyphs && nodes.length > 6) {
        const kinds = ['chat', 'gear', 'chart'];
        const picked = [];
        for (let k = 0; k < kinds.length; k++) {
          for (let tries = 0; tries < 24; tries++) {
            const idx = Math.floor(Math.random() * nodes.length);
            if (picked.includes(idx)) continue;
            const nd = nodes[idx];
            if (nd.x < 60 || nd.x > W - 60 || nd.y < 60 || nd.y > H - 60) continue;
            nd.kind = kinds[k]; nd.r = 9.5; picked.push(idx); break;
          }
        }
      }

      this.hub = { x: cx, y: cy, r: 4.6 };
      this.nodes = nodes;

      const maxD = Math.min(W, H) * (narrow ? 0.62 : 0.42);
      const seen = new Set();
      const edges = [];
      const push = (a, b) => {
        const key = a < b ? a + ':' + b : b + ':' + a;
        if (seen.has(key)) return;
        seen.add(key);
        edges.push({ a, b });
      };
      for (let i = 0; i < nodes.length; i++) {
        const d = nodes.map((m, j) => ({ j, d: Math.hypot(m.x - nodes[i].x, m.y - nodes[i].y) }))
          .filter((o) => o.j !== i && o.d < maxD).sort((p, q) => p.d - q.d);
        const kmax = Math.min(d.length, Math.random() < 0.45 ? 4 : 3);
        for (let k = 0; k < kmax; k++) push(i, d[k].j);
      }
      const near = nodes.map((m, j) => ({ j, d: Math.hypot(m.x - cx, m.y - cy) })).sort((p, q) => p.d - q.d);
      for (let k = 0; k < Math.min(7, near.length); k++) push(-1, near[k].j);
      this.edges = edges;

      this.pulses = [];
      const pc = Math.max(6, Math.round(edges.length * 0.26));
      for (let i = 0; i < pc; i++) this.pulses.push(this.spawn(true));
    }

    spawn(seed) {
      const e = Math.floor(Math.random() * this.edges.length);
      return {
        e,
        p: seed ? Math.random() : 0,
        v: 0.055 + Math.random() * 0.075,
        dir: Math.random() < 0.5 ? 1 : -1,
        wait: seed ? Math.random() * 3 : 0.6 + Math.random() * 5.5,
        alt: Math.random() < 0.4
      };
    }

    pos(i) {
      return i === -1 ? this.hub : this.nodes[i];
    }

    rgba(hex, a) {
      return rgba(this._colorCache, hex, a);
    }

    frame(now) {
      this.raf = requestAnimationFrame(this.frame);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      const c = this.cfg;
      const t = (now - this.t0) / 1000;
      const ctx = this.ctx;
      if (!ctx || !this.nodes) return;
      const step = this.reduced ? 0 : dt * c.speed;
      const k = c.intensity / 0.45;

      ctx.clearRect(0, 0, this.w, this.h);
      ctx.globalAlpha = 1;

      for (const nd of this.nodes) {
        nd.x = nd.bx + Math.sin(t * nd.sp * c.speed + nd.ph) * nd.amp;
        nd.y = nd.by + Math.cos(t * nd.sp * 0.83 * c.speed + nd.ph * 1.7) * nd.amp * 0.7;
      }
      const hp = 1 + Math.sin(t * 0.55 * c.speed) * 0.06;

      ctx.lineWidth = 1;
      for (const e of this.edges) {
        const A = this.pos(e.a), B = this.pos(e.b);
        const g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
        g.addColorStop(0, this.rgba(c.accent, 0.10 * k));
        g.addColorStop(0.5, this.rgba(c.accentAlt, 0.20 * k));
        g.addColorStop(1, this.rgba(c.accent, 0.10 * k));
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.pulses.length; i++) {
        const pu = this.pulses[i];
        if (pu.wait > 0) { pu.wait -= step; continue; }
        pu.p += pu.v * step;
        if (pu.p >= 1) { this.pulses[i] = this.spawn(false); continue; }
        const e = this.edges[pu.e];
        if (!e) { this.pulses[i] = this.spawn(false); continue; }
        const A = this.pos(pu.dir > 0 ? e.a : e.b), B = this.pos(pu.dir > 0 ? e.b : e.a);
        if (!A || !B) { this.pulses[i] = this.spawn(false); continue; }
        const fade = Math.sin(Math.min(1, pu.p) * Math.PI);
        const col = pu.alt ? c.accentAlt : c.accent;
        const px = A.x + (B.x - A.x) * pu.p, py = A.y + (B.y - A.y) * pu.p;
        const tp = Math.max(0, pu.p - 0.16);
        const tx = A.x + (B.x - A.x) * tp, ty = A.y + (B.y - A.y) * tp;
        const tg = ctx.createLinearGradient(tx, ty, px, py);
        tg.addColorStop(0, this.rgba(col, 0));
        tg.addColorStop(1, this.rgba(col, 0.55 * fade * k));
        ctx.strokeStyle = tg;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py); ctx.stroke();
        const rg = ctx.createRadialGradient(px, py, 0, px, py, 7);
        rg.addColorStop(0, this.rgba(col, 0.95 * fade * k));
        rg.addColorStop(1, this.rgba(col, 0));
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      for (const nd of this.nodes) {
        const b = 0.5 + Math.sin(t * 0.45 * c.speed + nd.glow) * 0.22;
        if (nd.kind) { this.drawFn(nd, b, c); continue; }
        ctx.fillStyle = this.rgba(c.accent, (0.35 + b * 0.4) * k);
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2); ctx.fill();
      }

      const hub = this.hub;
      ctx.strokeStyle = this.rgba(c.accentAlt, 0.22 * k);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hub.x, hub.y, 15 * hp, 0, Math.PI * 2); ctx.stroke();
      const ring = (t * 0.22 * c.speed) % 1;
      ctx.strokeStyle = this.rgba(c.accent, 0.3 * (1 - ring) * k);
      ctx.beginPath(); ctx.arc(hub.x, hub.y, 15 + ring * 70, 0, Math.PI * 2); ctx.stroke();
      const hg = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, 26);
      hg.addColorStop(0, this.rgba(c.accent, 0.7 * k));
      hg.addColorStop(1, this.rgba(c.accent, 0));
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(hub.x, hub.y, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.rgba('#dfe7ff', 0.85 * k);
      ctx.beginPath(); ctx.arc(hub.x, hub.y, hub.r * hp, 0, Math.PI * 2); ctx.fill();
    }

    drawFn(nd, b, c) {
      const ctx = this.ctx, k = c.intensity / 0.45;
      ctx.strokeStyle = this.rgba(c.accentAlt, (0.26 + b * 0.2) * k);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = this.rgba(c.accent, 0.55 * k);
      ctx.strokeStyle = this.rgba(c.accent, 0.6 * k);
      if (nd.kind === 'chat') {
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(nd.x + i * 3.2, nd.y, 1.05, 0, Math.PI * 2); ctx.fill(); }
      } else if (nd.kind === 'gear') {
        ctx.beginPath(); ctx.arc(nd.x, nd.y, 2.4, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + b;
          ctx.beginPath();
          ctx.moveTo(nd.x + Math.cos(a) * 3.4, nd.y + Math.sin(a) * 3.4);
          ctx.lineTo(nd.x + Math.cos(a) * 5, nd.y + Math.sin(a) * 5);
          ctx.stroke();
        }
      } else {
        const hs = [3, 5.5, 4.2];
        for (let i = 0; i < 3; i++) ctx.fillRect(nd.x - 4 + i * 3, nd.y + 2.6 - hs[i], 1.6, hs[i]);
      }
    }
  }

  function init() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    new HeroNetwork(canvas, {
      accent: '#5f8cff',
      accentAlt: '#9a6cff',
      intensity: 0.45,
      density: 1,
      speed: 1,
      glyphs: true
    }).start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
