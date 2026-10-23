/**
 * Ilustrações vetoriais dos produtos. Leves (nenhuma imagem externa) e recolorem
 * conforme a variação escolhida — o vaso fica laranja quando o cliente escolhe laranja.
 * Quando houver fotos reais, basta trocar por <img> no ProductCard/ProductPage.
 */
import { useId, type ReactNode } from 'react'

export type ArtKey =
  | 'avental'
  | 'colar'
  | 'luvas'
  | 'anel'
  | 'pin'
  | 'abotoaduras'
  | 'gravata'
  | 'malhete'
  | 'quadro'
  | 'caneca'
  | 'camiseta'
  | 'colunas'
  | 'esquadro'
  | 'chaveiro'
  | 'bode'
  | 'vaso'
  | 'lua'
  | 'lithophane'
  | 'suporte'
  | 'headset'
  | 'dragao'
  | 'organizador'
  | 'topo'
  | 'xadrez'
  | 'servico'
  | 'modelagem'

export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)))
  const r = f(n >> 16)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 170
}

const GOLD = '#c79b3b'
const GOLD_L = '#ecd28f'
const NAVY = '#15263d'

/** Esquadro e Compasso (coordenadas 0–100). */
export function SquareCompass({ color = GOLD, x = 0, y = 0, s = 1, w = 7 }: { color?: string; x?: number; y?: number; s?: number; w?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {/* compasso */}
      <path d="M50 12 L20 80 M50 12 L80 80" />
      <circle cx="50" cy="12" r="5" fill={color} stroke="none" />
      {/* esquadro */}
      <path d="M14 56 L50 90 L86 56" strokeWidth={w * 1.25} />
    </g>
  )
}

function Base({ y = 168, rx = 62, color = 'rgba(13,26,43,.16)' }: { y?: number; rx?: number; color?: string }) {
  return <ellipse cx="100" cy={y} rx={rx} ry={rx * 0.13} fill={color} />
}

