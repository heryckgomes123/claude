"""Ferramentas de desenho procedural (numpy + Pillow) para o reel "Lua em Falta".

Tudo trabalha em float32 RGB [0..1+] no espaço da "placa" (plate), que é 20%
maior que o quadro final para permitir movimentos de câmera.
"""
import numpy as np
from PIL import Image, ImageDraw

W, H = 864, 1536          # placa (plate)
OW, OH = 720, 1280        # saída 9:16
FPS = 30
BPM = 110
BEAT = 60.0 / BPM

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
U = XX / W
V = YY / H


# ----------------------------------------------------------------- cores
def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0


def col(c):
    return hexc(c) if isinstance(c, str) else np.asarray(c, np.float32)


def mix(a, b, t):
    return a + (b - a) * t


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0 + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


def grad1d(x, stops):
    """x: array em [0,1]; stops: [(pos, cor)] -> array (...,3)."""
    pos = np.array([p for p, _ in stops], np.float32)
    cs = np.stack([col(c) for _, c in stops])
    out = np.empty(x.shape + (3,), np.float32)
    for k in range(3):
        out[..., k] = np.interp(x, pos, cs[:, k])
    return out


def vgrad(stops, y0=0.0, y1=1.0):
    t = np.clip((V - y0) / (y1 - y0), 0, 1)
    return grad1d(t, stops)


def lum(img):
    return img[..., 0] * 0.299 + img[..., 1] * 0.587 + img[..., 2] * 0.114


def gray(img, tint=(1, 1, 1)):
    return lum(img)[..., None] * np.asarray(tint, np.float32)


def saturate(img, s):
    l = lum(img)[..., None]
    return l + (img - l) * s


# ----------------------------------------------------------------- blur / resize
def resizeF(a, w, h, method=Image.BILINEAR):
    if a.ndim == 2:
        return np.asarray(Image.fromarray(np.ascontiguousarray(a, np.float32)).resize((w, h), method))
    return np.stack([resizeF(a[..., i], w, h, method) for i in range(a.shape[2])], -1)


def _box(a, r, axis):
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    p = np.pad(a, pad, mode='edge')
    c = np.cumsum(p, axis=axis, dtype=np.float32)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return (hi - lo) / (2 * r + 1)


def blur(a, s, sx=None):
    """Gaussiana aproximada (3 passes de box). sx permite blur anisotrópico."""
    sy = s
    sx = s if sx is None else sx
    if max(sx, sy) <= 0.3:
        return a
    h, w = a.shape[:2]
    k = max(1, int(min(sx, sy) / 3)) if min(sx, sy) > 6 else 1
    b = a if k == 1 else resizeF(a, max(2, w // k), max(2, h // k))
    for _ in range(3):
        ry = int(round((np.sqrt(4 * (sy / k) ** 2 + 1) - 1) / 2))
        rx = int(round((np.sqrt(4 * (sx / k) ** 2 + 1) - 1) / 2))
        if ry >= 1:
            b = _box(b, ry, 0)
        if rx >= 1:
            b = _box(b, rx, 1)
    return b if k == 1 else resizeF(b, w, h)


# ----------------------------------------------------------------- ruído
def vnoise(h, w, cx, cy=None, seed=0):
    cy = cx if cy is None else cy
    gh, gw = int(h / cy) + 4, int(w / cx) + 4
    g = np.random.default_rng(seed).random((gh, gw), dtype=np.float32)
    big = resizeF(g, int(gw * cx), int(gh * cy), Image.BICUBIC)
    return big[:h, :w]


def fbm(h, w, cell, octaves=5, seed=0, persist=0.5, aniso=1.0):
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        c = max(1.0, cell / 2 ** o)
        out += vnoise(h, w, c * aniso, c, seed + o * 17) * amp
        tot += amp
        amp *= persist
    return out / tot


def ridge1d(n, cell, octaves=4, seed=0):
    """Linha 1D de ruído (para cristas de montanhas / dunas)."""
    return fbm(1, n, cell, octaves, seed)[0]


# ----------------------------------------------------------------- composição
def over(img, c, m):
    m = m[..., None] if m.ndim == 2 else m
    c = col(c) if not isinstance(c, np.ndarray) or c.ndim == 1 else c
    img += (c - img) * m
    return img


def add(img, c, m, amt=1.0):
    img += (m[..., None] if m.ndim == 2 else m) * col(c) * amt
    return img


def glow(img, m, c, sigma, amt=1.0):
    return add(img, c, blur(m, sigma), amt)


def screen(img, layer):
    return 1 - (1 - img) * (1 - np.clip(layer, 0, 1))


# ----------------------------------------------------------------- máscaras vetoriais
class Mask:
    """Desenho com supersampling (anti-aliasing) -> máscara float [0,1]."""

    def __init__(self, w=W, h=H, ss=2):
        self.w, self.h, self.ss = w, h, ss
        self.im = Image.new('L', (w * ss, h * ss), 0)
        self.d = ImageDraw.Draw(self.im)

    def _p(self, pts):
        s = self.ss
        return [(float(x) * s, float(y) * s) for x, y in pts]

    def poly(self, pts, f=255):
        self.d.polygon(self._p(pts), fill=f)
        return self

    def ellipse(self, cx, cy, rx, ry=None, f=255):
        ry = rx if ry is None else ry
        s = self.ss
        self.d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=f)
        return self

    def ring(self, cx, cy, rx, ry, width, f=255):
        s = self.ss
        self.d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], outline=f, width=max(1, int(width * s)))
        return self

    def rect(self, x0, y0, x1, y1, f=255, r=0):
        s = self.ss
        if r > 0:
            self.d.rounded_rectangle([x0 * s, y0 * s, x1 * s, y1 * s], radius=r * s, fill=f)
        else:
            self.d.rectangle([x0 * s, y0 * s, x1 * s, y1 * s], fill=f)
        return self

    def line(self, pts, width, f=255):
        self.d.line(self._p(pts), fill=f, width=max(1, int(width * self.ss)), joint='curve')
        return self

    def capsule(self, p1, p2, r, f=255):
        self.line([p1, p2], 2 * r, f)
        self.ellipse(p1[0], p1[1], r, r, f)
        self.ellipse(p2[0], p2[1], r, r, f)
        return self

    def arr(self):
        return np.asarray(self.im.resize((self.w, self.h), Image.BOX), np.float32) / 255.0


