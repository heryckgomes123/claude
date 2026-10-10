// Exporta os efeitos para vídeo com transparência (WebM VP9 + alpha, com som)
// e um preview MP4 com todos os presentes em sequência, sobre fundo escuro.
//
// Uso: node tools/render.cjs [presente ...] [--fps 30] [--prores] [--sem-preview]
// Requer: playwright (Chromium) e ffmpeg com libvpx-vp9/libopus/libx264.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const { serve } = require('./serve.cjs');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FPS = +opt('--fps', 30);
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'videos');
const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { url, close } = await serve(ROOT);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`${url}/presentes/index.html?render=1`);
  await page.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 });
  const all = await page.evaluate(() => FX.GIFTS);
  const wanted = args.filter(a => all.includes(a));
  const gifts = wanted.length ? wanted : all;
  const dur = await page.evaluate(() => FX.DUR);
  const previews = [];

  for (const gift of gifts) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `fx-${gift}-`));
    await page.evaluate(k => FX.setGift(k), gift);
    fs.writeFileSync(path.join(tmp, 'audio.wav'), Buffer.from(await page.evaluate(() => FX.audio()), 'base64'));
    const n = Math.round(dur * FPS);
    for (let i = 0; i < n; i++) {
      const data = await page.evaluate(t => FX.frame(t), i / FPS);
      fs.writeFileSync(path.join(tmp, `f${String(i).padStart(4, '0')}.png`), Buffer.from(data.split(',')[1], 'base64'));
    }
    const frames = ['-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png')];
    const audio = ['-i', path.join(tmp, 'audio.wav')];
    // WebM com canal alpha (OBS "Fonte de mídia", TikFinity, Streamer.bot)
    ff([...frames, ...audio, '-map', '0:v', '-map', '1:a',
      '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '32', '-b:v', '0', '-row-mt', '1',
      '-deadline', 'good', '-cpu-used', '2', '-auto-alt-ref', '0', '-metadata:s:v:0', 'alpha_mode=1',
      '-c:a', 'libopus', '-b:a', '128k', '-shortest', path.join(OUT, `${gift}.webm`)]);
    if (args.includes('--prores')) {
      ff([...frames, ...audio, '-map', '0:v', '-map', '1:a', '-c:v', 'prores_ks', '-profile:v', '4444',
        '-pix_fmt', 'yuva444p10le', '-c:a', 'pcm_s16le', '-shortest', path.join(OUT, `${gift}.mov`)]);
    }
    if (!args.includes('--sem-preview')) {
      const pv = path.join(os.tmpdir(), `preview-${gift}.mp4`);
      ff([...frames, ...audio, '-f', 'lavfi', '-i', `gradients=s=1080x1920:c0=0x1d2740:c1=0x090c16:x0=540:y0=300:x1=540:y1=1920:d=${dur}:r=${FPS}`,
        '-filter_complex', '[2:v][0:v]overlay=shortest=1,scale=720:1280,format=yuv420p[v]', '-map', '[v]', '-map', '1:a',
        '-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-shortest', pv]);
      previews.push(pv);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`ok: videos/${gift}.webm (${(fs.statSync(path.join(OUT, `${gift}.webm`)).size / 1e6).toFixed(1)} MB)`);
  }
  await browser.close(); close();

  if (previews.length > 1) {
    const list = path.join(os.tmpdir(), 'previews.txt');
    fs.writeFileSync(list, previews.map(p => `file '${p}'`).join('\n'));
    ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(OUT, 'preview-todos.mp4')]);
    console.log('ok: videos/preview-todos.mp4');
  } else if (previews.length === 1) {
    fs.copyFileSync(previews[0], path.join(OUT, `preview-${gifts[0]}.mp4`));
  }
  previews.forEach(p => fs.rmSync(p, { force: true }));
})();
