"""Renderiza os quadros de "Lua em Falta" (720x1280, 30 fps) em PNG.

Linha do tempo (110 BPM, 1 batida = 0,545 s):
  batidas 0-3   intro: flashes de 2 quadros com todas as cenas + cartela de título
  batidas 3-29  13 cenas, uma a cada 2 batidas (corte no bumbo)
  batidas 29-35 cena final (a lua volta ao céu) + fade para preto
"""
import os
import sys
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from lib import BEAT, FPS, OH, OW, H, W, blur, resizeF
from scenes import SCENES

INTRO_BEATS = 3
SCENE_BEATS = 2
FINAL_BEATS = 6
TAIL = 0.6                     # segundos de preto no fim (cauda do reverb)
N_FLASH = 18
TITLE_FROM = 2 * N_FLASH       # quadro em que a cartela de título entra

T_INTRO = INTRO_BEATS * BEAT
T_SCENES = T_INTRO + (len(SCENES) - 1) * SCENE_BEATS * BEAT
T_END = T_SCENES + FINAL_BEATS * BEAT
DURATION = T_END + TAIL
NFRAMES = int(round(DURATION * FPS))

FONT_DIR = '/usr/share/fonts/opentype/inter'


def font(name, size):
    try:
        return ImageFont.truetype(os.path.join(FONT_DIR, name), size)
    except OSError:
        return ImageFont.load_default()


def scene_at(f):
    """-> ('intro', None, None) | ('scene', idx, t_local, f_local)"""
    t = f / FPS
    if t < T_INTRO:
        return ('intro', None, t, f)
    if t < T_SCENES:
        k = int((t - T_INTRO) / (SCENE_BEATS * BEAT))
        t0 = T_INTRO + k * SCENE_BEATS * BEAT
        return ('scene', k, t - t0, f - int(round(t0 * FPS)))
    k = len(SCENES) - 1
    return ('scene', k, t - T_SCENES, f - int(round(T_SCENES * FPS)))


def scene_dur(k):
    return FINAL_BEATS * BEAT if k == len(SCENES) - 1 else SCENE_BEATS * BEAT


# ---------------------------------------------------------------- câmera
def ease(x):
    return 1 - (1 - x) ** 2.2 if x < 1 else 1.0


def camera(img, z, cx, cy, rng):
    cx += rng.normal(0, .35) / W
    cy += rng.normal(0, .35) / H
    s = (W / OW) / z
    c0 = cx * W - OW / 2 * s
    f0 = cy * H - OH / 2 * s
    c0 = np.clip(c0, 0, W - OW * s)
    f0 = np.clip(f0, 0, H - OH * s)
    u8 = Image.fromarray((np.clip(img, 0, 1) * 255 + .5).astype(np.uint8))
    out = u8.transform((OW, OH), Image.AFFINE, (s, 0, c0, 0, s, f0), resample=Image.BICUBIC)
    return np.asarray(out, np.float32) / 255.0


# ---------------------------------------------------------------- pós-produção
_yy, _xx = np.mgrid[0:OH, 0:OW].astype(np.float32)
_r = np.sqrt(((_xx - OW / 2) / (OW / 2)) ** 2 * .8 + ((_yy - OH / 2) / (OH / 2)) ** 2)
VIGNETTE = (1 - .42 * np.clip(_r / 1.25, 0, 1) ** 2.4)[..., None]