function render(art: ArtKey, c: string, p: string): ReactNode {
  const d1 = shade(c, -0.25)
  const d2 = shade(c, -0.45)
  const l1 = shade(c, 0.25)
  const l2 = shade(c, 0.5)

  switch (art) {
    case 'avental':
      return (
        <>
          <Base y={170} rx={58} />
          <path d="M44 56 H156 V158 Q156 166 148 166 H52 Q44 166 44 158 Z" fill={c} />
          <path d="M44 56 H156 V158 Q156 166 148 166 H52 Q44 166 44 158 Z" fill="none" stroke={GOLD} strokeWidth="4" />
          <path d="M44 56 L100 100 L156 56 Z" fill={d1} />
          <path d="M44 56 L100 100 L156 56" fill="none" stroke={GOLD} strokeWidth="4" strokeLinejoin="round" />
          <path d="M34 50 H166" stroke={d2} strokeWidth="6" strokeLinecap="round" />
          <SquareCompass color={isLight(c) ? GOLD : GOLD_L} x={74} y={108} s={0.52} w={8} />
          {[52, 64, 76, 88, 100, 112, 124, 136, 148].map((x) => (
            <path key={x} d={`M${x} 166 v8`} stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
          ))}
        </>
      )
    case 'colar':
      return (
        <>
          <path d="M52 30 L100 128 L148 30" fill="none" stroke={c} strokeWidth="22" strokeLinejoin="round" />
          <path d="M52 30 L100 128 L148 30" fill="none" stroke={GOLD} strokeWidth="2" strokeDasharray="5 5" strokeLinejoin="round" />
          <circle cx="100" cy="150" r="28" fill={GOLD} />
          <circle cx="100" cy="150" r="22" fill={shade(GOLD, -0.15)} />
          <SquareCompass color={GOLD_L} x={82} y={132} s={0.36} w={9} />
          <path d="M100 122 v6" stroke={GOLD} strokeWidth="5" />
        </>
      )
    case 'luvas':
      return (
        <>
          <Base y={172} rx={66} />
          {[
            [70, -12],
            [124, 12],
          ].map(([x, r]) => (
            <g key={x} transform={`translate(${x} 100) rotate(${r})`}>
              <path
                d="M-26 60 V-4 Q-26 -10 -20 -10 V-46 Q-20 -54 -13 -54 Q-6 -54 -6 -46 V-58 Q-6 -66 1 -66 Q8 -66 8 -58 V-50 Q8 -58 15 -58 Q22 -58 22 -50 V-36 Q22 -44 28 -44 Q34 -44 34 -36 V20 Q34 40 22 50 V60 Z"
                fill="#fbfaf6"
                stroke="#d9d3c4"
                strokeWidth="2.5"
              />
              <path d="M-26 50 H22" stroke="#d9d3c4" strokeWidth="2.5" />
              <path d="M-38 6 Q-40 -16 -26 -10" fill="#fbfaf6" stroke="#d9d3c4" strokeWidth="2.5" />
            </g>
          ))}
        </>
      )
    case 'anel':
      return (
        <>
          <Base y={162} rx={56} />
          <ellipse cx="100" cy="118" rx="56" ry="40" fill="none" stroke={d1} strokeWidth="16" />
          <ellipse cx="100" cy="114" rx="56" ry="40" fill="none" stroke={c} strokeWidth="14" />
          <ellipse cx="100" cy="110" rx="56" ry="40" fill="none" stroke={l1} strokeWidth="3" opacity=".7" />
          <rect x="66" y="40" width="68" height="62" rx="16" fill={d1} />
          <rect x="70" y="40" width="60" height="56" rx="14" fill={NAVY} stroke={c} strokeWidth="5" />
          <SquareCompass color={c} x={79} y={47} s={0.42} w={8} />
        </>
      )
    case 'pin':
      return (
        <>
          <Base y={162} rx={44} />
          <circle cx="100" cy="98" r="54" fill={d1} />
          <circle cx="100" cy="94" r="54" fill={c} />
          <circle cx="100" cy="94" r="44" fill={NAVY} />
          <SquareCompass color={c} x={66} y={60} s={0.68} w={7} />
          <circle cx="82" cy="74" r="10" fill="#fff" opacity=".12" />
        </>
      )
    case 'abotoaduras':
      return (
        <>
          <Base y={160} rx={70} />
          {[64, 138].map((x, i) => (
            <g key={x}>
              <rect x={x - 8} y={112} width="16" height="30" rx="5" fill={d1} />
              <rect x={x - 28} y={136} width="56" height="12" rx="6" fill={d1} />
              <circle cx={x} cy={i ? 92 : 86} r="34" fill={d1} />
              <circle cx={x} cy={i ? 88 : 82} r="34" fill={c} />
              <circle cx={x} cy={i ? 88 : 82} r="26" fill={NAVY} />
              <SquareCompass color={c} x={x - 19} y={(i ? 88 : 82) - 19} s={0.38} w={9} />
            </g>
          ))}
        </>
      )
    case 'gravata':
      return (
        <>
          <path d="M84 22 H116 L110 44 H90 Z" fill={d1} />
          <path d="M90 44 H110 L132 150 L100 182 L68 150 Z" fill={c} />
          {[64, 92, 120, 148].map((y) => (
            <SquareCompass key={y} color={shade(c, 0.35)} x={92} y={y - 4} s={0.16} w={10} />
          ))}
          {[78, 106, 134].map((y) => (
            <SquareCompass key={y} color={shade(c, 0.35)} x={78} y={y - 4} s={0.16} w={10} />
          ))}
          {[78, 106, 134].map((y) => (
            <SquareCompass key={'b' + y} color={shade(c, 0.35)} x={106} y={y - 4} s={0.16} w={10} />
          ))}
          <path d="M90 44 H110" stroke={d2} strokeWidth="3" />
        </>
      )
    case 'malhete':
      return (
        <>
          <Base y={168} rx={70} />
          <rect x="40" y="148" width="120" height="16" rx="6" fill={d2} />
          <g transform="rotate(-24 100 100)">
            <rect x="94" y="78" width="12" height="96" rx="6" fill={l1} />
            <rect x="94" y="78" width="12" height="96" rx="6" fill="none" stroke={d1} strokeWidth="2" />
            <rect x="52" y="44" width="96" height="40" rx="12" fill={c} />
            <rect x="52" y="44" width="16" height="40" rx="6" fill={d1} />
            <rect x="132" y="44" width="16" height="40" rx="6" fill={d1} />
            <rect x="74" y="58" width="52" height="12" rx="3" fill={GOLD} opacity=".9" />
          </g>
        </>
      )
    case 'quadro':
      return (
        <>
          <rect x="30" y="26" width="140" height="148" rx="6" fill="#20160c" />
          <rect x="38" y="34" width="124" height="132" rx="2" fill={NAVY} />
          <rect x="38" y="34" width="124" height="132" rx="2" fill={`url(#${p}-grid)`} opacity=".5" />
          <SquareCompass color="rgba(0,0,0,.35)" x={57} y={56} s={0.9} w={9} />
          <SquareCompass color={d1} x={54} y={53} s={0.9} w={9} />
          <SquareCompass color={c} x={52} y={51} s={0.9} w={9} />
          <SquareCompass color={l2} x={52} y={51} s={0.9} w={2} />
        </>
      )
    case 'caneca':
      return (
        <>
          <Base y={170} rx={58} />
          <path d="M140 74 Q176 74 176 106 Q176 138 140 138" fill="none" stroke="#e7e2d6" strokeWidth="14" />
          <path d="M48 52 H148 V156 Q148 168 136 168 H60 Q48 168 48 156 Z" fill="#fbfaf6" />
          <ellipse cx="98" cy="52" rx="50" ry="8" fill="#e7e2d6" />
          <rect x="60" y="74" width="76" height="76" rx="12" fill={c} />
          <g transform="translate(73 80) scale(.5)">
            <Goat fill={GOLD} eye={c} />
          </g>
        </>
      )
    case 'camiseta':
      return (
        <>
          <path d="M70 30 L38 46 L22 82 L46 92 L54 76 V172 H146 V76 L154 92 L178 82 L162 46 L130 30 Q116 44 100 44 Q84 44 70 30 Z" fill={c} />
          <path d="M70 30 Q84 50 100 50 Q116 50 130 30" fill="none" stroke={d1} strokeWidth="5" />
          <g transform="translate(78 78) scale(.44)">
            <Goat fill={isLight(c) ? NAVY : GOLD} eye={c} />
          </g>
        </>
      )
    case 'colunas':
      return (
        <>
          <Base y={176} rx={74} />
          {[62, 138].map((x) => (
            <g key={x}>
              <rect x={x - 26} y={160} width="52" height="12" rx="2" fill={d1} />
              <rect x={x - 20} y={150} width="40" height="12" rx="2" fill={c} />
              <rect x={x - 15} y={56} width="30" height="96" fill={c} />
              {[-9, -3, 3, 9].map((o) => (
                <path key={o} d={`M${x + o} 58 V150`} stroke={d1} strokeWidth="2" />
              ))}
              <rect x={x - 22} y={44} width="44" height="12" rx="2" fill={d1} />
              <circle cx={x} cy={30} r="16" fill={l1} />
              <path d={`M${x - 16} 30 H${x + 16}`} stroke={d1} strokeWidth="2" />
              <path d={`M${x} 14 V46`} stroke={d1} strokeWidth="2" />
              <text x={x} y={110} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="20" fill={d2}>
                {x < 100 ? 'B' : 'J'}
              </text>
            </g>
          ))}
        </>
      )
    case 'esquadro':
      return (
        <>
          <Base y={176} rx={66} />
          <path d="M40 150 H160 L168 172 H32 Z" fill={d2} />
          <rect x="40" y="140" width="120" height="12" rx="3" fill={d1} />
          <text x="100" y="166" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="1.5" fill={l2}>
            ARLS · Nº 42
          </text>
          <SquareCompass color={d1} x={42} y={26} s={1.16} w={9} />
          <SquareCompass color={c} x={40} y={22} s={1.16} w={9} />
        </>
      )
    case 'chaveiro':
      return (
        <>
          <circle cx="100" cy="34" r="16" fill="none" stroke="#a9b0ba" strokeWidth="5" />
          <path d="M100 50 v14" stroke="#a9b0ba" strokeWidth="5" />
          <rect x="44" y="62" width="112" height="104" rx="26" fill={NAVY} />
          <rect x="50" y="68" width="100" height="92" rx="22" fill={c} />
          <circle cx="100" cy="76" r="5" fill={NAVY} />
          <SquareCompass color={isLight(c) ? NAVY : '#fff'} x={74} y={86} s={0.52} w={9} />
          <text x="100" y="150" textAnchor="middle" fontSize="14" fontWeight="800" fill={isLight(c) ? NAVY : '#fff'}>
            ROBERTO
          </text>
        </>
      )
    case 'bode':
      return (
        <>
          <Base y={176} rx={52} />
          <ellipse cx="100" cy="168" rx="50" ry="10" fill={d1} />
          <g transform="translate(30 20) scale(1.4)">
            <Goat fill={c} eye={isLight(c) ? NAVY : '#fff'} horn={isLight(c) ? GOLD : l1} />
          </g>
        </>
      )
    case 'vaso':
      return (
        <>
          <Base y={176} rx={46} />
          <path d="M66 28 H134 Q150 80 140 120 Q132 160 120 172 H80 Q68 160 60 120 Q50 80 66 28 Z" fill={d1} />
          <clipPath id={`${p}-vaso`}>
            <path d="M66 28 H134 Q150 80 140 120 Q132 160 120 172 H80 Q68 160 60 120 Q50 80 66 28 Z" />
          </clipPath>
          <g clipPath={`url(#${p}-vaso)`}>
            {[
              [70, 40, 16],
              [102, 44, 14],
              [128, 52, 13],
              [84, 70, 15],
              [116, 78, 16],
              [66, 98, 13],
              [98, 104, 15],
              [132, 108, 12],
              [80, 132, 14],
              [112, 140, 15],
              [96, 166, 10],
            ].map(([x, y, r], i) => (
              <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.82} fill={i % 3 ? 'rgba(13,26,43,.55)' : 'rgba(13,26,43,.4)'} />
            ))}
            <path d="M66 28 Q56 100 80 172 H64 V28 Z" fill={l1} opacity=".25" />
          </g>
          <ellipse cx="100" cy="28" rx="34" ry="6" fill={l1} />
          <path d="M98 28 Q92 6 78 2 M102 28 Q110 4 128 6" stroke="#2f7d4f" strokeWidth="3" fill="none" />
          <circle cx="78" cy="4" r="6" fill="#ffd166" />
          <circle cx="128" cy="6" r="6" fill="#ff7aa2" />
        </>
      )
    case 'lua':
      return (
        <>
          <circle cx="100" cy="94" r="74" fill="#ffd98a" opacity=".22" />
          <circle cx="100" cy="94" r="62" fill={c} />
          <circle cx="100" cy="94" r="62" fill={`url(#${p}-moon)`} />
          {[
            [78, 70, 12],
            [118, 82, 9],
            [92, 118, 15],
            [126, 116, 7],
            [70, 104, 6],
            [108, 58, 6],
          ].map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill="#d8c8a8" />
              <circle cx={x + 1.5} cy={y + 1.5} r={r * 0.75} fill="#e9dcc1" />
            </g>
          ))}
          <rect x="72" y="160" width="56" height="12" rx="6" fill="#7a5a3a" />
        </>
      )
    case 'lithophane':
      return (
        <>
          <Base y={174} rx={60} />
          <rect x="48" y="152" width="104" height="18" rx="6" fill="#2a2a2e" />
          <circle cx="140" cy="161" r="3" fill="#3cff8f" />
          <rect x="46" y="38" width="108" height="116" rx="6" fill="#ffe7b8" />
          <rect x="46" y="38" width="108" height="116" rx="6" fill={`url(#${p}-litho)`} />
          {/* "foto" em relevo — silhueta de duas pessoas */}
          <circle cx="82" cy="84" r="16" fill="#c69a5e" opacity=".75" />
          <path d="M56 154 Q58 108 82 106 Q106 108 108 154 Z" fill="#c69a5e" opacity=".75" />
          <circle cx="120" cy="78" r="17" fill="#a87a44" opacity=".75" />
          <path d="M94 154 Q96 102 120 100 Q146 102 148 154 Z" fill="#a87a44" opacity=".75" />
          <rect x="46" y="38" width="108" height="116" rx="6" fill="none" stroke={c} strokeWidth="3" />
        </>
      )
    case 'suporte':
      return (
        <>
          <Base y={172} rx={60} />
          <path d="M42 166 H158 L150 150 H50 Z" fill={d1} />
          <path d="M60 150 L112 64 L124 70 L78 150 Z" fill={c} />
          <circle cx="118" cy="68" r="9" fill={d1} />
          <rect x="96" y="20" width="60" height="110" rx="10" transform="rotate(14 126 75)" fill="#1d1f24" />
          <rect x="101" y="27" width="50" height="96" rx="6" transform="rotate(14 126 75)" fill="#3c6ff0" />
          <rect x="101" y="27" width="50" height="96" rx="6" transform="rotate(14 126 75)" fill={`url(#${p}-screen)`} />
          <path d="M120 140 L132 116" stroke={l1} strokeWidth="6" strokeLinecap="round" />
        </>
      )
    case 'headset':
      return (
        <>
          <Base y={176} rx={52} />
          <path d="M60 172 L72 150 H128 L140 172 Z" fill={d1} />
          <path d="M90 150 L94 60 H106 L110 150 Z" fill={c} />
          <path d="M74 60 H126 L118 48 H82 Z" fill={l1} />
          <path d="M70 70 Q70 20 100 20 Q130 20 130 70" fill="none" stroke="#1d1f24" strokeWidth="10" strokeLinecap="round" />
          <rect x="56" y="64" width="22" height="40" rx="9" fill="#1d1f24" />
          <rect x="122" y="64" width="22" height="40" rx="9" fill="#1d1f24" />
          <rect x="60" y="70" width="8" height="28" rx="4" fill={c} />
          <rect x="132" y="70" width="8" height="28" rx="4" fill={c} />
        </>
      )
    case 'dragao':
      return (
        <>
          <Base y={172} rx={70} />
          {Array.from({ length: 9 }).map((_, i) => {
            const x = 150 - i * 12
            const y = 120 + Math.sin(i * 0.8) * 16
            return <rect key={i} x={x - 9} y={y - 9} width="18" height="18" rx="4" fill={i % 2 ? c : d1} transform={`rotate(${i * 8} ${x} ${y})`} />
          })}
          <path d="M150 118 Q172 96 178 110 Q170 118 160 124 Z" fill={d1} />
          <path d="M44 100 L30 72 L58 90 Z" fill={l1} />
          <path d="M74 112 L60 70 L104 96 Z" fill={l1} opacity=".9" />
          <path d="M40 96 Q34 70 56 66 Q80 64 80 88 Q78 106 56 108 Q44 108 40 96 Z" fill={c} />
          <path d="M44 70 L36 50 M60 66 L62 46" stroke={d2} strokeWidth="4" strokeLinecap="round" />
          <circle cx="54" cy="82" r="5" fill="#fff" />
          <circle cx="55" cy="83" r="2.5" fill="#1d1f24" />
          {[70, 96, 122].map((x) => (
            <path key={x} d={`M${x} 136 l-6 18 M${x + 6} 136 l0 18`} stroke={d1} strokeWidth="5" strokeLinecap="round" />
          ))}
        </>
      )
    case 'organizador':
      return (
        <>
          <Base y={172} rx={70} />
          {[
            [70, 120, 46],
            [130, 120, 30],
            [100, 98, 62],
            [70, 76, 20],
            [130, 76, 38],
          ].map(([x, y, h], i) => (
            <g key={i}>
              <path d={`M${x - 26} ${y + 30} L${x - 13} ${y + 38} H${x + 13} L${x + 26} ${y + 30} V${y + 30 - h} H${x - 26} Z`} fill={i % 2 ? d1 : c} />
              <ellipse cx={x} cy={y + 30 - h} rx="26" ry="9" fill={l1} />
              <ellipse cx={x} cy={y + 30 - h} rx="20" ry="6" fill={d2} />
            </g>
          ))}
          <path d="M96 30 L108 6" stroke="#ff5a36" strokeWidth="6" strokeLinecap="round" />
          <path d="M88 34 L84 12" stroke="#2348a8" strokeWidth="6" strokeLinecap="round" />
        </>
      )
    case 'topo':
      return (
        <>
          <path d="M40 140 H160 V170 H40 Z" fill="#fbe1ea" />
          <path d="M40 140 Q50 150 60 140 T80 140 T100 140 T120 140 T140 140 T160 140" fill="none" stroke="#fff" strokeWidth="6" />
          <path d="M70 132 V100 M130 132 V100" stroke={d1} strokeWidth="4" />
          <text x="100" y="94" textAnchor="middle" fontFamily="'Brush Script MT', 'Segoe Script', cursive" fontStyle="italic" fontWeight="700" fontSize="44" fill={c} stroke={d1} strokeWidth="1">
            Ana
          </text>
          <text x="100" y="124" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="22" fill={c}>
            7 anos
          </text>
          {[52, 148, 64, 136].map((x, i) => (
            <path key={i} d={`M${x} ${36 + i * 6} l3 6 6 1 -5 4 2 6 -6 -3 -6 3 2 -6 -5 -4 6 -1 z`} fill={GOLD_L} />
          ))}
        </>
      )
    case 'xadrez':
      return (
        <>
          <Base y={172} rx={74} />
          {/* rei */}
          <path d="M72 168 H112 L108 154 H76 Z M78 154 Q74 110 84 92 H100 Q110 110 106 154 Z" fill={c} />
          <circle cx="92" cy="84" r="12" fill={c} />
          <path d="M92 52 V72 M84 60 H100" stroke={c} strokeWidth="6" strokeLinecap="round" />
          {/* peão claro */}
          <path d="M120 168 H156 L152 156 H124 Z M126 156 Q124 132 132 122 H144 Q152 132 150 156 Z" fill="#efeee9" stroke="#d6cdb8" strokeWidth="2" />
          <circle cx="138" cy="112" r="12" fill="#efeee9" stroke="#d6cdb8" strokeWidth="2" />
          {/* cavalo claro */}
          <path d="M34 168 H70 L66 156 H38 Z M40 156 Q36 126 50 108 Q44 98 52 86 Q66 78 72 96 Q66 100 62 104 Q72 128 66 156 Z" fill="#efeee9" stroke="#d6cdb8" strokeWidth="2" />
        </>
      )
    case 'servico':
      return (
        <>
          {/* impressora 3D */}
          <rect x="34" y="20" width="132" height="152" rx="10" fill="none" stroke={NAVY} strokeWidth="8" />
          <rect x="34" y="146" width="132" height="26" rx="6" fill={NAVY} />
          <circle cx="150" cy="159" r="5" fill="#3cff8f" />
          <rect x="52" y="159" width="40" height="4" rx="2" fill="#2f5180" />
          <path d="M38 50 H162" stroke="#2f5180" strokeWidth="5" />
          <rect x="86" y="42" width="30" height="24" rx="4" fill={c} />
          <path d="M101 66 L101 76" stroke={NAVY} strokeWidth="5" />
          <path d="M98 76 L104 76 L101 82 Z" fill={NAVY} />
          <rect x="52" y="134" width="96" height="10" rx="2" fill="#a9b0ba" />
          {/* peça sendo impressa, camada a camada */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={74 + (i % 2) * 1} y={128 - i * 6} width={52 - i * 2} height="5" rx="2" fill={i % 2 ? c : shade(c, -0.12)} transform={`translate(${i} 0)`} />
          ))}
        </>
      )
    case 'modelagem':
      return (
        <>
          <rect x="22" y="26" width="156" height="110" rx="10" fill={NAVY} />
          <rect x="30" y="34" width="140" height="94" rx="4" fill="#0b1626" />
          <rect x="30" y="34" width="140" height="94" rx="4" fill={`url(#${p}-grid)`} opacity=".7" />
          {/* cubo wireframe */}
          <g fill="none" stroke="#5aa2ff" strokeWidth="2">
            <path d="M80 62 L110 50 L140 62 L110 74 Z" />
            <path d="M80 62 V100 L110 112 V74" />
            <path d="M140 62 V100 L110 112" />
          </g>
          <path d="M80 62 L110 74 L140 62 L110 50 Z" fill="#5aa2ff" opacity=".18" />
          <circle cx="110" cy="74" r="3.5" fill={c} />
          <circle cx="80" cy="62" r="3" fill="#fff" />
          <circle cx="140" cy="100" r="3" fill="#fff" />
          <rect x="40" y="44" width="22" height="4" rx="2" fill="#2f5180" />
          <rect x="40" y="52" width="16" height="4" rx="2" fill="#2f5180" />
          <rect x="40" y="60" width="20" height="4" rx="2" fill="#2f5180" />
          <path d="M84 136 L78 162 H122 L116 136 Z" fill={shade(NAVY, 0.15)} />
          <rect x="60" y="160" width="80" height="10" rx="5" fill={NAVY} />
        </>
      )
  }
}

