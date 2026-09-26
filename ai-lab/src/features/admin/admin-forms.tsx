'use client'
import { Ban, Check, Copy, Download, KeyRound, Loader2, Pencil, Plus, ShieldCheck, Trash2, UserMinus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/components/lab/copy-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { CATEGORY_ICON_NAMES } from '@/lib/category-icons'
import {
  deleteCategory,
  deleteLabUpdate,
  deleteTag,
  disableAccessCode,
  generateAccessCodes,
  grantMembership,
  renameTag,
  revokeMembership,
  saveCategory,
  saveLabUpdate,
  setUserRole,
} from '@/server/actions/admin'
import type { ActionResult } from '@/server/actions/result'

function useAction() {
  const [pending, startTransition] = useTransition()
  const run = <T,>(fn: () => Promise<ActionResult<T>>, onOk?: (r: T) => void) =>
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        const detail = result.fieldErrors ? Object.values(result.fieldErrors)[0] : undefined
        toast.error(result.error, detail ? { description: detail } : undefined)
        return
      }
      if (result.message) toast.success(result.message)
      onOk?.(result.data)
    })
  return { pending, run }
}

/* ------------------------------- Taxonomia ------------------------------- */

type CategoryRow = {
  id: string
  kind: 'CONTENT' | 'TOOL'
  slug: string
  name: string
  description: string | null
  icon: string | null
  sortOrder: number
}

export function CategoryDialog({ category, kind = 'CONTENT' }: { category?: CategoryRow; kind?: 'CONTENT' | 'TOOL' }) {
  const [open, setOpen] = useState(false)
  const { pending, run } = useAction()
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    run(
      () =>
        saveCategory({
          id: category?.id,
          kind: (f.get('kind') as 'CONTENT' | 'TOOL') ?? kind,
          name: String(f.get('name') ?? ''),
          slug: String(f.get('slug') ?? '') || undefined,
          description: String(f.get('description') ?? ''),
          icon: String(f.get('icon') ?? ''),
          sortOrder: Number(f.get('sortOrder') ?? 0),
        }),
      () => setOpen(false),
    )
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Editar ${category.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant="primary" size="sm">
            <Plus /> Nova categoria
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{category ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <Field label="Área" htmlFor="cat-kind">
            <NativeSelect id="cat-kind" name="kind" defaultValue={category?.kind ?? kind}>
              <option value="CONTENT">Conteúdo (prompts, workflows, referências, tutoriais)</option>
              <option value="TOOL">Diretório de ferramentas</option>
            </NativeSelect>
          </Field>
          <Field label="Nome" htmlFor="cat-name">
            <Input id="cat-name" name="name" defaultValue={category?.name} required maxLength={80} />
          </Field>
          <Field label="Slug" htmlFor="cat-slug" optional hint="Vazio = gerado a partir do nome.">
            <Input id="cat-slug" name="slug" defaultValue={category?.slug} className="font-mono" maxLength={96} />
          </Field>
          <Field label="Descrição" htmlFor="cat-desc" optional>
            <Textarea id="cat-desc" name="description" defaultValue={category?.description ?? ''} maxLength={300} className="min-h-20" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ícone" htmlFor="cat-icon">
              <NativeSelect id="cat-icon" name="icon" defaultValue={category?.icon ?? 'layers'}>
                {CATEGORY_ICON_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Ordem" htmlFor="cat-order">
              <Input id="cat-order" name="sortOrder" type="number" min={0} max={999} defaultValue={category?.sortOrder ?? 0} />
            </Field>
          </div>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteCategoryButton({ id, name, usage }: { id: string; name: string; usage: number }) {
  const { pending, run } = useAction()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label={`Excluir ${name}`}
      onClick={() => {
        if (window.confirm(usage ? `“${name}” é usada por ${usage} conteúdo(s), que ficarão sem categoria. Excluir?` : `Excluir “${name}”?`))
          run(() => deleteCategory(id))
      }}
    >
      <Trash2 />
    </Button>
  )
}

export function TagRow({ id, name, slug, usage }: { id: string; name: string; slug: string; usage: number }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const { pending, run } = useAction()
  return (
    <li className="flex items-center gap-2 rounded-xl border border-border bg-ink-900/60 px-3 py-2">
      {editing ? (
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => renameTag(id, value), () => setEditing(false))
          }}
        >
          <Input value={value} onChange={(e) => setValue(e.target.value)} className="h-8" maxLength={40} autoFocus aria-label="Nome da tag" />
          <Button type="submit" size="icon-sm" variant="primary" disabled={pending} aria-label="Salvar">
            <Check />
          </Button>
        </form>
      ) : (
        <>
          <span className="flex-1 text-sm">
            #{name} <span className="font-mono text-[11px] text-mute-600">{slug}</span>
          </span>
          <span className="font-mono text-xs text-mute-600">{usage}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label={`Renomear ${name}`}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label={`Excluir ${name}`}
            onClick={() => window.confirm(`Excluir a tag “${name}”?`) && run(() => deleteTag(id))}
          >
            <Trash2 />
          </Button>
        </>
      )}
    </li>
  )
}

