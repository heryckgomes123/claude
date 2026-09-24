/**
 * Sobreposição de celebração (check-in, treino concluído, conquista, subida de nível).
 * Chame `celebrate({...})` de qualquer lugar.
 */
import { useEffect } from 'react'
import { create } from 'zustand'
import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'
import { SoundService, type SoundCue } from '@/services/sound/SoundService'
import { vibrate } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface CelebrationData {
  title: string
  subtitle?: string
  xp?: number
  icon?: string
  sound?: SoundCue
}

const useCelebration = create<{ current: CelebrationData | null; show: (c: CelebrationData) => void; hide: () => void }>((set) => ({
  current: null,
  show: (c) => set({ current: c }),
  hide: () => set({ current: null }),
}))

export const celebrate = (c: CelebrationData) => {
  useCelebration.getState().show(c)
  SoundService.play(c.sound ?? 'success')
  if (useAppStore.getState().settings.haptics) vibrate([14, 40, 22])
}

export function CelebrationLayer() {
  const { current, hide } = useCelebration()
  useEffect(() => {
    if (!current) return
    const id = setTimeout(hide, 2600)
    return () => clearTimeout(id)
  }, [current, hide])

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-bg/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={hide}
          role="status"
          aria-live="assertive"
        >
          <div className="relative flex flex-col items-center px-8 text-center">
            {/* anéis de expansão */}
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute top-12 size-24 -translate-y-1/2 rounded-full border border-lift/60"
                initial={{ scale: 0.6, opacity: 0.8 }}
                animate={{ scale: 3.2, opacity: 0 }}
                transition={{ duration: 1.6, delay: i * 0.25, ease: 'easeOut' }}
              />
            ))}
            <motion.div
              className="relative grid size-24 place-items-center rounded-full bg-lift text-4xl shadow-[0_0_60px_rgb(47_107_255/0.6)]"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              {current.icon ?? <Check size={44} strokeWidth={3} />}
            </motion.div>
            <motion.h2
              className="font-display-wide mt-7 text-[26px] leading-tight font-extrabold uppercase"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              {current.title}
            </motion.h2>
            {current.subtitle && (
              <motion.p className="mt-2 max-w-xs text-sm text-ink-2" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.22 }}>
                {current.subtitle}
              </motion.p>
            )}
            {!!current.xp && (
              <motion.div
                className="font-display-wide mt-5 rounded-full border border-lift/40 bg-lift/15 px-5 py-2 text-xl font-extrabold text-lift-3 tabular"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 420, damping: 16 }}
              >
                +{current.xp} XP
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
