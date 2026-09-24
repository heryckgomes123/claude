import { useSearchParams } from 'react-router-dom'
import { RotateCcw, Sparkles } from 'lucide-react'
import { Header } from '@/components/ui/Header'
import { AIChat } from '@/components/domain/AIChat'
import { AIService } from '@/services/ai/AIService'
import { useAppStore } from '@/store/useAppStore'

export default function AIPage() {
  const [params] = useSearchParams()
  const clear = useAppStore((s) => s.clearAIMessages)
  const hasMessages = useAppStore((s) => s.aiMessages.length > 0)
  const real = AIService.isRealAI

  return (
    <div className="flex h-dvh flex-col">
      <Header
        title="LIFT AI"
        back
        large={false}
        action={
          hasMessages ? (
            <button onClick={clear} className="grid size-10 place-items-center rounded-full text-muted hover:text-ink" aria-label="Nova conversa">
              <RotateCcw size={18} />
            </button>
          ) : undefined
        }
      />
      <div className="px-4 pb-3">
        <div className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 text-[12px] leading-relaxed ${real ? 'border-lift/25 bg-lift/8 text-ink-2' : 'border-warn/25 bg-warn/6 text-ink-2'}`}>
          <Sparkles size={14} className={`mt-0.5 shrink-0 ${real ? 'text-lift-2' : 'text-warn'}`} />
          <p>
            {real
              ? 'Assistente de treino da LIFT. Não substitui orientação médica, fisioterapêutica ou nutricional.'
              : 'Modo demonstração: respostas geradas por regras locais a partir dos seus dados — ainda sem IA conectada. Não substitui profissionais de saúde.'}
          </p>
        </div>
      </div>
      <AIChat initialPrompt={params.get('q') ?? undefined} />
    </div>
  )
}
