"""Trilha original de "Lua em Falta" — sintetizada do zero em numpy (110 BPM, Lá menor).

Estrutura (em batidas):
  0-3    riser + "ticks" sincronizados com os flashes, impacto no título
  3-29   groove lo-fi/indie: bumbo em cada corte, palmas no contratempo, hats,
         pad com sidechain, baixo, arpejo dedilhado; melodia de vidro a partir da 19
  29-35  breakdown: sem bateria, piano + brilho subindo junto com a lua; acorde final
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 110
B = 60 / BPM
DUR = 19.7
N = int(DUR * SR)
rng = np.random.default_rng(110)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def at(beat):
    return int(beat * B * SR)


def env_adsr(n, a, d, s, r, sus_len):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sl = max(0, int(sus_len * SR) - a - d)
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)), np.full(sl, s), np.linspace(s, 0, max(r, 1))])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))


def place(buf, x, start, gain=1.0):
    if start >= len(buf):
        return
    end = min(len(buf), start + len(x))
    if buf.ndim == 2:
        buf[start:end] += (x[:end - start] * gain if x.ndim == 2 else x[:end - start, None] * gain)
    else:
        buf[start:end] += x[:end - start] * gain


def fft_filter(x, lo=None, hi=None, order=2):
    n = len(x)
    X = np.fft.rfft(x, n)
    f = np.fft.rfftfreq(n, 1 / SR)
    m = np.ones_like(f)
    if hi:
        m /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        m /= np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * m, n)


def sweep(x, f0, f1, kind='lp', blk=2048):
    """Filtro com corte variando no tempo (overlap-add)."""
    hop = blk // 2
    win = np.hanning(blk)
    out = np.zeros(len(x) + blk)
    xp = np.pad(x, (0, blk))
    f = np.fft.rfftfreq(blk, 1 / SR)
    nb = len(x) // hop + 1
    for i in range(nb):
        k = i / max(1, nb - 1)
        fc = f0 * (f1 / f0) ** k
        seg = xp[i * hop:i * hop + blk] * win
        m = 1 / np.sqrt(1 + (f / fc) ** 4) if kind == 'lp' else 1 / np.sqrt(1 + (fc / np.maximum(f, 1)) ** 4)
        out[i * hop:i * hop + blk] += np.fft.irfft(np.fft.rfft(seg) * m, blk)
    return out[:len(x)]


# ---------------------------------------------------------------- instrumentos
def saw_add(freq, n, bright=1.0, detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    nh = int(min(40, 9000 / freq))
    for h in range(1, nh + 1):
        amp = 1 / h * np.exp(-h / (6 * bright))
        out += amp * np.sin(2 * np.pi * freq * (1 + detune) * h * t + phase * h)
    return out


def pad_note(m, dur, bright=1.0):
    n = int((dur + 1.2) * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for i, d in enumerate([-.006, -.002, .0015, .005]):
        ph = rng.uniform(0, 6)
        v = saw_add(mtof(m), n, bright, d, ph)
        if i % 2:
            L += v * .8
            R += v * .5
        else:
            L += v * .5
            R += v * .8
    e = env_adsr(n, .35, .4, .8, 1.1, dur)
    return np.stack([L * e, R * e], 1) * .07


def pluck(m, dur=1.2, bright=.5):
    f = mtof(m)
    p = int(SR / f)
    n = int(dur * SR)
    y = np.zeros(n + p + 3)
    y[1:p + 1] = fft_filter(rng.uniform(-1, 1, p), hi=3000 * bright + 400) if p > 64 else rng.uniform(-1, 1, p)
    i = p + 1
    while i < n + p + 1:
        j = min(i + p, n + p + 1)
        y[i:j] = .5 * (y[i - p:j - p] + y[i - p - 1:j - p - 1]) * .996
        i = j
    out = y[p + 1:p + 1 + n]
    return out * np.linspace(1, 0, n) ** .5


def glass(m, dur):
    n = int((dur + .8) * SR)
    t = np.arange(n) / SR
    f = mtof(m) * (1 + .004 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / .4, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    v = np.sin(ph) + .35 * np.sin(2 * ph) + .12 * np.sin(3 * ph) + .08 * np.sin(4.01 * ph)
    return v * env_adsr(n, .02, .3, .6, .7, dur) * .16


def bell(m, dur=2.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    v = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in
            [(1, 1, 1.6), (2.76, .5, 3), (5.4, .25, 5), (8.93, .12, 8)])
    return v * .18


def kick(gain=1.0, length=.45, deep=False):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = (40 if deep else 48) + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    v = np.sin(ph) * np.exp(-t * (4 if deep else 7.5))
    v += fft_filter(rng.uniform(-1, 1, n), lo=1500) * np.exp(-t * 300) * .3
    return np.tanh(v * 1.6) * gain * .9


def clap(gain=1.0):
    n = int(.35 * SR)
    t = np.arange(n) / SR
    nz = fft_filter(rng.uniform(-1, 1, n), lo=900, hi=6000)
    e = np.zeros(n)
    for o in (0, .011, .022):
        e += (t >= o) * np.exp(-(t - o) * 90) * (t >= o)
    e += np.exp(-t * 14) * .35
    return nz * e * gain * .45


def hat(gain=1.0, open_=False):
    n = int((.35 if open_ else .06) * SR)
    t = np.arange(n) / SR
    nz = fft_filter(rng.uniform(-1, 1, n), lo=7000)
    return nz * np.exp(-t * (9 if open_ else 70)) * gain * .33


def tick(gain, pitch):
    n = int(.03 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * pitch * t) * .6 + rng.uniform(-1, 1, n) * .4) * np.exp(-t * 160) * gain


def reverb_ir(sec=2.6, seed=1):
    r = np.random.default_rng(seed)
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = r.uniform(-1, 1, n) * np.exp(-t * 3.0 / sec * 2.2)
    ir = fft_filter(ir, lo=200, hi=6500)
    ir[:int(.02 * SR)] *= np.linspace(0, 1, int(.02 * SR))
    return ir / np.sqrt(np.sum(ir ** 2))


def convolve(x, ir):
    n = len(x) + len(ir)
    nf = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


# ---------------------------------------------------------------- arranjo
def build():
    drums = np.zeros((N, 2))
    music = np.zeros((N, 2))
    lead = np.zeros((N, 2))
    sub = np.zeros(N)
    fx = np.zeros((N, 2))
    duck = np.ones(N)

    # intro: riser de ruído + ticks em cada flash (2 quadros = 1/15 s)
    n_in = at(3)
    nz = rng.uniform(-1, 1, n_in)
    rs = sweep(nz, 300, 9000, 'lp') * np.linspace(.05, 1, n_in) ** 2 * .22
    place(fx, np.stack([rs, np.roll(rs, 300)], 1), 0)
    for j in range(18):
        s = int(j * 2 / 30 * SR)
        place(fx, np.stack([tick(.35, 400 + j * 90)] * 2, 1), s)
    t_title = int(36 / 30 * SR)
    place(drums, np.stack([kick(1.0, 1.2, deep=True)] * 2, 1), t_title, .9)
    place(music, np.stack([bell(81, 3.0), bell(81, 3.0)], 1), t_title, .7)
    n_rv = at(3) - t_title
    rv = fft_filter(rng.uniform(-1, 1, n_rv), lo=4000) * np.linspace(0, 1, n_rv) ** 3 * .3
    place(fx, np.stack([rv, rv], 1), t_title)

    # harmonia (batida inicial, baixo, notas do pad)
    chords = [
        (3, 4, 45, [60, 64, 67, 71]),   # Am9
        (7, 4, 41, [57, 60, 64, 67]),   # Fmaj9
        (11, 4, 48, [55, 59, 62, 64]),  # Cmaj9
        (15, 4, 43, [59, 62, 64, 69]),  # G6/9
        (19, 4, 45, [60, 64, 67, 71]),
        (23, 4, 41, [57, 60, 64, 67]),
        (27, 2, 48, [55, 59, 62, 64]),
        (29, 4, 41, [57, 59, 64, 72]),  # Fmaj7#11 (breakdown)
        (33, 4, 45, [60, 64, 69, 71]),  # Am(add9) final
    ]
    for b0, nb, root, notes in chords:
        bright = .6 if b0 < 11 else (1.0 if b0 < 29 else .7)
        for m in notes:
            place(music, pad_note(m, nb * B + (.6 if b0 >= 29 else 0), bright), at(b0))
        if b0 < 29:
            for k in range(nb * 2):
                n = int(B / 2 * SR)
                t = np.arange(n) / SR
                v = np.sin(2 * np.pi * mtof(root - 12) * t) * np.minimum(1, t * 200) * np.exp(-t * 3)
                v += .3 * np.sin(4 * np.pi * mtof(root - 12) * t) * np.exp(-t * 8)
                place(sub, v * .5, at(b0 + k * .5))
        else:
            n = int((nb * B + 1.5) * SR)
            t = np.arange(n) / SR
            place(sub, np.sin(2 * np.pi * mtof(root - 12) * t) * np.exp(-t * .9) * .45 * np.minimum(1, t * 50), at(b0))
        arp = [0, 2, 1, 3, 2, 1, 3, 2]
        step = .5 if b0 < 29 else 1.0
        for k in range(int(nb / step)):
            m = notes[arp[k % 8]] + 12
            if b0 >= 29 and k % 2:
                continue
            p = pluck(m, 1.4 if b0 < 29 else 2.5, .5 if b0 < 15 else .8)
            pan = .5 + .35 * np.sin(k * 1.7)
            place(music, np.stack([p * (1 - pan), p * pan], 1) * .9, at(b0 + k * step))

    # melodia de vidro (batidas 19-29)
    mel = [(19, 76, 1.5), (20.5, 74, .5), (21, 72, 1), (22, 71, 1), (23, 69, 1.5), (24.5, 72, .5),
           (25, 76, 2), (27, 79, 1), (28, 76, 1)]
    for b0, m, d in mel:
        g = glass(m, d * B)
        place(lead, np.stack([g, g], 1), at(b0))
        for e in range(1, 4):   # eco ping-pong de 3/8
            de = at(b0 + .75 * e)
            gg = fft_filter(g, hi=3000) * .45 ** e
            place(lead, np.stack([gg, gg * .3] if e % 2 else [gg * .3, gg], 1), de)

    # bateria (batidas 3-29)
    for b in np.arange(3, 29, .25):
        rel = b - 3
        if rel % 2 == 0:
            place(drums, np.stack([kick(1.0)] * 2, 1), at(b))
            s = at(b)
            dn = int(.38 * SR)
            if s < N:
                seg = min(dn, N - s)
                duck[s:s + seg] = np.minimum(duck[s:s + seg], 1 - .6 * np.exp(-np.arange(seg) / SR * 9))
        if b >= 11 and rel % 2 == 1.5:
            place(drums, np.stack([kick(.55)] * 2, 1), at(b))
        if b >= 7 and rel % 2 == 1:
            place(drums, np.stack([clap(1.0) * .9, clap(1.0)], 1), at(b))
        if rel % 1 == .5 and b >= 5:
            g = hat(.9)
            place(drums, np.stack([g * .6, g], 1), at(b))
        elif rel % .5 == .25 and b >= 11:
            g = hat(.45)
            place(drums, np.stack([g, g * .6], 1), at(b + .03))
        if rel % 4 == 3.5 and b >= 7:
            g = hat(.7, True)
            place(drums, np.stack([g, g], 1), at(b))
    for k, b in enumerate(np.arange(28, 29, .125)):   # virada
        place(drums, np.stack([clap(.25 + k * .08)] * 2, 1), at(b))
    rev_c = fft_filter(rng.uniform(-1, 1, at(1.5)), lo=5000) * np.linspace(0, 1, at(1.5)) ** 4 * .25
    place(fx, np.stack([rev_c, rev_c], 1), at(27.5))

    # breakdown: brilho subindo com a lua + impacto final
    n_up = at(4.6)
    sh = sweep(rng.uniform(-1, 1, n_up), 800, 12000, 'hp') * np.linspace(0, 1, n_up) ** 2 * .07
    place(fx, np.stack([sh, np.roll(sh, 500)], 1), at(29))
    for k, m in enumerate([88, 84, 81, 88, 91, 93]):
        b_ = bell(m, 2.2) * .5
        place(fx, np.stack([b_ * (k % 2), b_ * (1 - k % 2)], 1) + np.stack([b_, b_], 1) * .4, at(29.5 + k * .66))
    place(drums, np.stack([kick(1.0, 1.6, deep=True)] * 2, 1), at(33), .85)
    for m in (69, 76, 81):
        b_ = bell(m, 4.0)
        place(music, np.stack([b_, b_], 1), at(33), .8)

    # vinil
    crack = np.zeros(N)
    idx = rng.integers(0, N, 900)
    crack[idx] = rng.uniform(-1, 1, 900) * rng.random(900) ** 3
    crack = fft_filter(crack, lo=1500, hi=9000) * 1.6 + fft_filter(rng.uniform(-1, 1, N), lo=3000, hi=8000) * .006

    music *= duck[:, None] ** 1.0
    sub *= duck
    sub = np.tanh(sub * 1.4) * .5
    ir_l, ir_r = reverb_ir(2.8, 1), reverb_ir(2.8, 2)
    send = music * .55 + lead * .9 + fx * .5 + drums * np.array([.12, .12])
    wet = np.stack([convolve(send[:, 0], ir_l), convolve(send[:, 1], ir_r)], 1)
    mix = drums * .95 + music + lead + fx + sub[:, None] + wet * .55 + crack[:, None] * .7
    mix = fft_filter(mix[:, 0], lo=28)[:, None] * np.array([1, 0]) + fft_filter(mix[:, 1], lo=28)[:, None] * np.array([0, 1])
    t = np.arange(N) / SR
    fade = np.clip((DUR - t) / 1.2, 0, 1) ** 1.5
    mix *= fade[:, None]
    mix *= np.clip(t / .02, 0, 1)[:, None]
    peak = np.max(np.abs(mix))
    mix = np.tanh(mix / peak * 1.25) / np.tanh(1.25) * .93
    return mix


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'trilha.wav'
    m = build()
    pcm = (np.clip(m, -1, 1) * 32767).astype(np.int16)
    with wave.open(out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('ok', out, f'{len(m) / SR:.2f}s')
