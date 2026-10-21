import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Badge, Button, Empty, IconButton, Modal, PageHeader, Tabs, Toggle, toast } from '../components/ui'
import { TEMPLATES, blankAutomation, type Template } from '../data/templates'
import { TRIGGER_META, describeTrigger } from '../lib/describe'
import { validateFlow } from '../lib/flow'
import { navigate } from '../lib/router'
import { formatNumber, normalize, percent, timeAgo } from '../lib/util'
import { useStore } from '../store/store'

type Filter = 'all' | 'active' | 'paused'

export function TemplateGallery({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createAutomation = useStore((s) => s.createAutomation)
  const create = (template?: Template) => {
    const id = createAutomation(template ? template.build() : blankAutomation())
    onClose()
    navigate(`/automacoes/${id}`)
  }
  return (
    <Modal open={open} onClose={onClose} title="Nova automação" wide>
      <button
        type="button"
        onClick={() => create()}
        className="mb-4 flex w-full items-center gap-4 rounded-2xl border border-dashed border-brand/50 bg-brand/5 p-4 text-left transition hover:bg-brand/10"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-brand/15 text-accent">
          <Icon name="plus" />
        </span>
        <span>
          <span className="block font-semibold">Começar do zero</span>
          <span className="text-[13px] text-muted">Um gatilho e uma mensagem para você montar o resto.</span>
        </span>
      </button>
      <p className="label">Modelos prontos</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" onClick={() => create(t)} className="card group p-4 text-left transition hover:border-brand/50">
            <Badge tone={t.category === 'IA' ? 'success' : 'brand'}>{t.category}</Badge>
            <span className="mt-3 block font-semibold group-hover:text-accent">{t.name}</span>
            <span className="mt-1 block text-[13px] text-muted">{t.description}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

export function Automations({ gallery = false }: { gallery?: boolean }) {
  const automations = useStore((s) => s.automations)
  const updateAutomation = useStore((s) => s.updateAutomation)
  const deleteAutomation = useStore((s) => s.deleteAutomation)
  const duplicateAutomation = useStore((s) => s.duplicateAutomation)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [showGallery, setShowGallery] = useState(gallery)

  const list = useMemo(() => {
    const q = normalize(query)
    return automations
      .filter((a) => (filter === 'all' ? true : filter === 'active' ? a.active : !a.active))
      .filter((a) => !q || normalize(`${a.name} ${a.description} ${a.triggers.map(describeTrigger).join(' ')}`).includes(q))
      .sort((a, b) => Number(b.active) - Number(a.active) || b.updatedAt - a.updatedAt)
  }, [automations, filter, query])

  const toggle = (id: string, active: boolean) => {
    const automation = automations.find((a) => a.id === id)!
    if (active) {
      const errors = validateFlow(automation, automations).filter((i) => i.level === 'error')
      if (errors.length) {
        toast(`Corrija ${errors.length} erro(s) no fluxo antes de ativar.`, 'error')
        return
      }
    }
    updateAutomation(id, { active })
    toast(active ? 'Automação ativada.' : 'Automação pausada.')
  }

  return (
    <>
      <PageHeader
        title="Automações"
        subtitle="Fluxos que respondem sozinhos por palavra-chave, comentário, story, link, intenção de IA ou boas-vindas."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setShowGallery(true)}>
            Nova automação
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: 'Todas', count: automations.length },
            { id: 'active', label: 'Ativas', count: automations.filter((a) => a.active).length },
            { id: 'paused', label: 'Pausadas', count: automations.filter((a) => !a.active).length },
          ]}
        />
        <label className="relative ml-auto w-full sm:w-72">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            <Icon name="search" size={15} />
          </span>
          <input className="field !pl-9" placeholder="Buscar automação ou palavra-chave" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar automações" />
        </label>
      </div>

      {list.length === 0 ? (
        <Empty
          icon="flow"
          title={automations.length ? 'Nada encontrado' : 'Nenhuma automação ainda'}
          text={automations.length ? 'Tente outro termo ou filtro.' : 'Comece por um modelo pronto e ajuste do seu jeito.'}
          action={
            <Button variant="primary" icon="plus" onClick={() => setShowGallery(true)}>
              Criar automação
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {list.map((a) => {
            const issues = validateFlow(a, automations)
            const errors = issues.filter((i) => i.level === 'error').length
            return (
              <article
                key={a.id}
                className="card group flex min-w-0 cursor-pointer flex-col gap-4 p-5 transition hover:border-line-strong md:flex-row md:items-center"
                onClick={() => navigate(`/automacoes/${a.id}`)}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Toggle checked={a.active} onChange={(v) => toggle(a.id, v)} label={a.active ? 'Pausar automação' : 'Ativar automação'} />
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-2 font-semibold group-hover:text-accent">
                      {a.name}
                      {errors > 0 && <Badge tone="danger">{errors} erro(s)</Badge>}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {a.triggers.length === 0 && <span className="text-[12px] text-faint">Sem gatilho</span>}
                      {a.triggers.map((t) => (
                        <span key={t.id} className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-line bg-surface px-2 py-0.5 text-[12px] text-muted" title={describeTrigger(t)}>
                          <span className="text-accent">{TRIGGER_META[t.type].label}:</span>
                          <span className="truncate">{describeTrigger(t)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-4 text-[12px] md:w-[300px]">
                  <div>
                    <dt className="text-faint">Execuções</dt>
                    <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{formatNumber(a.stats.runs)}</dd>
                  </div>
                  <div>
                    <dt className="text-faint">Concluídas</dt>
                    <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{percent(a.stats.completed, a.stats.runs)}</dd>
                  </div>
                  <div>
                    <dt className="text-faint">CTR</dt>
                    <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{percent(a.stats.clicks, a.stats.runs)}</dd>
                  </div>
                </dl>
                <div className="flex items-center justify-between gap-1 md:justify-end" onClick={(e) => e.stopPropagation()}>
                  <span className="mr-2 text-[11px] text-faint">editada há {timeAgo(a.updatedAt)}</span>
                  <IconButton
                    icon="copy"
                    label="Duplicar"
                    onClick={() => {
                      const id = duplicateAutomation(a.id)
                      if (id) toast('Automação duplicada (pausada).')
                    }}
                  />
                  <IconButton
                    icon="trash"
                    label="Excluir"
                    onClick={() => {
                      if (window.confirm(`Excluir "${a.name}"? Essa ação não pode ser desfeita.`)) {
                        deleteAutomation(a.id)
                        toast('Automação excluída.')
                      }
                    }}
                  />
                </div>
              </article>
            )
          })}
        </div>
      )}

      <TemplateGallery
        open={showGallery}
        onClose={() => {
          setShowGallery(false)
          if (gallery) navigate('/automacoes')
        }}
      />
    </>
  )
}
