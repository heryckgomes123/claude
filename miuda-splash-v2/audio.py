"""Trilha sintetizada do splash v2 (7.5 s, 48 kHz, estéreo) -> splash_audio_v2.wav"""
import wave
import numpy as np

SR, DUR = 48000, 7.5
n = int(SR * DUR); t = np.arange(n) / SR
rng = np.random.default_rng(11)

def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))
def env(t0, a, d, shape=2.0):
    e = np.zeros(n)
    up = (t >= t0 - a) & (t < t0); e[up] = ((t[up] - (t0 - a)) / a) ** shape
    dn = t >= t0; e[dn] = np.exp(-(t[dn] - t0) / d)
    return e
def tone(f0, f1, t0, t1, g):
    m = (t >= t0) & (t < t1); out = np.zeros(n)
    tt = t[m] - t0; k = tt / (t1 - t0)
    ph = 2 * np.pi * (f0 * tt + (f1 - f0) * tt * k / 2)
    out[m] = np.sin(ph) * np.sin(np.pi * k) ** 1.5 * g
    return out
def chime(t0, freqs, g, d=1.2):
    out = np.zeros(n); m = t >= t0; tt = t[m] - t0
    for i, f in enumerate(freqs): out[m] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / (d / (1 + i * 0.3))) / (1 + i)
    return out * g

L = np.zeros(n); R = np.zeros(n)
def both(x, pan=0.0):
    global L, R
    L += x * (1 - pan) / 1.2; R += x * (1 + pan) / 1.2

fade = np.clip(t / 1.0, 0, 1) * np.clip((DUR - t) / 0.35, 0, 1)
pad = (np.sin(2 * np.pi * 49 * t) + 0.5 * np.sin(2 * np.pi * 73.4 * t) + 0.25 * np.sin(2 * np.pi * 98 * t + 1))
both(pad * 0.09 * fade * (0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * t)))
both(band(rng.standard_normal(n), 4000, 10000) * 0.012 * fade)

# 1) linha de luz: zumbido elétrico subindo
both(tone(180, 720, 0.15, 0.95, 0.22) + tone(360, 1440, 0.15, 0.95, 0.06))
both(band(rng.standard_normal(n), 2000, 9000) * env(0.75, 0.55, 0.12, 2) * 0.12)
# 2) virada da carta
both(band(rng.standard_normal(n), 400, 4000) * env(1.25, 0.45, 0.15, 2.5) * 0.35, -0.3)
# 3) baralho espalha: rajada de "flicks" de carta
for i in range(36):
    tc = 1.45 + i * 0.012 + rng.uniform(0, 0.01)
    click = band(rng.standard_normal(n), 1500, 9000) * env(tc, 0.001, 0.012) * rng.uniform(0.25, 0.45)
    both(click, rng.uniform(-0.7, 0.7))
both(band(rng.standard_normal(n), 300, 6000) * env(1.75, 0.3, 0.25, 2) * 0.35, 0.4)
# 4) túnel: whoosh longo crescendo + grave
both(band(rng.standard_normal(n), 200, 3500) * env(3.6, 1.3, 0.35, 2.2) * 0.5)
both(tone(60, 140, 2.3, 4.4, 0.25))
# 5) peças encaixando + impacto
for tc, g in ((4.05, 0.5), (4.22, 0.6)):
    both(band(rng.standard_normal(n), 1200, 7000) * env(tc, 0.002, 0.04) * g)
    both(chime(tc, [523 if tc < 4.1 else 659], 0.12, 0.4))
rise = band(rng.standard_normal(n), 3000, 14000) * env(4.4, 0.5, 0.03, 3) * 0.25
dt = np.clip(t - 4.4, 0, None)
boom = np.sin(2 * np.pi * (36 * dt + 40 * (1 - np.exp(-dt * 10)) / 10)) * (t >= 4.4) * np.exp(-dt / 1.1)
hit = band(rng.standard_normal(n), 60, 3000) * env(4.4, 0.004, 0.14) * 0.7
both(rise + boom * 0.95 + hit)
both(chime(4.4, [784, 1175, 1568, 2349], 0.13, 2.2))
# 6) brilho atravessando o logo
both(band(rng.standard_normal(n), 6000, 14000) * env(5.5, 0.6, 0.4, 2) * 0.08, 0.3)
# 7) assinatura
both(chime(6.05, [1046.5, 1568, 2093], 0.10, 1.4), -0.2)
both(band(rng.standard_normal(n), 5000, 13000) * env(6.6, 0.4, 0.4) * 0.08)
for i in range(3): both(chime(6.97 + i * 0.12, [2637 + i * 300], 0.06, 0.07))

mix = np.stack([L, R], 1); mix /= np.abs(mix).max() / 0.89
k = int(0.01 * SR); mix[:k] *= np.linspace(0, 1, k)[:, None]
with wave.open("splash_audio_v2.wav", "wb") as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((mix * 32767).astype("<i2").tobytes())
print("ok splash_audio_v2.wav")
