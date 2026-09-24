import { motion } from 'motion/react'
import { PlayCircle } from 'lucide-react'
import type { Exercise } from '@/types/models'
import { cn } from '@/lib/utils'

/**
 * Espaço de demonstração visual do exercício.
 * Quando `mediaUrl` existir (vídeo curto, animação ou modelo 3D), é exibido aqui.
 * Até lá, mostra um placeholder técnico honesto — sem imagens genéricas.
 */
export function ExerciseVisual({ exercise, className, compact }: { exercise: Exercise; className?: string; compact?: boolean }) {
  if (exercise.mediaUrl) {
    return (
      <video
        src={exercise.mediaUrl}
        className={cn('w-full rounded-2xl bg-surface-2 object-cover', className)}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
    )
  }
  return (
    <div className={cn('relative grid place-items-center overflow-hidden rounded-2xl border border-line bg-surface-2', className)}>
      <div className="hud-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(circle,black,transparent_75%)]" />
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute size-20 rounded-full border border-lift/40"
          animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: 'easeOut' }}
        />
      ))}
      <div className="relative flex flex-col items-center text-center">
        <span className="grid size-12 place-items-center rounded-full bg-lift/15 text-lift-2">
          <PlayCircle size={24} />
        </span>
        {!compact && (
          <>
            <p className="mt-2.5 text-[12px] font-semibold text-ink-2">Demonstração em produção</p>
            <p className="mt-1 text-[11px] text-muted capitalize">{exercise.muscleGroups.join(' · ')}</p>
          </>
        )}
      </div>
    </div>
  )
}
