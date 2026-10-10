"""As 14 cenas de "Lua em Falta".

Cada cena gera uma placa estática (build) e anima elementos por quadro (dyn).
O personagem recorrente é o andarilho com a lua no lugar da cabeça.
"""
import numpy as np
from lib import (W, H, U, V, XX, YY, Mask, add, blur, col, disc_mask, fbm, figure, glow,
                 gray, grad1d, moon_head, moon_sprite, over, paste, ridge1d, saturate,
                 smooth, stars, vgrad, vnoise, mix)


def rng_t(seed, t, fps=30):
    return np.random.default_rng(seed * 1000 + int(t * fps))


def streaks(img, n, seed, x0, x1, y0, y1, length, angle, c, amt, width=1.0, t=0, speed=0):
    """Chuva / riscos de movimento desenhados como linhas finas."""
    mk = Mask(ss=1)
    r = np.random.default_rng(seed)
    xs = r.uniform(x0, x1, n)
    ys = r.uniform(y0, y1, n)
    if speed:
        ys = y0 + (ys - y0 + speed * t) % (y1 - y0)
    dx, dy = np.cos(angle) * length, np.sin(angle) * length
    for x, y in zip(xs, ys):
        mk.line([(x, y), (x + dx, y + dy)], width)
    return add(img, c, mk.arr(), amt)


class Scene:
    cam = ((1.06, .5, .5), (1.14, .5, .5))
    grade = dict(sat=1.0)

    def frame(self, t):
        img = self.plate.copy()
        self.dyn(img, t)
        return img

    def dyn(self, img, t):
        pass


# ----------------------------------------------------------------- 01 mar sem lua
class MarSemLua(Scene):
    cam = ((1.04, .5, .52), (1.16, .5, .46))

    def build(self):
        hy = .56
        sky = vgrad([(0, '#03100f'), (.30, '#0a2b2d'), (.62, '#2c7c74'), (.92, '#9fead6'), (1, '#e8fff5')], 0, hy)
        sea = vgrad([(0, '#78cdb9'), (.03, '#2a6d68'), (.25, '#0b2f30'), (1, '#010809')], hy, 1)
        img = np.where((V < hy)[..., None], sky, sea).astype(np.float32)
        cl = fbm(H, W, 170, 5, 11, aniso=3.0)
        band = np.exp(-((V - .46) / .08) ** 2)
        img = over(img, '#0a2c2f', smooth(.48, .68, cl) * band * .8)
        img = add(img, '#bff7e8', smooth(.55, .75, cl) * band * (V < hy), .10)
        img = stars(img, 1100, 2, ymax=.44, bright=.9, big=9, tint=(.85, 1, .95))
        st = vnoise(H, W, 300, 3, seed=5)
        depth = np.clip((V - hy) / (1 - hy), 0, 1)
        img = add(img, '#8ff0d6', smooth(.62, .9, st) * (1 - depth) ** 2.5 * (V > hy), .30)
        mk = Mask()
        fx, fy, fh = W * .5, H * .815, H * .34
        hx, hy_, hr = figure(mk, fx, fy, fh, 'stand', head=False)
        m = mk.arr()
        wl = fy - .17 * fh
        rows = np.arange(H)
        src = np.clip((2 * wl - rows).astype(int), 0, H - 1)
        refl = m[src] * (rows > wl)[:, None]
        shift = (np.sin(rows * .21) * 5 * (rows > wl)).astype(int)
        refl = np.stack([np.roll(refl[i], shift[i]) for i in range(H)])
        refl = blur(refl, 2.5) * np.exp(-np.clip(rows - wl, 0, None) / (fh * .5))[:, None]
        img = over(img, '#020b0b', refl * .75)
        img = over(img, '#020a0a', m * (YY < wl))
        img = add(img, '#7fe8cf', blur(m * (YY < wl), 3) * (1 - m) * (YY < hy_ + hr * 2.2), .25)
        rp = Mask()
        for i in range(5):
            rp.ring(fx, wl, fh * (.10 + .085 * i), fh * (.016 + .011 * i), 1.6)
        img = add(img, '#bff7e6', blur(rp.arr(), .8) * 1.0, .35)
        self.hx, self.hy, self.hr, self.hzn = hx, hy_, fh * .078, hy
        self.tex = vnoise(H * 2, W, 46, 3, seed=8)
        self.plate = moon_head(img, hx, hy_, self.hr, glow_col=(.72, 1, .9), glow_amt=1.15)

    def dyn(self, img, t):
        off = int(t * 55) % H
        tex = self.tex[H - off:2 * H - off]
        depth = np.clip((V - self.hzn) / (1 - self.hzn), 0, 1)
        wx = 10 + 150 * depth
        col_ = np.exp(-((XX - self.hx) / wx) ** 2) * (V > self.hzn + .003)
        add(img, '#d9fff2', smooth(.55, .8, tex) * col_ * (1 - .6 * depth), .9)


# ----------------------------------------------------------------- 02 cometa
class Cometa(Scene):
    cam = ((1.16, .52, .50), (1.05, .5, .5))

    def build(self):
        hy = .70
        img = vgrad([(0, '#07051a'), (.30, '#241645'), (.58, '#6e3a63'), (.82, '#d8704e'), (1, '#ffc57c')], 0, hy)
        img = stars(img, 900, 21, ymax=.62, bright=.8, big=7)
        cx, cy = .80 * W, .15 * H
        ang = np.deg2rad(205)
        dx, dy = XX - cx, YY - cy
        s = dx * np.cos(ang) + dy * np.sin(ang)
        q = -dx * np.sin(ang) + dy * np.cos(ang)
        qn = ridge1d(4000, 7, 3, 9)
        sn = qn[np.clip((q + 2000).astype(int), 0, 3999)]
        width = 5 + np.clip(s, 0, None) * .11
        tail = np.exp(-(q / width) ** 2) * np.exp(-np.clip(s, 0, None) / (W * .55)) * (s > -4)
        img = add(img, '#c9ecff', tail * (.35 + .9 * sn), .95)
        ang2 = np.deg2rad(218)
        s2 = dx * np.cos(ang2) + dy * np.sin(ang2)
        q2 = -dx * np.sin(ang2) + dy * np.cos(ang2) + 0.0006 * s2 ** 2
        dust = np.exp(-(q2 / (8 + np.clip(s2, 0, None) * .2)) ** 2) * np.exp(-np.clip(s2, 0, None) / (W * .35)) * (s2 > 0)
        img = add(img, '#ffc99a', dust, .45)
        hm = disc_mask(cx, cy, 5)
        img = glow(img, hm, '#e8f6ff', 6, 3.0)
        img = glow(img, hm, '#9fd8ff', 30, 2.2)
        img = add(img, '#ffffff', hm, 1)
        rid = ridge1d(W, 150, 4, 7)
        top = (hy - .028 + .045 * rid ** 1.5) * H
        mesa = (YY > top[None, :]) & (V < hy + .02)
        haze = np.clip((YY - top[None, :]) / 60, 0, 1)
        img = over(img, mix(col('#c9715a'), col('#4a2438'), haze[..., None]), mesa * .95)
        g = V >= hy
        ground = vgrad([(0, '#3a1f26'), (.25, '#1c0f15'), (1, '#060305')], hy, 1)
        ground *= (.85 + .3 * fbm(H, W, 40, 4, 22, aniso=3))[..., None]
        img = np.where(g[..., None], ground, img).astype(np.float32)
        img = add(img, '#ffb47a', np.exp(-((V - hy) / .004) ** 2), .5)
        gy = .875 * H
        body = Mask().rect(.17 * W, gy - .165 * H, .70 * W, gy - .03 * H, r=.07 * H).arr()
        img = over(img, vgrad([(0, '#3f6b69'), (1, '#0f2324')], (gy - .165 * H) / H, gy / H), body)
        stripe = body * smooth(gy - .118 * H, gy - .115 * H, YY) * (1 - smooth(gy - .095 * H, gy - .092 * H, YY))
        img = over(img, '#c9b994', stripe * .9)
        img = add(img, '#ffd29a', body * np.exp(-((YY - (gy - .163 * H)) / 3) ** 2), .55)
        win = Mask()
        win.rect(.24 * W, gy - .145 * H, .36 * W, gy - .115 * H, r=12)
        win.rect(.52 * W, gy - .145 * H, .63 * W, gy - .115 * H, r=12)
        door = Mask().rect(.40 * W, gy - .145 * H, .47 * W, gy - .04 * H, r=8)
        wm, dm = win.arr(), door.arr()
        self.light = wm + dm
        img = over(img, '#ffd27a', wm)
        img = over(img, vgrad([(0, '#fff0c2'), (1, '#ffa94a')], .73, .84), dm)
        spill = Mask().poly([(.40 * W, gy - .04 * H), (.47 * W, gy - .04 * H), (.62 * W, H * .99), (.20 * W, H * .99)]).arr()
        img = add(img, '#ffb35a', blur(spill, 14) * (YY > gy - .04 * H), .45)
        img = glow(img, wm + dm, '#ffb054', 16, .9)
        img = glow(img, wm + dm, '#ff8a3a', 60, .5)
        whl = Mask().ellipse(.555 * W, gy - .028 * H, .034 * H).arr()
        img = over(img, '#050304', whl)
        img = over(img, '#2a2a2a', Mask().ellipse(.555 * W, gy - .028 * H, .012 * H).arr())
        hitch = Mask().line([(.17 * W, gy - .07 * H), (.06 * W, gy - .05 * H)], 7).line([(.09 * W, gy - .055 * H), (.09 * W, gy)], 5).arr()
        img = over(img, '#0a0606', hitch)
        img = over(img, '#000000', blur(Mask().ellipse(.44 * W, gy + .004 * H, .27 * W, .012 * H).arr(), 6) * .7)
        mk = Mask()
        fh = .155 * H
        roof = gy - .165 * H
        hx, hy_, _ = figure(mk, .30 * W, roof + .335 * fh, fh, 'sit', head=False)
        img = over(img, '#070608', mk.arr())
        self.plate = moon_head(img, hx, hy_, fh * .08, glow_col=(1, .9, .75), glow_amt=.8)
        self.gy = gy

    def dyn(self, img, t):
        r = np.random.default_rng(4)
        n = 70
        x = r.uniform(0, W, n) + t * r.uniform(10, 40, n)
        y = r.uniform(.6 * H, H, n) - t * r.uniform(2, 12, n)
        m = np.zeros((H, W), np.float32)
        m[np.clip(y.astype(int), 0, H - 1), np.clip(x.astype(int), 0, W - 1)] = r.uniform(.3, 1, n)
        add(img, '#ffcf96', blur(m, 1.2), 6)
        fl = .9 + .1 * np.sin(t * 37) * np.sin(t * 13)
        add(img, '#ffb054', self.light, (fl - .9) * 2)


