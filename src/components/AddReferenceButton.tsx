import { useProjectActions } from '../state/actions'
import { useProject } from '../state/project'
import { Check, Plus } from './Icons'

interface Props {
  id: string
  title: string
  tone?: 'dark' | 'light'
  className?: string
  /** Rótulo curto para espaços estreitos. */
  compact?: boolean
}

/** Liga/desliga uma peça no “Meu projeto”. */
export function AddReferenceButton({ id, title, tone = 'dark', className = '', compact = false }: Props) {
  const { state } = useProject()
  const { toggleReference } = useProjectActions()
  const added = state.references.includes(id)

  const base = 'inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 text-[0.82rem] font-semibold transition-colors duration-200'
  const style = added
    ? tone === 'dark'
      ? 'bg-ion-400 text-ink-950 hover:bg-ion-300'
      : 'bg-paper-ink text-bone hover:bg-[#262236]'
    : tone === 'dark'
      ? 'border border-white/20 bg-ink-950/50 text-bone backdrop-blur-md hover:border-volt-300 hover:bg-volt-600/30'
      : 'border border-paper-ink/20 bg-white/70 text-paper-ink backdrop-blur-md hover:border-paper-ink/50 hover:bg-white'

  return (
    <button
      type="button"
      aria-pressed={added}
      aria-label={`Adicionar “${title}” ao meu projeto`}
      onClick={() => toggleReference(id)}
      className={`${base} ${style} ${className}`}
    >
      {added ? <Check size={16} strokeWidth={2.4} /> : <Plus size={16} strokeWidth={2.2} />}
      {compact ? (added ? 'Adicionado' : 'Adicionar') : added ? 'No meu projeto' : 'Adicionar ao projeto'}
    </button>
  )
}
