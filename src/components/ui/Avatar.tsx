import { cn } from '@/lib/utils'

interface AvatarProps {
  initials: string
  src?: string | null
  size?: number
  ring?: boolean
  className?: string
  highlight?: boolean
}

export function Avatar({ initials, src, size = 40, ring, highlight, className }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full font-display-wide font-bold text-ink',
        highlight ? 'bg-gradient-to-br from-lift to-lift-deep' : 'bg-gradient-to-br from-surface-3 to-surface-2',
        ring && 'ring-2 ring-lift ring-offset-2 ring-offset-bg',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden={!src}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" loading="lazy" /> : initials}
    </div>
  )
}
