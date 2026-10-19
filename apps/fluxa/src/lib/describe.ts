import type { Trigger, TriggerType } from './types'
import { CHANNEL_LABEL } from './audience'

export const TRIGGER_META: Record<TriggerType, { label: string; hint: string }> = {
  keyword: { label: 'Palavra-chave', hint: 'Mensagem contém, começa com ou é igual a uma palavra.' },
  comment: { label: 'Comentário em post', hint: 'Quem comenta a palavra recebe a mensagem no Direct.' },
  story_reply: { label: 'Resposta a story', hint: 'Quando alguém responde aos seus stories.' },
  ref_link: { label: 'Link / QR code', hint: 'Entrada por link de bio, anúncio, site ou QR code.' },
  ai_intent: { label: 'Intenção (IA)', hint: 'Entende o que a pessoa quer, sem depender da palavra exata.' },
  welcome: { label: 'Boas-vindas', hint: 'Primeira mensagem de um contato novo.' },
  default: { label: 'Resposta padrão', hint: 'Quando nenhuma outra automação responde.' },
}

export function describeTrigger(t: Trigger): string {
  const channels = t.channels.length ? ` · ${t.channels.map((c) => CHANNEL_LABEL[c]).join(', ')}` : ''
  const words = t.keywords.filter(Boolean)
  switch (t.type) {
    case 'keyword':
      return `${t.match === 'exact' ? 'É igual a' : t.match === 'starts' ? 'Começa com' : 'Contém'} ${words.map((w) => `“${w}”`).join(', ') || '—'}${channels}`
    case 'comment':
      return `Comentário ${words.length ? `com ${words.map((w) => `“${w}”`).join(', ')}` : 'qualquer'}${channels}`
    case 'story_reply':
      return `Resposta a story${words.length ? ` com ${words.map((w) => `“${w}”`).join(', ')}` : ''}${channels}`
    case 'ref_link':
      return `Link ?ref=${t.ref || '—'}${channels}`
    case 'ai_intent':
      return `Intenção: ${t.intent || '—'}${channels}`
    case 'welcome':
      return `Primeira mensagem${channels}`
    case 'default':
      return `Nenhuma outra resposta${channels}`
  }
}