# ----------------------------------------------------------------- 03 contra a corrente
def umbrella_sprite(R, base, seed):
    n = int(R * 2 + 30)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    c = n / 2
    dx, dy = xx - c, yy - c
    r = np.sqrt(dx * dx + dy * dy)
    th = np.arctan2(dy, dx)
    edge = R * (1 - .045 * np.abs(np.sin(4 * th)))
    a = np.clip(edge - r + .5, 0, 1)
    panel = .5 + .5 * np.cos(8 * th)
    rib = np.exp(-((np.mod(th + np.pi / 8, np.pi / 4) - np.pi / 8) * r / 1.4) ** 2)
    light = np.clip(-(dx + dy) / (R * 1.4), -1, 1)
    z = np.sqrt(np.clip(1 - (r / R) ** 2, 0, 1))
    shade = .55 + .20 * z + .35 * light + .30 * panel
    rgb = np.asarray(col(base))[None, None] * shade[..., None]
    rgb = rgb + .35 * np.exp(-(((dx + R * .35) ** 2 + (dy + R * .35) ** 2) / (R * .35) ** 2))[..., None] * (panel[..., None] * .5 + .5)
    rgb = rgb * (1 - .35 * rib[..., None])
    rim = np.exp(-((r - edge * .97) / 1.5) ** 2) * .25
    rgb = rgb + rim[..., None]
    tip = np.clip(3.2 - r, 0, 1)
    rgb = rgb * (1 - tip[..., None]) + .7 * tip[..., None]
    sh = np.zeros_like(a)
    k = int(R * .22)
    sh[k:, k:] = a[:-k, :-k]
    sh = blur(sh, R * .18) * .55
    return rgb.astype(np.float32), a, sh


class Corrente(Scene):
    cam = ((1.08, .5, .55), (1.30, .52, .54))

    def build(self):
        base = .17 + .08 * fbm(H, W, 70, 5, 31) + .05 * vnoise(H, W, 2, 2, 32)
        img = np.repeat(base[..., None], 3, 2)
        pud = smooth(.60, .66, fbm(H, W, 150, 4, 33))
        img = over(img, vgrad([(0, '#6c6e70'), (1, '#3c3e40')]), pud * .55)
        bars = (np.mod(XX + 20, 78) < 40) & (V > .20) & (V < .88)
        wear = .55 + .45 * smooth(.30, .5, fbm(H, W, 30, 4, 34))
        img = over(img, '#c8c8c2', bars * wear * .6)
        img = over(img, '#9a9a96', (np.abs(V - .935) < .004) * (np.mod(XX, 120) < 70) * .8)
        self.plate = img.astype(np.float32)
        self.black = umbrella_sprite(54, '#202226', 1)
        self.red = umbrella_sprite(56, '#e0141e', 2)
        r = np.random.default_rng(7)
        pts = []
        while len(pts) < 60:
            p = (r.uniform(-.05, 1.05) * W, r.uniform(-.25, 1.25) * H)
            if all((p[0] - a) ** 2 + (p[1] - b) ** 2 > 98 ** 2 for a, b in pts) and abs(p[0] - .52 * W) > 70:
                pts.append(p)
        self.pts = np.array(pts)
        self.v = r.uniform(70, 110, len(pts))

    def dyn(self, img, t):
        rgb, a, sh = self.black
        for (x, y), v in zip(self.pts, self.v):
            yy = y + v * t
            paste(img, np.zeros(3, np.float32), sh, x + 6, yy + 6)
            paste(img, rgb, a, x, yy)
        rgb, a, sh = self.red
        x, y = .52 * W, .62 * H - 60 * t
        paste(img, np.zeros(3, np.float32), sh, x + 6, y + 6)
        paste(img, rgb, a, x, y)
        g = gray(img)
        img[:] = mix(g, img, 0.0)
        paste(img, rgb, a, x, y)
        rg = rng_t(5, t)
        mk = Mask(ss=1)
        for _ in range(260):
            px, py = rg.uniform(0, W), rg.uniform(0, H)
            ddx, ddy = (px - W / 2) * .05, (py - H / 2) * .05
            mk.line([(px, py), (px + ddx, py + ddy)], 1)
        for _ in range(26):
            px, py, rr = rg.uniform(0, W), rg.uniform(0, H), rg.uniform(3, 12)
            mk.ring(px, py, rr, rr * .6, 1)
        add(img, '#ffffff', mk.arr(), .22)


