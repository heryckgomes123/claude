import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button, ChipInput, IconButton } from '../../components/ui'
import { newTrigger } from '../../data/templates'
import { CHANNEL_LABEL } from '../../lib/audience'
import { TRIGGER_META } from '../../lib/describe'
import type { Channel, KeywordMatch, Trigger, TriggerType } from '../../lib/types'
import { CHANNELS } from '../../lib/types'

const ORDER: TriggerType[] = ['keyword', 'ai_intent', 'comment', 'story_reply', 'ref_link', 'welcome', 'default']

export function TriggersPanel({ triggers, onChange }: { triggers: Trigger[]; onChange: (t: Trigger[]) => void }) {
  const [adding, setAdding] = useState(false)
  const set = (id: string, patch: Partial<Trigger>) => onChange(triggers.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  return (
    <div className="space-y-3">
      {triggers.map((t) => (
        <div key={t.id} className="space-y-3 rounded-2xl border border-ink-700 bg-ink-900 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-neon">
                <Icon name="bolt" size={14} /> {TRIGGER_META[t.type].label}
              </div>
              <p className="mt-0.5 text-[11.5px] text-mute-600">{TRIGGER_META[t.type].hint}</p>
            </div>
            <IconButton icon="trash" label="Remover gatilho" onClick={() => onChange(triggers.filter((x) => x.id !== t.id))} />
          </div>

          {(t.type === 'keyword' || t.type === 'comment' || t.type === 'story_reply') && (
            <div>
              <span className="label">{t.type === 'keyword' ? 'Palavras-chave' : 'Palavras-chave (vazio = qualquer)'}</span>
              <ChipInput values={t.keywords} onChange={(keywords) => set(t.id, { keywords })} placeholder="Digite e tecle Enter" />
              <select className="field mt-2" value={t.match} onChange={(e) => set(t.id, { match: e.target.value as KeywordMatch })} aria-label="Tipo de correspondência">
                <option value="contains">Mensagem contém a palavra</option>
                <option value="starts">Mensagem começa com a palavra</option>
                <option value="exact">Mensagem é exatamente a palavra</option>
              </select>
              <p className="mt-1.5 text-[11px] text-mute-600">Não diferencia maiúsculas, acentos nem pontuação.</p>
            </div>
          )}

          {t.type === 'comment' && (
            <>
              <div>
                <span className="label">Post específico (opcional)</span>
                <input className="field" placeholder="ID do post — vazio vale para todos" value={t.postId ?? ''} onChange={(e) => set(t.id, { postId: e.target.value })} />
              </div>
              <div>
                <span className="label">Resposta pública no comentário</span>
                <input className="field" placeholder="Ex.: Te mandei no Direct! 📩" value={t.publicReply ?? ''} onChange={(e) => set(t.id, { publicReply: e.target.value })} />
              </div>
            </>
          )}

          {t.type === 'ai_intent' && (
            <div>
              <span className="label">Descreva a intenção</span>
              <textarea className="field" rows={3} placeholder="Ex.: pessoa quer saber preço, contratar ou pedir orçamento" value={t.intent ?? ''} onChange={(e) => set(t.id, { intent: e.target.value })} />
              <p className="mt-1.5 text-[11px] text-mute-600">Roda quando nenhuma palavra-chave correspondeu. Com o Claude conectado a IA entende sinônimos e contexto; sem ele, usa similaridade de palavras.</p>
            </div>
          )}

          {t.type === 'ref_link' && (
            <div>
              <span className="label">Identificador (ref)</span>
              <input className="field font-mono" value={t.ref ?? ''} onChange={(e) => set(t.id, { ref: e.target.value.trim() })} />
              <p className="mt-1.5 text-[11px] text-mute-600">Crie o link e o QR code em Crescimento.</p>
            </div>
          )}

          <div>
            <span className="label">Canais</span>
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map((c: Channel) => {
                const on = t.channels.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set(t.id, { channels: on ? t.channels.filter((x) => x !== c) : [...t.channels, c] })}
                    className={`rounded-full border px-2.5 py-1 text-[11.5px] transition ${on ? 'border-brand-500/60 bg-brand/10 text-brand-200' : 'border-ink-700 text-mute hover:border-ink-600'}`}
                  >
                    {CHANNEL_LABEL[c]}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-mute-600">{t.channels.length ? '' : 'Nenhum selecionado = todos os canais.'}</p>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="grid gap-1.5 rounded-2xl border border-dashed border-ink-600 p-2">
          {ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onChange([...triggers, newTrigger(type)])
                setAdding(false)
              }}
              className="rounded-xl px-3 py-2 text-left transition hover:bg-ink-850"
            >
              <span className="block text-[13px] font-medium">{TRIGGER_META[type].label}</span>
              <span className="block text-[11.5px] text-mute-600">{TRIGGER_META[type].hint}</span>
            </button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button icon="plus" className="w-full" onClick={() => setAdding(true)}>
          Adicionar gatilho
        </Button>
      )}
    </div>
  )
}
