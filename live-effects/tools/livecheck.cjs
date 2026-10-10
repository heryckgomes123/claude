// Abre o efeito no modo "ao vivo" (como o OBS faria), dispara e tira um print.
// Uso: node tools/livecheck.cjs saida.png "?autoplay=galaxia&nome=Teste" [ms]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [out, query = '?autoplay=1&nome=Teste', ms = '2900'] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  page.on('console', m => m.type() === 'error' && console.log('[console]', m.text()));
  await page.goto('file://' + path.resolve(__dirname, '../presentes/index.html') + query);
  await page.waitForTimeout(+ms);
  await page.screenshot({ path: out, omitBackground: true });
  await browser.close();
})();