# ----------------------------------------------------------------- personagem
POSES = {
    'stand': dict(neck=(0, .84), head=(0, .915), sh=(.105, .795), el=(.13, .62), ha=(.125, .47),
                  hip=(.055, .50), kn=(.06, .27), an=(.065, .035),
                  coat=[(-.115, .81), (.115, .81), (.13, .55), (.15, .30), (-.15, .30), (-.13, .55)]),
    'open': dict(neck=(0, .84), head=(0, .915), sh=(.105, .795), el=(.25, .84), ha=(.40, .92),
                 hip=(.055, .50), kn=(.065, .27), an=(.08, .035),
                 coat=[(-.115, .81), (.115, .81), (.13, .55), (.16, .30), (-.16, .30), (-.13, .55)]),
    'sit': dict(neck=(0, .66), head=(0, .735), sh=(.105, .615), el=(.15, .47), ha=(.10, .385),
                hip=(.07, .38), kn=(.085, .35), an=(.08, .04),
                coat=[(-.115, .63), (.115, .63), (.135, .45), (.145, .36), (-.145, .36), (-.135, .45)]),
    'climb': dict(neck=(0, .84), head=(0, .915), sh=(.105, .795), el=(.14, .63), ha=(.15, .50),
                  hip=(.055, .50), kn=(.06, .27), an=(.065, .035), lkn=(-.07, .40), lan=(-.08, .20),
                  coat=[(-.115, .81), (.115, .81), (.13, .55), (.15, .32), (-.15, .32), (-.13, .55)]),
}


def figure(mk, x, y, h, pose='stand', head=True, head_r=.062, legs_to=None):
    """Silhueta de pessoa de sobretudo. (x,y)=centro dos pés na placa, h=altura px.
    Retorna a posição (cx, cy, r) da cabeça."""
    P = POSES[pose]

    def pt(p, side=1):
        return (x + p[0] * side * h, y - p[1] * h)

    mk.poly([pt(p) for p in P['coat']])
    for side in (-1, 1):
        mk.capsule(pt(P['sh'], side), pt(P['el'], side), .032 * h)
        mk.capsule(pt(P['el'], side), pt(P['ha'], side), .028 * h)
        kn, an = P['kn'], P['an']
        if side == -1 and 'lkn' in P:
            kn, an = (-P['lkn'][0], P['lkn'][1]), (-P['lan'][0], P['lan'][1])
        mk.capsule(pt(P['hip'], side), pt(kn, side), .045 * h)
        mk.capsule(pt(kn, side), pt(an, side), .036 * h)
        ax, ay = pt(an, side)
        mk.ellipse(ax + side * .02 * h, ay + .01 * h, .045 * h, .022 * h)
    sy = P['sh'][1]
    mk.poly([pt((-.11, sy + .005)), pt((.11, sy + .005)), pt((.03, sy + .065)), pt((-.03, sy + .065))])
    mk.capsule(pt(P['neck']), pt((0, P['neck'][1] - .05)), .03 * h)
    hx, hy = pt(P['head'])
    if head:
        mk.ellipse(hx, hy, head_r * h * .9, head_r * h)
    return hx, hy, head_r * h * 1.25


