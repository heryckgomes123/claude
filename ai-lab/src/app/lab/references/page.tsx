import type { Metadata } from 'next'
import { LibraryPage } from '@/features/library-page'

export const metadata: Metadata = { title: 'Referências' }

export default function ReferencesPage({ searchParams }: PageProps<'/lab/references'>) {
  return (
    <LibraryPage
      type="REFERENCE"
      searchParams={searchParams}
      eyebrow="Inspiração"
      title="Referências"
      description="Direções visuais para criar com intenção: paleta, luz, composição e notas de direção — ligadas aos prompts que as reproduzem."
      howTo={['Escolha uma direção visual', 'Leia as notas de luz e paleta', 'Use o prompt relacionado']}
      filters={['category', 'tag']}
      layout="masonry"
      searchPlaceholder="Buscar referências — ex.: neon, minimalista, gastronomia…"
    />
  )
}
