/** Gera os ícones PNG do PWA a partir de web/public/favicon.svg (usa Chromium do Playwright). */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const svg = readFileSync('web/public/favicon.svg', 'utf8');
const exe = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
mkdirSync('web/public/icons', { recursive: true });

async function shot(size, file, { pad = 0, bg = 'transparent' } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = size - pad * 2;
  await page.setContent(`<html><body style="margin:0;background:${bg};display:grid;place-items:center;width:${size}px;height:${size}px">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  await page.screenshot({ path: `web/public/icons/${file}`, omitBackground: bg === 'transparent' });
}
const warm = 'radial-gradient(circle at 50% 55%, #3a1b0a, #0d0806 70%)';
await shot(192, 'icon-192.png');
await shot(512, 'icon-512.png');
await shot(512, 'icon-maskable-512.png', { pad: 80, bg: warm });
await shot(180, 'apple-touch-icon.png', { pad: 14, bg: warm });
// imagem social
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<html><body style="margin:0;width:1200px;height:630px;background:${warm};display:flex;align-items:center;justify-content:center;gap:48px;font-family:Georgia,serif">
  <div style="width:300px;height:300px">${svg.replace('<svg ', '<svg width="300" height="300" ')}</div>
  <div><div style="font-size:120px;font-weight:900;letter-spacing:6px;background:linear-gradient(#fff3cf,#d9a441 60%,#9a6a22);-webkit-background-clip:text;color:transparent">MIÚDA®</div>
  <div style="font-size:34px;letter-spacing:14px;color:#d6a766;text-transform:uppercase">Da Toca do Javali</div></div></body></html>`);
await page.screenshot({ path: 'web/public/icons/og.png' });
await browser.close();
console.log('Ícones gerados em web/public/icons');
