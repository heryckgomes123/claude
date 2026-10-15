// Renderiza scene.html quadro a quadro (Chromium headless + WebGL) e codifica com ffmpeg.
// node capture.mjs out.mp4 [--w 1080 --h 2336 --fps 30] [--audio splash_audio.wav] [--stills 0.5,1.2,...]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args.find(a => a.endsWith('.mp4')) || 'miuda_splash_v2.mp4';
const W = +opt('--w', 1080), H = +opt('--h', 2336), FPS = +opt('--fps', 30), DUR = +opt('--dur', 7.5);
const AUDIO = opt('--audio', null), STILLS = opt('--stills', null), FROM = +opt('--from', 0), TO = +opt('--to', DUR);
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 600, height: 1200 } });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => { console.error('[pageerror]', e); process.exit(1); });
await page.goto(`http://127.0.0.1:${port}/scene.html?w=${W}&h=${H}&fps=${FPS}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });

async function frame(t) {
  await page.evaluate(t => window.renderFrame(t), t);
  return Buffer.from(await page.evaluate(() => window.grabFrame()), 'base64');
}

if (STILLS) {
  for (const t of STILLS.split(',').map(Number)) {
    const buf = await frame(t);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', '-', `still_${t.toFixed(2)}.png`]);
    ff.stdin.end(buf); await new Promise(r => ff.on('close', r));
    console.log('still', t);
  }
} else {
  const ffArgs = ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-'];
  if (AUDIO) ffArgs.push('-i', AUDIO, '-c:a', 'aac', '-b:a', '160k', '-shortest');
  ffArgs.push('-c:v', 'libx264', '-preset', 'slow', '-crf', opt('--crf', '18'), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', OUT);
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(FROM * FPS), n1 = Math.round(TO * FPS);
  const t0 = Date.now();
  for (let i = n0; i < n1; i++) {
    const buf = await frame(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % FPS === 0) console.log(`${(i / FPS).toFixed(1)}s  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log('ok', OUT);
}
await browser.close(); server.close();