/* -------------------------------- Membros -------------------------------- */

export function MemberActions({
  userId,
  email,
  role,
  isSelf,
  plans,
  memberships,
}: {
  userId: string
  email: string
  role: string
  isSelf: boolean
  plans: { id: string; name: string; isActive: boolean }[]
  memberships: { id: string; planName: string; active: boolean }[]
}) {
  const [open, setOpen] = useState(false)
  const { pending, run } = useAction()
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="secondary">
            <KeyRound /> Conceder acesso
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Conceder acesso</DialogTitle>
          <DialogDescription>{email}</DialogDescription>
          <form
            className="mt-5 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              run(
                () =>
                  grantMembership({
                    userId,
                    planId: String(f.get('planId')),
                    durationDays: String(f.get('durationDays') ?? ''),
                    note: String(f.get('note') ?? ''),
                  }),
                () => setOpen(false),
              )
            }}
          >
            <Field label="Plano" htmlFor={`plan-${userId}`}>
              <NativeSelect id={`plan-${userId}`} name="planId" required>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.isActive ? '' : ' (inativo)'}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Duração em dias" htmlFor={`days-${userId}`} optional hint="Vazio = sem data de término.">
              <Input id={`days-${userId}`} name="durationDays" type="number" min={1} max={3650} />
            </Field>
            <Field label="Nota" htmlFor={`note-${userId}`} optional hint="Ex.: nº do pedido, cortesia, parceria.">
              <Input id={`note-${userId}`} name="note" maxLength={280} />
            </Field>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Conceder
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {memberships
        .filter((m) => m.active)
        .map((m) => (
          <Button
            key={m.id}
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => window.confirm(`Revogar o acesso “${m.planName}” de ${email}?`) && run(() => revokeMembership(m.id))}
          >
            <UserMinus /> Revogar {m.planName}
          </Button>
        ))}
      {!isSelf && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            const next = role === 'ADMIN' ? 'USER' : 'ADMIN'
            if (window.confirm(next === 'ADMIN' ? `Tornar ${email} administrador?` : `Remover o papel de administrador de ${email}?`))
              run(() => setUserRole(userId, next))
          }}
        >
          <ShieldCheck /> {role === 'ADMIN' ? 'Remover admin' : 'Tornar admin'}
        </Button>
      )}
    </div>
  )
}

/* ---------------------------- Códigos de acesso --------------------------- */

