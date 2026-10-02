import { AnimatePresence, m } from 'framer-motion'
import { useUI } from '../state/ui'
import { Check } from './Icons'

/** Confirmação discreta (ex.: “Referência adicionada ao seu projeto.”), anunciada a leitores de tela. */
export function Toast() {
  const { toast } = useUI()
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 top-[76px] z-[70] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <m.div
            key={toast.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="glass flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4 text-sm text-bone shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-ion-400 text-ink-950">
              <Check size={14} strokeWidth={2.6} />
            </span>
            {toast.text}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
