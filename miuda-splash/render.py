"""
MIÚDA — splash cinematográfico (7.5 s, 1080x2336, 30 fps).

Roteiro
  0.00–1.75  A  cartas flutuantes   fade-in do preto, push-in lento, reflexo de luz
  1.50–3.25  B  fichas na mesa      dolly descendo das cartas até as fichas
  3.00–4.70  C  mesa vista de cima  pull-back com leve rotação
  4.55–6.15  D  logo M em vidro     flash de energia + reflexo varrendo o M
  5.85–7.50  E  logo + MIÚDA        match-cut do M, revela nome, slogan e loader ///

Uso: python3 render.py [saida.mp4] [--fps 30] [--audio]
"""
import sys, math, subprocess, os
import numpy as np
from PIL import Image

SRC = os.environ.get("MIUDA_SRC", "/root/.claude/uploads/dc935286-d016-5275-b328-1bc43594a707/")
IMG = {
    "cards": "c133641f-image.png",
    "chips": "6a005612-image.png",
    "table": "766b3cb4-image.png",
    "logo":  "2e414667-image.png",
    "brand": "3f7678c3-image.png",
}
W, H = 1080, 2336
SW, SH = 853, 1844                      # tamanho das imagens-fonte
FIT = max(W / SW, H / SH)
DUR = 7.5

args = sys.argv[1:]
OUT = next((a for a in args if a.endswith(".mp4")), "miuda_splash.mp4")
FPS = int(args[args.index("--fps") + 1]) if "--fps" in args else 30
N = int(round(DUR * FPS))

# ---------------------------------------------------------------- utilidades
def load(name):
    return Image.open(SRC + IMG[name]).convert("RGB")

def clamp01(x): return min(1.0, max(0.0, x))
def lin(t, a, b): return clamp01((t - a) / (b - a))
def smooth(x): x = clamp01(x); return x * x * (3 - 2 * x)
def ease_io(x): x = clamp01(x); return 0.5 - 0.5 * math.cos(math.pi * x)
def ease_out(x): x = clamp01(x); return 1 - (1 - x) ** 3
def ease_out5(x): x = clamp01(x); return 1 - (1 - x) ** 5
def mix(a, b, k): return a + (b - a) * k

def box_blur(a, r, axis):
    if r < 1: return a
    pad = [(0, 0)] * a.ndim; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis, dtype=np.float32)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return (hi - lo) / (2 * r + 1)

def blur(a, sigma):
    r = max(1, int(round(sigma * 0.93)))   # 3 box blurs ~ gaussiana
    for _ in range(3):
        a = box_blur(box_blur(a, r, 0), r, 1)
    return a

def lum(a): return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722

def camera(img, s, cx, cy, rot=0.0, size=(W, H)):
    """Renderiza img (PIL, coords fonte) com zoom s, ponto (cx,cy) no centro da tela, rotação rot (graus)."""
    k = 1.0 / (FIT * s)
    th = math.radians(rot)
    c, sn = math.cos(th), math.sin(th)
    ow, oh = size
    # src = C + R(-th) * (p - center) * k
    a, b = c * k, sn * k
    d, e = -sn * k, c * k
    x0 = cx - (a * ow / 2 + b * oh / 2)
    y0 = cy - (d * ow / 2 + e * oh / 2)
    out = img.transform(size, Image.AFFINE, (a, b, x0, d, e, y0), resample=Image.BICUBIC)
    arr = np.asarray(out, dtype=np.float32) / 255.0
    return arr[..., None] if arr.ndim == 2 else arr

def to_screen(px, py, s, cx, cy):
    return (W / 2 + (px - cx) * FIT * s, H / 2 + (py - cy) * FIT * s)

# ---------------------------------------------------------------- fontes
imgs = {k: load(k) for k in IMG}

