import type { ContentType } from '@/lib/labels'
import { cn, hashString, safeExternalUrl } from '@/lib/utils'
import { ContentTypeIcon } from './content-icons'
import { CoverImage } from './cover-image'

const ACCENTS = ['#e2ae3a', '#f7c948', '#7cc4ff', '#c98b4a', '#8fd694', '#ff8f7a', '#b69cff', '#5fd3c4']

/**
 * Capa do conteúdo. Com imagem: carrega com lazy-loading e cai para a capa generativa em caso de erro.
 * Sem imagem: composição abstrata determinística (derivada do slug ou da paleta da referência).
 */
export function Cover({
  seed,
  type,
  imageUrl,
  palette,
  className,
  label,
  showIcon = true,
  style,
}: {
  style?: React.CSSProperties
  seed: string
  type: ContentType
  imageUrl?: string | null
  palette?: string[] | null
  className?: string
  label?: string
  showIcon?: boolean
}) {
  const safeUrl = safeExternalUrl(imageUrl)
  const art = <GenerativeArt seed={seed} type={type} palette={palette} showIcon={showIcon} />
  return (
    <div className={cn('relative overflow-hidden bg-ink-850', className)} style={style} role={label ? 'img' : undefined} aria-label={label}>
      {safeUrl ? <CoverImage src={safeUrl} fallback={art} /> : art}
    </div>
  )
}

function GenerativeArt({
  seed,
  type,
  palette,
  showIcon,
}: {
  seed: string
  type: ContentType
  palette?: string[] | null
  showIcon: boolean
}) {
  const h = hashString(seed)
  const colors = palette && palette.length >= 2 ? palette : [ACCENTS[h % ACCENTS.length], ACCENTS[(h >> 3) % ACCENTS.length]]
  const a = colors[Math.min(colors.length - 1, palette ? Math.floor(colors.length / 2) + 1 : 0)] ?? colors[0]
  const b = colors[palette ? 2 % colors.length : 1] ?? colors[1]
  const x1 = 15 + (h % 50)
  const y1 = 10 + ((h >> 5) % 40)
  const x2 = 50 + ((h >> 9) % 45)
  const y2 = 55 + ((h >> 13) % 40)
  const rotate = (h >> 4) % 360
  const base = palette && palette.length ? palette[0] : '#0b0b0a'

  return (
    <div className="absolute inset-0" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 80% at ${x1}% ${y1}%, ${a}8c, transparent 72%), radial-gradient(60% 70% at ${x2}% ${y2}%, ${b}66, transparent 70%), conic-gradient(from ${rotate}deg at 70% 30%, ${a}1f, transparent 30%, ${b}1a 60%, transparent), linear-gradient(${rotate}deg, ${base}, #0b0b0a)`,
        }}
      />
      {palette && palette.length > 0 && (
        <div className="absolute inset-x-3 bottom-3 flex h-2 overflow-hidden rounded-full ring-1 ring-black/20">
          {palette.map((c) => (
            <span key={c} className="flex-1" style={{ background: c }} />
          ))}
        </div>
      )}
      <div className="lab-grid-bg absolute inset-0 opacity-60 [mask-image:none]" />
      <div
        className="absolute rounded-full border border-bone/10"
        style={{ width: '70%', aspectRatio: '1', left: `${x1 - 10}%`, top: `${y1 - 5}%` }}
      />
      {showIcon && (
        <ContentTypeIcon type={type} className="absolute bottom-4 right-4 size-6 text-bone/25" />
      )}
    </div>
  )
}
