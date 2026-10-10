// Executa uma expressão no modo render; salva PNG se o resultado for dataURL.
// Uso: node tools/eval.cjs <presente> "<expressão>" [saida.png]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.cjs');
(async () => {
  const [gift, expr, out] = process.argv.slice(2);
  const { url, close } = await serve(path.join(__dirname, '..'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`${url}/presentes/index.html?render=1&presente=${gift}`);
  await page.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 });
  const r = await page.evaluate(expr);
  if (typeof r === 'string' && r.startsWith('data:image')) fs.writeFileSync(out, Buffer.from(r.split(',')[1], 'base64'));
  else console.log(JSON.stringify(r));
  await browser.close(); close();
})();
