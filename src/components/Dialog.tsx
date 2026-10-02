import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  labelledBy: string
  className?: string
  children: ReactNode
  /** Elemento que recebe o foco ao abrir (padrão: primeiro focável). */
  initialFocus?: RefObject<HTMLElement | null>
}

/**
 * Modal acessível sobre <dialog> nativo: o resto da página fica inerte (contenção de foco),
 * Escape fecha, clique fora fecha, e o foco volta ao elemento que abriu.
 */
export function Dialog({ open, onClose, labelledBy, className = '', children, initialFocus }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      document.documentElement.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        const target =
          initialFocus?.current ??
          dialog.querySelector<HTMLElement>('[data-autofocus]') ??
          dialog.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        target?.focus()
      })
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, initialFocus])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleClose = () => {
      document.documentElement.style.overflow = ''
      const target = returnTo.current
      returnTo.current = null
      if (target && document.contains(target)) target.focus({ preventScroll: true })
      onCloseRef.current()
    }
    const handleCancel = (e: Event) => {
      e.preventDefault()
      onCloseRef.current()
    }
    dialog.addEventListener('close', handleClose)
    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('close', handleClose)
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className={className}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {open ? children : null}
    </dialog>
  )
}