# ----------------------------------------------------------------- 04 fim do mundo
class FimDoMundo(Scene):
    cam = ((1.05, .5, .55), (1.15, .5, .52))

    def build(self):
        hy = .70
        img = vgrad([(0, '#1c0303'), (.35, '#6e1208'), (.70, '#e2501a'), (.92, '#ffb066'), (1, '#ffe2a8')], 0, hy)
        pc = np.array([.5 * W, .76 * H])
        R = .56 * W
        dx, dy = XX - pc[0], YY - pc[1]
        d = np.sqrt(dx * dx + dy * dy) / R
        tilt = np.deg2rad(-13)
        a_ = dx * np.cos(tilt) + dy * np.sin(tilt)
        b_ = -dx * np.sin(tilt) + dy * np.cos(tilt)
        e = np.sqrt((a_ / (1.75 * R)) ** 2 + (b_ / (.30 * R)) ** 2)
        rn = ridge1d(2000, 6, 3, 41)
        ring = smooth(1.0, 1.04, e) * (1 - smooth(1.36, 1.42, e)) * (.35 + .65 * rn[np.clip((e * 900).astype(int), 0, 1999)])
        ring *= 1 - .7 * smooth(1.17, 1.19, e) * (1 - smooth(1.21, 1.23, e))
        ringc = '#ffd9a6'
        img = add(img, ringc, ring * (b_ < 0), .55)
        pm = np.clip((1 - d) * R, 0, 1)
        bands = vnoise(H, W, 900, 22, 42) * .6 + fbm(H, W, 60, 4, 43, aniso=8) * .4
        pcol = grad1d(bands, [(0, '#5a1c10'), (.35, '#b8502c'), (.55, '#efa36a'), (.75, '#a8402a'), (1, '#f6c48a')])
        z = np.sqrt(np.clip(1 - d * d, 0, 1))
        light = np.clip(.35 + .65 * (-dy / R + .2), 0, 1)
        pcol = pcol * (.25 + .75 * z ** .6 * light)[..., None]
        img = mix(img, pcol, pm[..., None])
        rim = np.exp(-((d - 1) / .012) ** 2)
        img = add(img, '#ff9a4a', blur(rim, 8), 1.1)
        img = add(img, '#ff6a2a', blur(rim, 50), .9)
        img = add(img, ringc, ring * (b_ > 0), .7)
        img = over(img, '#2a0604', smooth(.55, .8, fbm(H, W, 220, 5, 44, aniso=4)) * np.exp(-((V - .48) / .1) ** 2) * .55)
        sky_m = V < hy
        lake = (V >= hy) & (V < hy + .035)
        src = np.clip((2 * hy * H - YY).astype(int), 0, H - 1)
        refl = img[src, XX.astype(int)] * .65
        refl = blur(refl, 1, 6)
        ground = vgrad([(0, '#2a0806'), (.2, '#120302'), (1, '#030000')], hy, 1)
        ground *= (.8 + .4 * fbm(H, W, 30, 4, 45, aniso=4))[..., None]
        img = np.where(sky_m[..., None], img, np.where(lake[..., None], refl, ground)).astype(np.float32)
        img = add(img, '#ffb070', np.exp(-((V - hy) / .0025) ** 2), .5)
        rock = Mask()
        pts = [(.28 * W, .94 * H), (.36 * W, .86 * H), (.41 * W, .835 * H), (.45 * W, .81 * H), (.52 * W, .805 * H),
               (.57 * W, .82 * H), (.62 * W, .85 * H), (.70 * W, .90 * H), (.78 * W, H), (.20 * W, H)]
        rock.poly(pts)
        img = over(img, '#070101', rock.arr())
        mk = Mask()
        fh = .18 * H
        hx, hy_, _ = figure(mk, .49 * W, .812 * H, fh, 'open', head=False)
        fm = mk.arr()
        img = over(img, '#050000', fm)
        img = add(img, '#ff8a3a', blur(fm, 2) * (1 - fm), .8)
        self.plate = moon_head(img, hx, hy_, fh * .08, glow_col=(1, .85, .6), glow_amt=.7)

    def dyn(self, img, t):
        r = np.random.default_rng(9)
        n = 110
        x0, y0 = r.uniform(0, W, n), r.uniform(.3 * H, 1.1 * H, n)
        vy = r.uniform(60, 180, n)
        x = x0 + np.sin(t * r.uniform(1, 3, n) + r.uniform(0, 6, n)) * 15 + t * 20
        y = (y0 - vy * t) % H
        m = np.zeros((H, W), np.float32)
        m[np.clip(y.astype(int), 0, H - 1), np.clip(x.astype(int), 0, W - 1)] = r.uniform(.3, 1, n)
        add(img, '#ffa04a', blur(m, 1.0), 9)
        add(img, '#ff5a1a', blur(m, 5), 25)


# ----------------------------------------------------------------- 05 escada pro infinito
class Escada(Scene):
    cam = ((1.06, .48, .62), (1.20, .55, .40))

    def build(self):
        img = np.zeros((H, W, 3), np.float32) + col('#03030b')
        n1, n2 = fbm(H, W, 320, 6, 51), fbm(H, W, 220, 6, 52)
        img = add(img, '#b0307e', smooth(.45, .85, n1) ** 2, .8)
        img = add(img, '#2a5fd0', smooth(.48, .85, n2) ** 2, .7)
        dd = U * .9 + V * .55 - .80
        band = np.exp(-(dd / .16) ** 2)
        img = add(img, '#c9b8ff', band * fbm(H, W, 90, 5, 53), .35)
        lanes = smooth(.55, .72, fbm(H, W, 80, 5, 54)) * band
        img = img * (1 - .65 * lanes[..., None])
        img = stars(img, 4000, 55, ymax=.9, bright=.85, region=.25 + band)
        img = stars(img, 600, 56, ymax=.9, bright=1.0, big=22)
        gc = np.array([.80 * W, .17 * H])
        dx, dy = (XX - gc[0]) / W, (YY - gc[1]) / W * 2.2
        r = np.sqrt(dx * dx + dy * dy) + 1e-4
        th = np.arctan2(dy, dx)
        arms = .5 + .5 * np.cos(2 * (th - 4.5 * np.log(r)))
        gal = np.exp(-r / .055) * (.4 + .9 * arms ** 2) + np.exp(-r / .012) * 1.5
        img = add(img, '#ffd9f0', gal, .9)
        img = add(img, '#ff8ad8', blur(gal, 20), .5)
        for i, (base, amp, c, sd) in enumerate([(.80, .05, '#1c1846', 61), (.86, .045, '#0e0c2a', 62), (.93, .04, '#05040f', 63)]):
            top = (base + amp * (ridge1d(W, 300, 3, sd) - .5) * 2) * H
            m = smooth(top[None, :] - 1, top[None, :] + 1, YY)
            img = over(img, c, m)
            img = add(img, '#8f7cff', m * np.exp(-np.clip(YY - top[None, :], 0, None) / 3), .6 - i * .15)
        self.steps = []
        for i in range(14):
            k = i / 13
            x = .20 * W + k * .55 * W
            y = .84 * H - k * .64 * H
            s = 1 - .68 * k
            w_, th_, dp = .15 * W * s, .022 * H * s, .010 * H * s
            front = Mask().rect(x - w_ / 2, y, x + w_ / 2, y + th_).arr()
            top_ = Mask().poly([(x - w_ / 2, y), (x + w_ / 2, y), (x + w_ / 2 + dp, y - dp), (x - w_ / 2 + dp, y - dp)]).arr()
            img = over(img, mix(col('#1e1a44'), col('#6d5fd0'), k), front)
            img = over(img, mix(col('#8a80d8'), col('#e8dcff'), k), top_)
            img = glow(img, front + top_, '#9d8cff', 10 * s + 2, .25 + .5 * k)
            self.steps.append((x, y, s))
        x, y, s = self.steps[4]
        mk = Mask()
        fh = .15 * H * s
        hx, hy_, _ = figure(mk, x, y - .2 * fh * 0, fh, 'climb', head=False)
        img = over(img, '#05040c', mk.arr())
        self.plate = moon_head(img, hx, hy_, fh * .08, glow_col=(.9, .9, 1), glow_amt=.8)

    def dyn(self, img, t):
        k = np.clip((t - .25) / .45, 0, 1)
        if 0 < k < 1:
            x0, y0 = .15 * W + k * .5 * W, .10 * H + k * .16 * H
            m = Mask(ss=1).line([(x0, y0), (x0 - 70, y0 - 22)], 2).arr()
            fade = np.clip((XX - (x0 - 70)) / 70, 0, 1)
            add(img, '#ffffff', m * fade, (1 - k) * 1.5)


