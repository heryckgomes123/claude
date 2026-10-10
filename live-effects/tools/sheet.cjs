// Folha de contato (PNG) de um efeito, para revisão visual.
// Uso: node tools/sheet.cjs <presente> <saida.png> <t1,t2,...> [colunas=4] [escala=0.25]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.cjs');
(async () => {
  const [gift, out, timesArg, cols = '4', scale = '0.25'] = process.argv.slice(2);
  const { url, close } = await serve(path.join(__dirname, '..'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  page.on('console', m => m.type() === 'error' && console.log('[console]', m.text()));
  await page.goto(`${url}/presentes/index.html?render=1&presente=${gift}`);
  await page.waitForFunction(() => document.title === 'ready' || document.title === 'erro', null, { timeout: 30000 });
  const times = timesArg.split(',').map(Number);
  const data = await page.evaluate(([t, c, s]) => FX.sheet(t, c, s), [times, +cols, +scale]);
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  await browser.close(); close();
})();
