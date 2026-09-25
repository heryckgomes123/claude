/**
 * Marca MIÚDA® — medalhão do Javali em bronze e ouro envelhecido.
 */
import { useId } from 'react';

export function BoarHead({ fill = 'currentColor', eyes = '#ff7a2e', className }: { fill?: string; eyes?: string; className?: string }) {
  return (
    <g className={className}>
      {/* orelhas */}
      <path d="M58 62 L34 22 L84 50 Z" fill={fill} />
      <path d="M142 62 L166 22 L116 50 Z" fill={fill} />
      <path d="M60 56 L44 32 L76 51 Z" fill="rgba(0,0,0,.35)" />
      <path d="M140 56 L156 32 L124 51 Z" fill="rgba(0,0,0,.35)" />
      {/* crina */}
      <path d="M66 58 L74 36 L82 52 L90 30 L96 50 L100 26 L104 50 L110 30 L118 52 L126 36 L134 58 Z" fill={fill} />
      {/* cabeça */}
      <path
        d="M56 66 Q100 40 144 66 L152 100 Q154 126 136 144 L128 162 Q118 184 100 184 Q82 184 72 162 L64 144 Q46 126 48 100 Z"
        fill={fill}
      />
      {/* sobrancelha / testa */}
      <path d="M64 92 Q82 80 96 96 L100 100 L104 96 Q118 80 136 92 Q122 90 108 104 L100 112 L92 104 Q78 90 64 92 Z" fill="rgba(0,0,0,.45)" />
      {/* olhos */}
      <g className="boar-eyes">
        <path d="M72 100 Q80 94 90 102 Q80 104 72 100 Z" fill={eyes} />
        <path d="M128 100 Q120 94 110 102 Q120 104 128 100 Z" fill={eyes} />
      </g>
      {/* focinho */}
      <ellipse cx="100" cy="160" rx="26" ry="17" fill="rgba(0,0,0,.35)" />
      <ellipse cx="100" cy="157" rx="24" ry="15" fill={fill} />
      <ellipse cx="91" cy="158" rx="4.5" ry="6" fill="rgba(0,0,0,.6)" />
      <ellipse cx="109" cy="158" rx="4.5" ry="6" fill="rgba(0,0,0,.6)" />
      {/* presas */}
      <path d="M78 160 Q60 152 62 128 Q70 146 84 152 Z" fill="#f4e7c8" />
      <path d="M122 160 Q140 152 138 128 Q130 146 116 152 Z" fill="#f4e7c8" />
      {/* sulcos */}
      <path d="M100 116 L100 140" stroke="rgba(0,0,0,.35)" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

export function Medallion({ size = 160, glow = true }: { size?: number; glow?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Emblema do Javali" style={glow ? { filter: 'drop-shadow(0 0 30px rgba(240,140,50,.45))' } : undefined}>
      <defs>
        <linearGradient id={`ring${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe3a0" />
          <stop offset=".35" stopColor="#d9a441" />
          <stop offset=".62" stopColor="#7d4f22" />
          <stop offset="1" stopColor="#c8903f" />
        </linearGradient>
        <radialGradient id={`core${id}`} cx=".5" cy=".4" r=".65">
          <stop offset="0" stopColor="#4a2612" />
          <stop offset=".7" stopColor="#1c0e06" />
          <stop offset="1" stopColor="#0e0703" />
        </radialGradient>
        <linearGradient id={`boar${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0cf83" />
          <stop offset=".45" stopColor="#b9823f" />
          <stop offset="1" stopColor="#6b4520" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill={`url(#ring${id})`} />
      <circle cx="100" cy="100" r="90" fill="#2a160a" />
      <circle cx="100" cy="100" r="86" fill={`url(#core${id})`} stroke="rgba(240,207,131,.35)" strokeWidth="1" />
      {Array.from({ length: 24 }).map((_, i) => (
        <rect key={i} x="99" y="6" width="2" height="6" rx="1" fill="#d9a441" opacity=".7" transform={`rotate(${i * 15} 100 100)`} />
      ))}
      <g transform="translate(22 18) scale(.78)">
        <BoarHead fill={`url(#boar${id})`} />
      </g>
    </svg>
  );
}

export function Wordmark({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const fs = { sm: '1.35rem', md: '2rem', lg: 'clamp(2.8rem, 11vw, 4.6rem)', xl: 'clamp(3.4rem, 14vw, 6.4rem)' }[size];
  return (
    <div className="wordmark" style={{ fontSize: fs }}>
      <span className="t-display t-gold wordmark-text">MIÚDA</span>
      <sup className="wordmark-r">®</sup>
    </div>
  );
}

export function LogoLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="lockup">
      <Medallion size={compact ? 38 : 150} glow={!compact} />
      <div>
        <Wordmark size={compact ? 'sm' : 'lg'} />
        {!compact && <div className="lockup-sub">Da Toca do Javali</div>}
      </div>
    </div>
  );
}