# ----------------------------------------------------------------- lua
def moon_sprite(r, seed=3, base=(1.0, .965, .87), phase=None):
    """Disco lunar com mares, crateras e escurecimento de borda. -> (rgb, alpha) quadrados."""
    n = int(r * 2 + 6)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    c = (n - 1) / 2
    dx, dy = (xx - c) / r, (yy - c) / r
    d = np.sqrt(dx * dx + dy * dy)
    alpha = np.clip((1 - d) * r, 0, 1)
    z = np.sqrt(np.clip(1 - d * d, 0, 1))
    maria = fbm(n, n, max(4, r * .7), 4, seed)
    tone = 1 - .30 * smooth(.45, .7, maria)
    rng = np.random.default_rng(seed)
    for _ in range(int(10 + r / 4)):
        cx, cy = rng.uniform(-.8, .8, 2)
        cr = rng.uniform(.04, .16)
        dd = np.sqrt((dx - cx) ** 2 + (dy - cy) ** 2) / cr
        tone -= .10 * np.exp(-((dd - .8) ** 2) * 18) * (dx - cx < 0)
        tone += .07 * np.exp(-((dd - .8) ** 2) * 18) * (dx - cx >= 0)
        tone -= .05 * (dd < .8)
    shade = (.55 + .45 * z) * tone
    if phase is not None:   # -1..1: posição do terminador (fase da lua)
        shade = shade * (.04 + .96 * smooth(-.07, .07, dx - phase * np.sqrt(np.clip(1 - dy * dy, 0, 1))))
    rgb = shade[..., None] * np.asarray(base, np.float32)
    return rgb.astype(np.float32), alpha.astype(np.float32)


def paste(img, rgb, alpha, cx, cy, amt=1.0, mode='over'):
    """Cola sprite centrado em (cx,cy) com recorte nas bordas."""
    h, w = alpha.shape
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    X0, Y0 = max(0, x0), max(0, y0)
    X1, Y1 = min(img.shape[1], x0 + w), min(img.shape[0], y0 + h)
    if X1 <= X0 or Y1 <= Y0:
        return img
    sa = alpha[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0, None] * amt
    sr = rgb[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0] if rgb.ndim == 3 else rgb
    reg = img[Y0:Y1, X0:X1]
    if mode == 'add':
        reg += sr * sa
    else:
        reg += (sr - reg) * sa
    return img


def moon_head(img, cx, cy, r, glow_col=(1, .95, .8), glow_amt=1.0, seed=3, base=(1.0, .965, .87)):
    rgb, a = moon_sprite(r, seed, base)
    m = np.zeros(img.shape[:2], np.float32)
    paste(m[..., None], np.ones((1,), np.float32), a, cx, cy)  # máscara
    img = glow(img, m, glow_col, r * 1.2, .55 * glow_amt)
    img = glow(img, m, glow_col, r * 4.5, .45 * glow_amt)
    img = glow(img, m, glow_col, r * 12, .25 * glow_amt)
    paste(img, rgb * 1.15, a, cx, cy)
    return img


def disc_mask(cx, cy, r):
    d = np.sqrt((XX - cx) ** 2 + (YY - cy) ** 2)
    return np.clip(r - d + .5, 0, 1)


# ----------------------------------------------------------------- estrelas
def stars(img, n, seed, ymax=1.0, bright=1.0, big=0, tint=(1, 1, 1), region=None):
    rng = np.random.default_rng(seed)
    layer = np.zeros(img.shape[:2], np.float32)
    xs = rng.integers(0, W, n)
    ys = (rng.random(n) ** 1.0 * ymax * H).astype(int)
    if region is not None:
        keep = region[ys.clip(0, H - 1), xs]
        rnd = rng.random(n)
        xs, ys = xs[rnd < keep], ys[rnd < keep]
    b = (rng.random(len(xs)) ** 6) * bright + .08 * bright
    np.add.at(layer, (ys.clip(0, H - 1), xs), b)
    img = add(img, tint, blur(layer, .6), 2.2)
    if big:
        bl = np.zeros_like(layer)
        bx, by = rng.integers(0, W, big), (rng.random(big) * ymax * H).astype(int)
        bl[by.clip(0, H - 1), bx] = rng.uniform(.6, 1.0, big) * bright
        img = add(img, tint, blur(bl, 1.2), 30)
        img = add(img, tint, blur(bl, 6), 60)
        sp = blur(bl, .8, 14) + blur(bl, 14, .8)
        img = add(img, tint, sp, 18)
    return img