# ----------------------------------------------------------------- 06 tempo nublado só aqui
class Nublado(Scene):
    cam = ((1.12, .5, .56), (1.04, .5, .54))

    def build(self):
        hy = .55
        img = vgrad([(0, '#8fa9a8'), (.6, '#c8d4cd'), (1, '#eef0e4')], 0, hy)
        img = add(img, '#ffffff', smooth(.5, .75, fbm(H, W, 200, 5, 71, aniso=2.5)) * (V < hy), .22)
        top = (hy - .015 - .022 * ridge1d(W, 40, 4, 72)) * H
        tm = smooth(top[None, :] - 1, top[None, :] + 1, YY)
        img = over(img, '#62746a', tm * (V < hy + .05))
        field = vgrad([(0, '#9aa978'), (.25, '#7d9258'), (1, '#33482c')], hy, 1)
        grass = vnoise(H, W, 2, 16, 73) * .5 + fbm(H, W, 120, 4, 74) * .5
        field *= (.75 + .45 * grass)[..., None]
        img = np.where((V > hy)[..., None], field, img).astype(np.float32)
        img = over(img, '#c8d2c6', smooth(hy - .02, hy + .02, V) * (1 - smooth(hy + .02, hy + .08, V)) * .35)
        img = add(img, '#fff1c8', (1 - V) * (1 - U) * .25, 1)
        cx, gy = .5 * W, .80 * H
        img = over(img, '#14201a', blur(Mask().ellipse(cx, gy + .005 * H, .28 * W, .026 * H).arr(), 10) * .55)
        pud = Mask().ellipse(cx, gy + .012 * H, .22 * W, .016 * H).arr()
        img = over(img, '#57666a', blur(pud, 2) * .8)
        chair_c = vgrad([(0, '#d0a24a'), (1, '#6e4c16')], .48, .80)
        back = Mask().rect(.36 * W, .50 * H, .64 * W, .73 * H, r=40).ellipse(.37 * W, .53 * H, .05 * W, .05 * H).ellipse(.63 * W, .53 * H, .05 * W, .05 * H).arr()
        img = over(img, chair_c * .85, back)
        for i in range(3):
            for j in range(4):
                img = over(img, '#5a3c10', Mask().ellipse(.41 * W + j * .06 * W, .55 * H + i * .045 * H, 3.5).arr())
        seat = Mask().rect(.35 * W, .70 * H, .65 * W, .775 * H, r=14).arr()
        img = over(img, chair_c, seat)
        for x in (.37, .63):
            img = over(img, '#2a1c08', Mask().rect(x * W - 5, .77 * H, x * W + 5, gy).arr())
        mk = Mask()
        fh = .20 * H
        hx, hy_, _ = figure(mk, cx, .80 * H, fh, 'sit', head=False)
        fm = mk.arr()
        img = over(img, vgrad([(0, '#3a4048'), (1, '#15181c')], .6, .8), fm)
        for x in (.33, .67):
            arm = Mask().rect(x * W - .045 * W, .62 * H, x * W + .045 * W, .78 * H, r=22).arr()
            img = over(img, chair_c * (.95 if x < .5 else .75), arm)
        img = moon_head(img, hx, hy_, fh * .085, glow_col=(1, .97, .9), glow_amt=.35)
        cl = Mask()
        r = np.random.default_rng(75)
        for _ in range(14):
            cl.ellipse(cx + r.uniform(-.17, .17) * W, .40 * H + r.uniform(-.035, .02) * H, r.uniform(.05, .09) * W)
        cm = blur(cl.arr(), 5) * (.75 + .5 * fbm(H, W, 30, 4, 76))
        cm = smooth(.5, .7, cm) * (1 - smooth(.43 * H, .45 * H, YY))
        ccol = vgrad([(0, '#8a9294'), (1, '#33393c')], .32, .44)
        img = over(img, ccol, cm)
        self.cm = cm
        self.plate = img.astype(np.float32)

    def dyn(self, img, t):
        mk = Mask(ss=1)
        r = rng_t(77, t)
        for _ in range(140):
            x = r.uniform(.34, .66) * W
            y = r.uniform(.42, .80) * H
            mk.line([(x, y), (x - 4, y + 34)], 1.3)
        m = mk.arr() * (1 - self.cm)
        add(img, '#f4f8fa', blur(m, .6), 1.1)
        sp = Mask(ss=1)
        for _ in range(18):
            x = r.uniform(.30, .70) * W
            sp.ring(x, .80 * H + r.uniform(-8, 12), r.uniform(4, 10), 2, 1)
        add(img, '#ffffff', sp.arr(), .4)


# ----------------------------------------------------------------- 07 sem sinal
class SemSinal(Scene):
    cam = ((1.04, .5, .5), (1.13, .5, .44))

    def build(self):
        hz = .50
        img = vgrad([(0, '#c8c8c4'), (.9, '#e6e6e2'), (1, '#f2f2ee')], 0, hz)
        sea = vgrad([(0, '#cfcfcb'), (.15, '#8e8e88'), (1, '#40403b')], hz, 1)
        sea *= (.9 + .2 * vnoise(H, W, 200, 3, 81))[..., None]
        img = np.where((V < hz)[..., None], img, sea).astype(np.float32)
        vx, vy = .5 * W, hz * H + 4
        deck = Mask().poly([(vx - 10, vy), (vx + 10, vy), (1.25 * W, H), (-.25 * W, H)]).arr()
        wood = (.42 + .12 * vnoise(H, W, 1.5, 30, 82))
        img = over(img, wood[..., None] * col('#d8d0c4') * 1.0, deck)
        for z in range(1, 60):
            y = vy + (H - vy) * (1.0 / (1 + .14 * (60 - z))) ** 1.1
            img = over(img, '#2e2b27', deck * np.exp(-((YY - y) / max(.5, (y - vy) * .012)) ** 2) * .55)
        for side in (-1, 1):
            for z in range(1, 14):
                f = (1.0 / (1 + .5 * (14 - z))) ** 1.0
                y = vy + (H - vy) * f
                x = vx + side * (10 + (W * .75 - 10) * f)
                w_ = 3 + 22 * f
                img = over(img, '#2a2824', Mask().rect(x - w_ / 2, y - 30 * f, x + w_ / 2, y + 160 * f).arr())
        fog = np.exp(-np.clip(YY - vy, 0, None) / 180)
        img = mix(img, col('#e9e9e5'), (fog * .85)[..., None])
        mk = Mask()
        fh = .42 * H
        fx, fy = .5 * W, .90 * H
        hx, hy_, _ = figure(mk, fx, fy, fh, 'stand', head=False)
        img = over(img, '#16161a', mk.arr())
        tw, th_ = .30 * fh, .23 * fh
        tx, ty = hx, hy_ - .02 * fh
        tv = Mask().rect(tx - tw / 2, ty - th_ / 2, tx + tw / 2, ty + th_ / 2, r=14).arr()
        img = over(img, vgrad([(0, '#4a4a48'), (1, '#1a1a1a')], (ty - th_ / 2) / H, (ty + th_ / 2) / H), tv)
        ant = Mask().line([(tx, ty - th_ / 2), (tx - .12 * fh, ty - th_ / 2 - .16 * fh)], 3).line([(tx, ty - th_ / 2), (tx + .09 * fh, ty - th_ / 2 - .18 * fh)], 3).arr()
        img = over(img, '#1a1a1a', ant)
        self.scr = Mask().rect(tx - tw * .40, ty - th_ * .36, tx + tw * .30, ty + th_ * .36, r=18).arr()
        self.box = (int(tx - tw * .42), int(ty - th_ * .4), int(tx + tw * .32), int(ty + th_ * .4))
        for i in range(2):
            img = over(img, '#8a8a86', Mask().ellipse(tx + tw * .38, ty - th_ * .2 + i * th_ * .22, 6).arr())
        self.plate = img.astype(np.float32)

    def dyn(self, img, t):
        x0, y0, x1, y1 = self.box
        r = rng_t(83, t)
        nz = r.random((y1 - y0, x1 - x0)).astype(np.float32)
        nz = nz * (.75 + .25 * np.sin(np.arange(y1 - y0) * 1.3 + t * 40))[:, None]
        roll = int((t * 300) % (y1 - y0))
        nz[roll:roll + 8] += .4
        m = self.scr[y0:y1, x0:x1, None]
        img[y0:y1, x0:x1] = img[y0:y1, x0:x1] * (1 - m) + (nz[..., None] * .95 + .1) * m
        fl = .7 + .3 * r.random()
        glow(img, self.scr, '#ffffff', 40, .35 * fl)
        mk = Mask(ss=2)
        for i in range(4):
            gx = (.15 + .2 * i) * W + t * 60
            gy = (.18 + .04 * np.sin(i * 2 + t)) * H
            s = 18 - i * 2
            fl2 = np.sin(t * 9 + i) * 6
            mk.line([(gx - s, gy - fl2), (gx, gy), (gx + s, gy - fl2)], 2.2)
        over(img, '#3a3a38', mk.arr())