# Plate limpa da imagem final (sem MIÚDA / slogan / listras) + máscaras retangulares suaves
brand = np.asarray(imgs["brand"], dtype=np.float32) / 255.0
L = lum(brand)
BOX = {"name": (126, 960, 750, 1130), "tag": (168, 1143, 698, 1186)}
BAR_BOXES = [(370, 1214, 410, 1262), (405, 1214, 443, 1262), (438, 1214, 482, 1262)]
def rect_mask(box, feather=6):
    x0, y0, x1, y1 = box
    m = np.zeros(L.shape, np.float32); m[y0:y1, x0:x1] = 1
    return np.clip(blur(m, feather), 0, 1)
plate = brand.copy()
def fill_box(box, decay):
    """Preenche a caixa interpolando, coluna a coluna, as bordas de cima e de baixo (o brilho de cima decai rápido)."""
    x0, y0, x1, y1 = box
    xs = slice(x0 - 40, x1 + 40)
    top = blur(brand[y0 - 8:y0 - 1, xs].mean(0, keepdims=True), 10)[0]
    bot = blur(brand[y1 + 1:y1 + 8, xs].mean(0, keepdims=True), 10)[0]
    yy_ = np.arange(y0 - 6, y1 + 6, dtype=np.float32)[:, None, None]
    lin_w = (yy_ - (y0 - 6)) / (y1 - y0 + 12)
    w_top = np.exp(-(yy_ - (y0 - 6)) / decay) if decay else 1 - lin_w
    w_top = w_top * (1 - lin_w) / np.maximum(w_top * (1 - lin_w) + (1 - w_top) * lin_w + lin_w * 1e-3, 1e-4)
    fill = top[None] * w_top + bot[None] * (1 - w_top)
    m = np.zeros(L.shape, np.float32); m[y0:y1, x0:x1] = 1; m = np.clip(blur(m, 5) * 1.8, 0, 1)
    region = (slice(y0 - 6, y1 + 6), xs)
    mm = m[region][..., None]
    plate[region] = plate[region] * (1 - mm) + fill * mm
fill_box(BOX["name"], 22)
fill_box(BOX["tag"], 0)
fill_box((366, 1210, 488, 1266), 0)
plate = np.clip(plate, 0, 1)
M_NAME, M_TAG = rect_mask(BOX["name"], 3), rect_mask(BOX["tag"], 3)
M_BARS = [rect_mask(b, 2) for b in BAR_BOXES]
def mask_img(m): return Image.fromarray((m * 255).astype(np.uint8))
lay_bars = [Image.fromarray((np.clip(brand * m[..., None], 0, 1) * 255).astype(np.uint8)) for m in M_BARS]
plate_img = Image.fromarray((plate * 255).astype(np.uint8))
brand_img = imgs["brand"]
mask_name, mask_tag = mask_img(M_NAME), mask_img(M_TAG)
mask_bars = [mask_img(m) for m in M_BARS]

# máscara de brilho do M (imagem "logo") para o reflexo de luz
logo_np = np.asarray(imgs["logo"], dtype=np.float32) / 255.0
m_mask = np.clip((logo_np[..., 1] - logo_np[..., 0] - 0.2) * 3.0, 0, 1)
m_mask[:500] = 0; m_mask[1200:] = 0
m_mask_img = Image.fromarray((m_mask * 255).astype(np.uint8)).convert("RGB")

# ---------------------------------------------------------------- precomputados
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
rr = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2)
vignette = np.clip(1.0 - 0.55 * np.clip(rr - 0.35, 0, 1) ** 1.6, 0, 1)[..., None]
TEAL = np.array([0.36, 1.0, 0.82], np.float32)
WARMW = np.array([0.85, 1.0, 0.96], np.float32)

rng = np.random.default_rng(7)
NP = 140
P = {
    "x": rng.uniform(0, W, NP), "y": rng.uniform(0, H, NP),
    "vy": rng.uniform(-90, -25, NP), "vx": rng.uniform(-18, 18, NP),
    "r": rng.choice([2, 3, 4, 6, 9, 14], NP, p=[.3, .25, .2, .13, .08, .04]),
    "a": rng.uniform(0.15, 0.6, NP), "ph": rng.uniform(0, 6.28, NP), "z": rng.uniform(0.6, 1.6, NP),
}
SPR = {}
for r in set(P["r"].tolist()):
    R = int(r * 3)
    g = np.mgrid[-R:R + 1, -R:R + 1].astype(np.float32)
    k = np.exp(-(g[0] ** 2 + g[1] ** 2) / (2 * r * r))
    SPR[r] = (k[..., None] * TEAL).astype(np.float32)

