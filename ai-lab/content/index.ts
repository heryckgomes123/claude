import type { ContentBundleInput } from '../src/lib/content-bundle'
import { prompts } from './prompts'
import { references } from './references'
import { categories } from './taxonomy'
import { tools } from './tools'
import { tutorials } from './tutorials'
import { workflows } from './workflows'

/** Conteúdo inicial do INTELRA AI LAB. Para adicionar itens, edite os arquivos desta pasta. */
export const seedBundle: ContentBundleInput = { categories, tools, prompts, workflows, references, tutorials }

export const seedUpdates = [
  {
    title: 'O INTELRA AI LAB está no ar',
    body: 'Prompts, workflows, ferramentas, referências e tutoriais conectados num só lugar. Comece pelo Explorar ou pelo tutorial “Anatomia de um prompt de imagem”.',
    kind: 'ANNOUNCEMENT' as const,
  },
  {
    title: 'Novo workflow: Foto de produto → vídeo comercial',
    body: 'O caminho completo da foto de celular ao vídeo de 15s, com ferramenta e prompt em cada etapa.',
    kind: 'NEW_CONTENT' as const,
    contentSlug: 'foto-de-produto-para-video-comercial',
  },
]
