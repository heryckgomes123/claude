import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Sparkles } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useProgress } from '@/services/progress'
import { AIService, AINotConfiguredError, AI_SUGGESTIONS } from '@/services/ai/AIService'
import { buildStudentContext } from '@/services/ai/context'
import type { AIMessage } from '@/types/models'
import { cn, uid } from '@/lib/utils'

/** Markdown mínimo: **negrito**, quebras de linha e marcadores "•". */
function RichText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        const parts: ReactNode[] = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') && p.endsWith('**') ? (
            <strong key={j} className="font-semibold text-ink">
              {p.slice(2, -2)}
            </strong>
          ) : (
            p
          ),
        )
        return line.trim() === '' ? <div key={i} className="h-2" /> : <p key={i}>{parts}</p>
      })}
    </>
  )
}

export function AIChat({ initialPrompt }: { initialPrompt?: string }) {
  const messages = useAppStore((s) => s.aiMessages)
  const push = useAppStore((s) => s.pushAIMessage)
  const progress = useProgress()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const sentInitial = useRef(false)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, busy])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    setInput('')
    const userMsg: AIMessage = { id: uid('m'), role: 'user', content, createdAt: new Date().toISOString() }
    push(userMsg)
    setBusy(true)
    try {
      const history = [...useAppStore.getState().aiMessages]
      const reply = await AIService.reply(history, buildStudentContext(progress))
      push({ id: uid('m'), role: 'assistant', content: reply.content, createdAt: new Date().toISOString(), source: reply.source })
    } catch (e) {
      push({
        id: uid('m'),
        role: 'assistant',
        content:
          e instanceof AINotConfiguredError
            ? 'A LIFT AI ainda não está conectada a um provedor de IA no servidor. Assim que a integração for configurada, poderei responder por aqui.'
            : 'Não consegui responder agora. Verifique sua conexão e tente novamente.',
        createdAt: new Date().toISOString(),
        source: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (initialPrompt && !sentInitial.current) {
      sentInitial.current = true
      send(initialPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {messages.length === 0 && !busy && (
          <div className="pt-4">
            <div className="card-surface p-5">
              <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-lift/15 text-lift-2">
                <Sparkles size={20} />
              </div>
              <h2 className="font-display-wide text-lg font-bold">Como posso ajudar hoje?</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                Pergunte sobre seus treinos, sua consistência, exercícios ou como organizar a semana. Eu uso os dados registrados no app — e aviso quando não tiver dados suficientes.
              </p>
            </div>
            <p className="hud-label mt-6 mb-2.5">Sugestões</p>
            <div className="flex flex-col gap-2">
              {AI_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-2xl border border-line bg-surface px-4 py-3 text-left text-[13.5px] text-ink-2 transition-colors hover:border-lift/40 hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[86%] space-y-0.5 rounded-[20px] px-4 py-3 text-[14px] leading-relaxed',
                  m.role === 'user'
                    ? 'rounded-br-md bg-lift text-white'
                    : cn('rounded-bl-md border border-line bg-surface text-ink-2', m.source === 'error' && 'border-warn/30'),
                )}
              >
                <RichText text={m.content} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {busy && (
          <div className="flex justify-start" aria-live="polite" aria-label="LIFT AI está respondendo">
            <div className="flex gap-1.5 rounded-[20px] rounded-bl-md border border-line bg-surface px-4 py-4">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-1.5 rounded-full bg-lift-2"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="sticky bottom-0 border-t border-line bg-bg/90 px-4 pt-3 pb-[max(var(--safe-bottom),14px)] backdrop-blur-xl"
      >
        <div className="flex items-end gap-2 rounded-[22px] border border-line-strong bg-surface p-1.5 pl-4 focus-within:border-lift/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            maxLength={800}
            placeholder="Pergunte à LIFT AI…"
            aria-label="Mensagem para a LIFT AI"
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-[15px] outline-none placeholder:text-muted"
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="submit"
            disabled={!input.trim() || busy}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-lift text-white disabled:bg-surface-3 disabled:text-muted"
            aria-label="Enviar"
          >
            <ArrowUp size={19} strokeWidth={2.5} />
          </motion.button>
        </div>
      </form>
    </div>
  )
}
