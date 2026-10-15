"""Trilha sonora sintetizada do splash (7.5 s, 48 kHz, estéreo) -> splash_audio.wav"""
import wave
import numpy as np

SR, DUR = 48000, 7.5
n = int(SR * DUR)
t = np.arange(n) / SR
rng = np.random.default_rng(3)

def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))

def env(t0, a, d, shape=2.0):
    e = np.zeros(n)
    up = (t >= t0 - a) & (t < t0); e[up] = ((t[up] - (t0 - a)) / a) ** shape
    dn = t >= t0; e[dn] = np.exp(-(t[dn] - t0) / d)
    return e

L = np.zeros(n); R = np.zeros(n)

# drone de fundo: quinta grave + brilho de ar
fade = np.clip(t / 1.2, 0, 1) * np.clip((DUR - t) / 0.4, 0, 1)
pad = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t + 0.4) + 0.3 * np.sin(2 * np.pi * 110 * t))
pad *= 0.10 * fade * (0.85 + 0.15 * np.sin(2 * np.pi * 0.4 * t))
air = band(rng.standard_normal(n), 3000, 9000) * 0.02 * fade
L += pad + air; R += pad + band(rng.standard_normal(n), 3000, 9000) * 0.02 * fade

# whooshes nas transições
for tc, g, pan in ((1.62, 0.55, -0.4), (3.12, 0.45, 0.4)):
    w = band(rng.standard_normal(n), 300, 5000) * env(tc, 0.35, 0.18, 2.5) * g
    L += w * (1 - pan) / 1.4; R += w * (1 + pan) / 1.4

# riser + impacto no flash do logo
rise = band(rng.standard_normal(n), 1500, 12000) * env(4.6, 0.9, 0.05, 3) * 0.35
boom = np.sin(2 * np.pi * (38 + 40 * np.exp(-np.clip(t - 4.6, 0, None) * 8)) * np.clip(t - 4.6, 0, None))
boom *= (t >= 4.6) * np.exp(-np.clip(t - 4.6, 0, None) / 0.9) * 0.9
hit = band(rng.standard_normal(n), 80, 2500) * env(4.6, 0.005, 0.12) * 0.5
for ch in (L, R): ch += rise + boom + hit

# brilho cristalino no match-cut e na revelação do nome
def chime(t0, freqs, g, d=1.2):
    out = np.zeros(n); m = t >= t0; tt = t[m] - t0
    for i, f in enumerate(freqs):
        out[m] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / (d / (1 + i * 0.3))) / (1 + i)
    return out * g
c1 = chime(5.9, [880, 1318.5, 1760], 0.10, 1.6)
c2 = chime(6.2, [1046.5, 1568, 2093], 0.09, 1.3)
sh = band(rng.standard_normal(n), 6000, 14000) * env(6.45, 0.3, 0.3) * 0.12
L += c1 + c2 * 0.7 + sh; R += c1 * 0.7 + c2 + sh

# ticks do loader ///
for i in range(3):
    tk = chime(6.98 + i * 0.12, [2637 + i * 300], 0.06, 0.08)
    L += tk; R += tk

mix = np.stack([L, R], 1)
mix /= np.abs(mix).max() / 0.89
mix[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
with wave.open("splash_audio.wav", "wb") as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((mix * 32767).astype("<i2").tobytes())
print("ok splash_audio.wav")
