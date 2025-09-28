// background.js — optimized layered visual effects system (trimmed features)
// Changes summary:
// - Parallax layer disabled (removed blue-ish balls per request).
// - Aurora and focus ripple remain disabled.
// - No auto-sparks wired to UI; sparks spawn via API only.
// - Performance: DPR capped, reduced particle/node budgets, frame-skip heavy layers, lower spawn rates.

(function(){
  'use strict';

  // Feature toggles — parallax/aurora and focus ripple disabled per user request.
  const CONFIG = {
    enableStarfield: true,
    enableParallax: false,      // DISABLED: removed blue-ish balls
    enableAurora: false,        // disabled
    enableConstellations: true,
    enableComets: true,
    enableSparks: true,
    enableFocusRipple: false    // disabled
  };

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // canvas elements
  const canvases = {
    bg: document.getElementById('bgCanvas'),
    parallax: document.getElementById('parallaxCanvas'),
    aurora: document.getElementById('auroraCanvas'),
    constellation: document.getElementById('constellationCanvas'),
    comet: document.getElementById('cometCanvas'),
    sparks: document.getElementById('sparksCanvas')
  };

  // ensure canvases exist
  Object.keys(canvases).forEach(k => {
    if(!canvases[k]){
      const c = document.createElement('canvas');
      c.id = (k === 'bg') ? 'bgCanvas' : k + 'Canvas';
      c.setAttribute('aria-hidden','true');
      document.body.insertBefore(c, document.body.firstChild);
      canvases[k] = c;
    }
  });

  // contexts (may be null on very old browsers)
  const ctx = {};
  for(const k of Object.keys(canvases)){
    try { ctx[k] = canvases[k].getContext('2d', { alpha: true }); } catch(e){ ctx[k] = null; }
  }

  // size & DPR clamp to control memory/canvas pixel count
  let W = 0, H = 0;
  // cap DPR to 1.5 to avoid huge canvases on high-DPI displays for perf
  function getDPR(){ return Math.min(1.5, window.devicePixelRatio || 1); }
  let DPR = getDPR();

  function resizeAll(){
    W = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    H = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    DPR = getDPR();
    Object.values(canvases).forEach(c => {
      c.width = Math.floor(W * DPR);
      c.height = Math.floor(H * DPR);
      c.style.width = W + 'px';
      c.style.height = H + 'px';
      const key = Object.keys(canvases).find(k => canvases[k] === c);
      if(ctx[key]) ctx[key].setTransform(DPR, 0, 0, DPR, 0, 0);
    });
    if(starfield && starfield.regenerate) starfield.regenerate();
    if(constellation && constellation.regenerate) constellation.regenerate();
  }

  window.addEventListener('resize', () => {
    if(resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeAll, 140);
  });
  let resizeTimer = null;

  // theme helper
  function isLightMode(){ return document.body.classList.contains('light'); }

  // Pause/resume handling
  let running = true;
  function pauseAll(){ running = false; stopAll(); }
  function resumeAll(){ if(!prefersReduced){ running = true; startAll(); } }
  document.addEventListener('visibilitychange', () => { if(document.hidden) pauseAll(); else resumeAll(); });
  window.addEventListener('blur', pauseAll);
  window.addEventListener('focus', resumeAll);

  // ---------- Starfield (optimized) ----------
  const starfield = (function(){
    if(!CONFIG.enableStarfield) return null;
    const C = ctx.bg;
    let stars = [];
    let raf = null;
    // lower density multiplier
    function suggestedCount(){
      const area = W * H;
      let base = Math.round(area / 16000); // increased area per star (fewer stars)
      let cap = 70;
      if(navigator.deviceMemory && navigator.deviceMemory >= 8) cap = 110;
      if(window.innerWidth < 600) cap = Math.min(cap, 36);
      if(prefersReduced) return Math.min(18, cap);
      return Math.max(10, Math.min(base, cap));
    }
    function regenerate(){
      stars = [];
      const n = suggestedCount();
      for(let i=0;i<n;i++){
        stars.push({
          x: Math.random()*W,
          y: Math.random()*H,
          r: Math.max(0.5, Math.random()*1.8),
          vx: (Math.random()-0.5)*0.14,
          vy: (Math.random()-0.5)*0.08,
          tw: Math.random()*Math.PI*2,
          twSpd: 0.001 + Math.random()*0.006
        });
      }
    }
    function draw(){
      if(!C) return;
      C.clearRect(0,0,W,H);
      const col = isLightMode() ? '30,40,60' : '255,255,255';
      for(const s of stars){
        s.x += s.vx;
        s.y += s.vy;
        s.tw += s.twSpd;
        if(s.x < -8) s.x = W + 8;
        if(s.x > W + 8) s.x = -8;
        if(s.y < -8) s.y = H + 8;
        if(s.y > H + 8) s.y = -8;
        const tw = Math.sin(s.tw)*0.35 + 0.65;
        C.beginPath();
        C.fillStyle = `rgba(${col},${(0.34 + tw*0.66).toFixed(3)})`;
        C.arc(s.x, s.y, s.r, 0, Math.PI*2);
        C.fill();
      }
    }
    function loop(){
      if(!running){ raf = null; return; }
      draw();
      raf = requestAnimationFrame(loop);
    }
    return {
      regenerate,
      start: function(){ if(prefersReduced){ regenerate(); draw(); return; } regenerate(); if(!raf) raf = requestAnimationFrame(loop); },
      stop: function(){ if(raf){ cancelAnimationFrame(raf); raf=null; } },
      ctx: C
    };
  })();

  // ---------- Parallax disabled (no blue-ish balls) ----------
  const parallax = null; // disabled per CONFIG.enableParallax = false

  // ---------- Aurora disabled (per user) ----------
  const aurora = null; // intentionally disabled for perf

  // ---------- Constellations (cheaper) ----------
  const constellation = (function(){
    if(!CONFIG.enableConstellations) return null;
    const C = ctx.constellation;
    let nodes = [];
    let raf = null;
    let showForm = false;
    let targetShape = [];
    // reduced node counts
    function suggestedNodes(){
      const area = W * H;
      let n = Math.round(area / 220000); // fewer nodes
      n = Math.max(6, Math.min(n, 20));
      if(prefersReduced) n = Math.min(n, 8);
      return n;
    }
    function regenerate(){
      nodes = [];
      const n = suggestedNodes();
      for(let i=0;i<n;i++){
        nodes.push({
          x: Math.random()*W,
          y: Math.random()*H,
          vx: (Math.random()-0.5)*0.4,
          vy: (Math.random()-0.5)*0.3,
          size: 1 + Math.random()*1.6,
          phase: Math.random()*Math.PI*2
        });
      }
    }
    // frame-skip to reduce connection calculations
    let frameCounter = 0;
    function draw(){
      if(!C) return;
      C.clearRect(0,0,W,H);
      const col = isLightMode() ? '16,40,72' : '170,195,255';
      // connections (only every 2 frames)
      const maxD = Math.min(130, Math.max(70, Math.min(W,H) * 0.10));
      const maxD2 = maxD*maxD;
      if((frameCounter & 1) === 0){
        for(let i=0;i<nodes.length;i++){
          const a = nodes[i];
          for(let j=i+1;j<nodes.length;j++){
            const b = nodes[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx*dx + dy*dy;
            if(d2 < maxD2){
              const t = 1 - (d2 / maxD2);
              C.strokeStyle = `rgba(${col},${(0.05 + 0.25*t).toFixed(3)})`;
              C.lineWidth = 0.8;
              C.beginPath();
              C.moveTo(a.x, a.y);
              C.lineTo(b.x, b.y);
              C.stroke();
            }
          }
        }
      }
      // nodes
      for(const n of nodes){
        const a = 0.6 + Math.sin(n.phase) * 0.35;
        C.beginPath();
        C.fillStyle = `rgba(${col},${a.toFixed(3)})`;
        C.arc(n.x, n.y, n.size, 0, Math.PI*2);
        C.fill();
      }
      frameCounter++;
    }

    function step(){
      for(const n of nodes){
        if(showForm && targetShape.length){
          const idx = nodes.indexOf(n) % targetShape.length;
          const tx = targetShape[idx].x;
          const ty = targetShape[idx].y;
          n.x += (tx - n.x) * 0.06;
          n.y += (ty - n.y) * 0.06;
        } else {
          n.x += n.vx;
          n.y += n.vy;
          n.phase += 0.018;
        }
        if(n.x < -8) n.x = W + 8;
        if(n.x > W + 8) n.x = -8;
        if(n.y < -8) n.y = H + 8;
        if(n.y > H + 8) n.y = -8;
      }
    }

    function loop(){
      if(!running){ raf = null; return; }
      step();
      draw();
      raf = requestAnimationFrame(loop);
    }

    function formShape(points, normalized = true, duration = 1400){
      if(!points || !points.length){ targetShape = []; showForm = false; return; }
      if(normalized) targetShape = points.map(p => ({ x: p.x * W, y: p.y * H }));
      else targetShape = points.map(p => ({ x: p.x, y: p.y }));
      showForm = true;
      setTimeout(()=>{ showForm = false; }, duration);
    }

    return {
      regenerate,
      start: function(){ regenerate(); if(!raf) raf = requestAnimationFrame(loop); },
      stop: function(){ if(raf){ cancelAnimationFrame(raf); raf = null; } },
      formShape,
      ctx: C
    };
  })();

  // ---------- Comet manager (rarer spawns) ----------
  const cometManager = (function(){
    if(!CONFIG.enableComets) return null;
    const C = ctx.comet;
    const comets = [];
    let raf = null;
    // much lower spawn frequency for perf
    const spawnRate = 0.006; // chance per frame
    function spawn(){
      const fromLeft = Math.random() < 0.6;
      const sx = fromLeft ? -30 : Math.random()*W;
      const sy = fromLeft ? Math.random()*H*0.6 : -30;
      const tx = W + 40;
      const ty = H * (0.25 + Math.random()*0.5);
      const speed = 0.9 + Math.random()*1.2;
      const angle = Math.atan2(ty - sy, tx - sx);
      comets.push({
        x: sx, y: sy, vx: Math.cos(angle)*speed*5, vy: Math.sin(angle)*speed*5,
        life: 0, maxLife: 60 + Math.random()*60,
        thickness: 1 + Math.random()*1.6
      });
    }
    function draw(){
      if(!C) return;
      C.clearRect(0,0,W,H);
      for(let i=comets.length-1;i>=0;i--){
        const c = comets[i];
        c.x += c.vx;
        c.y += c.vy;
        c.life++;
        const t = 1 - (c.life / c.maxLife);
        const alpha = Math.max(0, t);
        C.beginPath();
        const grad = C.createLinearGradient(c.x - c.vx*6, c.y - c.vy*6, c.x, c.y);
        const hue = isLightMode() ? '220,160,80' : '255,240,200';
        grad.addColorStop(0, `rgba(${hue},${(alpha*0.0).toFixed(3)})`);
        grad.addColorStop(0.6, `rgba(${hue},${(alpha*0.14).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${hue},${(alpha*0.85).toFixed(3)})`);
        C.strokeStyle = grad;
        C.lineWidth = c.thickness*2.2;
        C.beginPath();
        C.moveTo(c.x - c.vx*5, c.y - c.vy*5);
        C.lineTo(c.x, c.y);
        C.stroke();
        if(c.life > c.maxLife) comets.splice(i,1);
      }
    }
    function loop(){
      if(!running){ raf = null; return; }
      draw();
      // rare spawns only
      if(Math.random() < spawnRate) spawn();
      raf = requestAnimationFrame(loop);
    }
    return {
      start: function(){ if(prefersReduced) return; if(!raf) raf = requestAnimationFrame(loop); },
      stop: function(){ if(raf){ cancelAnimationFrame(raf); raf = null; } }
    };
  })();

  // ---------- Sparks (manual only; no auto-wire) ----------
  const sparks = (function(){
    if(!CONFIG.enableSparks) return null;
    const C = ctx.sparks;
    const particles = [];
    let raf = null;
    // spawn only via API; removed any automatic UI binding
    function spawn(x,y,color,count=8){
      for(let i=0;i<count;i++){
        const ang = Math.random()*Math.PI*2;
        const speed = 0.6 + Math.random()*2.2;
        particles.push({
          x, y,
          vx: Math.cos(ang)*speed,
          vy: Math.sin(ang)*speed,
          life: 0,
          maxLife: 28 + Math.random()*20,
          color: color || (isLightMode() ? '6,90,160' : '255,210,140'),
          size: 1 + Math.random()*1.8
        });
      }
      if(!raf) raf = requestAnimationFrame(loop);
    }
    function draw(){
      if(!C) return;
      C.clearRect(0,0,W,H);
      for(let i=particles.length-1;i>=0;i--){
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life++;
        const alpha = Math.max(0, 1 - (p.life / p.maxLife));
        C.beginPath();
        C.fillStyle = `rgba(${p.color},${alpha.toFixed(3)})`;
        C.arc(p.x, p.y, p.size * (1 + (1-alpha)), 0, Math.PI*2);
        C.fill();
        if(p.life > p.maxLife) particles.splice(i,1);
      }
    }
    function loop(){
      if(!running){ if(raf){ cancelAnimationFrame(raf); raf=null; } return; }
      draw();
      if(particles.length === 0){ cancelAnimationFrame(raf); raf = null; return; }
      raf = requestAnimationFrame(loop);
    }
    return {
      spawn,
      spawnActivity: function(x,y){ spawn(x,y,isLightMode() ? '6,90,160' : '255,210,140', 10); }
    };
  })();

  // ---------- Removed: focus/keyboard ripple & click-triggered effects ----------
  // No code here — the ripple feature and click/spawn wiring were intentionally removed.
  // Sparks will only appear when window.__zpluginsEffects.spawnSparkAt / spawnActivity is called.

  // ---------- Start/Stop helpers ----------
  function startAll(){
    if(prefersReduced) return;
    if(starfield && starfield.start) starfield.start();
    // parallax disabled
    // aurora disabled
    if(constellation && constellation.start) constellation.start();
    if(cometManager && cometManager.start) cometManager.start();
    // sparks are on-demand
  }
  function stopAll(){
    if(starfield && starfield.stop) starfield.stop();
    if(constellation && constellation.stop) constellation.stop();
    if(cometManager && cometManager.stop) cometManager.stop();
  }

  // initial sizing and start
  resizeAll();
  if(!prefersReduced) startAll();

  // Public API for manual triggers (no auto hooks)
  window.__zpluginsEffects = window.__zpluginsEffects || {};
  window.__zpluginsEffects.pause = pauseAll;
  window.__zpluginsEffects.resume = resumeAll;
  window.__zpluginsEffects.resize = resizeAll;
  window.__zpluginsEffects.formConstellation = function(points, normalized){ if(constellation && constellation.formShape) constellation.formShape(points, normalized); };
  window.__zpluginsEffects.spawnSparkAt = function(x,y){ if(sparks && sparks.spawn) sparks.spawn(x,y); };
  window.__zpluginsEffects.spawnActivity = function(x,y){ if(sparks && sparks.spawnActivity) sparks.spawnActivity(x,y); };

  // Do not auto-bind to UI elements (no automatic click/hover spawns)
  console.info('zPlugins effects initialized (parallax/aurora disabled, ripples/spawn-on-click removed). API available at window.__zpluginsEffects');

})();