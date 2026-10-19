/** Segmentação de contatos, temperatura do lead e links de crescimento. */
import type { Channel, Contact, GrowthTool, Segment, Settings } from './types'
import { insideWindow, normalize } from './util'

export function matchesSegment(contact: Contact, segment: Segment): boolean {
  if (contact.isTest || !contact.subscribed) return false
  if (segment.channels.length && !segment.channels.includes(contact.channel)) return false
  const tags = contact.tags.map(normalize)
  if (segment.includeTags.some((t) => !tags.includes(normalize(t)))) return false
  if (segment.excludeTags.some((t) => tags.includes(normalize(t)))) return false
  return contact.score >= segment.minScore
}

export interface Reach {
  eligible: Contact[]
  outsideWindow: Contact[]
}

/** Quem recebe uma transmissão agora: fora da janela de 24 h da Meta o envio livre não é permitido. */
export function broadcastReach(contacts: Contact[], segment: Segment, now = Date.now()): Reach {
  const matched = contacts.filter((c) => matchesSegment(c, segment))
  return {
    eligible: matched.filter((c) => insideWindow(c, now)),
    outsideWindow: matched.filter((c) => !insideWindow(c, now)),
  }
}

export type Temperature = 'frio' | 'morno' | 'quente'

export function temperature(score: number, hot: number): Temperature {
  if (score >= hot) return 'quente'
  if (score >= hot / 2) return 'morno'
  return 'frio'
}

export function allTags(contacts: Contact[]): string[] {
  const set = new Map<string, string>()
  for (const c of contacts) for (const t of c.tags) if (!set.has(normalize(t))) set.set(normalize(t), t)
  return [...set.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function allFields(contacts: Contact[]): string[] {
  const set = new Set<string>()
  for (const c of contacts) for (const k of Object.keys(c.fields)) set.add(k)
  return [...set].sort()
}

/** Link de entrada de uma ferramenta de crescimento, por canal. */
export function growthLink(tool: Pick<GrowthTool, 'channel' | 'ref'>, settings: Settings): string {
  const ref = encodeURIComponent(tool.ref)
  switch (tool.channel) {
    case 'whatsapp':
      // O WhatsApp não aceita parâmetro de origem: o ref vai como mensagem pré-preenchida.
      return `https://wa.me/${settings.handles.whatsapp.replace(/\D/g, '')}?text=${ref}`
    case 'instagram':
      return `https://ig.me/m/${encodeURIComponent(settings.handles.instagram.replace(/^@/, ''))}?ref=${ref}`
    case 'messenger':
      return `https://m.me/${encodeURIComponent(settings.handles.messenger)}?ref=${ref}`
    case 'telegram':
      return `https://t.me/${encodeURIComponent(settings.handles.telegram.replace(/^@/, ''))}?start=${ref}`
  }
}

export function buttonSnippet(tool: GrowthTool, settings: Settings): string {
  const href = growthLink(tool, settings)
  const label = tool.channel === 'whatsapp' ? 'Fale conosco no WhatsApp' : tool.channel === 'instagram' ? 'Fale conosco no Instagram' : 'Fale conosco'
  return `<a href="${href}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;background:#e2ae3a;color:#070707;font:600 15px/1 system-ui,sans-serif;text-decoration:none">${label}</a>`
}

export function toCsv(contacts: Contact[]): string {
  const fieldNames = allFields(contacts)
  const header = ['nome', 'sobrenome', 'canal', 'usuario', 'tags', 'pontuacao', 'inscrito', 'criado_em', ...fieldNames]
  const escape = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const rows = contacts.map((c) =>
    [c.firstName, c.lastName, c.channel, c.handle, c.tags.join('|'), String(c.score), c.subscribed ? 'sim' : 'nao', new Date(c.createdAt).toISOString(), ...fieldNames.map((f) => c.fields[f] ?? '')]
      .map(escape)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  messenger: 'Messenger',
  telegram: 'Telegram',
  web: 'Site',
}
