import type { EcosystemGlyph as GlyphType } from '../data/ecosystem'

const base = 'transition-transform duration-[900ms] ease-premium [transform-box:fill-box] origin-center'

/** Ilustrações abstratas que se movimentam no hover do card (group-hover). */
export function EcosystemGlyph({ type }: { type: GlyphType }) {
  return (
    <svg viewBox="0 0 120 120" className="size-24 overflow-visible md:size-28" fill="none" aria-hidden="true">
      {type === 'signal' && (
        <g strokeWidth="1">
          {[18, 32, 46].map((r, i) => (
            <path
              key={r}
              d={`M ${60 - r} ${86} A ${r} ${r} 0 0 1 ${60 + r} ${86}`}
              className={`${base} stroke-bone/30 group-hover:scale-[1.12] group-hover:stroke-bone/60`}
              style={{ transitionDelay: `${i * 70}ms`, transformOrigin: '50% 100%' }}
            />
          ))}
          <path
            d="M 4 86 A 56 56 0 0 1 116 86"
            className={`${base} stroke-gold/0 group-hover:stroke-gold/70`}
            style={{ transitionDelay: '200ms' }}
          />
          <circle cx="60" cy="86" r="3" className="fill-gold" />
        </g>
      )}

      {type === 'network' && (
        <g strokeWidth="1">
          <g className={`${base} group-hover:rotate-[18deg]`}>
            <path d="M60 60 L24 34 M60 60 L98 30 M60 60 L30 94 M60 60 L96 92 M24 34 L98 30 M30 94 L96 92" className="stroke-bone/20" />
            {[
              [24, 34],
              [98, 30],
              [30, 94],
              [96, 92],
            ].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" className="fill-ink-900 stroke-bone/50" />
            ))}
          </g>
          <circle cx="60" cy="60" r="16" className={`${base} stroke-gold/40 group-hover:scale-[1.35] group-hover:stroke-gold/70`} />
          <circle cx="60" cy="60" r="6" className="fill-gold" />
        </g>
      )}

      {type === 'layers' && (
        <g strokeWidth="1">
          {[2, 1, 0].map((i) => (
            <path
              key={i}
              d="M60 40 L100 60 L60 80 L20 60 Z"
              className={`glyph-layer ${base} ${i === 0 ? 'fill-gold/10 stroke-gold/70' : 'fill-ink-900 stroke-bone/35'}`}
              style={{ ['--i' as string]: i - 1, transitionDelay: `${i * 60}ms` }}
            />
          ))}
        </g>
      )}

      {type === 'aperture' && (
        <g strokeWidth="1">
          <circle cx="60" cy="60" r="44" className="stroke-bone/20" />
          <g className={`${base} group-hover:rotate-[60deg]`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <path
                key={i}
                d="M60 16 L82 60"
                className="stroke-bone/45"
                style={{ transform: `rotate(${i * 60}deg)`, transformOrigin: '60px 60px' }}
              />
            ))}
          </g>
          <circle cx="60" cy="60" r="14" className={`${base} stroke-gold/70 group-hover:scale-75`} />
          <circle cx="60" cy="60" r="2.5" className="fill-gold" />
        </g>
      )}

      {type === 'modules' && (
        <g>
          {Array.from({ length: 9 }).map((_, i) => {
            const x = 22 + (i % 3) * 28
            const y = 22 + Math.floor(i / 3) * 28
            const accent = i === 4
            const moves = [0, 2, 6, 8].includes(i)
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="20"
                height="20"
                rx="4"
                strokeWidth="1"
                className={`${base} ${accent ? 'fill-gold/80 stroke-gold group-hover:rotate-45' : 'fill-ink-900 stroke-bone/35'} ${
                  moves ? 'group-hover:scale-75' : ''
                }`}
                style={{ transitionDelay: `${i * 35}ms` }}
              />
            )
          })}
        </g>
      )}
    </svg>
  )
}
