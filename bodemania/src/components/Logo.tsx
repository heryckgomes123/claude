import { Goat } from './ProductArt'

export function Mark({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <rect width="100" height="100" rx="26" fill={dark ? '#c79b3b' : '#0d1a2b'} />
      <g transform="translate(14 10) scale(.72)">
        <Goat fill={dark ? '#0d1a2b' : '#f4e7c4'} eye={dark ? '#c79b3b' : '#0d1a2b'} horn={dark ? '#0d1a2b' : '#c79b3b'} />
      </g>
    </svg>
  )
}

export default function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark dark={dark} size={compact ? 32 : 38} />
      <span className="leading-none">
        <span className={`display block text-[1.35rem] font-bold tracking-tight ${dark ? 'text-white' : 'text-navy-900'}`}>
          Bode<span className={dark ? 'text-gold-300' : 'text-gold-600'}>mania</span>
        </span>
        {!compact && <span className={`mt-0.5 hidden text-[0.6rem] font-semibold tracking-[0.2em] uppercase sm:block ${dark ? 'text-white/50' : 'text-mute'}`}>maçonaria · impressão 3D</span>}
      </span>
    </span>
  )
}
