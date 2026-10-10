// Gera uma folha de contato (PNG) com quadros do efeito, para revisão visual.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const [html, out, timesArg, cols = '4', scale = '0.25', extra = ''] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + path.resolve(html) + '?render=1' + extra);
  await page.waitForFunction(() => document.title === 'ready', null, { timeout: 20000 });
  const times = timesArg.split(',').map(Number);
  const url = await page.evaluate(([t, c, s]) => FX.sheet(t, c, s), [times, +cols, +scale]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  await browser.close();
})();