# ----------------------------------------------------------------- 08 eclipse
class Eclipse(Scene):
    cam = ((1.05, .5, .50), (1.20, .5, .40))
    grade = dict(sat=1.05)

    def build(self):
        img = vgrad([(0, '#1a0a26'), (.28, '#5a2758'), (.50, '#c46c80'), (.62, '#f2a39a'), (.70, '#ffd9b8'), (1, '#ffe9cf')])
        cl = fbm(H, W, 160, 5, 91, aniso=3)
        img = add(img, '#ffc8c0', smooth(.55, .75, cl) * smooth(.18, .32, V) * (1 - smooth(.62, .72, V)), .25)
        img = over(img, '#3a1638', smooth(.6, .8, fbm(H, W, 110, 5, 92, aniso=3)) * (1 - smooth(.38, .52, V)) * .35)
        img = stars(img, 500, 93, ymax=.35, bright=.6)
        ux = np.arange(W) / W
        top = (.665 + .30 * (ux - .5) ** 2 + .006 * (ridge1d(W, 30, 3, 94) - .5)) * H
        hill = smooth(top[None, :] - 1, top[None, :] + 1, YY)
        mk = Mask(ss=1)
        r = np.random.default_rng(95)
        for x in np.linspace(0, W, 700):
            y = top[int(min(W - 1, x))]
            mk.line([(x, y + 3), (x + r.uniform(-4, 4), y - r.uniform(4, 16))], 1)
        img = over(img, '#22101e', np.clip(hill + mk.arr(), 0, 1))
        fh = .30 * H
        xL, xR = .435 * W, .565 * W
        gyL, gyR = top[int(xL)], top[int(xR)]
        body = Mask()
        heads = []
        for x, gy, side in ((xL, gyL, 1), (xR, gyR, -1)):
            hx, hy_, _ = figure(body, x, gy, fh, 'stand', head=False)
            nx, ny = x, gy - .83 * fh
            tx, ty = x + side * .085 * fh, gy - .905 * fh
            body.capsule((nx, ny), (tx - side * .03 * fh, ty + .045 * fh), .03 * fh)
            heads.append((tx, ty))
        body.capsule((xL + .125 * W * .0 + .125 * fh, gyL - .47 * fh), (xR - .125 * fh, gyR - .47 * fh), .03 * fh)
        hA, hB = heads
        bm = body.arr()
        img = over(img, '#120610', bm)
        rs = .07 * fh
        sc = np.array(hA)
        mc = np.array(hB)
        sun = disc_mask(sc[0], sc[1], rs)
        moon = disc_mask(mc[0], mc[1], rs * 1.02)
        dx, dy = XX - mc[0], YY - mc[1]
        d = np.sqrt(dx * dx + dy * dy)
        th = np.arctan2(dy, dx)
        rays = ridge1d(3000, 30, 4, 96)
        rv = rays[((th + np.pi) / (2 * np.pi) * 2999).astype(int)]
        cor = np.exp(-np.clip(d - rs, 0, None) / (rs * (.6 + 1.6 * rv))) * (d > rs * .98)
        occ = 1 - .85 * bm
        img = add(img, '#fff0dc', cor * occ, 1.1)
        img = add(img, '#ffb4a0', blur(cor, 30) * occ, .8)
        img = add(img, '#ffd8c0', np.clip(bm - blur(bm, 3), 0, 1) * np.exp(-d / (rs * 6)), 4)
        cres = sun * (1 - moon)
        img = add(img, '#ffffff', cres, 1.5)
        img = glow(img, cres, '#fff4e0', 6, 2.5)
        img = glow(img, cres, '#ffd2b0', 26, 1.5)
        img = over(img, '#0e0610', moon * .97)
        self.cres = cres
        self.mc, self.rs = mc, rs
        self.plate = img.astype(np.float32)

    def dyn(self, img, t):
        r = np.random.default_rng(97)
        n = 45
        x = r.uniform(.1, .9, n) * W + np.sin(t * 2 + r.uniform(0, 6, n)) * 12
        y = r.uniform(.55, .95, n) * H - t * 15
        b = .5 + .5 * np.sin(t * r.uniform(3, 8, n) + r.uniform(0, 6, n))
        m = np.zeros((H, W), np.float32)
        m[np.clip(y.astype(int), 0, H - 1), np.clip(x.astype(int), 0, W - 1)] = b
        add(img, '#ffe9a0', blur(m, 1.2), 7)
        add(img, '#ffc070', blur(m, 6), 20)
        add(img, '#ffffff', self.cres, .3 * np.sin(t * 6) ** 2)


# ----------------------------------------------------------------- 09 olho da tempestade
class Farol(Scene):
    cam = ((1.06, .55, .45), (1.16, .58, .38))

    def build(self):
        hz = .62
        self.eye = np.array([.56 * W, .19 * H])
        F = fbm(H, W, 120, 6, 101)
        dx, dy = (XX - self.eye[0]), (YY - self.eye[1]) * 2.0
        r = np.sqrt(dx * dx + dy * dy) + 1
        th = np.arctan2(dy, dx) + 2.4 * np.log(r / 40)
        sx = np.clip(self.eye[0] + r * np.cos(th), 0, W - 1).astype(int)
        sy = np.clip(self.eye[1] + r * np.sin(th) * .5, 0, H - 1).astype(int)
        sw = F[sy, sx]
        rn = r / W
        img = grad1d(np.clip(sw * 1.2 - .1 + .25 * np.exp(-rn / .25), 0, 1),
                     [(0, '#08161c'), (.4, '#1e4250'), (.65, '#4f7f88'), (.85, '#e3a0b4'), (1, '#ffe4ee')])
        img = add(img, '#ffd6e6', np.exp(-rn / .03), 1.0)
        img = mix(img, vgrad([(0, '#0b1a20'), (1, '#24434a')], 0, hz), (smooth(.35, .75, V))[..., None] * .6)
        sea = vgrad([(0, '#2c4a50'), (.2, '#142a30'), (1, '#050c0f')], hz, 1)
        caps = smooth(.72, .85, vnoise(H, W, 60, 4, 102) * .6 + fbm(H, W, 20, 3, 103) * .4)
        sea = sea + (caps * (1 - (V - hz)))[..., None] * .35
        img = np.where((V < hz)[..., None], img, sea).astype(np.float32)
        ex, ey = self.eye
        ufo = Mask().ellipse(ex, ey + 4, 26, 7).ellipse(ex, ey - 1, 11, 8).arr()
        beam = Mask().poly([(ex - 7, ey + 8), (ex + 7, ey + 8), (ex + 30, ey + 120), (ex - 30, ey + 120)]).arr()
        img = add(img, '#e9fff8', blur(beam, 4) * (1 - (YY - ey) / 120).clip(0, 1), .45)
        img = over(img, '#0a0e12', ufo)
        img = glow(img, ufo, '#9ff6ff', 8, .8)
        cl = Mask()
        rr = ridge1d(W, 40, 4, 104)
        pts = [(.40 * W, H)] + [(x, (.64 + .25 * (1 - smooth(.45, .70, x / W)) ** 1.5 - .035 * rr[int(x)]) * H) for x in np.linspace(.45 * W, W - 1, 60)] + [(W, H)]
        cl.poly(pts)
        img = over(img, '#070b0d', cl.arr())
        lx, ly, lh = .80 * W, .632 * H, .21 * H
        tower = Mask().poly([(lx - .045 * W, ly), (lx + .045 * W, ly), (lx + .03 * W, ly - lh), (lx - .03 * W, ly - lh)]).arr()
        tcol = mix(col('#e6e0d6'), col('#7a756e'), np.clip((XX - lx) / (.05 * W) * .5 + .5, 0, 1)[..., None])
        bands = (np.mod(YY - ly, lh / 3.5) < lh / 7)
        tcol = np.where(bands[..., None], tcol * col('#c0404a') * 1.3, tcol)
        img = over(img, tcol, tower)
        lamp = Mask().rect(lx - .022 * W, ly - lh - .04 * H, lx + .022 * W, ly - lh).arr()
        img = over(img, '#fff2b0', lamp)
        img = over(img, '#151515', Mask().poly([(lx - .03 * W, ly - lh - .04 * H), (lx + .03 * W, ly - lh - .04 * H), (lx, ly - lh - .065 * H)]).arr())
        img = glow(img, lamp, '#ffd88a', 20, 1.2)
        self.lamp = (lx, ly - lh - .02 * H)
        self.plate = img.astype(np.float32)

    def dyn(self, img, t):
        lx, ly = self.lamp
        a = np.deg2rad(198 + 40 * t)
        dx, dy = XX - lx, YY - ly
        s = dx * np.cos(a) + dy * np.sin(a)
        q = -dx * np.sin(a) + dy * np.cos(a)
        beam = np.exp(-(q / (6 + s * .085)) ** 2) * (s > 0) * np.exp(-s / (W * .9))
        add(img, '#fff1c6', beam, 1.0)
        if .48 < t < .60:
            k = 1 - (t - .48) / .12
            img += .22 * k * (V < .62)[..., None]
            r = np.random.default_rng(105)
            p = [(.2 * W, .25 * H)]
            while p[-1][1] < .62 * H:
                p.append((p[-1][0] + r.uniform(-30, 30), p[-1][1] + r.uniform(20, 45)))
            m = Mask(ss=1).line(p, 2.5).arr()
            add(img, '#f0f6ff', m, 1.5 * k)
            glow(img, m, '#b8d0ff', 12, 1.2 * k)
        streaks(img, 160, int(t * 30), 0, W, 0, H, 30, np.deg2rad(105), '#c8d8dc', .18)