/** Bode geométrico (coordenadas 0–100) — o mascote/logo da Bodemania. */
export function Goat({ fill = NAVY, eye = '#fff', horn }: { fill?: string; eye?: string; horn?: string }) {
  const h = horn ?? GOLD
  return (
    <g>
      <path d="M38 32 C30 12 14 8 8 22 C16 16 26 20 30 36 Z" fill={h} />
      <path d="M62 32 C70 12 86 8 92 22 C84 16 74 20 70 36 Z" fill={h} />
      <path d="M33 40 L10 44 L30 52 Z" fill={fill} />
      <path d="M67 40 L90 44 L70 52 Z" fill={fill} />
      <path d="M36 30 H64 L71 44 L60 74 L50 80 L40 74 L29 44 Z" fill={fill} />
      <path d="M43 77 H57 L50 96 Z" fill={fill} />
      <circle cx="42" cy="48" r="3.4" fill={eye} />
      <circle cx="58" cy="48" r="3.4" fill={eye} />
      <path d="M45 66 L50 70 L55 66" fill="none" stroke={eye} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

type Props = {
  art: ArtKey
  color?: string
  universe?: 'maconaria' | '3d'
  className?: string
  /** variação de enquadramento para a galeria */
  view?: 0 | 1 | 2
  label?: string
}

export default function ProductArt({ art, color, universe = '3d', className = '', view = 0, label }: Props) {
  const c = color ?? GOLD
  const p = 'a' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const bg =
    universe === 'maconaria'
      ? view === 1
        ? ['#15263d', '#0d1a2b']
        : ['#f6f1e6', '#eae1cd']
      : view === 1
        ? ['#1d1f24', '#0f1013']
        : ['#f1f3f6', '#e1e6ee']
  const transform = view === 2 ? 'translate(-50 -40) scale(1.5)' : view === 1 ? 'translate(10 10) scale(.9)' : undefined

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={label ?? art} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${p}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bg[0]} />
          <stop offset="1" stopColor={bg[1]} />
        </linearGradient>
        <pattern id={`${p}-grid`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0 H0 V10" fill="none" stroke="#5aa2ff" strokeOpacity=".18" strokeWidth=".6" />
        </pattern>
        <radialGradient id={`${p}-moon`} cx=".38" cy=".35" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#b58f52" stopOpacity=".35" />
        </radialGradient>
        <radialGradient id={`${p}-litho`} cx=".5" cy=".85" r=".9">
          <stop offset="0" stopColor="#fff6dd" stopOpacity=".9" />
          <stop offset="1" stopColor="#f0b860" stopOpacity=".35" />
        </radialGradient>
        <linearGradient id={`${p}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5a36" stopOpacity=".85" />
          <stop offset="1" stopColor="#6a3fb5" stopOpacity=".2" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${p}-bg)`} />
      {universe === '3d' && view !== 1 && <rect width="200" height="200" fill={`url(#${p}-grid)`} opacity=".55" />}
      {universe === 'maconaria' && view !== 1 && (
        <g opacity=".07">
          {Array.from({ length: 10 }).map((_, i) =>
            Array.from({ length: 10 }).map((__, j) => ((i + j) % 2 ? <rect key={`${i}-${j}`} x={i * 20} y={j * 20} width="20" height="20" fill={NAVY} /> : null)),
          )}
        </g>
      )}
      <g transform={transform}>{render(art, c, p)}</g>
    </svg>
  )
}