def post(img, rng, sat=1.0, flash=0.0):
    lumi = img @ np.array([.299, .587, .114], np.float32)
    hi = np.clip(lumi - .62, 0, None)[..., None] * img
    small = resizeF(hi, OW // 4, OH // 4)
    bl = blur(small, 3) * .6 + blur(small, 12) * .6
    img = img + resizeF(bl, OW, OH) * np.array([1.0, .92, .85], np.float32) * .55
    l = (img @ np.array([.299, .587, .114], np.float32))[..., None]
    img = l + (img - l) * sat
    img = img + flash
    img = np.clip(img, 0, 1.6)
    img = img / (1 + .18 * img)            # ombro suave de filme
    img = img * 1.12
    img = .028 + img * (1 - .028)          # pretos levemente lavados
    img = img + (np.array([-.012, .004, .016]) * (1 - img)) + np.array([.012, .004, -.012]) * img
    img[..., 0] = np.roll(img[..., 0], 1, 1)
    img[..., 2] = np.roll(img[..., 2], -1, 1)
    img = img * VIGNETTE
    g = rng.normal(0, 1, (OH // 2, OW // 2)).astype(np.float32)
    g = np.asarray(Image.fromarray(g).resize((OW, OH), Image.BILINEAR))
    lumi = img.mean(2, keepdims=True)
    img = img + g[..., None] * .045 * (.35 + lumi * (1 - lumi) * 2.2)
    if rng.random() < .25:
        for _ in range(rng.integers(1, 4)):
            x, y = rng.integers(0, OW), rng.integers(0, OH)
            rr = rng.integers(1, 3)
            img[max(0, y - rr):y + rr, max(0, x - rr):x + rr] *= .4 if rng.random() < .6 else 1.8
    return np.clip(img, 0, 1)


def save(img, f, outdir):
    Image.fromarray((img * 255 + .5).astype(np.uint8)).save(os.path.join(outdir, f'{f:04d}.png'), compress_level=1)


# ---------------------------------------------------------------- intro
def flash_plan():
    r = np.random.default_rng(2026)
    order = list(r.permutation(len(SCENES)))
    order += list(r.permutation(len(SCENES)))[:N_FLASH - len(SCENES)]
    plan = []
    for j in range(N_FLASH):
        plan.append(dict(scene=int(order[j]), t=float(r.uniform(.1, .9)), z=float(r.uniform(1.1, 1.6)),
                         x=float(r.uniform(.35, .65)), y=float(r.uniform(.3, .7)),
                         mode=['normal', 'normal', 'neg', 'duo', 'normal'][j % 5]))
    return plan


def flash_look(img, mode):
    if mode == 'neg':
        return 1 - img
    if mode == 'duo':
        l = img.mean(2, keepdims=True)
        return np.array([.05, .02, .12]) + l * np.array([1.0, .45, .55])
    return img


def title_frame(f, rng):
    k = (f - TITLE_FROM) / (INTRO_BEATS * BEAT * FPS - TITLE_FROM)
    img = np.zeros((OH, OW, 3), np.float32) + .015
    lay = Image.new('L', (OW, OH), 0)
    d = ImageDraw.Draw(lay)
    big = font('InterDisplay-Bold.otf', 92)
    small = font('Inter-Medium.otf', 22)

    def spaced(text, fnt, y, track):
        widths = [d.textlength(ch, font=fnt) for ch in text]
        total = sum(widths) + track * (len(text) - 1)
        x = (OW - total) / 2
        for ch, w_ in zip(text, widths):
            d.text((x, y), ch, font=fnt, fill=255)
            x += w_ + track

    spaced('LUA', big, OH / 2 - 120, 26)
    spaced('EM FALTA', big, OH / 2 - 10, 18)
    spaced('UM CURTA EM 14 MUNDOS', small, OH / 2 + 120, 9)
    m = np.asarray(lay, np.float32) / 255
    sh = int(6 * (1 - k)) + 1
    img[..., 0] += np.roll(m, sh, 1) * .95
    img[..., 1] += m * .93
    img[..., 2] += np.roll(m, -sh, 1) * .88
    yy = (OH / 2 - 160) - 0
    d2 = np.sqrt((_xx - OW / 2) ** 2 + (_yy - yy) ** 2)
    img += (np.clip(16 - d2, 0, 1) * .95)[..., None] * np.array([1, .96, .86])
    img += (np.exp(-d2 / 60) * .35)[..., None] * np.array([1, .9, .7])
    leak = np.exp(-(((_xx - OW * (1.1 - k * .4)) / 260) ** 2 + ((_yy - OH * .3) / 600) ** 2))
    img += leak[..., None] * np.array([1, .45, .15]) * .55 * np.sin(np.pi * k)
    return img


# ---------------------------------------------------------------- tarefas
def render_scene(k, outdir):
    sc = SCENES[k]()
    sc.build()
    grade = getattr(sc, 'grade', {})
    (z0, x0, y0), (z1, x1, y1) = sc.cam
    dur = scene_dur(k)
    t_start = T_INTRO + k * SCENE_BEATS * BEAT
    f_start = int(round(t_start * FPS))
    f_end = int(round((t_start + dur) * FPS)) if k < len(SCENES) - 1 else NFRAMES
    for f in range(f_start, f_end):
        t = f / FPS - t_start
        fl = f - f_start
        rng = np.random.default_rng(f)
        e = ease(min(1.0, t / dur))
        punch = 1 + .045 * np.exp(-fl / 2.2)
        img = camera(sc.frame(min(t, dur)), (z0 + (z1 - z0) * e) * punch, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, rng)
        flash = .16 * np.exp(-fl / 1.2)
        img = post(img, rng, grade.get('sat', 1.0), flash)
        if k == len(SCENES) - 1:
            fade = np.clip((T_END - f / FPS) / 1.1, 0, 1)
            img = img * fade ** 1.6
        save(img, f, outdir)
    for j, p in enumerate(flash_plan()):
        if p['scene'] != k:
            continue
        rng = np.random.default_rng(10000 + j)
        img = camera(sc.frame(p['t']), p['z'], p['x'], p['y'], rng)
        img = post(flash_look(img, p['mode']), rng, 1.15, .08)
        for f in (2 * j, 2 * j + 1):
            save(img, f, outdir)
    return k


def render_title(outdir):
    for f in range(TITLE_FROM, int(round(T_INTRO * FPS))):
        rng = np.random.default_rng(f)
        save(post(title_frame(f, rng), rng), f, outdir)
    return 'title'


def task(arg):
    kind, val, outdir = arg
    return render_scene(val, outdir) if kind == 'scene' else render_title(outdir)


if __name__ == '__main__':
    outdir = sys.argv[1]
    only = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else None
    os.makedirs(outdir, exist_ok=True)
    print(f'duração {DURATION:.2f}s, {NFRAMES} quadros', flush=True)
    jobs = [('scene', k, outdir) for k in range(len(SCENES)) if only is None or k in only]
    if only is None:
        jobs.append(('title', 0, outdir))
    jobs.sort(key=lambda j: -1 if j[0] == 'scene' and j[1] == len(SCENES) - 1 else 0)
    with Pool(int(os.environ.get('JOBS', os.cpu_count() or 4))) as pool:
        for r in pool.imap_unordered(task, jobs):
            print('ok', r, flush=True)