# ----------------------------------------------------------------- 10 a única cor
class Papoula(Scene):
    cam = ((1.04, .55, .45), (1.16, .56, .42))

    def build(self):
        img = vgrad([(0, '#d6d6d4'), (.45, '#bdbdba'), (.55, '#8c8c88'), (1, '#4a4a46')])
        mk = Mask(ss=1)
        r = np.random.default_rng(111)
        for _ in range(500):
            x = r.uniform(0, W)
            y = r.uniform(.48, 1.0) * H
            mk.line([(x, y), (x + r.uniform(-25, 25), y - r.uniform(40, 140))], r.uniform(2, 6))
        img = over(img, '#3a3a38', blur(mk.arr(), 9) * .6)
        bk = Mask(ss=1)
        for _ in range(14):
            bk.ring(r.uniform(0, W), r.uniform(.05, .5) * H, rr := r.uniform(10, 30), rr, 2)
            bk.ellipse(r.uniform(0, W), r.uniform(.05, .5) * H, r.uniform(8, 22))
        img = add(img, '#ffffff', blur(bk.arr(), 4), .12)
        fm = Mask()
        hx, hy_, _ = figure(fm, .20 * W, .50 * H, .075 * H, 'stand', head=False)
        img = over(img, '#5a5a58', blur(fm.arr(), 1.8))
        img = moon_head(img, hx, hy_, .075 * H * .085, glow_col=(1, 1, 1), glow_amt=.5)
        img = blur(img, 1.0)
        fc = np.array([.56 * W, .42 * H])
        stem = Mask()
        pts = [(.50 * W + 30 * np.sin(k * 2.2), H * (1.02 - k * .58)) for k in np.linspace(0, 1, 30)]
        pts[-1] = (fc[0], fc[1] + 20)
        stem.line(pts, 9)
        img = over(img, '#2e2e2c', stem.arr())
        flower = np.zeros((H, W, 3), np.float32)
        fa = np.zeros((H, W), np.float32)
        dx, dy = XX - fc[0], YY - fc[1]
        rd = np.sqrt(dx * dx + dy * dy)
        th = np.arctan2(dy, dx)
        crink = vnoise(H, W, 6, 6, 112)
        for k, (ang, rx, ry, sh) in enumerate([(-150, 120, 92, .85), (-30, 125, 90, .9), (95, 115, 95, .75), (40, 120, 88, 1.0), (-95, 105, 80, 1.05)]):
            a = np.deg2rad(ang)
            cx, cy = fc[0] + np.cos(a) * rx * .55, fc[1] + np.sin(a) * ry * .55
            px, py = XX - cx, YY - cy
            u = (px * np.cos(a) + py * np.sin(a)) / rx
            v = (-px * np.sin(a) + py * np.cos(a)) / ry
            e = np.sqrt(u * u + v * v)
            pm = np.clip((1 - e) * 60, 0, 1)
            radial = np.clip(rd / 150, 0, 1)
            pc = grad1d(radial, [(0, '#1a0000'), (.18, '#5a0204'), (.4, '#c01010'), (.8, '#ff3a26'), (1, '#ff6a4a')])
            pc = pc * (sh * (.85 + .3 * crink) * (.8 + .25 * (1 - e)))[..., None]
            flower = flower * (1 - pm[..., None]) + pc * pm[..., None]
            fa = np.maximum(fa, pm)
        cen = disc_mask(fc[0], fc[1], 24)
        flower = flower * (1 - cen[..., None]) + col('#141a12') * cen[..., None]
        fa = np.maximum(fa, cen)
        for k in range(28):
            a = k / 28 * 2 * np.pi
            flower = over(flower, '#050505', disc_mask(fc[0] + np.cos(a) * 32, fc[1] + np.sin(a) * 30, 3.2))
        self.flower, self.fa = flower, fa
        self.base = img.astype(np.float32)
        img = gray(img)
        img = img * (1 - fa[..., None]) + flower * fa[..., None]
        img = glow(img, fa, '#ff2a1a', 40, .12)
        fg = Mask(ss=1)
        for _ in range(90):
            x = r.uniform(-.1, 1.1) * W
            fg.line([(x, H + 10), (x + r.uniform(-40, 40), H * r.uniform(.78, .92))], r.uniform(3, 7))
        img = over(img, '#121212', blur(fg.arr(), 3.5))
        self.plate = img.astype(np.float32)

    def dyn(self, img, t):
        bx = .20 * W + t * 170
        by = .32 * H + np.sin(t * 5) * 30 - t * 40
        flap = abs(np.cos(t * 26))
        mk = Mask(ss=2)
        for side in (-1, 1):
            mk.poly([(bx, by), (bx + side * 46 * flap, by - 40), (bx + side * 58 * flap, by - 8), (bx + side * 10 * flap, by + 4)])
            mk.poly([(bx, by + 2), (bx + side * 38 * flap, by + 10), (bx + side * 26 * flap, by + 38), (bx, by + 14)])
        wm = mk.arr()
        over(img, '#e8e8e6', wm)
        edge = np.clip(wm - blur(wm, 2.5) * 1.2, 0, 1) * 3
        over(img, '#101010', np.clip(edge, 0, 1))
        over(img, '#0a0a0a', Mask().capsule((bx, by - 10), (bx, by + 24), 3.2).arr())


# ----------------------------------------------------------------- 11 parque afogado
class RodaGigante(Scene):
    cam = ((1.04, .52, .52), (1.12, .55, .50))

    def build(self):
        hz = .615
        img = vgrad([(0, '#d2d4d4'), (.85, '#ecedeb'), (1, '#f4f4f2')], 0, hz)
        img = add(img, '#ffffff', smooth(.5, .8, fbm(H, W, 200, 5, 121, aniso=3)) * (V < hz), .2)
        ux = np.arange(W) / W
        isl = (hz - .012 * smooth(.0, .2, ux) * (1 - smooth(.25, .35, ux)) * (1 + ridge1d(W, 30, 3, 122))) * H
        img = over(img, '#b5b8b8', smooth(isl[None, :] - 1, isl[None, :] + 1, YY) * (V < hz))
        sea = vgrad([(0, '#c4c6c6'), (.2, '#9a9e9e'), (1, '#4a5052')], hz, 1)
        sea *= (.92 + .16 * vnoise(H, W, 260, 3, 123))[..., None]
        wl = hz * H
        C = np.array([.56 * W, .555 * H])
        R = .35 * W
        mk = Mask()
        mk.ring(C[0], C[1], R, R, 6).ring(C[0], C[1], R * .9, R * .9, 3).ellipse(C[0], C[1], 16)
        n = 18
        rimpts = []
        for k in range(n):
            a = k / n * 2 * np.pi
            p = (C[0] + np.cos(a) * R, C[1] + np.sin(a) * R)
            rimpts.append(p)
            mk.line([tuple(C), p], 2.6)
            q = (C[0] + np.cos(a + np.pi / n) * R * .9, C[1] + np.sin(a + np.pi / n) * R * .9)
            mk.line([p, q], 2)
            mk.line([p, (p[0], p[1] + 16)], 2)
            mk.rect(p[0] - 14, p[1] + 14, p[0] + 14, p[1] + 44, r=6)
        for s in (-1, 1):
            mk.line([tuple(C), (C[0] + s * R * .55, wl + 120)], 10)
        wh = mk.arr()
        wcol = '#3c4042'
        sky_part = img.copy()
        sky_part = over(sky_part, wcol, wh)
        rows = np.arange(H)
        src = np.clip((2 * wl - rows).astype(int), 0, H - 1)
        refl = wh[src] * (rows > wl)[:, None]
        sh = (np.sin(rows * .17) * 6).astype(int)
        refl = np.stack([np.roll(refl[i], sh[i]) for i in range(H)])
        refl = blur(refl, 2, 1) * np.exp(-np.clip(rows - wl, 0, None) / 400)[:, None]
        sea = over(sea, '#30363a', refl * .45)
        sea = over(sea, '#30363a', wh * .12)
        img = np.where((V < hz)[..., None], sky_part, sea).astype(np.float32)
        fog = smooth(.35, .62, V) * (1 - smooth(.62, .75, V)) * (.6 + .5 * fbm(H, W, 140, 4, 124, aniso=3))
        img = mix(img, col('#e4e6e4'), np.clip(fog, 0, 1)[..., None] * .55)
        img = gray(img, (.97, 1, 1.03))
        lm = np.zeros((H, W), np.float32)
        for k in range(n * 2):
            a = k / (2 * n) * 2 * np.pi
            p = (C[0] + np.cos(a) * R, C[1] + np.sin(a) * R)
            if p[1] < wl - 4:
                lm += disc_mask(p[0], p[1], 3)
                src_y = 2 * wl - p[1]
                lm += disc_mask(p[0], src_y, 2.5) * .35 * (src_y < H)
        img = add(img, '#ffd07a', lm, 1.2)
        img = glow(img, lm, '#ffb04a', 8, 1.4)
        img = glow(img, lm, '#ff9a3a', 30, .5)
        self.plate = img.astype(np.float32)

    def dyn(self, img, t):
        r = np.random.default_rng(125)
        n = 34
        cx, cy = .10 * W + t * 150, .22 * H - t * 30
        mk = Mask(ss=2)
        for i in range(n):
            x = cx + r.normal(0, 70) + np.sin(t * 2 + i) * 8
            y = cy + r.normal(0, 40) + np.cos(t * 1.6 + i) * 6
            s = r.uniform(4, 8)
            f = np.sin(t * 14 + i) * s * .6
            mk.line([(x - s, y - f), (x, y), (x + s, y - f)], 1.4)
        over(img, '#2c2e30', mk.arr())


