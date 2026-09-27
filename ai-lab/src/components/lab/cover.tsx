import { Sparkles } from 'lucide-react'
import { cn, hashString } from '@/lib/utils'

const ACCENTS = ['#e2ae3a', '#f7c948', '#7cc4ff', '#c98b4a', '#8fd694', '#ff8f7a', '#b69cff', '#5fd3c4']

/** Capa do prompt: a imagem enviada pelo professor ou um degradê gerado a partir do título. */
export function PromptCover({
  seed,
  imageId,
  className,
  priority = false,
}: {
  seed: string
  imageId?: string | null
  className?: string
  priority?: boolean
}) {
  if (imageId)
    return (
      <div className={cn('relative overflow-hidden bg-ink-850', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem privada servida pela API autenticada */}
        <img
          src={`/api/media/${imageId}`}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          className="absolute inset-0 size-full object-cover"
        />
      </div>
    )
  const h = hashString(seed)
  const a = ACCENTS[h % 8]
  const b = ACCENTS[(h >> 3) % 8]
  const x = 15 + (h % 50)
  const y = 10 + ((h >> 5) % 40)
  return (
    <div
      aria-hidden
      className={cn('relative overflow-hidden', className)}
      style={{
        background: `radial-gradient(70% 80% at ${x}% ${y}%, ${a}8c, transparent 72%), radial-gradient(60% 70% at ${100 - x}% 80%, ${b}66, transparent 70%), #0b0b0a`,
      }}
    >
      <div className="lab-grid-bg absolute inset-0 opacity-60" />
      <Sparkles className="absolute bottom-3 left-3 size-5 text-bone/70" />
    </div>
  )
}
