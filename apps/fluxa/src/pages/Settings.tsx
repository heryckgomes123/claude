import { useRef, useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { Badge, Button, ChannelIcon, IconButton, PageHeader, download, toast } from '../components/ui'
import { AI_MODELS, describeAiError, testConnection } from '../lib/ai'
import { uid } from '../lib/util'
import { exportData, isFluxaData, useStore } from '../store/store'

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const savedReplies = useStore((s) => s.savedReplies)
  const saveReply = useStore((s) => s.saveReply)
  const deleteReply = useStore((s) => s.deleteReply)
  const resetDemo = useStore((s) => s.resetDemo)
  const clearAll = useStore((s) => s.clearAll)
  const importData = useStore((s) => s.importData)
  const [key, setKey] = useState(settings.ai.apiKey)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const setHandle = (k: keyof typeof settings.handles, v: string) => updateSettings({ handles: { ...settings.handles, [k]: v } })

  const saveKey = async () => {
    const apiKey = key.trim()
    updateSettings({ ai: { ...settings.ai, apiKey } })
    if (!apiKey) {
      toast('IA desconectada. O Fluxa volta a usar o classificador local.')
      return
    }
    setTesting(true)
    try {
      await testConnection({ apiKey, model: settings.ai.model, businessName: settings.businessName })
      toast('Claude conectado!')
    } catch (error) {
      toast(await describeAiError(error), 'error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <PageHeader title="Configurações" subtitle="Marca, canais, IA, respostas salvas e dados." />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Negócio">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">Nome do negócio</span>
              <input className="field" value={settings.businessName} onChange={(e) => updateSettings({ businessName: e.target.value })} />
            </label>
            <label>
              <span className="label">Nome do time no inbox</span>
              <input className="field" value={settings.agentName} onChange={(e) => updateSettings({ agentName: e.target.value })} />
            </label>
            <label>
              <span className="label">Lead quente a partir de</span>
              <input className="field" type="number" min={1} value={settings.hotLeadScore} onChange={(e) => updateSettings({ hotLeadScore: Math.max(1, Number(e.target.value) || 1) })} />
            </label>
            <label>
              <span className="label">Tempo dos atrasos</span>
              <select className="field" value={settings.timeScale} onChange={(e) => updateSettings({ timeScale: e.target.value as 'demo' | 'real' })}>
                <option value="demo">Demonstração (1 unidade = 1 s)</option>
                <option value="real">Tempo real</option>
              </select>
            </label>
          </div>
        </Card>

        <Card title="Inteligência artificial" subtitle="Conecte sua chave da API do Claude para gatilhos por intenção, respostas com IA, sugestões e resumos no inbox.">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {settings.ai.apiKey ? (
                <Badge tone="success">
                  <Icon name="check" size={11} /> Conectado
                </Badge>
              ) : (
                <Badge>Usando IA local</Badge>
              )}
            </div>
            <label className="block">
              <span className="label">Chave da API (Anthropic)</span>
              <div className="flex gap-2">
                <input className="field font-mono" type={showKey ? 'text' : 'password'} placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} />
                <IconButton icon={showKey ? 'x' : 'search'} label={showKey ? 'Ocultar chave' : 'Mostrar chave'} onClick={() => setShowKey(!showKey)} />
              </div>
            </label>
            <label className="block">
              <span className="label">Modelo</span>
              <select className="field" value={settings.ai.model} onChange={(e) => updateSettings({ ai: { ...settings.ai, model: e.target.value } })}>
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button variant="primary" disabled={testing || key.trim() === settings.ai.apiKey} onClick={saveKey}>
                {testing ? 'Testando…' : 'Salvar e testar'}
              </Button>
              {settings.ai.apiKey && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setKey('')
                    updateSettings({ ai: { ...settings.ai, apiKey: '' } })
                    toast('Chave removida.')
                  }}
                >
                  Remover
                </Button>
              )}
            </div>
            <p className="text-[11.5px] text-faint">
              A chave fica salva só neste navegador e vai direto para a API da Anthropic. Não é incluída em exportações. Em produção, use um backend para guardar a chave.
            </p>
          </div>
        </Card>

        <Card title="Canais" subtitle="Contas usadas nos links e QR codes de Crescimento.">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['instagram', 'Instagram (@usuário)'],
                ['whatsapp', 'WhatsApp (DDI + DDD + número)'],
                ['messenger', 'Página do Facebook'],
                ['telegram', 'Bot do Telegram'],
              ] as const
            ).map(([k, label]) => (
              <label key={k}>
                <span className="label flex items-center gap-1.5">
                  <ChannelIcon channel={k} size={12} /> {label}
                </span>
                <input className="field" value={settings.handles[k]} onChange={(e) => setHandle(k, e.target.value)} />
              </label>
            ))}
          </div>
          <p className="mt-3 rounded-xl border border-subtle bg-canvas p-3 text-[12px] text-muted">
            Esta versão roda no navegador: os fluxos são testados no simulador e no inbox. Para responder clientes reais é preciso o servidor de integração com a API da Meta (Instagram, Messenger e WhatsApp Cloud API) e do Telegram — o motor de fluxos já está separado para rodar lá.
          </p>
        </Card>

        <Card title="Respostas salvas" subtitle="Atalhos para o time responder rápido no inbox. Aceitam variáveis como {{first_name}}.">
          <ul className="space-y-2">
            {savedReplies.map((r) => (
              <li key={r.id} className="grid gap-2 rounded-xl border border-subtle p-2.5 sm:grid-cols-[140px_1fr_auto]">
                <input className="field" value={r.title} aria-label="Título" onChange={(e) => saveReply({ ...r, title: e.target.value })} />
                <input className="field" value={r.text} aria-label="Texto" onChange={(e) => saveReply({ ...r, text: e.target.value })} />
                <IconButton icon="trash" label="Excluir resposta" onClick={() => deleteReply(r.id)} />
              </li>
            ))}
          </ul>
          <Button size="sm" icon="plus" className="mt-3" onClick={() => saveReply({ id: uid('sr'), title: 'Nova', text: '' })}>
            Adicionar resposta
          </Button>
        </Card>

        <Card title="Dados" subtitle="Tudo fica salvo neste navegador. Faça backup ou leve para outro computador.">
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const data: unknown = JSON.parse(await file.text())
                if (!isFluxaData(data)) throw new Error('formato')
                if (!window.confirm('Substituir todos os dados atuais pelo backup?')) return
                importData({ ...data, settings: { ...data.settings, ai: { ...data.settings.ai, apiKey: settings.ai.apiKey } } })
                toast('Backup restaurado.')
              } catch {
                toast('Arquivo inválido: use um backup exportado pelo Fluxa.', 'error')
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button icon="download" onClick={() => download(`fluxa-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportData(), null, 2))}>
              Exportar backup
            </Button>
            <Button icon="upload" onClick={() => fileInput.current?.click()}>
              Restaurar backup
            </Button>
            <Button
              icon="reset"
              onClick={() => {
                if (window.confirm('Recarregar os dados de demonstração? Suas alterações serão perdidas.')) {
                  resetDemo()
                  toast('Dados de demonstração restaurados.')
                }
              }}
            >
              Recarregar demonstração
            </Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                if (window.confirm('Apagar automações, contatos, transmissões e todo o histórico? Exporte um backup antes se quiser guardar.')) {
                  clearAll()
                  toast('Tudo limpo. Comece do zero!')
                }
              }}
            >
              Começar do zero
            </Button>
          </div>
        </Card>
      </div>
      <p className="mt-6 text-center text-[12px] text-faint">INTELRA Fluxa · um app do ecossistema INTELRA</p>
    </>
  )
}
