/**
 * Falas do mascote. São determinísticas: dependem da seção visível e das ações do visitante.
 * O robô não é um chatbot — não há IA conversacional conectada.
 */
import type { InterestId } from './quote'

export type MascotState = 'welcome' | 'exploring' | 'selected' | 'briefing' | 'confirmed'

export type SceneId =
  | 'inicio'
  | 'criacoes'
  | 'imagens'
  | 'videos'
  | 'experiencias'
  | 'direcao'
  | 'solucoes'
  | 'como-funciona'
  | 'fechamento'

export const MASCOT_LINES = {
  welcome: 'Me conta: o que vamos criar para sua marca?',
  interest: {
    images: 'Uma foto. Várias possibilidades.',
    video: 'Toda ideia fica melhor em movimento.',
    site: 'Vamos transformar visita em conversa?',
    custom: 'Ideia sem nome? A gente ajuda a dar forma.',
    discover: 'Vem comigo: são três mundos para explorar.',
  } satisfies Record<InterestId, string>,
  scenes: {
    inicio: 'Me conta: o que vamos criar para sua marca?',
    criacoes: 'Vem comigo: são três mundos para explorar.',
    imagens: 'Uma foto. Várias possibilidades.',
    videos: 'Aperta o play. Eu espero aqui.',
    experiencias: 'Sites que parecem lugares, não formulários.',
    direcao: 'Escolha um universo. Eu guardo para você.',
    solucoes: 'Pode misturar: imagem, vídeo e site no mesmo projeto.',
    'como-funciona': 'Sem mistério: nada é produzido antes da sua aprovação.',
    fechamento: 'E aí, o que vamos criar?',
  } satisfies Record<SceneId, string>,
  /** Mostrada ao explorar quando ainda não há referências. */
  nudge: 'Gostou desse estilo? Leva para o seu projeto.',
  referenceAdded: 'Anotado! Referência guardada no seu projeto.',
  referenceRemoved: 'Tirei essa do projeto.',
  directionSaved: 'Direção guardada. Já dá para imaginar, né?',
  hasDirection: 'Já temos uma direção. Vamos organizar sua ideia?',
  briefing: {
    1: 'Já temos uma direção. Vamos organizar sua ideia?',
    2: 'Pode responder “ainda não sei”. Tá tudo bem.',
    3: 'Só o essencial para a equipe te responder.',
    4: 'Seu briefing está pronto para revisar.',
  } as Record<1 | 2 | 3 | 4, string>,
  sending: 'Enviando… segura aí.',
  confirmed: 'Recebido! Agora a equipe INTELRA assume daqui.',
  failed: 'Ops, não consegui enviar. Seu briefing continua salvo.',
}