# ----------------------------------------------------------------- 12 mil luzes, nenhuma ligação
class Lanternas(Scene):
    cam = ((1.05, .5, .55), (1.17, .5, .58))

    def build(self):
        hz = .37
        img = vgrad([(0, '#010208'), (.8, '#08142a'), (1, '#1a2c4a')], 0, hz)
        img = stars(img, 700, 131, ymax=.34, bright=.6)
        sea = vgrad([(0, '#0d1c30'), (.2, '#05101e'), (1, '#010309')], hz, 1)
        sea *= (.85 + .3 * vnoise(H, W, 200, 3, 132))[..., None]
        img = np.where((V < hz)[..., None], img, sea).astype(np.float32)
        r = np.random.default_rng(133)
        self.phones = []
        lit = np.zeros((H, W), np.float32)
        refl = np.zeros((H, W), np.float32)
        notif = np.zeros((H, W), np.float32)
        for _ in range(110):
            z = r.random() ** .8
            y = (hz + .01 + z ** 1.6 * .62) * H
            x = r.uniform(-.05, 1.05) * W
            if abs(x - .5 * W) < .16 * W and .64 * H < y < .80 * H:
                continue
            s = .12 + .88 * z
            w_, h_ = 26 * s, 46 * s * .42
            m = Mask(ss=2).rect(x - w_ / 2, y - h_ / 2, x + w_ / 2, y + h_ / 2, r=3 * s).arr()
            lit += m * r.uniform(.6, 1.0)
            refl += Mask(ss=1).rect(x - w_ * .35, y + h_ / 2, x + w_ * .35, y + h_ / 2 + 70 * s).arr() * .4
            if r.random() < .18:
                notif += disc_mask(x + w_ / 2, y - h_ / 2, 3.5 * s + .6)
            self.phones.append((x, y, s))
        refl = blur(refl, 1, 3) * (vnoise(H, W, 30, 2, 134) > .45)
        img = add(img, '#7fb6ff', refl, .5)
        img = add(img, '#cfe6ff', lit, 1.0)
        img = glow(img, lit, '#7fb0ff', 10, 1.2)
        img = glow(img, lit, '#3c6cff', 50, .9)
        img = over(img, '#ff2a3a', np.clip(notif, 0, 1))
        img = glow(img, notif, '#ff3a3a', 6, .9)
        bx, by = .5 * W, .74 * H
        boat = Mask().poly([(bx - .17 * W, by - .012 * H), (bx + .17 * W, by - .012 * H), (bx + .12 * W, by + .022 * H), (bx - .12 * W, by + .022 * H)])
        boat.line([(bx - .08 * W, by - .01 * H), (bx - .26 * W, by + .03 * H)], 4).line([(bx + .08 * W, by - .01 * H), (bx + .26 * W, by + .03 * H)], 4)
        img = over(img, '#020306', boat.arr())
        mk = Mask()
        fh = .15 * H
        hx, hy_, _ = figure(mk, bx, by + .00 * H + .30 * fh, fh, 'sit', head=False)
        img = over(img, '#020306', mk.arr() * (YY < by))
        self.head = (hx, hy_)
        self.wtex = vnoise(H * 2, W, 30, 3, 135)
        self.plate = moon_head(img, hx, hy_, fh * .085, glow_col=(1, .82, .55), glow_amt=1.1, base=(1, .9, .72))

    def dyn(self, img, t):
        hx, hy_ = self.head
        off = int(t * 40) % H
        tex = self.wtex[H - off:2 * H - off]
        colm = np.exp(-((XX - hx) / 40) ** 2) * (YY > .755 * H) * np.exp(-(YY - .755 * H) / 200)
        add(img, '#ffc070', smooth(.55, .8, tex) * colm, .9)
        r = np.random.default_rng(136)
        for i, (x, y, s) in enumerate(self.phones[::9]):
            on = np.sin(t * r.uniform(3, 9) + r.uniform(0, 6)) > .6
            if on:
                m = disc_mask(x, y, 20 * s)
                add(img, '#9fd0ff', m, .5)


# ----------------------------------------------------------------- 13 baleia de fim de tarde
def whale_mask(L, x0, y0):
    s = np.linspace(0, 1, 120)
    top = -L * .13 * np.sin(np.pi * np.clip(s, 0, 1) ** .72) - L * .01
    bot = L * .11 * np.sin(np.pi * s ** .8) + L * .004
    xs = x0 + s * L
    mk = Mask()
    pts = [(xs[i], y0 + top[i]) for i in range(len(s))] + [(xs[i], y0 + bot[i]) for i in range(len(s))][::-1]
    mk.poly(pts)
    mk.ellipse(x0 + L * .985, y0 + L * .002, L * .03, L * .055)
    tx, ty = x0 + L * .02, y0
    mk.poly([(tx, ty - 6), (tx - L * .12, ty - L * .11), (tx - L * .16, ty - L * .10), (tx - L * .06, ty), (tx - L * .16, ty + L * .10),
             (tx - L * .12, ty + L * .11), (tx, ty + 6)])
    fx, fy = x0 + L * .66, y0 + L * .06
    mk.poly([(fx, fy - 6), (fx + L * .06, fy), (fx - L * .12, fy + L * .20), (fx - L * .17, fy + L * .21), (fx - L * .05, fy + L * .03)])
    mk.poly([(x0 + L * .30, y0 - L * .07), (x0 + L * .36, y0 - L * .10), (x0 + L * .37, y0 - L * .07)])
    return mk


