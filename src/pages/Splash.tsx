import { useEffect } from 'react'
import { motion } from 'motion/react'
import { LiftMark } from '@/components/brand/LiftLogo'
import { LIFT_CONFIG } from '@/config/lift.config'

/**
 * Abertura: logo + tagline (~1.9s). O roteamento decide o destino depois:
 * Primeiro acesso → Onboarding → Login → Home
 * Sessão ativa    → Home
 */
export default function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = setTimeout(onDone, reduced ? 600 : 1900)
    return () => clearTimeout(id)
  }, [onDone])

  return (
    <motion.div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-bg" exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.35 }}>
      <div className="hud-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_65%)]" />
      <motion.div
        className="absolute size-[520px] rounded-full bg-lift/20 blur-[120px]"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
      <div className="relative flex flex-col items-center">
        <LiftMark size={64} animated />
        <motion.h1
          className="font-display-wide mt-6 text-[72px] leading-none font-black tracking-[0.04em]"
          initial={{ opacity: 0, letterSpacing: '0.3em', filter: 'blur(8px)' }}
          animate={{ opacity: 1, letterSpacing: '0.04em', filter: 'blur(0px)' }}
          transition={{ delay: 0.45, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          LIFT
        </motion.h1>
        <motion.div
          className="mt-5 flex items-center gap-2.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.5 }}
        >
          {LIFT_CONFIG.TAGLINE.map((t, i) => (
            <span key={t} className="flex items-center gap-2.5">
              {i > 0 && <span className="size-1 rounded-full bg-lift" />}
              <span className="hud-label !text-[10px] !text-ink-2">{t}</span>
            </span>
          ))}
        </motion.div>
      </div>
      <motion.div
        className="absolute bottom-[max(var(--safe-bottom),28px)] h-[2px] w-24 overflow-hidden rounded-full bg-white/8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.div className="h-full bg-lift" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ delay: 0.6, duration: 1.2, ease: 'easeInOut' }} />
      </motion.div>
    </motion.div>
  )
}
