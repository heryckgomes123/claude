import { PORTFOLIO_BY_ID } from '../../config/portfolio'
import { BUDGET_GUIDANCE_ID, BUDGET_RANGES, BUDGET_SKIP_ID, DIRECTION_LABELS, SERVICE_BY_ID, visibleQuestions } from '../../config/quote'
import type { Question } from '../../config/quote'
import type { ProjectState } from '../../state/project'

export function answerLabel(q: Question, value: string | string[] | undefined): string {
  if (value === undefined) return ''
  if (Array.isArray(value)) return value.map((v) => q.options?.find((o) => o.id === v)?.label ?? v).join(', ')
  if (q.options) return q.options.find((o) => o.id === value)?.label ?? value
  return value
}

export function budgetLabel(budget: string): string {
  if (budget === BUDGET_GUIDANCE_ID) return 'Quero orientação'
  if (budget === BUDGET_SKIP_ID) return 'Prefiro não informar'
  return BUDGET_RANGES.find((r) => r.id === budget)?.label ?? ''
}

/** Linhas legíveis do projeto (para WhatsApp e “copiar resumo”). Sem dados de contato. */
export function projectLines(state: ProjectState): string[] {
  const lines: string[] = []
  if (state.services.length) lines.push(`Serviços: ${state.services.map((s) => SERVICE_BY_ID[s].label).join(', ')}`)
  const refs = state.references.map((id) => PORTFOLIO_BY_ID[id]?.title).filter(Boolean)
  if (refs.length) lines.push(`Referências: ${refs.join('; ')}`)
  if (state.direction) lines.push(`Direção visual: ${DIRECTION_LABELS[state.direction]}`)
  for (const q of visibleQuestions(state.services)) {
    const label = answerLabel(q, state.answers[q.id])
    if (label) lines.push(`${shortLabel(q)}: ${label}`)
  }
  const budget = budgetLabel(state.contact.budget)
  if (budget) lines.push(`Investimento: ${budget}`)
  if (state.contact.budgetNote) lines.push(`Sobre o investimento: ${state.contact.budgetNote}`)
  return lines
}

function shortLabel(q: Question): string {
  const map: Record<string, string> = {
    goal: 'Objetivo',
    images_quantity: 'Quantidade de imagens',
    images_channel: 'Canais',
    video_length: 'Duração do vídeo',
    video_format: 'Formato do vídeo',
    site_type: 'Tipo de página',
    site_current: 'Já tem site',
    custom_description: 'Ideia',
    deadline: 'Prazo',
    materials: 'Materiais disponíveis',
    links: 'Links',
  }
  return map[q.id] ?? q.label
}

export function whatsappMessage(state: ProjectState): string {
  const intro = state.submission
    ? `Olá, INTELRA! Acabei de enviar meu projeto pelo site (protocolo ${state.submission.id.slice(0, 8)}).`
    : 'Olá, INTELRA! Montei meu projeto no site e quero conversar.'
  const lines = projectLines(state)
  const name = state.contact.name.trim()
  return [intro, name ? `Sou ${name}${state.contact.company ? `, da ${state.contact.company.trim()}` : ''}.` : '', '', ...lines]
    .filter((l, i) => l !== '' || i === 2)
    .join('\n')
}
