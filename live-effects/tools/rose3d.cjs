// Renderiza tools/rose3d.html (three.js) e salva rosa-intelra/rose.png (fundo transparente).
// Uso: node tools/rose3d.cjs            -> grava rosa-intelra/rose.png e embute no index.html
//      node tools/rose3d.cjs saida.png [?close=1]   -> só grava o PNG (teste)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
server.listen(0, async () => {
  const out = process.argv[2] || path.join(root, '..', 'rosa-intelra', 'rose.png');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${server.address().port}/rose3d.html${process.argv[3] || ''}`);
  await page.waitForFunction(() => document.title === 'done', null, { timeout: 120000 });
  const r = await page.evaluate(() => window.RESULT);
  fs.writeFileSync(out, Buffer.from(r.png.split(',')[1], 'base64'));
  // embute a rosa no efeito (arquivo único, funciona como "arquivo local" no OBS)
  if (!process.argv[2]) {
    const html = path.join(root, '..', 'rosa-intelra', 'index.html');
    const src = fs.readFileSync(html, 'utf8');
    const next = src.replace(/\/\*ROSE_PNG\*\/'[^']*'\/\*END_ROSE_PNG\*\//, `/*ROSE_PNG*/'${r.png}'/*END_ROSE_PNG*/`);
    fs.writeFileSync(html, next);
  }
  delete r.png;
  console.log(JSON.stringify(r));
  await browser.close(); server.close();
});
