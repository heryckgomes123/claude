'use client'
import { Loader2, UserPlus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/input'
import { changeGrantStatus, grantEmails } from '@/server/actions/admin'

export function GrantEmailsForm() {
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState<string[]>([])
  const [pending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setInvalid([])
    startTransition(async () => {
      const result = await grantEmails(value)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      setInvalid(result.data.invalid)
      setValue(result.data.invalid.join('\n'))
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Field
        label="Liberar acesso manualmente"
        htmlFor="emails"
        hint="Um e-mail por linha. Opcional: “email, nome”. O aluno cria a conta com esse e-mail e já entra."
      >
        <Textarea
          id="emails"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          placeholder={'maria@email.com, Maria Souza\njoao@email.com'}
          className="font-mono text-[13px]"
        />
      </Field>
      {invalid.length > 0 && (
        <p role="alert" className="text-sm text-warning">
          {invalid.length} linha(s) com e-mail inválido ficaram no campo para você corrigir.
        </p>
      )}
      <Button type="submit" variant="primary" disabled={pending || !value.trim()} className="justify-self-start">
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Liberar acesso
      </Button>
    </form>
  )
}

export function GrantStatusButton({ id, status, email }: { id: string; status: string; email: string }) {
  const [pending, startTransition] = useTransition()
  const active = status === 'ACTIVE'
  return (
    <Button
      variant={active ? 'ghost' : 'outline'}
      size="sm"
      disabled={pending}
      aria-label={`${active ? 'Bloquear' : 'Reativar'} acesso de ${email}`}
      onClick={() => {
        if (active && !window.confirm(`Bloquear o acesso de ${email}?`)) return
        startTransition(async () => {
          const result = await changeGrantStatus(id, active ? 'REVOKED' : 'ACTIVE')
          if (!result.ok) toast.error(result.error)
          else toast.success(result.message)
        })
      }}
    >
      {pending && <Loader2 className="animate-spin" />}
      {active ? 'Bloquear' : 'Reativar'}
    </Button>
  )
}
