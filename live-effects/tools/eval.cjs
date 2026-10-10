// Executa uma expressão no modo render e salva PNG (se retornar dataURL) ou imprime o resultado.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const [html, expr, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + path.resolve(html) + '?render=1');
  await page.waitForFunction(() => document.title === 'ready', null, { timeout: 20000 });
  const r = await page.evaluate(expr);
  if (typeof r === 'string' && r.startsWith('data:image')) fs.writeFileSync(out, Buffer.from(r.split(',')[1], 'base64'));
  else console.log(JSON.stringify(r));
  await browser.close();
})();
