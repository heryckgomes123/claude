'use client'
import { Heart } from 'lucide-react'
import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { toggleFavorite } from '@/server/actions/lab'

export function FavoriteButton({
  contentId,
  initial,
  title,
  variant = 'icon',
  className,
}: {
  contentId: string
  initial: boolean
  title: string
  variant?: 'icon' | 'button'
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const [favorited, setOptimistic] = useOptimistic(initial)

  function onClick(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    startTransition(async () => {
      setOptimistic(!favorited)
      const result = await toggleFavorite(contentId)
      if (!result.ok) toast.error(result.error)
      else toast.success(result.message)
    })
  }

  const label = favorited ? `Remover “${title}” dos favoritos` : `Favoritar “${title}”`
  if (variant === 'button')
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={favorited}
        aria-label={label}
        disabled={pending}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
          favorited ? 'border-gold-300/40 bg-gold-300/10 text-gold-200' : 'border-input text-bone hover:border-gold-300/40',
          className,
        )}
      >
        <Heart className={cn('size-4', favorited && 'animate-pop fill-gold-300 text-gold-300')} aria-hidden />
        {favorited ? 'Favoritado' : 'Favoritar'}
      </button>
    )
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorited}
      aria-label={label}
      disabled={pending}
      className={cn(
        'grid size-9 place-items-center rounded-full border border-bone/10 bg-ink-950/60 backdrop-blur-md transition-colors hover:border-gold-300/40',
        className,
      )}
    >
      <Heart
        className={cn('size-4 transition-colors', favorited ? 'animate-pop fill-gold-300 text-gold-300' : 'text-bone/80')}
        aria-hidden
      />
    </button>
  )
}
