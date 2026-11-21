/* Hidden Worlds: the playable page around the engine. */
(function () {
  'use strict';
  const HW = window.HW;
  const $ = id => document.getElementById(id);
  const view = $('view'), ctx = view.getContext('2d'), stage = $('stage');
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DIFF = ['Gentle', 'Easy', 'Medium', 'Hard', 'Fiendish'];
  const EPOCH = new Date(2026, 10, 20);            // puzzle No. 1
  const GOLD = '#ffb81c', FLARE = '#e5532d', INK = '#13231d';
  const STORE = 'hidden-worlds-proto-residents';

  const S = {
    seed: '', difficulty: 3, P: null, targetSet: new Set(), found: new Set(), order: [],
    misses: 0, hints: 0, elapsed: 0, t0: 0, running: false, done: false, tick: 0,
    scale: 1, tx: 0, ty: 0, minScale: 0.1, vw: 0, vh: 0, dpr: 1,
    truth: false, ids: false, anims: [], hint: null, raf: 0, toastT: 0, touched: false
  };
  window.HWApp = { state: S };

  // ---------- small helpers ----------
  function todaySeed() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function puzzleNo(seed) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(seed);
    if (!m) return 0;
    return Math.round((new Date(+m[1], +m[2] - 1, +m[3]) - EPOCH) / 864e5) + 1;
  }
  function fmt(ms) { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : (word === 'miss' ? 'es' : 's')); }
  function toast(text, sticky) {
    const el = $('toast');
    el.textContent = text; el.classList.add('on');
    clearTimeout(S.toastT);
    if (!sticky) S.toastT = setTimeout(() => el.classList.remove('on'), 1700);
  }
  function hideToast() { clearTimeout(S.toastT); $('toast').classList.remove('on'); }
  function showStatus(text, isError) { const el = $('status'); el.textContent = text; el.classList.toggle('error', !!isError); el.hidden = false; }
  function hideStatus() { $('status').hidden = true; }
  window.addEventListener('error', e => {
    showStatus('Something went wrong, so the puzzle may not work. Details: ' + (e.message || 'unknown error') + (e.lineno ? ' (line ' + e.lineno + ')' : ''), true);
  });
  function loadCollection() {
    try { const v = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function saveCollection(list) { try { localStorage.setItem(STORE, JSON.stringify(list)); } catch (e) { /* storage may be unavailable */ } }
  let collection = loadCollection();

  // ---------- view: pan and zoom ----------
  function resize() {
    const r = stage.getBoundingClientRect();
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.vw = Math.max(1, r.width); S.vh = Math.max(1, r.height);
    view.width = Math.round(S.vw * S.dpr); view.height = Math.round(S.vh * S.dpr);
    if (S.P) { if (S.touched) { S.minScale = Math.min(S.vw / S.P.W, S.vh / S.P.H); clampView(); } else fitView(false); }
    draw();
  }
  function clampView() {
    const P = S.P; if (!P) return;
    S.scale = Math.max(S.minScale, Math.min(4, S.scale));
    const w = P.W * S.scale, h = P.H * S.scale;
    S.tx = w <= S.vw ? (S.vw - w) / 2 : Math.min(0, Math.max(S.vw - w, S.tx));
    S.ty = h <= S.vh ? (S.vh - h) / 2 : Math.min(0, Math.max(S.vh - h, S.ty));
  }
  function fitView(contain) {
    const P = S.P; if (!P) return;
    S.minScale = Math.min(S.vw / P.W, S.vh / P.H);
    S.scale = contain ? S.minScale : Math.max(S.vw / P.W, S.vh / P.H, 0.4);
    S.tx = (S.vw - P.W * S.scale) / 2; S.ty = (S.vh - P.H * S.scale) / 2;
    clampView();
  }
  function zoomAt(cx, cy, next) {
    S.touched = true;
    const wx = (cx - S.tx) / S.scale, wy = (cy - S.ty) / S.scale;
    S.scale = Math.max(S.minScale, Math.min(4, next));
    S.tx = cx - wx * S.scale; S.ty = cy - wy * S.scale;
    clampView(); requestDraw();
  }
  function centerOn(x, y, minScale) {
    S.touched = true;
    if (minScale && S.scale < minScale) S.scale = minScale;
    S.tx = S.vw / 2 - x * S.scale; S.ty = S.vh / 2 - y * S.scale;
    clampView(); requestDraw();
  }

  // ---------- drawing ----------
  function requestDraw() { if (!S.raf) S.raf = requestAnimationFrame(draw); }
  function ring(sp, px) {
    const r = sp.size * 0.66 + 6 * px;
    ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, 7);
    ctx.lineWidth = 7 * px; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 4 * px; ctx.strokeStyle = GOLD; ctx.stroke();
  }
  function draw() {
    S.raf = 0;
    const P = S.P, t = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1b3a30'; ctx.fillRect(0, 0, view.width, view.height);
    if (!P) return;
    const k = S.dpr * S.scale;
    ctx.setTransform(k, 0, 0, k, S.dpr * S.tx, S.dpr * S.ty);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(P.canvas, 0, 0);
    if (S.ids) {
      ctx.fillStyle = '#16241f'; ctx.fillRect(0, 0, P.W, P.H);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(P.idCanvas, 0, 0, P.W, P.H);
    }
    const px = 1 / S.scale;
    for (const uid of S.found) ring(P.sprites[uid], px);
    let active = false;
    S.anims = S.anims.filter(a => {
      const p = (t - a.t0) / a.dur;
      if (p >= 1) return false;
      active = true;
      if (a.kind === 'found') {
        const e = 1 - Math.pow(1 - p, 3);
        ctx.globalAlpha = 1 - e; ctx.strokeStyle = GOLD; ctx.lineWidth = 6 * px;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r * (2.8 - 1.8 * e), 0, 7); ctx.stroke();
      } else {
        const r = 9 * px;
        ctx.globalAlpha = reduceMotion ? 1 : 1 - p; ctx.strokeStyle = FLARE; ctx.lineWidth = 4 * px; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a.x - r, a.y - r); ctx.lineTo(a.x + r, a.y + r); ctx.moveTo(a.x + r, a.y - r); ctx.lineTo(a.x - r, a.y + r); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return true;
    });
    if (S.hint) {
      if (t > S.hint.until) S.hint = null;
      else {
        active = true;
        const pulse = reduceMotion ? 1 : 1 + 0.035 * Math.sin(t / 180);
        ctx.setLineDash([14 * px, 10 * px]);
        ctx.beginPath(); ctx.arc(S.hint.x, S.hint.y, S.hint.r * pulse, 0, 7);
        ctx.lineWidth = 7 * px; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.lineWidth = 4 * px; ctx.strokeStyle = FLARE; ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (S.truth) drawTruth(P, px);
    if (active) requestDraw();
  }
  function drawTruth(P, px) {
    ctx.lineWidth = 2 * px; ctx.strokeStyle = '#ffffff'; ctx.setLineDash([6 * px, 5 * px]);
    for (const sp of P.sprites) {
      if (sp.role !== 'decoy') continue;
      const h = sp.size * 0.6; ctx.strokeRect(sp.x - h, sp.y - h, h * 2, h * 2);
    }
    ctx.setLineDash([]);
    for (const uid of P.targets) {
      const sp = P.sprites[uid], h = sp.size * 0.62;
      ctx.lineWidth = 6 * px; ctx.strokeStyle = INK; ctx.strokeRect(sp.x - h, sp.y - h, h * 2, h * 2);
      ctx.lineWidth = 3 * px; ctx.strokeStyle = sp.role === 'resident' ? FLARE : GOLD; ctx.strokeRect(sp.x - h, sp.y - h, h * 2, h * 2);
    }
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.font = '600 12px Figtree, system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    for (const uid of P.targets) {
      const sp = P.sprites[uid], text = sp.label + ', ' + Math.round(sp.vis * 100) + '% visible';
      const sx = sp.x * S.scale + S.tx, sy = (sp.y - sp.size * 0.62) * S.scale + S.ty - 14;
      const w = ctx.measureText(text).width + 14;
      ctx.fillStyle = INK; ctx.fillRect(sx - w / 2, sy - 10, w, 20);
      ctx.fillStyle = '#ffffff'; ctx.fillText(text, sx, sy + 1);
    }
  }

  // ---------- play ----------
  function elapsedNow() { return S.running ? performance.now() - S.t0 : S.elapsed; }
  function startTimer() {
    if (S.running || S.done || !S.P) return;
    S.running = true; S.t0 = performance.now() - S.elapsed;
    S.tick = setInterval(() => { $('timer').textContent = fmt(elapsedNow()); }, 250);
  }
  function stopTimer() {
    S.elapsed = elapsedNow(); S.running = false; clearInterval(S.tick);
    $('timer').textContent = fmt(S.elapsed);
  }
  function updateHud() {
    const P = S.P; if (!P) return;
    const n = puzzleNo(S.seed);
    $('puzzleLabel').textContent = (n > 0 ? 'No. ' + n + ', ' : 'Seed ') + S.seed + ', ' + DIFF[S.difficulty - 1];
    $('foundN').textContent = S.found.size; $('totalN').textContent = P.targets.length;
    $('timer').textContent = fmt(elapsedNow());
  }
  function click(x, y) {
    const P = S.P; if (!P || S.done) return;
    const wx = (x - S.tx) / S.scale, wy = (y - S.ty) / S.scale;
    const uid = HW.findNear(P, wx, wy, 12 / S.scale, u => S.targetSet.has(u) && !S.found.has(u));
    if (uid >= 0) { markFound(uid); return; }
    const direct = HW.hitAt(P, wx, wy);
    if (direct >= 0 && S.found.has(direct)) return;
    S.misses++;
    S.anims.push({ kind: 'miss', x: wx, y: wy, t0: performance.now(), dur: 420 });
    requestDraw();
  }
  function markFound(uid) {
    const P = S.P, sp = P.sprites[uid];
    S.found.add(uid); S.order.push(uid);
    if (!reduceMotion) S.anims.push({ kind: 'found', x: sp.x, y: sp.y, r: sp.size * 0.66, t0: performance.now(), dur: 520 });
    const chip = document.querySelector('.chip[data-uid="' + uid + '"]');
    if (chip) { chip.classList.add('found'); chip.setAttribute('aria-label', sp.label + ', found'); }
    if (sp.role === 'resident' && collection.indexOf(sp.resident.id) < 0) { collection.push(sp.resident.id); saveCollection(collection); renderCollection(); }
    toast('Found: ' + sp.label);
    updateHud(); requestDraw();
    if (S.found.size === P.targets.length) finish();
  }
  function shareText() {
    const P = S.P, n = puzzleNo(S.seed);
    return 'Hidden Worlds ' + (n > 0 ? 'No. ' + n : 'seed ' + S.seed) + ' (prototype)\n' +
      S.found.size + '/' + P.targets.length + ' found in ' + fmt(S.elapsed) + ', ' + plural(S.misses, 'miss') + ', ' + plural(S.hints, 'hint') + '\n' +
      DIFF[S.difficulty - 1] + ' difficulty';
  }
  function finish() {
    stopTimer(); S.done = true;
    const P = S.P;
    $('doneLine').textContent = 'You found all ' + P.targets.length + ' in ' + fmt(S.elapsed) + ' with ' + plural(S.misses, 'miss') + ' and ' + plural(S.hints, 'hint') + '.';
    $('doneResident').textContent = P.resident.name + ' is in your collection: ' + collection.length + ' of ' + HW.RESIDENTS.length + ' residents found.';
    $('shareText').value = shareText();
    $('done').hidden = false;
    $('copyBtn').focus();
  }
  function hint() {
    const P = S.P; if (!P || S.done) return;
    const left = P.targets.filter(u => !S.found.has(u));
    if (!left.length) return;
    const sp = P.sprites[left[Math.floor(Math.random() * left.length)]];
    const r = 230, a = Math.random() * 7, d = Math.random() * (r - sp.size);
    S.hint = { x: sp.x + Math.cos(a) * d, y: sp.y + Math.sin(a) * d, r, until: performance.now() + 6000 };
    S.hints++; startTimer();
    centerOn(S.hint.x, S.hint.y, Math.min(0.9, Math.max(S.scale, 0.6)));
    toast(sp.label + ' is inside the circle');
  }

  // ---------- pointer, wheel and keyboard ----------
  const ptrs = new Map();
  let gesture = null;
  function pos(e) { const r = view.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  view.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { view.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    const p = pos(e); ptrs.set(e.pointerId, p); startTimer(); S.touched = true;
    if (ptrs.size === 1) gesture = { kind: 'drag', lx: p.x, ly: p.y, moved: 0 };
    else if (ptrs.size === 2) {
      const q = Array.from(ptrs.values());
      gesture = { kind: 'pinch', d: Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y) || 1, scale: S.scale, mx: (q[0].x + q[1].x) / 2, my: (q[0].y + q[1].y) / 2 };
    }
  });
  view.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId) || !gesture) return;
    const p = pos(e); ptrs.set(e.pointerId, p);
    if (gesture.kind === 'drag' && ptrs.size === 1) {
      const dx = p.x - gesture.lx, dy = p.y - gesture.ly;
      gesture.lx = p.x; gesture.ly = p.y; gesture.moved += Math.abs(dx) + Math.abs(dy);
      if (gesture.moved > 6) { S.tx += dx; S.ty += dy; clampView(); requestDraw(); }
    } else if (gesture.kind === 'pinch' && ptrs.size === 2) {
      const q = Array.from(ptrs.values());
      const d = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y) || 1, mx = (q[0].x + q[1].x) / 2, my = (q[0].y + q[1].y) / 2;
      S.tx += mx - gesture.mx; S.ty += my - gesture.my; gesture.mx = mx; gesture.my = my;
      zoomAt(mx, my, gesture.scale * d / gesture.d);
    }
  });
  function pointerEnd(e) {
    if (!ptrs.has(e.pointerId)) return;
    const p = pos(e); ptrs.delete(e.pointerId);
    if (gesture && gesture.kind === 'drag' && e.type === 'pointerup' && gesture.moved <= 6) click(p.x, p.y);
    if (ptrs.size === 1) { const q = Array.from(ptrs.values())[0]; gesture = { kind: 'drag', lx: q.x, ly: q.y, moved: 99 }; }
    else if (ptrs.size === 0) gesture = null;
  }
  view.addEventListener('pointerup', pointerEnd);
  view.addEventListener('pointercancel', pointerEnd);
  view.addEventListener('wheel', e => {
    e.preventDefault();
    const p = pos(e);
    zoomAt(p.x, p.y, S.scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
  }, { passive: false });
  view.addEventListener('keydown', e => {
    const step = 90;
    if (e.key === 'ArrowLeft') S.tx += step; else if (e.key === 'ArrowRight') S.tx -= step;
    else if (e.key === 'ArrowUp') S.ty += step; else if (e.key === 'ArrowDown') S.ty -= step;
    else if (e.key === '+' || e.key === '=') { zoomAt(S.vw / 2, S.vh / 2, S.scale * 1.25); e.preventDefault(); return; }
    else if (e.key === '-' || e.key === '_') { zoomAt(S.vw / 2, S.vh / 2, S.scale / 1.25); e.preventDefault(); return; }
    else if (e.key === '0') { fitView(true); requestDraw(); return; }
    else return;
    e.preventDefault(); clampView(); requestDraw();
  });
  $('zin').addEventListener('click', () => zoomAt(S.vw / 2, S.vh / 2, S.scale * 1.35));
  $('zout').addEventListener('click', () => zoomAt(S.vw / 2, S.vh / 2, S.scale / 1.35));
  $('zfit').addEventListener('click', () => { fitView(true); requestDraw(); });

  // ---------- panels ----------
  function icon(def, color, cssSize, flat) {
    const c = document.createElement('canvas');
    c.width = cssSize * 2; c.height = cssSize * 2; c.setAttribute('aria-hidden', 'true');
    const x = c.getContext('2d'); x.scale(2, 2);
    HW.drawIcon(x, def, color, cssSize / 2, cssSize / 2, cssSize * 0.86, flat);
    return c;
  }
  function buildTray() {
    const P = S.P, tray = $('tray');
    tray.textContent = '';
    for (const uid of P.targets) {
      const sp = P.sprites[uid], b = document.createElement('button');
      b.type = 'button'; b.className = 'chip' + (sp.role === 'resident' ? ' resident' : '') + (S.found.has(uid) ? ' found' : '');
      b.dataset.uid = uid; b.setAttribute('aria-label', sp.label + (S.found.has(uid) ? ', found' : ', not found yet'));
      b.appendChild(icon(sp.def, sp.color, 40));
      const name = document.createElement('span'); name.className = 'name'; name.textContent = sp.label; b.appendChild(name);
      const tick = document.createElement('span'); tick.className = 'tick'; tick.setAttribute('aria-hidden', 'true'); b.appendChild(tick);
      b.addEventListener('click', () => {
        if (S.found.has(uid)) centerOn(sp.x, sp.y, 0.8);
        else toast(sp.role === 'resident' ? sp.label + ' lives here somewhere' : sp.label + ' is still hidden');
      });
      tray.appendChild(b);
    }
  }
  function renderCollection() {
    const box = $('collection'), D = HW.defs();
    box.textContent = '';
    for (const r of HW.RESIDENTS) {
      const got = collection.indexOf(r.id) >= 0, d = document.createElement('div');
      d.className = 'res' + (got ? ' got' : '');
      d.appendChild(icon(D.residentDefs[r.variant], r.color, 46, got ? null : '#c5d0c0'));
      const n = document.createElement('span'); n.textContent = got ? r.name : 'Not yet'; d.appendChild(n);
      box.appendChild(d);
    }
  }
  function buildDrawer() {
    const P = S.P, st = P.stats, dl = $('stats');
    $('seed').value = S.seed; $('difficulty').value = S.difficulty; $('diffOut').textContent = DIFF[S.difficulty - 1];
    const rows = [
      ['Sprites placed', st.sprites], ['Hiding places (trees, bushes, buildings)', st.occluders],
      ['Lookalike decoys', st.decoys], ['Filler objects', st.clutter],
      ['Least a target may show', Math.round(P.cfg.minVis * 100) + '%'],
      ['Checks run', st.passes], ['Targets moved after a check', st.moved], ['Build time', st.ms + ' ms']
    ];
    dl.textContent = '';
    for (const r of rows) {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = r[0]; dd.textContent = r[1]; dl.appendChild(dt); dl.appendChild(dd);
    }
    const tb = $('ttable').tBodies[0];
    tb.textContent = '';
    for (const uid of P.targets) {
      const sp = P.sprites[uid], tr = document.createElement('tr');
      const cells = [sp.label, Math.round(sp.vis * 100) + '%', Math.round(sp.size) + ' px', sp.crowd, null];
      cells.forEach((v, i) => {
        const td = document.createElement('td');
        if (i === 4) {
          const m = document.createElement('span'), bar = document.createElement('i');
          m.className = 'meter'; bar.style.width = sp.score + '%'; m.appendChild(bar);
          td.appendChild(m); td.appendChild(document.createTextNode(sp.score));
        } else td.textContent = v;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    }
    renderCollection();
  }
  function setDrawer(open) {
    $('drawer').hidden = !open;
    $('engineBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  $('engineBtn').addEventListener('click', () => setDrawer($('drawer').hidden));
  $('drawerClose').addEventListener('click', () => { setDrawer(false); $('engineBtn').focus(); });
  $('hintBtn').addEventListener('click', hint);
  $('truth').addEventListener('change', e => { S.truth = e.target.checked; requestDraw(); });
  $('ids').addEventListener('change', e => { S.ids = e.target.checked; requestDraw(); });
  $('difficulty').addEventListener('input', e => { $('diffOut').textContent = DIFF[e.target.value - 1]; });
  $('difficulty').addEventListener('change', e => newPuzzle($('seed').value, +e.target.value));
  $('genForm').addEventListener('submit', e => { e.preventDefault(); newPuzzle($('seed').value, +$('difficulty').value); });
  $('todayBtn').addEventListener('click', () => newPuzzle(todaySeed(), +$('difficulty').value));
  function randomSeed() { return 'world-' + (1000 + Math.floor(Math.random() * 9000)); }
  $('randBtn').addEventListener('click', () => newPuzzle(randomSeed(), +$('difficulty').value));
  $('nextBtn').addEventListener('click', () => newPuzzle(randomSeed(), S.difficulty));
  $('doneClose').addEventListener('click', () => { $('done').hidden = true; view.focus(); });
  $('copyBtn').addEventListener('click', () => {
    const ta = $('shareText');
    const fallback = () => { ta.focus(); ta.select(); toast('Press Ctrl or Cmd + C to copy'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => toast('Result copied'), fallback);
    else fallback();
  });

  // ---------- build a puzzle ----------
  function newPuzzle(seed, difficulty, restore) {
    S.seed = String(seed || '').trim() || todaySeed();
    S.difficulty = Math.max(1, Math.min(5, Math.round(difficulty) || 3));
    showStatus('Building the world');
    clearInterval(S.tick);
    setTimeout(() => {
      let P;
      try { P = HW.generate({ seed: S.seed, difficulty: S.difficulty }); }
      catch (err) { showStatus('The world could not be built on this device. Details: ' + (err && err.message ? err.message : err), true); return; }
      S.P = P; S.targetSet = new Set(P.targets); S.found = new Set(); S.order = [];
      S.misses = 0; S.hints = 0; S.elapsed = 0; S.running = false; S.done = false; S.anims = []; S.hint = null; S.touched = false;
      if (restore && restore.seed === S.seed && Array.isArray(restore.found)) {
        for (const u of restore.found) { if (S.targetSet.has(u) && !S.found.has(u)) { S.found.add(u); S.order.push(u); } }
        S.misses = restore.misses | 0; S.hints = restore.hints | 0; S.elapsed = +restore.elapsed || 0;
        S.done = S.found.size === P.targets.length;
      }
      $('done').hidden = true;
      buildTray(); buildDrawer(); updateHud(); fitView(false); requestDraw(); hideStatus();
    }, 40);
  }

  // ---------- start ----------
  // Web fonts are added after the page is running, so a slow font server can never hold it up.
  function loadFonts() {
    try {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=Figtree:wght@400;500;600;700&display=swap';
      document.head.appendChild(l);
    } catch (e) { /* system fonts are fine */ }
  }
  let started = false;
  function start(data) {
    if (started) return;
    started = true;
    resize();
    newPuzzle((data && data.seed) || todaySeed(), (data && data.difficulty) || 3, data);
    setTimeout(loadFonts, 600);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);
  const hot = window.claude && window.claude.hot;
  try { if (hot && hot.snapshot) hot.snapshot(() => ({ seed: S.seed, difficulty: S.difficulty, found: S.order.slice(), misses: S.misses, hints: S.hints, elapsed: elapsedNow() })); } catch (e) { /* optional */ }
  if (hot && hot.ready) {
    try { hot.ready(start); } catch (e) { /* fall through to the timer */ }
    setTimeout(() => start({}), 1200);
  } else start((hot && hot.data) || {});
})();
