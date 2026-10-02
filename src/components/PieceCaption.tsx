import { KIND_LABEL } from '../config/portfolio'
import type { PortfolioItem } from '../config/portfolio'
import { AddReferenceButton } from './AddReferenceButton'

/** Legenda padrão de uma peça: tipo (honesto), título, crédito e botão de adicionar ao projeto. */
export function PieceCaption({ item, tone = 'dark', compact = false }: { item: PortfolioItem; tone?: 'dark' | 'light'; compact?: boolean }) {
  const light = tone === 'light'
  return (
    <figcaption className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pt-3">
      <div className="min-w-0">
        <p className={`eyebrow ${light ? 'text-volt-700' : 'text-ion-300'}`}>{KIND_LABEL[item.kind]}</p>
        <p className={`mt-1.5 font-display text-[1.05rem] font-semibold leading-tight ${light ? 'text-paper-ink' : 'text-bone'}`}>{item.title}</p>
        <p className={`mt-0.5 text-[0.85rem] ${light ? 'text-paper-mute' : 'text-mute'}`}>{item.credit}</p>
      </div>
      <AddReferenceButton id={item.id} title={item.title} tone={tone} compact={compact} />
    </figcaption>
  )
}
