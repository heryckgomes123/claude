'use client'
import { Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { ActionResult } from '@/server/actions/result'

type FormAction = (form: FormData) => Promise<ActionResult<unknown>>

/**
 * Formulário do painel: envia para uma server action, mostra erros por campo
 * e, ao salvar, volta para a lista (ou fica na página, se `redirectTo` não for informado).
 */
export function ActionForm({
  action,
  redirectTo,
  submitLabel = 'Salvar',
  children,
  resetOnSuccess = false,
  className,
}: {
  action: FormAction
  redirectTo?: string
  submitLabel?: string
  children: React.ReactNode
  resetOnSuccess?: boolean
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<{ message: string; fields: string[] } | null>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setError(null)
    startTransition(async () => {
      const result = await action(form)
      if (!result.ok) {
        setError({ message: result.error, fields: Object.values(result.fieldErrors ?? {}) })
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Salvo')
      if (resetOnSuccess) formElement.reset()
      if (redirectTo) router.push(redirectTo)
    })
  }

  return (
    <form onSubmit={onSubmit} className={className ?? 'grid gap-5'}>
      {children}
      {error && (
        <div role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          <p>{error.message}</p>
          {error.fields.length > 0 && (
            <ul className="mt-1.5 list-disc pl-5">
              {error.fields.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} {submitLabel}
        </Button>
        {redirectTo && (
          <Button type="button" variant="ghost" size="lg" onClick={() => router.push(redirectTo)}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}

/** Botão de excluir com confirmação. */
export function DeleteButton({
  action,
  title,
  description = 'Esta ação não pode ser desfeita.',
  redirectTo,
  label = 'Excluir',
  compact = false,
}: {
  action: () => Promise<ActionResult<unknown>>
  title: string
  description?: string
  redirectTo?: string
  label?: string
  compact?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <Button
        variant={compact ? 'ghost' : 'danger'}
        size={compact ? 'icon-sm' : 'md'}
        onClick={() => setOpen(true)}
        aria-label={compact ? `${label}: ${title}` : undefined}
      >
        <Trash2 />
        {!compact && label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Excluir “{title}”?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await action()
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  toast.success(result.message ?? 'Excluído')
                  setOpen(false)
                  if (redirectTo) router.push(redirectTo)
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
