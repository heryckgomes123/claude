import type { Metadata } from 'next'
import { LibraryPage } from '@/features/library-page'

export const metadata: Metadata = { title: 'Workflows' }

export default function WorkflowsPage({ searchParams }: PageProps<'/lab/workflows'>) {
  return (
    <LibraryPage
      type="WORKFLOW"
      searchParams={searchParams}
      eyebrow="Processos"
      title="Workflows"
      description="Um prompt resolve uma etapa. Um workflow leva você da ideia ao resultado final — com a ferramenta e o prompt de cada passo."
      howTo={['Escolha o resultado que você quer', 'Veja as ferramentas necessárias', 'Siga as etapas na ordem']}
      filters={['category', 'difficulty', 'tool', 'time']}
      searchPlaceholder="Buscar workflows — ex.: vídeo de produto, anúncio, restauração…"
    />
  )
}
