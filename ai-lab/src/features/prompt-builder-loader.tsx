'use client'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/misc'

/** O Builder usa rascunho em localStorage; renderizá-lo só no cliente evita divergência de hidratação. */
export const PromptBuilderLoader = dynamic(() => import('./prompt-builder').then((m) => m.PromptBuilder), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Carregando o Prompt Builder">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  ),
})
