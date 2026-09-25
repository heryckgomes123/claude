/**
 * Sons da Toca, sintetizados com Web Audio (zero arquivos de áudio):
 * dados rolando, moedas, vitória, derrota, "Javali!", cliques e o
 * crepitar ambiente da lareira.
 */
import { getPrefs } from './prefs';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambience: { stop: () => void } | null = null;

function ac(): AudioContext | null {
  if (!getPrefs().sound) return null;
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  master!.gain.value = getPrefs().volume;
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; at?: number; slide?: number } = {}) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + (opts.at ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function knock(at: number, gain = 0.35, freq = 900) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.06);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 3;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
}

export const sfx = {
  click() {
    knock(0, 0.12, 2200);
  },
  roll(n = 6) {
    // dados batendo na madeira
    for (let i = 0; i < 6 + n * 2; i++) knock(i * 0.045 + Math.random() * 0.03, 0.18 + Math.random() * 0.2, 700 + Math.random() * 900);
    knock(0.62, 0.35, 500);
  },
  select() {
    tone(660, 0.08, { type: 'triangle', gain: 0.08 });
  },
  coin() {
    tone(1568, 0.25, { type: 'triangle', gain: 0.12 });
    tone(2093, 0.35, { type: 'sine', gain: 0.08, at: 0.06 });
  },
  coins() {
    for (let i = 0; i < 6; i++) tone(1400 + Math.random() * 900, 0.22, { type: 'triangle', gain: 0.07, at: i * 0.07 });
  },
  bank() {
    tone(392, 0.18, { type: 'triangle', gain: 0.12 });
    tone(523, 0.28, { type: 'triangle', gain: 0.12, at: 0.1 });
  },
  bust() {
    tone(180, 0.5, { type: 'sawtooth', gain: 0.12, slide: 70 });
    knock(0, 0.4, 200);
  },
  hot() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, { type: 'square', gain: 0.05, at: i * 0.06 }));
  },
  win() {
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.45, { type: 'triangle', gain: 0.14, at: i * 0.12 }));
    [523, 659, 784].forEach((f) => tone(f, 1.2, { type: 'sine', gain: 0.08, at: 0.65 }));
  },
  lose() {
    [392, 349, 311, 262].forEach((f, i) => tone(f, 0.4, { type: 'triangle', gain: 0.1, at: i * 0.18 }));
  },
  turn() {
    tone(880, 0.12, { type: 'sine', gain: 0.08 });
    tone(1320, 0.18, { type: 'sine', gain: 0.06, at: 0.08 });
  },
  notify() {
    tone(988, 0.12, { type: 'sine', gain: 0.07 });
    tone(1319, 0.2, { type: 'sine', gain: 0.07, at: 0.1 });
  },
  door() {
    tone(90, 0.9, { type: 'sawtooth', gain: 0.06, slide: 60 });
    knock(0.1, 0.3, 300);
    knock(0.5, 0.25, 250);
  },
};

/** Crepitar ambiente da lareira. */
export function setAmbience(on: boolean) {
  if (!on) {
    ambience?.stop();
    ambience = null;
    return;
  }
  if (ambience) return;
  const c = ac();
  if (!c) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 4);
  src.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  const g = c.createGain();
  g.gain.value = 0.05;
  src.connect(lp).connect(g).connect(master!);
  src.start();
  const timer = window.setInterval(() => {
    if (Math.random() < 0.55) knock(Math.random() * 0.3, 0.05 + Math.random() * 0.12, 1500 + Math.random() * 2500);
  }, 260);
  ambience = {
    stop() {
      clearInterval(timer);
      try {
        src.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

/** Desbloqueia o áudio no primeiro gesto do usuário (política dos navegadores). */
export function unlockAudio() {
  ac();
}
