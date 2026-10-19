import { useEffect, useRef } from 'react'
import type { ChatMessage, FlowButton } from '../lib/types'
import { clockTime } from '../lib/util'
import { Icon } from './Icon'

interface Props {
  messages: ChatMessage[]
  /** 'business': visão do time (contato à esquerda). 'contact': visão do cliente, no simulador. */
  perspective: 'business' | 'contact'
  onButton?: (message: ChatMessage, button: FlowButton) => void
  onQuickReply?: (message: ChatMessage, reply: { id: string; label: string }) => void
  typing?: boolean
  emptyText?: string
}

export function ChatThread({ messages, perspective, onButton, onQuickReply, typing = false, emptyText = 'Nenhuma mensagem ainda.' }: Props) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages.length, typing])

  const last = messages[messages.length - 1]

  return (
    <div className="flex flex-col gap-2 px-3 py-4">
      {messages.length === 0 && !typing && <p className="py-10 text-center text-[13px] text-mute-600">{emptyText}</p>}
      {messages.map((m) => {
        if (m.from === 'system') {
          return (
            <div key={m.id} className="my-1 flex justify-center">
              <span className="max-w-[90%] rounded-full border border-ink-700 bg-ink-850 px-3 py-1 text-center text-[11px] text-mute">{m.text}</span>
            </div>
          )
        }
        const fromBusiness = m.from !== 'contact'
        const mine = perspective === 'business' ? fromBusiness : !fromBusiness
        return (
          <div key={m.id} className={`pop-in flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] overflow-hidden rounded-2xl ${mine ? 'rounded-br-md' : 'rounded-bl-md'} ${bubbleTone(m, perspective)}`}>
              {m.imageUrl && <img src={m.imageUrl} alt="" className="max-h-48 w-full object-cover" loading="lazy" />}
              {m.text && <p className="whitespace-pre-wrap break-words px-3.5 py-2 text-[13.5px] leading-relaxed">{m.text}</p>}
              {m.buttons && m.buttons.length > 0 && (
                <div className="flex flex-col border-t border-white/10">
                  {m.buttons.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      disabled={!onButton}
                      onClick={() => onButton?.(m, b)}
                      className="flex items-center justify-center gap-1.5 border-b border-white/10 px-3 py-2 text-[13px] font-medium text-info last:border-b-0 enabled:hover:bg-white/5 disabled:cursor-default"
                    >
                      {b.label || 'Botão'}
                      {b.action === 'url' && <Icon name="external" size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="mt-1 flex items-center gap-1 px-1 text-[10px] text-mute-600">
              {m.from === 'bot' && <Icon name="bot" size={11} />}
              {m.from === 'agent' && <Icon name="user" size={11} />}
              {m.from === 'bot' ? 'Automação · ' : m.from === 'agent' ? 'Time · ' : ''}
              {clockTime(m.ts)}
            </span>
          </div>
        )
      })}
      {typing && (
        <div className="flex items-center gap-1 self-start rounded-2xl rounded-bl-md bg-ink-800 px-4 py-3" aria-label="Digitando">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 animate-bounce rounded-full bg-mute" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}
      {last?.quickReplies && last.from === 'bot' && (
        <div className={`flex flex-wrap gap-1.5 ${perspective === 'contact' ? 'justify-end' : 'justify-end'}`}>
          {last.quickReplies.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={!onQuickReply}
              onClick={() => onQuickReply?.(last, q)}
              className="rounded-full border border-brand-500/60 px-3 py-1 text-[12.5px] text-brand-200 transition enabled:hover:bg-brand/10 disabled:opacity-60"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}
      <div ref={end} />
    </div>
  )
}

function bubbleTone(m: ChatMessage, perspective: Props['perspective']): string {
  if (m.from === 'contact') return perspective === 'contact' ? 'bg-gradient-to-br from-brand-300 to-brand-500 text-ink-950' : 'bg-ink-800 text-bone'
  if (m.from === 'agent') return 'bg-info/15 text-bone border border-info/25'
  return perspective === 'contact' ? 'bg-ink-800 text-bone' : 'bg-brand/12 text-bone border border-brand-600/30'
}
