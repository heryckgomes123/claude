// Renderiza todos os objetos 3D dos presentes e grava:
//   presentes/assets/<item>.png   (fundo transparente, 2x)
//   presentes/assets/items.js     (tamanho, ponto de pegada e centro de cada item)
// Uso: node tools/items.cjs [item ...]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.cjs');

const ASSETS = path.join(__dirname, '..', 'presentes', 'assets');
const ALL = ['rose', 'rosewhite', 'heartme', 'heartplush', 'star', 'note', 'dino'];

(async () => {
  const only = process.argv.slice(2);
  const list = only.length ? only : ALL;
  fs.mkdirSync(ASSETS, { recursive: true });
  const metaFile = path.join(ASSETS, 'items.js');
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8').replace(/^window\.ITEMS = /, '').replace(/;\s*$/, '')) : {};
  const { url, close } = await serve(__dirname);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const item of list) {
    const page = await browser.newPage();
    page.on('pageerror', e => console.log(`[${item}] pageerror`, e.message));
    const isRose = item.startsWith('rose');
    await page.goto(isRose ? `${url}/rose3d.html${item === 'rosewhite' ? '?white=1' : ''}` : `${url}/items3d.html?item=${item}`);
    await page.waitForFunction(() => document.title === 'done', null, { timeout: 120000 });
    const r = await page.evaluate(() => window.RESULT);
    fs.writeFileSync(path.join(ASSETS, `${item}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
    if (isRose) {
      // unidades = pixels / 2; pegada no caule (y=560), centro no botão
      const b = r.bloom;
      meta[item] = { src: `assets/${item}.png`, W: 400, H: 760, GX: Math.round(r.stemX1120 / 2), GY: 560, BX: Math.round((b.minX + b.maxX) / 4), BY: Math.round((b.minY + b.maxY) / 4), R: Math.round((b.maxX - b.minX) / 4), stem: true };
    } else {
      const b = r.bbox, h = (b.maxY - b.minY) / 2;
      meta[item] = { src: `assets/${item}.png`, W: 320, H: 320, GX: Math.round((b.minX + b.maxX) / 4), GY: Math.round(b.maxY / 2 - h * 0.14), BX: Math.round((b.minX + b.maxX) / 4), BY: Math.round((b.minY + b.maxY) / 4), R: Math.round(Math.max(b.maxX - b.minX, b.maxY - b.minY) / 4) };
    }
    console.log(item, JSON.stringify(meta[item]));
    await page.close();
  }
  fs.writeFileSync(metaFile, 'window.ITEMS = ' + JSON.stringify(meta, null, 2) + ';\n');
  await browser.close(); close();
})();
