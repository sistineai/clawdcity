// Reproduce viewer-like conditions: sandboxed iframe, strict CSP, and a font request that never answers.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer-core');
const page_html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'));
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src data: blob:";
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/frame')) { res.writeHead(200, { 'content-type': 'text/html', 'content-security-policy': CSP }); res.end(page_html); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!DOCTYPE html><body style="margin:0"><iframe id="f" sandbox="allow-scripts" src="/frame" style="border:0;width:100vw;height:100vh"></iframe></body>'); }
}).listen(0, async () => {
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  for (const mode of ['fonts-fail-fast', 'fonts-hang']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.setRequestInterception(true);
    page.on('request', r => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) { if (mode === 'fonts-hang') return; /* never answer */ return r.abort(); } r.continue(); });
    await page.setViewport({ width: 390, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    page.goto('http://localhost:' + port + '/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await new Promise(r => setTimeout(r, 6000));
    const frame = page.frames().find(f => f.url().includes('/frame'));
    let state = 'no frame';
    if (frame) state = await Promise.race([
      frame.evaluate(() => ({ started: !!(window.HWApp && window.HWApp.state.P), bodyH: document.body ? document.body.clientHeight : -1, stageH: document.getElementById('stage') ? document.getElementById('stage').clientHeight : -1 })).catch(e => 'evaluate failed: ' + e.message),
      new Promise(r => setTimeout(() => r('frame not responding (scripts blocked)'), 3000))
    ]);
    console.log(mode, JSON.stringify(state), errors.filter(e => !/Failed to load resource/.test(e)));
    await page.screenshot({ path: path.join(__dirname, 'out', 'sandbox-' + mode + '.png') }).catch(() => {});
    await page.close().catch(() => {});
  }
  await browser.close(); server.close();
});
