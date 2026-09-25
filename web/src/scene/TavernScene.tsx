/**
 * A TOCA DO JAVALI — cenário de fundo vivo.
 * Parede de pedra, vigas, lareira com fogo, cabeça de javali sobre a lareira,
 * estandartes, tochas, lustre de velas, barris e mesas em silhueta, fumaça e
 * brasas subindo. Em telas estreitas o enquadramento foca a lareira.
 */
import { memo, useEffect, useRef } from 'react';
import { BoarHead } from '../brand/Logo';
import { usePrefs } from '../lib/prefs';

export type SceneMood = 'home' | 'dim' | 'dark';

function Flames({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="flame" d="M-60 0 C -70 -60, -30 -90, -20 -150 C 0 -100, 30 -110, 20 -170 C 60 -120, 80 -60, 60 0 Z" fill="url(#fireOuter)" />
      <path className="flame flame--b" d="M-40 0 C -46 -40, -20 -70, -10 -110 C 6 -76, 26 -80, 18 -126 C 46 -90, 54 -40, 40 0 Z" fill="url(#fireMid)" />
      <path className="flame flame--c" d="M-22 0 C -26 -26, -10 -44, -4 -70 C 6 -48, 18 -50, 14 -78 C 30 -52, 32 -24, 22 0 Z" fill="url(#fireCore)" />
    </g>
  );
}

function Torch({ x, y, cls }: { x: number; y: number; cls?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="150" fill="url(#torchGlow)" className={`torchlight ${cls ?? ''}`} style={{ mixBlendMode: 'screen' }} />
      <path d="M-6 10 L6 10 L10 90 L-10 90 Z" fill="#2a1a0e" stroke="#6b4520" strokeWidth="2" />
      <path d="M-18 8 L18 8 L12 20 L-12 20 Z" fill="#4d4640" stroke="#8a7a66" strokeWidth="1.5" />
      <g transform="translate(0 10) scale(.28)">
        <path className="flame" d="M-60 0 C -70 -60, -30 -90, -20 -150 C 0 -100, 30 -110, 20 -170 C 60 -120, 80 -60, 60 0 Z" fill="url(#fireOuter)" />
        <path className="flame flame--c" d="M-30 0 C -34 -30, -12 -50, -6 -84 C 8 -58, 22 -60, 18 -90 C 38 -60, 40 -28, 30 0 Z" fill="url(#fireCore)" />
      </g>
    </g>
  );
}

