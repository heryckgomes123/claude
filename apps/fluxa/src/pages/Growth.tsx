import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Badge, Button, ChannelIcon, Empty, IconButton, Modal, PageHeader, copyText, toast } from '../components/ui'
import { CHANNEL_LABEL, buttonSnippet, growthLink } from '../lib/audience'
import { navigate } from '../lib/router'
import type { GrowthTool, GrowthToolType } from '../lib/types'
import { formatNumber, slugify, uid } from '../lib/util'
import { receive, testContact } from '../store/runtime'
import { useStore } from '../store/store'

const TYPE_LABEL: Record<GrowthToolType, string> = { link: 'Link', qr: 'QR code', button: 'Botão para site' }
const TOOL_CHANNELS: GrowthTool['channel'][] = ['instagram', 'whatsapp', 'messenger', 'telegram']

function QrImage({ value, size = 168 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: '#051120', light: '#f5f8fc' } })
      .then((url) => alive && setSrc(url))
      .catch(() => setSrc(''))
    return () => {
      alive = false
    }
  }, [value, size])
  return src ? <img src={src} alt="QR code do link" width={size} height={size} className="rounded-xl" /> : <div style={{ width: size, height: size }} className="rounded-xl bg-subtle" />
}

function Editor({ initial, onClose }: { initial: GrowthTool; onClose: () => void }) {
  const automations = useStore((s) => s.automations)
  const saveGrowthTool = useStore((s) => s.saveGrowthTool)
  const [t, setT] = useState(initial)
  return (
    <Modal
      open
      onClose={onClose}
      title="Ferramenta de crescimento"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!t.name.trim() || !t.ref.trim() || !t.automationId}
            onClick={() => {
              saveGrowthTool(t)
              toast('Ferramenta salva.')
              onClose()
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="label">Nome</span>
          <input className="field" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Tipo</span>
            <select className="field" value={t.type} onChange={(e) => setT({ ...t, type: e.target.value as GrowthToolType })}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Canal</span>
            <select className="field" value={t.channel} onChange={(e) => setT({ ...t, channel: e.target.value as GrowthTool['channel'] })}>
              {TOOL_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="label">{t.channel === 'whatsapp' ? 'Mensagem pré-preenchida' : 'Identificador (ref)'}</span>
          <input className="field font-mono" value={t.ref} onChange={(e) => setT({ ...t, ref: t.channel === 'whatsapp' ? e.target.value : slugify(e.target.value) })} />
          <span className="mt-1 block text-[11.5px] text-faint">
            {t.channel === 'whatsapp' ? 'O WhatsApp não envia a origem do clique: a pessoa chega com este texto pronto para enviar, e é ele que dispara a automação.' : 'Vai no link como ?ref=… e identifica de onde o contato veio.'}
          </span>
        </label>
        <label className="block">
          <span className="label">Automação que inicia</span>
          <select className="field" value={t.automationId} onChange={(e) => setT({ ...t, automationId: e.target.value })}>
            <option value="">Escolha…</option>
            {automations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.active ? '' : ' (pausada)'}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  )
}

export function Growth() {
  const tools = useStore((s) => s.growthTools)
  const automations = useStore((s) => s.automations)
  const settings = useStore((s) => s.settings)
  const deleteGrowthTool = useStore((s) => s.deleteGrowthTool)
  const [editing, setEditing] = useState<GrowthTool | null>(null)

  const downloadQr = async (tool: GrowthTool) => {
    const url = await QRCode.toDataURL(growthLink(tool, settings), { margin: 2, width: 1024 })
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${slugify(tool.name) || 'fluxa'}.png`
    a.click()
  }

  const testEntry = async (tool: GrowthTool) => {
    const contact = testContact(tool.channel)
    const automation = automations.find((a) => a.id === tool.automationId)
    if (!automation?.active) {
      toast('Ative a automação ligada a esta ferramenta para testar.', 'error')
      return
    }
    await receive(contact.id, { text: tool.ref }, { kind: tool.channel === 'whatsapp' ? 'message' : 'ref', ref: tool.ref })
    navigate(`/inbox/${contact.id}`)
  }

  return (
    <>
      <PageHeader
        title="Crescimento"
        subtitle="Links, QR codes e botões que trazem pessoas para a conversa e já iniciam a automação certa — com contagem de entradas por origem."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setEditing({ id: uid('g'), name: 'Novo link', type: 'link', channel: 'instagram', ref: 'campanha', automationId: automations[0]?.id ?? '', entries: 0, createdAt: Date.now() })}
          >
            Nova ferramenta
          </Button>
        }
      />
      {settings.handles.whatsapp.replace(/\D/g, '') === '5500000000000' && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#f1d58a] bg-[#fff8e5] px-4 py-3 text-[13px] text-[#6b4e00]">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-[#b07d00]" />
          <span>
            Os links usam contas de exemplo. Configure seu @ do Instagram, número de WhatsApp, página do Messenger e bot do Telegram em{' '}
            <a href="#/configuracoes" className="underline">
              Configurações
            </a>
            .
          </span>
        </div>
      )}
      {tools.length === 0 ? (
        <Empty icon="rocket" title="Nenhuma ferramenta" text="Crie um link para a bio, um QR code para o balcão ou um botão para o site." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tools.map((tool) => {
            const link = growthLink(tool, settings)
            const automation = automations.find((a) => a.id === tool.automationId)
            return (
              <article key={tool.id} className="card min-w-0 flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{tool.name}</h2>
                      <Badge tone="brand">{TYPE_LABEL[tool.type]}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
                      <ChannelIcon channel={tool.channel} /> {CHANNEL_LABEL[tool.channel]} → {automation ? automation.name : <span className="text-danger">automação removida</span>}
                      {automation && !automation.active && <Badge>pausada</Badge>}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-poster text-[26px] leading-none">{formatNumber(tool.entries)}</div>
                    <div className="text-[11px] text-faint">entradas</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-1 flex-col gap-4 sm:flex-row">
                  {tool.type === 'qr' && (
                    <div className="shrink-0">
                      <QrImage value={link} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-1.5 rounded-xl border border-line bg-canvas py-1 pl-3 pr-1">
                      <code className="min-w-0 flex-1 truncate text-[12px] text-accent">{link}</code>
                      <IconButton icon="copy" label="Copiar link" onClick={() => copyText(link, 'Link copiado!')} />
                    </div>
                    {tool.type === 'button' && (
                      <div className="rounded-xl border border-line bg-canvas p-3">
                        <div className="mb-2 flex items-center justify-between text-[11.5px] text-faint">
                          HTML para colar no site
                          <button type="button" className="text-accent hover:underline" onClick={() => copyText(buttonSnippet(tool, settings), 'Código copiado!')}>
                            Copiar
                          </button>
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: buttonSnippet(tool, settings) }} />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tool.type === 'qr' && (
                        <Button size="sm" icon="download" onClick={() => downloadQr(tool)}>
                          Baixar PNG
                        </Button>
                      )}
                      <Button size="sm" icon="play" onClick={() => testEntry(tool)}>
                        Testar entrada
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(tool)}>
                        Editar
                      </Button>
                      <IconButton
                        icon="trash"
                        label="Excluir"
                        onClick={() => {
                          if (window.confirm(`Excluir "${tool.name}"?`)) deleteGrowthTool(tool.id)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {editing && <Editor key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