def particles(frame, t, gain):
    if gain <= 0: return
    for i in range(NP):
        r = int(P["r"][i]); spr = SPR[r]; R = spr.shape[0] // 2
        x = (P["x"][i] + P["vx"][i] * t * P["z"][i]) % W
        y = (P["y"][i] + P["vy"][i] * t * P["z"][i]) % H
        a = P["a"][i] * gain * (0.6 + 0.4 * math.sin(t * 2.3 + P["ph"][i]))
        if r >= 9: a *= 0.35                                   # bokeh grande = mais sutil
        xi, yi = int(x), int(y)
        x0, y0, x1, y1 = xi - R, yi - R, xi + R + 1, yi + R + 1
        sx0, sy0 = max(0, -x0), max(0, -y0)
        sx1, sy1 = spr.shape[1] - max(0, x1 - W), spr.shape[0] - max(0, y1 - H)
        if sx1 <= sx0 or sy1 <= sy0: continue
        frame[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] += spr[sy0:sy1, sx0:sx1] * a

def sweep(t, start, end, angle_deg, width, travel=(-0.2, 1.2)):
    """Banda de luz diagonal (0..1) que atravessa a tela entre start e end."""
    if not (start <= t <= end): return None
    ph = math.radians(angle_deg)
    u = (xx * math.cos(ph) + yy * math.sin(ph))
    umin, umax = 0 * math.cos(ph) + 0, W * abs(math.cos(ph)) + H * abs(math.sin(ph))
    pos = mix(umin + (umax - umin) * travel[0], umin + (umax - umin) * travel[1], ease_io(lin(t, start, end)))
    return np.exp(-((u - pos) / width) ** 2)[..., None]

def zoom_blur(frame, amount, cx=W / 2, cy=H / 2, n=7):
    if amount <= 0.002: return frame
    im = Image.fromarray((np.clip(frame, 0, 1) * 255).astype(np.uint8))
    acc = np.zeros_like(frame)
    for i in range(n):
        s = 1 + amount * i / (n - 1)
        a = 1 / s
        out = im.transform((W, H), Image.AFFINE, (a, 0, cx - cx * a, 0, a, cy - cy * a), resample=Image.BILINEAR)
        acc += np.asarray(out, dtype=np.float32) / 255.0
    return acc / n

