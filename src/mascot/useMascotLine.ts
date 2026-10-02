import { MASCOT_LINES } from '../config/mascot'
import type { MascotState, SceneId } from '../config/mascot'
import { useProject } from '../state/project'
import { useUI } from '../state/ui'

export interface MascotLine {
  state: MascotState
  text: string
  /** Ação sugerida junto da fala (ex.: abrir o orçamento). */
  action?: 'quote'
}

const EXPLORE_SCENES: SceneId[] = ['criacoes', 'imagens', 'videos', 'experiencias', 'direcao']

/** Resolve a fala atual do mascote a partir da seção visível e das ações reais do visitante. */
export function useMascotLine(): MascotLine {
  const { state } = useProject()
  const ui = useUI()

  if (ui.submit.status === 'sending') return { state: 'briefing', text: MASCOT_LINES.sending }
  if (ui.quoteOpen) {
    if (ui.submit.status === 'success') return { state: 'confirmed', text: MASCOT_LINES.confirmed }
    if (ui.submit.status === 'error') return { state: 'briefing', text: MASCOT_LINES.failed }
    return { state: 'briefing', text: MASCOT_LINES.briefing[ui.quoteStep] }
  }
  if (ui.event) return { state: ui.event.state, text: ui.event.text }
  if (state.submission) return { state: 'confirmed', text: MASCOT_LINES.confirmed }

  const picks = state.references.length + (state.direction ? 1 : 0)
  const scene = ui.scene

  if (scene === 'inicio') {
    return { state: 'welcome', text: state.interest ? MASCOT_LINES.interest[state.interest] : MASCOT_LINES.welcome }
  }
  if (picks > 0 && !EXPLORE_SCENES.includes(scene)) {
    return { state: 'exploring', text: MASCOT_LINES.hasDirection, action: 'quote' }
  }
  if (picks === 0 && scene === 'experiencias') {
    return { state: 'exploring', text: MASCOT_LINES.nudge }
  }
  return { state: 'exploring', text: MASCOT_LINES.scenes[scene] }
}
