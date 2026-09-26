import type { Metadata } from 'next'
import { LibraryPage } from '@/features/library-page'

export const metadata: Metadata = { title: 'Tutoriais' }

export default function TutorialsPage({ searchParams }: PageProps<'/lab/tutorials'>) {
  return (
    <LibraryPage
      type="TUTORIAL"
      searchParams={searchParams}
      eyebrow="Aprender"
      title="Tutoriais"
      description="Técnicas explicadas passo a passo, com os erros mais comuns e dicas de quem produz com IA todos os dias."
      howTo={['Comece pelo seu nível', 'Siga os passos com o prompt aberto', 'Pratique com um experimento']}
      filters={['difficulty', 'category', 'tool']}
      searchPlaceholder="Buscar tutoriais — ex.: iluminação, câmera, upscale…"
    />
  )
}