def bloom(frame, thr=0.55, strength=0.55, sigma=22):
    sm = frame[::4, ::4]
    hl = np.clip(sm - thr, 0, None) / (1 - thr)
    b = blur(hl, sigma / 4)
    b = np.asarray(Image.fromarray((np.clip(b, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR),
                   dtype=np.float32) / 255.0
    return frame + b * strength

def flare(frame, t, t0, cy, peak=1.0, dur=0.55):
    """Flare anamórfico horizontal (estilo lente cinema)."""
    k = math.exp(-((t - t0) / (dur / 3)) ** 2) * peak
    if k < 0.01: return
    dy = (yy[:, :1] - cy)
    band = np.exp(-(dy / 7) ** 2) + 0.35 * np.exp(-(dy / 60) ** 2)
    dx = (xx[:1, :] - W / 2) / (W * 0.65)
    horiz = np.exp(-dx ** 2)
    frame += (band * horiz)[..., None] * TEAL * k
    core = np.exp(-(((xx - W / 2) / 90) ** 2 + ((yy - cy) / 90) ** 2))[..., None]
    frame += core * WARMW * k * 0.9

# ---------------------------------------------------------------- shots
def shot_cards(t):
    p = lin(t, 0.0, 1.75)
    s = mix(1.16, 1.32, ease_out(p))
    rot = mix(-2.0, 0.4, ease_out(p))
    f = camera(imgs["cards"], s, mix(440, 420, p), mix(980, 900, p), rot)
    sw = sweep(t, 0.35, 1.45, 62, 120)
    if sw is not None:
        f = f + sw * (0.25 + 1.2 * lum(f)[..., None]) * TEAL * 0.55
    return f

def shot_chips(t):
    p = lin(t, 1.5, 3.3)
    e = ease_io(p)
    s = mix(1.42, 1.16, e)
    return camera(imgs["chips"], s, mix(430, 420, e), mix(690, 1010, e), mix(1.2, -0.3, e))

def shot_table(t):
    p = lin(t, 3.0, 4.7)
    e = ease_out(p)
    s = mix(1.45, 1.14, e)
    return camera(imgs["table"], s, mix(450, 430, e), mix(780, 860, e), mix(6.0, 0.0, e))

D_END = (1.10, 426.5, 900.0)               # câmera final do shot D (s, cx, cy)
M3 = (437.0, 892.0, 1.19)                   # centro e escala relativa do M na imagem "logo"
M2 = (413.0, 691.0, 1.0)                    # centro do M na imagem "brand" (alinhado por correlação)

def shot_logo(t):
    p = lin(t, 4.55, 5.9)
    e = ease_out(p)
    s = mix(1.02, D_END[0], e)
    cx, cy = mix(426.5, D_END[1], e), mix(960, D_END[2], e)
    f = camera(imgs["logo"], s, cx, cy, 0)
    mm = camera(m_mask_img, s, cx, cy, 0)[..., :1]
    sw = sweep(t, 5.05, 5.85, 55, 95)
    if sw is not None:
        f = f + sw * mm * WARMW * 0.85 + sw * 0.05 * TEAL
    # pulso de "energia" no M logo após o flash
    pulse = math.exp(-((t - 4.75) / 0.35) ** 2) * 0.55
    f = f + mm * TEAL * pulse
    return f

def brand_cam(t):
    sE0 = D_END[0] * M3[2] / M2[2]
    offx, offy = (M3[0] - D_END[1]) * D_END[0] / sE0, (M3[1] - D_END[2]) * D_END[0] / sE0
    c0 = (M2[0] - offx, M2[1] - offy)
    e = ease_io(lin(t, 6.0, 7.25))
    return mix(sE0, 1.0, e), mix(c0[0], 426.5, e), mix(c0[1], 922.0, e)

def shot_brand(t):
    s, cx, cy = brand_cam(t)
    f = camera(plate_img, s, cx, cy)
    full = camera(brand_img, s, cx, cy)
    # MIÚDA: revelação por wipe com borda luminosa
    p_name = lin(t, 6.15, 6.75)
    if p_name > 0:
        mk = camera(mask_name, s, cx, cy)[..., :1]
        x0s, _ = to_screen(126, 0, s, cx, cy); x1s, _ = to_screen(750, 0, s, cx, cy)
        edge = mix(x0s - 60, x1s + 90, ease_io(p_name))
        reveal = np.clip((edge - xx[:1, :]) / 70, 0, 1)[..., None] * mk
        glow = np.exp(-((xx[:1, :] - edge) / 24) ** 2)[..., None] * (1 - smooth(lin(t, 6.62, 6.82)))
        f = f * (1 - reveal) + full * reveal
        f = f + mk * glow * (lum(full)[..., None] * 1.8 * TEAL + 0.04 * TEAL)
    # slogan: fade + leve subida
    p_tag = smooth(lin(t, 6.55, 7.05))
    if p_tag > 0:
        dy = mix(8, 0, ease_out(lin(t, 6.55, 7.05)))
        mk = camera(mask_tag, s, cx, cy + 0)[..., :1] * p_tag
        tg = camera(brand_img, s, cx, cy - dy) if dy > 0.3 else full
        f = f * (1 - mk) + tg * mk
    # loader ///: acendem em sequência
    for i, (lb, mb) in enumerate(zip(lay_bars, mask_bars)):
        st = 6.85 + i * 0.12
        a = smooth(lin(t, st, st + 0.15))
        if a > 0:
            mk = camera(mb, s, cx, cy)[..., :1] * a
            f = f * (1 - mk) + full * mk
            f = f + camera(lb, s, cx, cy) * math.exp(-((t - st - 0.15) / 0.12) ** 2) * 1.2
    return f

SHOTS = [  # (render, entra, sai)
    (shot_cards, 0.0, 1.75),
    (shot_chips, 1.5, 3.3),
    (shot_table, 3.0, 4.7),
    (shot_logo, 4.55, 6.25),
    (shot_brand, 5.85, DUR + 1),
]

def render(t):
    # pesos de crossfade
    layers = []
    for fn, a, b in SHOTS:
        if a <= t <= b:
            layers.append((fn, a, b))
    frame = None
    for i, (fn, a, b) in enumerate(layers):
        img = fn(t)
        if frame is None:
            frame = img
        else:
            fade_len = {1.5: 0.25, 3.0: 0.3, 4.55: 0.15, 5.85: 0.35}[a]
            k = smooth(lin(t, a, a + fade_len))
            frame = frame * (1 - k) + img * k
    # zoom-blur nas transições
    zb = 0.0
    for tc, amt, w in ((1.62, 0.09, 0.16), (3.12, 0.07, 0.18), (4.6, 0.12, 0.14)):
        zb = max(zb, amt * math.exp(-((t - tc) / w) ** 2))
    frame = zoom_blur(frame, zb)
    # flashes
    for tc, amt, w in ((1.62, 0.22, 0.07), (3.12, 0.12, 0.08), (4.6, 0.55, 0.07)):
        k = amt * math.exp(-((t - tc) / w) ** 2)
        if k > 0.01:
            frame = frame + k * TEAL * 0.6 + k * 0.25
    flare(frame, t, 4.6, H * 0.40, peak=0.7)
    flare(frame, t, 6.45, to_screen(0, 1048, *brand_cam(t))[1], peak=0.45, dur=0.7)
    # partículas (somem no final para entregar quadro limpo)
    particles(frame, t, smooth(lin(t, 0.1, 0.8)) * (1 - 0.6 * smooth(lin(t, 6.6, 7.4))))
    frame = bloom(frame, strength=0.45)
    # grade de cor: contraste suave e sombras puxadas para teal
    frame = np.clip(frame, 0, None)
    frame = frame / (1 + 0.18 * frame)  # tone-map suave
    frame = frame * 1.18
    frame = frame * vignette
    shadows = np.clip(0.25 - lum(frame), 0, 0.25)[..., None]
    frame = frame + shadows * np.array([-0.02, 0.03, 0.025], np.float32)
    # fade-in do preto
    fin = smooth(lin(t, 0.0, 0.7))
    frame = frame * (0.0 + fin)
    # grão de filme sutil
    g = rng.standard_normal((H // 2, W // 2)).astype(np.float32)
    g = np.repeat(np.repeat(g, 2, 0), 2, 1)[..., None]
    frame = frame + g * 0.012 * (0.4 + 0.6 * (1 - lum(frame)[..., None]))
    return np.clip(frame, 0, 1)

# ---------------------------------------------------------------- render
def main():
    if "--still" in args:
        for ts in [float(x) for x in args[args.index("--still") + 1].split(",")]:
            Image.fromarray((render(ts) * 255).astype(np.uint8)).save(f"still_{ts:.2f}.png")
        return
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if "--audio" in args and os.path.exists("splash_audio.wav"):
        cmd += ["-i", "splash_audio.wav", "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
            "-profile:v", "high", "-movflags", "+faststart", OUT]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(N):
        t = i / FPS
        pr.stdin.write((render(t) * 255 + 0.5).astype(np.uint8).tobytes())
        if i % FPS == 0: print(f"{t:.1f}s", flush=True)
    pr.stdin.close(); pr.wait()
    print("ok", OUT)

if __name__ == "__main__":
    main()
