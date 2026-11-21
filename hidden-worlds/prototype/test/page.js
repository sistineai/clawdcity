// Drive the built page in headless Chrome: play a full puzzle with real mouse events.
const path = require('path');
const puppeteer = require('puppeteer-core');
const out = path.join(__dirname, 'out');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.setViewport({ width: 1360, height: 800, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.HWApp && window.HWApp.state.P, { timeout: 15000 });
  await new Promise(r => setTimeout(r, 400));
  const info = await page.evaluate(() => { const S = window.HWApp.state; return { seed: S.seed, targets: S.P.targets.length, ms: S.P.stats.ms, scale: S.scale, label: document.getElementById('puzzleLabel').textContent, chips: document.querySelectorAll('.chip').length }; });
  console.log('loaded', info);
  await page.screenshot({ path: path.join(out, 'page-1-start.png') });

  // wheel zoom changes the scale
  const s0 = await page.evaluate(() => window.HWApp.state.scale);
  await page.mouse.move(680, 400); await page.mouse.wheel({ deltaY: -400 });
  await new Promise(r => setTimeout(r, 150));
  const s1 = await page.evaluate(() => window.HWApp.state.scale);
  console.log('wheel zoom', s0.toFixed(3), '->', s1.toFixed(3));
  // drag pans
  const t0 = await page.evaluate(() => window.HWApp.state.tx);
  await page.mouse.move(700, 400); await page.mouse.down(); await page.mouse.move(600, 380, { steps: 5 }); await page.mouse.up();
  const t1 = await page.evaluate(() => window.HWApp.state.tx);
  const missesAfterDrag = await page.evaluate(() => window.HWApp.state.misses);
  console.log('drag pan tx', Math.round(t0), '->', Math.round(t1), 'misses after drag', missesAfterDrag);

  // show the whole world, then click a patch of empty sky: counts as a miss
  await page.click('#zfit'); await new Promise(r => setTimeout(r, 150));
  const emptyPt = await page.evaluate(() => {
    const S = window.HWApp.state, P = S.P, r = document.getElementById('view').getBoundingClientRect();
    for (let iy = 5; iy < P.idH; iy += 7) for (let ix = 5; ix < P.idW; ix += 7) {
      let clear = true;
      for (let dy = -40; dy <= 40 && clear; dy += 8) for (let dx = -40; dx <= 40; dx += 8) { const x = ix + dx, y = iy + dy; if (x < 0 || y < 0 || x >= P.idW || y >= P.idH || P.idMap[y * P.idW + x] >= 0) { clear = false; break; } }
      if (clear) return { x: r.left + (ix / P.idScale) * S.scale + S.tx, y: r.top + (iy / P.idScale) * S.scale + S.ty };
    }
    return null;
  });
  await page.mouse.click(emptyPt.x, emptyPt.y);
  console.log('misses after empty click', await page.evaluate(() => window.HWApp.state.misses));

  // click every target at one of its visible pixels
  const pts = await page.evaluate(() => {
    const S = window.HWApp.state, P = S.P, r = document.getElementById('view').getBoundingClientRect();
    return P.targets.map(uid => {
      // centroid of the pixels this target owns, snapped to an owned pixel
      let sx = 0, sy = 0, n = 0, first = -1;
      for (let i = 0; i < P.idMap.length; i++) if (P.idMap[i] === uid) { sx += i % P.idW; sy += Math.floor(i / P.idW); n++; if (first < 0) first = i; }
      let cx = Math.round(sx / n), cy = Math.round(sy / n);
      if (P.idMap[cy * P.idW + cx] !== uid) { cx = first % P.idW; cy = Math.floor(first / P.idW); }
      const wx = (cx + 0.5) / P.idScale, wy = (cy + 0.5) / P.idScale;
      return { uid, label: P.sprites[uid].label, x: r.left + wx * S.scale + S.tx, y: r.top + wy * S.scale + S.ty };
    });
  });
  for (const p of pts) { await page.mouse.click(p.x, p.y); await new Promise(r => setTimeout(r, 60)); }
  await new Promise(r => setTimeout(r, 700));
  const end = await page.evaluate(() => { const S = window.HWApp.state; return { found: S.found.size, total: S.P.targets.length, done: S.done, misses: S.misses, sheetOpen: !document.getElementById('done').hidden, share: document.getElementById('shareText').value, foundChips: document.querySelectorAll('.chip.found').length, line: document.getElementById('doneLine').textContent, res: document.getElementById('doneResident').textContent }; });
  console.log('after clicking all targets', end);
  await page.screenshot({ path: path.join(out, 'page-2-done.png') });

  // engine panel with answers and ID map
  await page.click('#doneClose');
  await page.click('#engineBtn');
  await page.click('#truth');
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(out, 'page-3-engine.png') });
  await page.click('#ids');
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(out, 'page-4-ids.png') });

  // harder puzzle via the slider, then a phone-sized viewport
  await page.evaluate(() => { const el = document.getElementById('difficulty'); el.value = 5; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await new Promise(r => setTimeout(r, 900));
  const hard = await page.evaluate(() => { const S = window.HWApp.state; return { difficulty: S.difficulty, targets: S.P.targets.length, sprites: S.P.stats.sprites, ms: S.P.stats.ms, found: S.found.size, label: document.getElementById('puzzleLabel').textContent }; });
  console.log('difficulty 5', hard);
  await page.click('#ids'); await page.click('#drawerClose');
  await page.setViewport({ width: 390, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(out, 'page-5-phone.png') });
  const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log('phone overflow check', overflow);
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });
