import { useCallback } from 'react'
import { MASCOT_LINES } from '../config/mascot'
import { PORTFOLIO_BY_ID } from '../config/portfolio'
import type { DirectionId, InterestId, ServiceId } from '../config/quote'
import { track } from '../lib/analytics'
import { scrollToAnchor } from '../lib/scroll'
import { useProject } from './project'
import { useUI } from './ui'

/** Ações de alto nível: atualizam o projeto, o mascote, os avisos e o analytics de uma vez. */
export function useProjectActions() {
  const { state, dispatch } = useProject()
  const ui = useUI()
  const { say, notify } = ui

  const chooseInterest = useCallback(
    (interest: InterestId, anchor?: string) => {
      dispatch({ type: 'interest', interest })
      track('service_selected', { service: interest, source: 'hero' })
      say(MASCOT_LINES.interest[interest], 'exploring')
      if (anchor) window.setTimeout(() => scrollToAnchor(anchor), 450)
    },
    [dispatch, say],
  )

  const toggleReference = useCallback(
    (id: string) => {
      const adding = !state.references.includes(id)
      dispatch({ type: 'toggleReference', id, on: adding })
      if (adding) {
        track('reference_added', { reference: id, world: PORTFOLIO_BY_ID[id]?.world ?? 'unknown' })
        notify('Referência adicionada ao seu projeto.')
        say(MASCOT_LINES.referenceAdded, 'selected')
      } else {
        notify('Referência removida do seu projeto.')
        say(MASCOT_LINES.referenceRemoved, 'exploring')
      }
    },
    [dispatch, notify, say, state.references],
  )

  const toggleService = useCallback(
    (service: ServiceId, source: string, on?: boolean) => {
      const adding = on ?? !state.services.includes(service)
      dispatch({ type: 'toggleService', service, on: adding })
      if (adding) track('service_selected', { service, source })
    },
    [dispatch, state.services],
  )

  const chooseDirection = useCallback(
    (direction: DirectionId | null) => {
      dispatch({ type: 'direction', direction })
      if (direction) {
        notify('Direção visual salva no seu projeto.')
        say(MASCOT_LINES.directionSaved, 'selected')
      }
    },
    [dispatch, notify, say],
  )

  /** Abre o orçamento já com um serviço marcado (CTAs contextuais). */
  const startQuoteWith = useCallback(
    (service: ServiceId | null, source: string) => {
      if (service) {
        dispatch({ type: 'toggleService', service, on: true })
        track('service_selected', { service, source })
      }
      ui.openQuote({ source })
    },
    [dispatch, ui],
  )

  return { chooseInterest, toggleReference, toggleService, chooseDirection, startQuoteWith }
}
