import { Wand2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LibraryPage } from '@/features/library-page'

export const metadata: Metadata = { title: 'Prompts' }

export default function PromptsPage({ searchParams }: PageProps<'/lab/prompts'>) {
  return (
    <LibraryPage
      type="PROMPT"
      searchParams={searchParams}
      eyebrow="Biblioteca"
      title="Prompts"
      description="Prompts testados, com variáveis para adaptar ao seu projeto, parâmetros recomendados e o resultado esperado."
      howTo={['Filtre pelo que quer criar', 'Abra e preencha as variáveis', 'Copie e cole na ferramenta indicada']}
      filters={['category', 'tool', 'difficulty', 'media', 'tag']}
      searchPlaceholder="Buscar prompts — ex.: fotografia de produto, retrato, vídeo…"
      headerActions={
        <Button asChild variant="outline">
          <Link href="/lab/prompt-builder">
            <Wand2 /> Criar no Prompt Builder
          </Link>
        </Button>
      }
    />
  )
}
