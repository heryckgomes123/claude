import type { Metadata } from 'next'
import { LibraryPage } from '@/features/library-page'

export const metadata: Metadata = { title: 'Ferramentas' }

export default function ToolsPage({ searchParams }: PageProps<'/lab/tools'>) {
  return (
    <LibraryPage
      type="TOOL"
      searchParams={searchParams}
      eyebrow="Diretório"
      title="Ferramentas de IA"
      description="Qual IA usar para cada tarefa, com pontos fortes, limites e os prompts e workflows que usam cada uma. Preços e recursos mudam — sempre mostramos quando a informação foi verificada."
      howTo={['Filtre por tipo de mídia', 'Compare pontos fortes e limites', 'Abra os prompts que usam a ferramenta']}
      filters={['category', 'media', 'pricing']}
      mediaOptions={['IMAGE', 'VIDEO', 'AUDIO', 'TEXT']}
      searchPlaceholder="Buscar ferramentas — ex.: vídeo, upscale, voz…"
    />
  )
}
