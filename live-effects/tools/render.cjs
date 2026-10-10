// Exporta o efeito para vídeo com transparência (WebM VP9 + alpha, com som)
// e um preview MP4 sobre fundo escuro.
//
// Uso: node tools/render.cjs [--fps 60] [--nome Fulano] [--prores]
// Requer: playwright (Chromium) e ffmpeg com libvpx-vp9/libopus.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FPS = +opt('--fps', 60);
const NOME = opt('--nome', '');
const dir = path.join(__dirname, '..', 'rosa-intelra');
const html = path.join(dir, 'index.html');
const base = NOME ? `rosa-intelra-${NOME.replace(/[^\w-]/g, '')}` : 'rosa-intelra';

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rosa-'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + html + '?render=1');
  await page.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 });
  const dur = await page.evaluate(() => FX.DUR);

  const wav = await page.evaluate(() => FX.audio());
  fs.writeFileSync(path.join(tmp, 'audio.wav'), Buffer.from(wav, 'base64'));

  const n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    const url = await page.evaluate(([t, nome]) => FX.frame(t, nome), [i / FPS, NOME]);
    fs.writeFileSync(path.join(tmp, `f${String(i).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
    if (i % 30 === 0) process.stdout.write(`\rquadros ${i}/${n}`);
  }
  console.log(`\rquadros ${n}/${n}`);
  await browser.close();

  const frames = ['-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png')];
  const audio = ['-i', path.join(tmp, 'audio.wav')];
  const ff = a => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });

  // 1) WebM com canal alpha (OBS "Fonte de mídia", TikFinity, Streamer.bot)
  ff([...frames, ...audio, '-map', '0:v', '-map', '1:a',
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '31', '-b:v', '0', '-row-mt', '1',
    '-deadline', 'good', '-cpu-used', '2', '-auto-alt-ref', '0', '-metadata:s:v:0', 'alpha_mode=1',
    '-c:a', 'libopus', '-b:a', '160k', '-shortest', path.join(dir, `${base}.webm`)]);

  // 2) Preview sobre fundo escuro (só para visualizar no celular/PC)
  ff([...frames, ...audio, '-f', 'lavfi', '-i', `gradients=s=1080x1920:c0=0x1d2740:c1=0x090c16:x0=540:y0=300:x1=540:y1=1920:d=${dur}:r=${FPS}`,
    '-filter_complex', '[2:v][0:v]overlay=shortest=1,format=yuv420p[v]', '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', path.join(dir, `${base}-preview.mp4`)]);

  // 3) Opcional: ProRes 4444 com alpha (.mov) para editores de vídeo
  if (args.includes('--prores')) {
    ff([...frames, ...audio, '-map', '0:v', '-map', '1:a', '-c:v', 'prores_ks', '-profile:v', '4444',
      '-pix_fmt', 'yuva444p10le', '-c:a', 'pcm_s16le', '-shortest', path.join(dir, `${base}.mov`)]);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('ok:', fs.readdirSync(dir).filter(f => f.startsWith(base)).join(', '));
})();
