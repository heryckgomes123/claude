/**
 * Retratos dos 10 personagens da Toca.
 * Direção de arte: silhuetas iluminadas pela lareira — contorno em luz de
 * brasa, olhos brilhando no escuro e um acessório que identifica cada um.
 * Tudo em SVG (nítido em qualquer tamanho, zero download).
 */
import { useId, type ReactElement } from 'react';
import { CHARACTER_MAP, FRAME_MAP } from '../../../shared/catalog';
import { ThemeIcon } from './Icon';

const BODY = 'M8 100 C 10 80, 28 70, 50 70 C 72 70, 90 80, 92 100 Z';
const NECK = 'M41 58 L59 58 L61 73 L39 73 Z';
const HEAD = 'M50 28 C 62 28, 66 38, 65 48 C 64 60, 57 66, 50 66 C 43 66, 36 60, 35 48 C 34 38, 38 28, 50 28 Z';

type Accessory = (c: { dark: string; light: string; rim: string }) => ReactElement;

const ACC: Record<string, Accessory> = {
  // Bórg — elmo com chifres, ombreiras
  borg: ({ dark, rim }) => (
    <g>
      <path d="M33 44 C 32 26, 68 26, 67 44 L 64 40 L 36 40 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M35 36 C 22 34, 16 22, 20 10 C 24 20, 30 26, 38 30 Z" fill="#e8d8b4" opacity=".9" />
      <path d="M65 36 C 78 34, 84 22, 80 10 C 76 20, 70 26, 62 30 Z" fill="#e8d8b4" opacity=".9" />
      <path d="M10 88 C 14 74, 26 70, 34 72 L 30 84 Z M90 88 C 86 74, 74 70, 66 72 L 70 84 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M40 50 C 42 64, 58 64, 60 50 C 56 58, 44 58, 40 50 Z" fill={dark} />
    </g>
  ),
  // Brun — careca, barba farta, avental, martelo no ombro
  brun: ({ dark, rim }) => (
    <g>
      <path d="M36 50 C 36 72, 46 80, 50 82 C 54 80, 64 72, 64 50 C 58 60, 42 60, 36 50 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M36 82 L 64 82 L 66 100 L 34 100 Z" fill="#3a2414" />
      <path d="M74 48 L 80 94" stroke="#6b4a2b" strokeWidth="4" strokeLinecap="round" />
      <rect x="66" y="38" width="20" height="12" rx="2" fill="#4d4640" stroke={rim} strokeWidth=".8" transform="rotate(8 76 44)" />
    </g>
  ),
  // Kael — capuz, lenço no rosto
  kael: ({ dark, rim }) => (
    <g>
      <path d="M28 72 C 24 50, 30 22, 50 18 C 70 22, 76 50, 72 72 C 66 60, 64 44, 50 40 C 36 44, 34 60, 28 72 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M38 52 C 44 58, 56 58, 62 52 L 60 62 C 54 66, 46 66, 40 62 Z" fill="#2a1e30" />
    </g>
  ),
  // Ragnar — cabelo longo, tranças e barba, cicatriz
  ragnar: ({ dark, rim }) => (
    <g>
      <path d="M34 42 C 32 26, 68 26, 66 42 C 70 56, 70 70, 66 80 L 62 60 L 38 60 L 34 80 C 30 70, 30 56, 34 42 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M40 54 C 42 70, 48 78, 50 84 C 52 78, 58 70, 60 54 C 54 60, 46 60, 40 54 Z" fill={dark} />
      <path d="M31 46 L 29 74 M69 46 L 71 74" stroke={rim} strokeWidth="2" strokeDasharray="3 2" opacity=".6" />
    </g>
  ),
  // Lynx — capuz de caça com orelhas e arco
  lynx: ({ dark, rim }) => (
    <g>
      <path d="M30 70 C 26 50, 30 26, 50 22 C 70 26, 74 50, 70 70 C 64 60, 62 44, 50 40 C 38 44, 36 60, 30 70 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M36 30 L 34 14 L 44 24 Z M64 30 L 66 14 L 56 24 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M16 96 C 12 70, 20 46, 34 34" stroke="#7a5230" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M16 96 L 34 34" stroke="#d8c59f" strokeWidth=".6" />
    </g>
  ),
  // Lupi — boné de mensageiro com pena
  lupi: ({ dark, rim, light }) => (
    <g>
      <path d="M34 40 C 36 26, 64 26, 66 40 C 58 36, 42 36, 34 40 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M62 34 C 74 26, 84 12, 82 4 C 76 14, 68 22, 60 30 Z" fill={light} opacity=".9" />
      <path d="M26 86 L 40 74 L 60 74 L 74 86" stroke="#5a3a20" strokeWidth="3" fill="none" />
      <rect x="62" y="80" width="14" height="10" rx="2" fill="#5a3a20" />
    </g>
  ),
  // Otis — chapéu de aba larga, bolsa de moedas
  otis: ({ dark, rim, light }) => (
    <g>
      <ellipse cx="50" cy="34" rx="28" ry="5" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M38 34 C 38 18, 62 18, 62 34 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M38 30 L 62 30" stroke={light} strokeWidth="2" opacity=".8" />
      <path d="M44 56 C 46 62, 54 62, 56 56" stroke={rim} strokeWidth="1" fill="none" />
      <circle cx="30" cy="88" r="7" fill="#5a3a18" stroke={light} strokeWidth="1" />
    </g>
  ),
  // Brokk — capacete de mineiro com vela, barba
  brokk: ({ dark, rim, light }) => (
    <g>
      <path d="M33 42 C 32 24, 68 24, 67 42 Z" fill="#4a423a" stroke={rim} strokeWidth=".8" />
      <rect x="45" y="22" width="10" height="8" rx="2" fill="#6b5e4e" />
      <ellipse className="candle-flame" cx="50" cy="16" rx="3" ry="6" fill={light} />
      <path d="M38 52 C 40 70, 48 76, 50 80 C 52 76, 60 70, 62 52 C 56 58, 44 58, 38 52 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M80 60 L 94 50 M86 56 L 88 70" stroke="#6b6158" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  // Corvin — capuz profundo e máscara de bico
  corvin: ({ dark, rim }) => (
    <g>
      <path d="M26 74 C 20 48, 28 18, 50 14 C 72 18, 80 48, 74 74 C 66 60, 64 42, 50 38 C 36 42, 34 60, 26 74 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M44 50 L 50 72 L 56 50 Z" fill="#1a1820" stroke={rim} strokeWidth=".6" />
      <path d="M70 76 C 78 66, 88 66, 94 72 C 86 72, 82 76, 80 82 Z" fill={dark} stroke={rim} strokeWidth=".6" />
    </g>
  ),
  // Aldren — chapéu de mago e barba longa
  aldren: ({ dark, rim, light }) => (
    <g>
      <ellipse cx="50" cy="38" rx="24" ry="4.5" fill={dark} stroke={rim} strokeWidth=".8" />
      <path d="M36 38 L 50 4 L 56 16 L 64 38 Z" fill={dark} stroke={rim} strokeWidth=".8" />
      <circle cx="53" cy="22" r="1.6" fill={light} />
      <path d="M38 52 C 40 76, 46 90, 50 98 C 54 90, 60 76, 62 52 C 56 60, 44 60, 38 52 Z" fill="#cfc4ae" opacity=".85" />
    </g>
  ),
};

/**
 * Artes oficiais (pintadas) dos personagens. Quando existir um arquivo em
 * web/public/art/characters/<id>.webp, registre-o aqui e ele substitui a
 * silhueta em SVG em todo o app.
 */
export const OFFICIAL_ART: Record<string, string> = {
  borg: '/art/characters/borg.webp',
};

export function CharacterArt({ id, className, withEmblem = true }: { id: string; className?: string; withEmblem?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const c = CHARACTER_MAP[id] ?? CHARACTER_MAP.borg;
  if (OFFICIAL_ART[c.id]) {
    return <img src={OFFICIAL_ART[c.id]} className={`char-img ${className ?? ''}`} alt={`${c.name}, ${c.role}`} draggable={false} />;
  }
  const [base, accent] = c.colors;
  const dark = '#140c08';
  const acc = ACC[c.id] ?? ACC.borg;
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${c.name}, ${c.role}`}>
      <defs>
        <radialGradient id={`bg${uid}`} cx=".5" cy=".85" r=".9">
          <stop offset="0" stopColor={accent} stopOpacity=".95" />
          <stop offset=".35" stopColor={base} />
          <stop offset="1" stopColor="#0a0605" />
        </radialGradient>
        <linearGradient id={`rim${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={accent} />
          <stop offset="1" stopColor={accent} stopOpacity=".15" />
        </linearGradient>
        <filter id={`glow${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <rect width="100" height="100" fill={`url(#bg${uid})`} />
      {withEmblem && (
        <g opacity=".13" transform="translate(58 4) scale(1.5)" color="#fff">
          <ThemeIcon name={c.emblem} size={24} strokeWidth={1.5} />
        </g>
      )}
      <g>
        <path d={BODY} fill={dark} stroke={`url(#rim${uid})`} strokeWidth="1.2" />
        <path d={NECK} fill={dark} />
        <path d={HEAD} fill={dark} stroke={`url(#rim${uid})`} strokeWidth="1" />
        {acc({ dark, light: accent, rim: `url(#rim${uid})` })}
        <g filter={`url(#glow${uid})`}>
          <ellipse cx="44" cy="47" rx="2.6" ry="1.3" fill={accent} />
          <ellipse cx="56" cy="47" rx="2.6" ry="1.3" fill={accent} />
        </g>
        <ellipse cx="44" cy="47" rx="1.5" ry=".7" fill="#fff6dc" />
        <ellipse cx="56" cy="47" rx="1.5" ry=".7" fill="#fff6dc" />
      </g>
    </svg>
  );
}

export function Portrait({
  avatar,
  frame = 'madeira',
  size = 48,
  level,
  active = false,
  square = false,
  title,
}: {
  avatar: string;
  frame?: string;
  size?: number;
  level?: number;
  active?: boolean;
  square?: boolean;
  title?: string;
}) {
  const f = FRAME_MAP[frame] ?? FRAME_MAP.madeira;
  return (
    <div
      className={`portrait ${square ? 'portrait--square' : ''} ${active ? 'is-active' : ''}`}
      style={{ width: size, height: size, ['--frame-color' as any]: f.color, ['--frame-glow' as any]: f.glow }}
      title={title}
    >
      <CharacterArt id={avatar} />
      {level !== undefined && <span className="lvl">{level}</span>}
    </div>
  );
}
