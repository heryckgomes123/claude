import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  /** "sheet" (padrão, mobile) desliza de baixo; "center" para diálogos */
  variant?: 'sheet' | 'center'
}

export function Modal({ open, onClose, title, children, className, variant = 'sheet' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-50 flex justify-center', variant === 'sheet' ? 'items-end' : 'items-center p-5')}>
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative w-full max-w-lg border border-line-strong bg-surface shadow-2xl',
              variant === 'sheet'
                ? 'max-h-[88dvh] overflow-y-auto rounded-t-[28px] pb-[calc(var(--safe-bottom)+20px)]'
                : 'rounded-[28px]',
              className,
            )}
            initial={variant === 'sheet' ? { y: '100%' } : { opacity: 0, scale: 0.94 }}
            animate={variant === 'sheet' ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={variant === 'sheet' ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            drag={variant === 'sheet' ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
          >
            {variant === 'sheet' && <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/15" />}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              {title ? <h3 className="font-display-wide text-lg font-bold">{title}</h3> : <span />}
              <button
                onClick={onClose}
                className="grid size-9 place-items-center rounded-full bg-white/6 text-ink-2 hover:text-ink"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pb-2">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