export function GenerateCodesForm({ plans }: { plans: { id: string; name: string; isActive: boolean }[] }) {
  const [codes, setCodes] = useState<string[] | null>(null)
  const { pending, run } = useAction()
  const defaultPlan = plans.find((p) => p.isActive && p.name !== 'Free') ?? plans[0]

  function download() {
    const blob = new Blob([`codigo\n${codes!.join('\n')}\n`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `intelra-codigos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-4 rounded-2xl border border-border bg-ink-900/60 p-5 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          run(
            () =>
              generateAccessCodes({
                planId: String(f.get('planId')),
                quantity: Number(f.get('quantity')),
                durationDays: String(f.get('durationDays') ?? ''),
                maxRedemptions: Number(f.get('maxRedemptions') || 1),
                expiresAt: String(f.get('expiresAt') ?? '') || undefined,
                note: String(f.get('note') ?? ''),
              }),
            (data) => setCodes(data.codes),
          )
        }}
      >
        <Field label="Plano" htmlFor="gc-plan">
          <NativeSelect id="gc-plan" name="planId" defaultValue={defaultPlan?.id}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isActive ? '' : ' (inativo)'}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Quantidade" htmlFor="gc-qty" hint="Até 500 por lote.">
          <Input id="gc-qty" name="quantity" type="number" min={1} max={500} defaultValue={1} required />
        </Field>
        <Field label="Usos por código" htmlFor="gc-max">
          <Input id="gc-max" name="maxRedemptions" type="number" min={1} max={10000} defaultValue={1} />
        </Field>
        <Field label="Duração do acesso (dias)" htmlFor="gc-days" optional hint="Vazio = sem término.">
          <Input id="gc-days" name="durationDays" type="number" min={1} max={3650} />
        </Field>
        <Field label="Código válido até" htmlFor="gc-exp" optional>
          <Input id="gc-exp" name="expiresAt" type="date" />
        </Field>
        <Field label="Nota" htmlFor="gc-note" optional hint="Ex.: lote Hotmart set/2026.">
          <Input id="gc-note" name="note" maxLength={280} />
        </Field>
        <div className="md:col-span-3">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Gerar códigos
          </Button>
        </div>
      </form>

      {codes && (
        <div role="status" className="grid gap-3 rounded-2xl border border-gold-300/30 bg-gold-300/[0.05] p-5">
          <p className="text-sm font-medium text-gold-100">
            {codes.length} código(s) gerado(s). Copie agora — por segurança, eles não serão exibidos novamente.
          </p>
          <pre className="max-h-64 overflow-auto rounded-xl bg-ink-950/70 p-4 font-mono text-sm leading-7">{codes.join('\n')}</pre>
          <div className="flex gap-2">
            <Button onClick={async () => (await copyToClipboard(codes.join('\n'))) && toast.success('Códigos copiados')}>
              <Copy /> Copiar todos
            </Button>
            <Button variant="ghost" onClick={download}>
              <Download /> Baixar CSV
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function DisableCodeButton({ id }: { id: string }) {
  const { pending, run } = useAction()
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => window.confirm('Desativar este código?') && run(() => disableAccessCode(id))}>
      <Ban /> Desativar
    </Button>
  )
}

/* ------------------------------- Novidades ------------------------------- */

type UpdateRow = {
  id: string
  title: string
  body: string
  kind: 'NEW_CONTENT' | 'FEATURE' | 'ANNOUNCEMENT'
  state: 'DRAFT' | 'PUBLISHED'
  contentId: string | null
}

export function UpdateDialog({ update, contents }: { update?: UpdateRow; contents: { id: string; title: string; type: string }[] }) {
  const [open, setOpen] = useState(false)
  const { pending, run } = useAction()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {update ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Editar ${update.title}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant="primary">
            <Plus /> Nova novidade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{update ? 'Editar novidade' : 'Nova novidade'}</DialogTitle>
        <DialogDescription>Aparece em “Novidades” na Home do Lab quando publicada.</DialogDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            run(
              () =>
                saveLabUpdate({
                  id: update?.id,
                  title: String(f.get('title') ?? ''),
                  body: String(f.get('body') ?? ''),
                  kind: f.get('kind') as UpdateRow['kind'],
                  contentId: String(f.get('contentId') ?? ''),
                  state: f.get('state') as UpdateRow['state'],
                }),
              () => setOpen(false),
            )
          }}
        >
          <Field label="Título" htmlFor="u-title">
            <Input id="u-title" name="title" defaultValue={update?.title} required maxLength={160} />
          </Field>
          <Field label="Texto" htmlFor="u-body" optional>
            <Textarea id="u-body" name="body" defaultValue={update?.body} maxLength={1000} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" htmlFor="u-kind">
              <NativeSelect id="u-kind" name="kind" defaultValue={update?.kind ?? 'ANNOUNCEMENT'}>
                <option value="ANNOUNCEMENT">Comunicado</option>
                <option value="NEW_CONTENT">Novo conteúdo</option>
                <option value="FEATURE">Novo recurso</option>
              </NativeSelect>
            </Field>
            <Field label="Estado" htmlFor="u-state">
              <NativeSelect id="u-state" name="state" defaultValue={update?.state ?? 'DRAFT'}>
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicada</option>
              </NativeSelect>
            </Field>
          </div>
          <Field label="Conteúdo vinculado" htmlFor="u-content" optional>
            <NativeSelect id="u-content" name="contentId" defaultValue={update?.contentId ?? ''}>
              <option value="">—</option>
              {contents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type} · {c.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteUpdateButton({ id, title }: { id: string; title: string }) {
  const { pending, run } = useAction()
  return (
    <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`Excluir ${title}`} onClick={() => window.confirm(`Excluir “${title}”?`) && run(() => deleteLabUpdate(id))}>
      <Trash2 />
    </Button>
  )
}