class Baleia(Scene):
    cam = ((1.04, .5, .5), (1.12, .52, .46))

    def build(self):
        hz = .72
        img = vgrad([(0, '#160f36'), (.30, '#432660'), (.55, '#a84f78'), (.70, '#ec9364'), (.75, '#ffcf96'), (1, '#ffd9a6')], 0, 1)
        cl = fbm(H, W, 150, 5, 141, aniso=3.5)
        lit = vgrad([(0, '#7a4a8a'), (.6, '#ff9a8a'), (1, '#ffd0a0')], .2, .72)
        img = over(img, lit, smooth(.55, .70, cl) * (V < .7) * .7)
        img = over(img, '#2c1a46', smooth(.62, .78, fbm(H, W, 100, 5, 142, aniso=3)) * (V < .5) * .5)
        img = add(img, '#ffd9a0', np.exp(-((V - hz) / .05) ** 2), .5)
        self.L = .80 * W
        wm = whale_mask(self.L, .12 * W, .34 * H).arr()
        wcol = vgrad([(0, '#0e0a1e'), (.55, '#1c1434'), (1, '#6a4a6e')], .25, .45)
        sprite = np.zeros((H, W, 3), np.float32) + wcol
        grooves = (np.sin(YY * .9) > .7) * (YY > .345 * H) * (XX > .55 * W)
        sprite = mix(sprite, sprite * 1.4, (grooves * .5)[..., None])
        rim = np.clip(wm - np.roll(wm, -7, 0), 0, 1)
        sprite = sprite + blur(rim, 1.5)[..., None] * col('#ffb08a') * 1.4
        self.wsprite, self.wm = sprite, wm
        self.sky = img.astype(np.float32)
        town = Mask()
        r = np.random.default_rng(143)
        x = -20
        wins = Mask(ss=1)
        while x < W + 20:
            w_ = r.uniform(60, 120)
            h_ = r.uniform(70, 160)
            base = .90 * H
            town.rect(x, base - h_, x + w_, H)
            town.poly([(x - 6, base - h_), (x + w_ / 2, base - h_ - w_ * .4), (x + w_ + 6, base - h_)])
            if r.random() < .5:
                town.rect(x + w_ * .7, base - h_ - w_ * .35, x + w_ * .7 + 12, base - h_ - 10)
            for _ in range(r.integers(1, 4)):
                if r.random() < .7:
                    wx, wy = x + r.uniform(10, w_ - 26), base - h_ + r.uniform(15, h_ - 30)
                    wins.rect(wx, wy, wx + 14, wy + 18)
            x += w_ + r.uniform(-5, 20)
        tm = town.arr()
        self.tm = tm
        self.wins = wins.arr() * tm
        lamp = Mask().line([(.30 * W, H), (.30 * W, .76 * H)], 6).line([(.30 * W, .76 * H), (.34 * W, .755 * H)], 4).arr()
        self.lamp = lamp
        mk = Mask()
        fh = .11 * H
        self.head = figure(mk, .44 * W, .955 * H, fh, 'stand', head=False)
        self.fig = mk.arr()
        self.fh = fh
        self.plate = self.sky

    def frame(self, t):
        img = self.sky.copy()
        dxp = int(t * 30)
        m = np.roll(self.wm, dxp, 1)
        s = np.roll(self.wsprite, dxp, 1)
        img = mix(img, s, m[..., None])
        img = over(img, '#ffc9a0', smooth(.5, .7, fbm(H, W, 90, 3, 144, aniso=4)) * np.exp(-((V - .47) / .05) ** 2) * .45)
        img = over(img, '#140b22', self.tm)
        img = over(img, '#ffcf7a', self.wins)
        img = glow(img, self.wins, '#ffa040', 10, .9)
        img = over(img, '#0c0614', self.lamp)
        lm = disc_mask(.34 * W, .762 * H, 6)
        img = add(img, '#fff0c0', lm, 2)
        img = glow(img, lm, '#ffc070', 30, 1.5)
        img = add(img, '#ffb060', blur(Mask().poly([(.32 * W, .765 * H), (.36 * W, .765 * H), (.46 * W, H), (.22 * W, H)]).arr(), 10), .25)
        img = over(img, '#05030a', self.fig)
        hx, hy_, _ = self.head
        return moon_head(img, hx, hy_, self.fh * .085, glow_col=(1, .9, .75), glow_amt=.7)


# ----------------------------------------------------------------- 14 devolvendo a lua
class Janela(Scene):
    cam = ((1.04, .5, .42), (1.16, .5, .36))

    def build(self):
        self.win = (.24 * W, .12 * H, .76 * W, .52 * H)
        x0, y0, x1, y1 = self.win
        out = vgrad([(0, '#050c22'), (.6, '#13285a'), (1, '#2c4680')], y0 / H, y1 / H)
        out = stars(out, 500, 151, ymax=.5, bright=.8, big=4)
        hill = (.507 - .016 * ridge1d(W, 80, 4, 152)) * H
        hm = smooth(hill[None, :] - 1, hill[None, :] + 1, YY)
        lights = np.zeros((H, W), np.float32)
        r = np.random.default_rng(153)
        for _ in range(60):
            x = r.integers(0, W)
            y = int(hill[x] + r.uniform(4, 40))
            lights[min(y, H - 1), x] = r.uniform(.5, 1)
        self.out = out
        self.hm = hm
        self.lights = blur(lights, .8)
        room = vgrad([(0, '#070a14'), (.5, '#0b1020'), (1, '#04060c')])
        room *= (.9 + .2 * fbm(H, W, 200, 3, 154))[..., None]
        self.room = room.astype(np.float32)
        winm = Mask().rect(x0, y0, x1, y1).arr()
        frame = Mask()
        frame.rect(x0 - 16, y0 - 16, x1 + 16, y0 + 4).rect(x0 - 16, y0 - 16, x0 + 4, y1 + 16).rect(x1 - 4, y0 - 16, x1 + 16, y1 + 16)
        frame.rect((x0 + x1) / 2 - 7, y0, (x0 + x1) / 2 + 7, y1).rect(x0, (y0 + y1) / 2 - 6, x1, (y0 + y1) / 2 + 6)
        frame.rect(x0 - 40, y1, x1 + 40, y1 + .028 * H)
        self.winm, self.frm = winm, frame.arr()
        cur = Mask()
        cur.poly([(.06 * W, .06 * H), (.27 * W, .06 * H), (.22 * W, .40 * H), (.25 * W, .74 * H), (.04 * W, .74 * H)])
        cur.poly([(.94 * W, .06 * H), (.73 * W, .06 * H), (.78 * W, .40 * H), (.75 * W, .74 * H), (.96 * W, .74 * H)])
        self.cur = cur.arr()
        self.folds = (.55 + .45 * np.sin(XX * .09 + np.sin(YY * .01) * 2)).astype(np.float32)
        cat = Mask()
        cx, cb = .67 * W, y1
        cat.ellipse(cx, cb - 40, 30, 42).ellipse(cx - 4, cb - 92, 22, 20)
        cat.poly([(cx - 22, cb - 100), (cx - 18, cb - 126), (cx - 6, cb - 108)]).poly([(cx + 2, cb - 108), (cx + 12, cb - 128), (cx + 18, cb - 100)])
        cat.line([(cx + 26, cb - 6), (cx + 60, cb - 4), (cx + 76, cb - 18)], 8)
        self.cat = cat.arr()
        bed = Mask().poly([(-.05 * W, .80 * H), (1.05 * W, .78 * H), (1.05 * W, H), (-.05 * W, H)])
        self.bed = bed.arr()
        mk = Mask()
        fh = .36 * H
        figure(mk, .38 * W, 1.0 * H + .02 * H, fh, 'sit', head=True, head_r=.07)
        self.fig = mk.arr()
        self.plate = room
        self.moon = moon_sprite(44, 7)
        self.lightm = blur(Mask(ss=1).poly([(x0, y1), (x1, y1), (x1 + .20 * W, H), (x0 - .10 * W, H)]).arr(), 18)

    def frame(self, t):
        x0, y0, x1, y1 = self.win
        k = np.clip(t / 2.5, 0, 1)
        k = 1 - (1 - k) ** 2
        my = mix(.50 * H, .245 * H, k)
        mx = .535 * W
        sky = self.out.copy()
        rgb, a = self.moon
        sky = glow(sky, disc_mask(mx, my, 44), '#cfe0ff', 60, .5 + .4 * k)
        sky = glow(sky, disc_mask(mx, my, 44), '#ffffff', 14, .6)
        paste(sky, rgb * 1.2, a, mx, my)
        sky = over(sky, '#03060f', self.hm)
        sky = add(sky, '#ffcf8a', self.lights, 6)
        img = self.room * (1 + 1.2 * k)
        img = mix(img, sky, self.winm[..., None])
        light = self.lightm
        img = add(img, '#8ab0ff', light * (YY > y1), .12 + .22 * k)
        img = over(img, "#04060c", self.frm)
        img = add(img, "#9ab8ff", self.frm * np.exp(-((YY - y1 - 2) / 3) ** 2), .5 * k)
        cc = mix(col('#0a0e1c'), col('#1c2a50'), np.clip(1 - np.abs(XX - W / 2) / (.3 * W), 0, 1)[..., None] * k)
        img = mix(img, cc * self.folds[..., None], self.cur[..., None])
        bedc = vgrad([(0, '#141c38'), (1, '#05070e')], .78, 1.0) * (.8 + .3 * self.folds[..., None])
        img = mix(img, bedc + light[..., None] * col('#6a88d0') * .35 * k, self.bed[..., None])
        img = over(img, '#020308', self.cat)
        img = over(img, '#020308', self.fig)
        img = add(img, '#9ab8ff', blur(self.fig, 2) * (1 - self.fig) * (YY < .70 * H), .25 * k)
        return img


SCENES = [MarSemLua, Cometa, Corrente, FimDoMundo, Escada, Nublado, SemSinal, Eclipse,
          Farol, Papoula, RodaGigante, Lanternas, Baleia, Janela]