function Banner({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 70)`}>
      <rect x="-70" y="-6" width="140" height="12" rx="6" fill="#3d2615" stroke="#8b603a" />
      <g className="banner-sway">
        <path d="M-58 6 L58 6 L58 330 L0 290 L-58 330 Z" fill="url(#bannerCloth)" stroke="#5e1712" strokeWidth="2" />
        <path d="M-48 16 L48 16 L48 310 L0 274 L-48 310 Z" fill="none" stroke="#d9a441" strokeWidth="2" opacity=".55" />
        <g transform="translate(-36 90) scale(.36)" opacity=".85">
          <BoarHead fill="#d9a441" eyes="#ffcf7a" />
        </g>
      </g>
    </g>
  );
}

function Scenery() {
  return (
    <svg className="scene-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <pattern id="bricks" width="140" height="64" patternUnits="userSpaceOnUse">
          <rect width="140" height="64" fill="#140c08" />
          <rect x="3" y="3" width="64" height="26" rx="5" fill="#2b221c" />
          <rect x="71" y="3" width="66" height="26" rx="5" fill="#2f2620" />
          <rect x="-32" y="35" width="66" height="26" rx="5" fill="#2d241e" />
          <rect x="38" y="35" width="64" height="26" rx="5" fill="#29201a" />
          <rect x="106" y="35" width="66" height="26" rx="5" fill="#2d241e" />
        </pattern>
        <pattern id="planks" width="220" height="40" patternUnits="userSpaceOnUse">
          <rect width="220" height="40" fill="#1c1109" />
          <rect x="0" y="2" width="216" height="36" fill="#26170c" />
          <path d="M10 14 C 60 10, 120 18, 200 12" stroke="#1a0f07" strokeWidth="2" fill="none" />
        </pattern>
        <radialGradient id="hearthLight" cx="800" cy="760" r="820" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff9a3c" stopOpacity=".85" />
          <stop offset=".25" stopColor="#d4581f" stopOpacity=".45" />
          <stop offset=".6" stopColor="#6b2a10" stopOpacity=".15" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="torchGlow">
          <stop offset="0" stopColor="#ffb357" stopOpacity=".55" />
          <stop offset=".5" stopColor="#e0582a" stopOpacity=".12" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="candleGlow">
          <stop offset="0" stopColor="#ffd27a" stopOpacity=".6" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fireOuter" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#c7361a" />
          <stop offset=".6" stopColor="#e86a24" stopOpacity=".9" />
          <stop offset="1" stopColor="#f5a23a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fireMid" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#f58a2a" />
          <stop offset="1" stopColor="#ffd05c" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id="fireCore" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff4c8" />
          <stop offset="1" stopColor="#ffd46a" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="bannerCloth" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a100c" />
          <stop offset=".5" stopColor="#8a2019" />
          <stop offset="1" stopColor="#4a100c" />
        </linearGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2413" />
          <stop offset="1" stopColor="#1d1209" />
        </linearGradient>
        <linearGradient id="stoneArch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d352e" />
          <stop offset="1" stopColor="#221c17" />
        </linearGradient>
        <linearGradient id="plaque" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5e3b1f" />
          <stop offset="1" stopColor="#2a1a0e" />
        </linearGradient>
        <linearGradient id="boarBronze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b5a2b" />
          <stop offset=".6" stopColor="#4a2c15" />
          <stop offset="1" stopColor="#24150a" />
        </linearGradient>
      </defs>

      {/* parede */}
      <rect width="1600" height="900" fill="url(#bricks)" />
      <rect width="1600" height="900" fill="url(#hearthLight)" className="firelight" style={{ mixBlendMode: 'screen' }} />

      {/* vigas e pilares */}
      <rect x="0" y="0" width="1600" height="64" fill="url(#beam)" />
      <rect x="0" y="60" width="1600" height="6" fill="#0d0805" opacity=".7" />
      <rect x="120" y="0" width="54" height="900" fill="url(#beam)" />
      <rect x="1426" y="0" width="54" height="900" fill="url(#beam)" />
      <path d="M174 64 L 290 64 L 174 180 Z M1426 64 L 1310 64 L 1426 180 Z" fill="#2a1a0e" />

      <Banner x={330} />
      <Banner x={1270} />
      <Torch x={475} y={330} />
      <Torch x={1125} y={330} cls="torchlight--b" />

      {/* lustre */}
      <g className="chandelier">
        <path d="M800 64 L 800 118" stroke="#3d2e22" strokeWidth="4" />
        <ellipse cx="800" cy="130" rx="120" ry="14" fill="none" stroke="#4d3a28" strokeWidth="8" />
        {[-100, -50, 0, 50, 100].map((dx) => (
          <g key={dx} transform={`translate(${800 + dx} 116)`}>
            <circle r="46" fill="url(#candleGlow)" className="torchlight" style={{ mixBlendMode: 'screen' }} />
            <rect x="-4" y="-2" width="8" height="18" fill="#e9dcc0" />
            <ellipse className="candle-flame" cx="0" cy="-9" rx="4" ry="9" fill="#ffd27a" />
          </g>
        ))}
      </g>

      {/* troféu: cabeça de javali sobre a lareira */}
      <g transform="translate(800 330)">
        <ellipse cx="0" cy="0" rx="120" ry="112" fill="url(#plaque)" stroke="#8b603a" strokeWidth="4" />
        <ellipse cx="0" cy="0" rx="104" ry="96" fill="none" stroke="#d9a441" strokeWidth="2" opacity=".35" />
        <g transform="translate(-92 -104) scale(.92)">
          <BoarHead fill="url(#boarBronze)" eyes="#ff7a2e" />
        </g>
      </g>

      {/* lareira */}
      <g>
        <path d="M540 900 L 540 520 Q 540 470 590 470 L 1010 470 Q 1060 470 1060 520 L 1060 900 Z" fill="url(#stoneArch)" stroke="#5f564b" strokeWidth="3" />
        <rect x="500" y="452" width="600" height="30" rx="4" fill="#3d2615" stroke="#8b603a" strokeWidth="2" />
        <path d="M610 900 L 610 640 Q 610 560 800 560 Q 990 560 990 640 L 990 900 Z" fill="#080403" />
        <path d="M610 900 L 610 640 Q 610 560 800 560 Q 990 560 990 640 L 990 900 Z" fill="url(#hearthLight)" opacity=".5" />
        <Flames x={740} y={850} s={1.05} />
        <Flames x={860} y={852} s={0.9} />
        <Flames x={800} y={856} s={1.35} />
        <rect x="660" y="846" width="280" height="20" rx="10" fill="#2b1608" transform="rotate(-4 800 856)" />
        <rect x="680" y="852" width="250" height="18" rx="9" fill="#3a1d0b" transform="rotate(5 800 860)" />
        {/* candelabros no console */}
        {[560, 1040].map((cx) => (
          <g key={cx} transform={`translate(${cx} 452)`}>
            <circle r="40" cy="-30" fill="url(#candleGlow)" className="torchlight" style={{ mixBlendMode: 'screen' }} />
            <rect x="-6" y="-26" width="12" height="26" fill="#e9dcc0" />
            <ellipse className="candle-flame" cx="0" cy="-34" rx="5" ry="10" fill="#ffd27a" />
          </g>
        ))}
      </g>

      {/* chão */}
      <rect x="0" y="868" width="1600" height="40" fill="url(#planks)" />

      {/* silhuetas: barris (esq.) */}
      <g fill="#0b0604" stroke="#e0582a" strokeOpacity=".22" strokeWidth="2">
        <ellipse cx="250" cy="800" rx="78" ry="96" />
        <ellipse cx="400" cy="820" rx="70" ry="80" />
        <ellipse cx="320" cy="660" rx="70" ry="84" />
        <path d="M180 760 L 320 760 M186 840 L 320 840 M258 612 L 384 612 M258 704 L 384 704" stroke="#2a1a0e" strokeWidth="6" />
      </g>
      {/* mesa, bancos e canecas (dir.) */}
      <g fill="#0b0604" stroke="#e0582a" strokeOpacity=".22" strokeWidth="2">
        <path d="M1160 760 L 1540 760 L 1540 784 L 1160 784 Z" />
        <path d="M1190 784 L 1210 900 L 1230 900 L 1216 784 Z M1490 784 L 1476 900 L 1496 900 L 1516 784 Z" />
        <path d="M1240 720 L 1280 720 L 1278 760 L 1242 760 Z M1282 732 C 1298 732, 1298 752, 1280 752" />
        <path d="M1400 726 L 1434 726 L 1432 760 L 1402 760 Z" />
        <path d="M1100 830 L 1180 830 L 1180 846 L 1100 846 Z M1110 846 L 1116 900 L 1124 900 M1170 846 L 1164 900 L 1156 900" />
      </g>
    </svg>
  );
}

/** Brasas subindo — canvas leve, pausa quando a aba está oculta. */
function Embers({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; hue: number };
    let ps: P[] = [];
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const spawn = (): P => {
      const fromHearth = Math.random() < 0.7;
      return {
        x: fromHearth ? w / 2 + (Math.random() - 0.5) * Math.min(w, 380) : Math.random() * w,
        y: h + 10,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -(0.5 + Math.random() * 1.1),
        life: 0,
        max: 260 + Math.random() * 380,
        r: 0.7 + Math.random() * 1.8,
        hue: 18 + Math.random() * 26,
      };
    };
    const target = Math.round(Math.min(70, (w * h) / 22000) * density);
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(3, (t - last) / 16.7);
      last = t;
      ctx.clearRect(0, 0, w, h);
      while (ps.length < target) ps.push(spawn());
      ps = ps.filter((p) => p.life < p.max && p.y > -20);
      for (const p of ps) {
        p.life += dt;
        p.x += (p.vx + Math.sin((p.life + p.hue * 10) / 40) * 0.35) * dt;
        p.y += p.vy * dt;
        const k = p.life / p.max;
        const a = Math.max(0, (k < 0.1 ? k * 10 : 1 - k) * 0.9);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `hsla(${p.hue + 20}, 100%, 75%, ${a})`);
        g.addColorStop(0.4, `hsla(${p.hue}, 100%, 55%, ${a * 0.5})`);
        g.addColorStop(1, `hsla(${p.hue}, 100%, 40%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [density]);
  return <canvas ref={ref} className="scene-embers" aria-hidden="true" />;
}

const MemoScenery = memo(Scenery);

export function TavernScene({ mood = 'home' }: { mood?: SceneMood }) {
  const prefs = usePrefs();
  return (
    <div className={`scene scene--${mood}`} aria-hidden="true">
      <MemoScenery />
      <div className="scene-smoke" />
      <div className="scene-veil" />
      {prefs.embers && !prefs.reduceMotion && <Embers density={mood === 'home' ? 1 : 0.5} />}
    </div>
  );
}

export { Embers };
