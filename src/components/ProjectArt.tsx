import type { ProjectArt as ArtType } from '../data/projects'

/**
 * Composições visuais de placeholder para os cards de projeto.
 * Substitua por imagens reais preenchendo `image` em src/data/projects.ts.
 */
export function ProjectArt({ type }: { type: ArtType }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="size-full" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={`glow-${type}`} cx="70%" cy="20%" r="70%">
          <stop offset="0" stopColor="#c9a45c" stopOpacity="0.22" />
          <stop offset="1" stopColor="#c9a45c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`fade-${type}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f3ee" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f5f3ee" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="#0d0d0d" />
      <rect width="400" height="300" fill={`url(#glow-${type})`} />
      <g stroke="#f5f3ee" strokeOpacity="0.05">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={i * 50} y1="0" x2={i * 50} y2="300" />
        ))}
      </g>

      {type === 'type' && (
        <g>
          <text x="48" y="206" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="150" fill="#f5f3ee" fillOpacity="0.9">
            Aa
          </text>
          <circle cx="300" cy="96" r="26" fill="#c9a45c" />
          <circle cx="300" cy="160" r="26" fill="#f5f3ee" fillOpacity="0.9" />
          <circle cx="300" cy="224" r="26" fill="#1c1c1c" stroke="#f5f3ee" strokeOpacity="0.2" />
          <line x1="48" y1="236" x2="220" y2="236" stroke="#f5f3ee" strokeOpacity="0.25" />
        </g>
      )}

      {type === 'frames' && (
        <g>
          <rect x="70" y="50" width="220" height="200" rx="10" fill="#141414" stroke="#f5f3ee" strokeOpacity="0.15" />
          <rect x="90" y="84" width="120" height="12" rx="3" fill={`url(#fade-${type})`} />
          <rect x="90" y="104" width="160" height="12" rx="3" fill="#f5f3ee" fillOpacity="0.12" />
          <rect x="90" y="136" width="64" height="20" rx="10" fill="#c9a45c" />
          <rect x="90" y="176" width="180" height="56" rx="6" fill="#f5f3ee" fillOpacity="0.05" />
          <rect x="262" y="96" width="84" height="164" rx="14" fill="#101010" stroke="#f5f3ee" strokeOpacity="0.25" />
          <rect x="274" y="120" width="50" height="8" rx="2" fill="#f5f3ee" fillOpacity="0.4" />
          <rect x="274" y="136" width="60" height="6" rx="2" fill="#f5f3ee" fillOpacity="0.12" />
          <rect x="274" y="224" width="60" height="16" rx="8" fill="#c9a45c" />
        </g>
      )}

      {type === 'nodes' && (
        <g>
          <g stroke="#f5f3ee" strokeOpacity="0.2">
            <path d="M200 150 L90 80 M200 150 L320 70 M200 150 L110 230 M200 150 L310 220 M90 80 L110 230 M320 70 L310 220 M90 80 L320 70" />
          </g>
          {[
            [90, 80],
            [320, 70],
            [110, 230],
            [310, 220],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9" fill="#141414" stroke="#f5f3ee" strokeOpacity="0.5" />
          ))}
          <circle cx="200" cy="150" r="46" stroke="#c9a45c" strokeOpacity="0.35" />
          <circle cx="200" cy="150" r="22" fill="#c9a45c" />
        </g>
      )}

      {type === 'grid' && (
        <g>
          <rect x="40" y="40" width="320" height="220" rx="12" fill="#121212" stroke="#f5f3ee" strokeOpacity="0.12" />
          <rect x="40" y="40" width="70" height="220" rx="12" fill="#f5f3ee" fillOpacity="0.03" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={126 + i * 76} y="60" width="66" height="44" rx="6" fill="#f5f3ee" fillOpacity={i === 0 ? 0.1 : 0.05} />
          ))}
          <path d="M130 220 L170 190 L210 200 L250 150 L290 165 L340 120" stroke="#c9a45c" strokeWidth="2" />
          <path d="M130 220 L170 190 L210 200 L250 150 L290 165 L340 120 L340 240 L130 240 Z" fill="#c9a45c" fillOpacity="0.08" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x="54" y={70 + i * 22} width="42" height="8" rx="2" fill="#f5f3ee" fillOpacity={i === 0 ? 0.4 : 0.12} />
          ))}
        </g>
      )}

      {type === 'wave' && (
        <g>
          {Array.from({ length: 7 }).map((_, i) => (
            <path
              key={i}
              d={`M0 ${120 + i * 14} C 100 ${60 + i * 18}, 200 ${220 - i * 6}, 400 ${110 + i * 16}`}
              stroke={i === 3 ? '#c9a45c' : '#f5f3ee'}
              strokeOpacity={i === 3 ? 0.9 : 0.12 + i * 0.02}
              strokeWidth={i === 3 ? 2 : 1}
            />
          ))}
        </g>
      )}

      {type === 'stack' && (
        <g>
          {[2, 1, 0].map((i) => (
            <g key={i} transform={`translate(${60 + i * 28} ${40 + i * 26})`}>
              <rect
                width="230"
                height="170"
                rx="10"
                fill={i === 0 ? '#161616' : '#111'}
                stroke="#f5f3ee"
                strokeOpacity={i === 0 ? 0.25 : 0.1}
              />
              <circle cx="14" cy="14" r="3" fill="#f5f3ee" fillOpacity="0.25" />
              <circle cx="26" cy="14" r="3" fill="#f5f3ee" fillOpacity="0.25" />
              {i === 0 && (
                <>
                  <rect x="20" y="46" width="130" height="14" rx="3" fill="#f5f3ee" fillOpacity="0.5" />
                  <rect x="20" y="68" width="170" height="8" rx="2" fill="#f5f3ee" fillOpacity="0.12" />
                  <rect x="20" y="120" width="56" height="18" rx="9" fill="#c9a45c" />
                </>
              )}
            </g>
          ))}
        </g>
      )}

      {type === 'orbit' && (
        <g>
          <ellipse cx="200" cy="150" rx="150" ry="58" stroke="#f5f3ee" strokeOpacity="0.14" transform="rotate(-14 200 150)" />
          <ellipse cx="200" cy="150" rx="110" ry="110" stroke="#f5f3ee" strokeOpacity="0.08" />
          {[
            [110, 110, 22],
            [300, 120, 16],
            [250, 210, 26],
            [150, 205, 14],
          ].map(([x, y, r], i) => (
            <rect
              key={i}
              x={x - r}
              y={y - r}
              width={r * 2}
              height={r * 2}
              rx={r * 0.5}
              fill="#151515"
              stroke="#f5f3ee"
              strokeOpacity="0.3"
            />
          ))}
          <circle cx="200" cy="150" r="30" fill="#c9a45c" />
        </g>
      )}
    </svg>
  )
}
