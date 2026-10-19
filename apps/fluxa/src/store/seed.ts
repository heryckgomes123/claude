/**
 * Dados de demonstração. Gerados de forma determinística para que o painel
 * pareça vivo no primeiro acesso. Tudo pode ser apagado em Configurações.
 */
import { TEMPLATES } from '../data/templates'
import type { Activity, Automation, Broadcast, Channel, ChatMessage, Contact, GrowthTool, SavedReply, Sequence, Settings } from '../lib/types'
import { uid } from '../lib/util'

const DAY = 86_400_000

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'INTELRA',
  agentName: 'Time INTELRA',
  handles: { instagram: 'intelra', whatsapp: '5500000000000', messenger: 'intelra', telegram: 'intelra_bot' },
  ai: { apiKey: '', model: 'claude-opus-5-5' },
  timeScale: 'demo',
  hotLeadScore: 50,
}

export interface SeedData {
  automations: Automation[]
  contacts: Contact[]
  broadcasts: Broadcast[]
  sequences: Sequence[]
  growthTools: GrowthTool[]
  savedReplies: SavedReply[]
  activity: Activity[]
}

const PEOPLE: [string, string, Channel][] = [
  ['Mariana', 'Alves', 'instagram'],
  ['Rafael', 'Costa', 'whatsapp'],
  ['Juliana', 'Ferreira', 'instagram'],
  ['Bruno', 'Lima', 'whatsapp'],
  ['Camila', 'Rocha', 'messenger'],
  ['Thiago', 'Martins', 'instagram'],
  ['Larissa', 'Gomes', 'whatsapp'],
  ['Felipe', 'Barbosa', 'telegram'],
  ['Beatriz', 'Ribeiro', 'instagram'],
  ['Lucas', 'Carvalho', 'whatsapp'],
  ['Amanda', 'Araújo', 'web'],
  ['Gustavo', 'Pereira', 'instagram'],
  ['Letícia', 'Mendes', 'whatsapp'],
  ['Pedro', 'Nascimento', 'messenger'],
  ['Isabela', 'Cardoso', 'instagram'],
  ['Diego', 'Teixeira', 'whatsapp'],
  ['Fernanda', 'Moreira', 'instagram'],
  ['Rodrigo', 'Correia', 'telegram'],
  ['Natália', 'Pinto', 'whatsapp'],
  ['Vinícius', 'Duarte', 'instagram'],
  ['Carolina', 'Freitas', 'web'],
  ['Matheus', 'Vieira', 'whatsapp'],
]

interface Script {
  /** Comentários e respostas a story só existem no Instagram. */
  instagramOnly?: boolean
  tags: string[]
  fields: Record<string, string>
  score: number
  lines: [ChatMessage['from'], string][]
  paused?: boolean
}

const SCRIPTS: Script[] = [
  {
    tags: ['lead', 'interesse-servicos'],
    fields: { servico: 'Marketing', email: 'contato@exemplo.com' },
    score: 45,
    lines: [
      ['contact', 'Oi! Quanto custa a gestão de Instagram?'],
      ['bot', 'Bora montar seu orçamento! Leva menos de 1 minuto. ⚡'],
      ['bot', 'O que você precisa?'],
      ['contact', 'Marketing'],
      ['bot', 'Prontinho! Um especialista em Marketing vai te chamar em até 1 dia útil. 🚀'],
    ],
  },
  {
    tags: ['quente', 'lead'],
    fields: { intencao: 'Pronto para contratar ou comprar', servico: 'Site ou sistema' },
    score: 85,
    paused: true,
    lines: [
      ['contact', 'Preciso de um site para minha clínica ainda este mês, vocês fazem?'],
      ['bot', 'Que demais! 🔥 Já chamei um especialista para falar com você agora mesmo.'],
      ['agent', 'Oi! Aqui é do time INTELRA. Fazemos sim — me conta quantas páginas você imagina?'],
      ['contact', 'Umas 5 páginas e agendamento online'],
    ],
  },
  {
    instagramOnly: true,
    tags: ['lead-comentario'],
    fields: {},
    score: 15,
    lines: [
      ['system', 'Comentário no post: “quero”'],
      ['bot', 'Oi! 👋 Vi seu comentário. Quer que eu te mande o material agora?'],
      ['contact', 'Quero!'],
      ['bot', 'Aqui está! É só tocar no botão abaixo. Qualquer dúvida, me chama por aqui. 💛'],
    ],
  },
  {
    tags: ['suporte', 'cliente'],
    fields: { intencao: 'Já é cliente e precisa de suporte' },
    score: 20,
    paused: true,
    lines: [
      ['contact', 'Meu formulário do site parou de enviar e-mails'],
      ['bot', 'Entendi! Vou te passar para o nosso suporte. Pode descrever o que está acontecendo?'],
      ['contact', 'Desde ontem ninguém recebe os contatos'],
    ],
  },
  {
    instagramOnly: true,
    tags: ['newsletter'],
    fields: {},
    score: 10,
    lines: [
      ['system', 'Respondeu ao story'],
      ['contact', 'Amei essa dica 😍'],
      ['bot', 'Ahh, que bom que você curtiu o story! 😍 Quer receber conteúdos assim toda semana?'],
      ['contact', 'Quero'],
    ],
  },
  {
    tags: ['pesquisando'],
    fields: { intencao: 'Pesquisando, comparando opções ou tirando dúvidas' },
    score: 25,
    lines: [
      ['contact', 'Vocês trabalham com automação de WhatsApp?'],
      ['bot', 'Trabalhamos sim! Posso te enviar um diagnóstico gratuito de 15 minutos para entender seu caso. Topa?'],
    ],
  },
  {
    tags: [],
    fields: {},
    score: 2,
    lines: [
      ['contact', 'Boa tarde'],
      ['bot', 'Olá! Bem-vindo(a) à INTELRA. 🖤💛\nComo posso te ajudar hoje?'],
    ],
  },
  {
    tags: ['cliente', 'diagnostico'],
    fields: { email: 'financeiro@empresa.com.br' },
    score: 60,
    lines: [
      ['system', 'Entrou pelo link: diagnostico'],
      ['bot', 'Diagnóstico de marketing GRATUITO esta semana. Quer garantir o seu?'],
      ['contact', 'Quero o diagnóstico'],
      ['bot', 'Fechado! Um especialista vai te chamar para agendar. 📅'],
    ],
  },
]

function makeContacts(now: number, rand: () => number): Contact[] {
  return PEOPLE.map(([firstName, lastName, channel], i) => {
    const scripts = channel === 'instagram' ? SCRIPTS : SCRIPTS.filter((s) => !s.instagramOnly)
    const script = scripts[i % scripts.length]
    const age = Math.floor(rand() * 13 * DAY) + 3_600_000
    const createdAt = now - age - DAY
    // Alguns contatos ficam fora da janela de 24 h para a demonstração das regras de envio.
    const lastInboundAt = i % 4 === 3 ? now - (1.5 + rand()) * DAY : now - age * 0.08
    let ts = lastInboundAt - script.lines.length * 60_000
    const messages: ChatMessage[] = script.lines.map(([from, text]) => {
      ts += 45_000 + Math.floor(rand() * 30_000)
      return { id: uid('m'), from, text: text.replace('Oi! 👋', `Oi, ${firstName}! 👋`), ts }
    })
    const handle = channel === 'whatsapp' ? `+55 11 9${String(8000_0000 + Math.floor(rand() * 1999_9999)).slice(0, 4)}-${String(1000 + i * 37).slice(0, 4)}` : `@${firstName.toLowerCase()}.${lastName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}`
    return {
      id: uid('c'),
      firstName,
      lastName,
      channel,
      handle,
      avatarHue: Math.floor(rand() * 360),
      tags: script.tags,
      fields: { ...script.fields, ...(channel === 'whatsapp' ? { telefone: handle.replace(/\D/g, '') } : {}) },
      score: script.score + Math.floor(rand() * 8),
      subscribed: i !== 9,
      botPaused: Boolean(script.paused),
      assignedTo: script.paused ? 'Time INTELRA' : undefined,
      createdAt,
      lastInboundAt,
      lastActivityAt: ts,
      unread: script.paused ? 1 : i % 6 === 0 ? 1 : 0,
      messages,
      sequences: [],
    }
  })
}

const SEEDED_STATS: Record<string, [number, number, number]> = {
  'comment-dm': [1284, 1102, 731],
  'welcome-menu': [642, 515, 388],
  'lead-capture': [318, 204, 0],
  'ai-qualify': [271, 244, 0],
  'follow-up': [126, 97, 41],
  'ab-offer': [212, 168, 133],
  'ai-default': [455, 455, 0],
  'story-reply': [389, 301, 180],
}

function makeAutomations(now: number): Automation[] {
  const list: Automation[] = TEMPLATES.map((t, i) => {
    const draft = t.build()
    const [runs, completed, clicks] = SEEDED_STATS[t.id] ?? [0, 0, 0]
    return {
      ...draft,
      id: uid('a'),
      active: t.id !== 'follow-up',
      stats: { runs, completed, clicks, nodeVisits: {}, variants: {} },
      createdAt: now - (30 - i * 3) * DAY,
      updatedAt: now - i * DAY * 0.7,
    }
  })
  // "Quero um orçamento" no menu de boas-vindas continua na automação de captura de lead.
  const lead = list[TEMPLATES.findIndex((t) => t.id === 'lead-capture')]
  const welcome = list[TEMPLATES.findIndex((t) => t.id === 'welcome-menu')]
  welcome.nodes = welcome.nodes.map((n) => (n.data.kind === 'goto' ? { ...n, data: { kind: 'goto', automationId: lead.id } } : n))
  const ab = list[TEMPLATES.findIndex((t) => t.id === 'ab-offer')]
  const split = ab.nodes.find((n) => n.data.kind === 'split')
  if (split?.data.kind === 'split') ab.stats.variants = { [split.data.variants[0].id]: 108, [split.data.variants[1].id]: 104 }
  return list
}

function makeActivity(now: number, rand: () => number, contacts: Contact[], automations: Automation[]): Activity[] {
  const out: Activity[] = []
  const active = automations.filter((a) => a.active)
  for (let d = 13; d >= 0; d--) {
    const dayStart = now - d * DAY - (now % DAY)
    const weekday = new Date(dayStart).getDay()
    const volume = Math.round((weekday === 0 || weekday === 6 ? 22 : 38) * (0.75 + rand() * 0.5) * (1 + (13 - d) * 0.03))
    for (let i = 0; i < volume; i++) {
      const ts = dayStart + Math.floor(rand() * DAY)
      if (ts > now) continue
      const contact = contacts[Math.floor(rand() * contacts.length)]
      const automation = active[Math.floor(rand() * active.length)]
      out.push({ id: uid('ev'), ts, type: 'message_in', contactId: contact.id, channel: contact.channel })
      if (rand() < 0.12) continue
      out.push({ id: uid('ev'), ts: ts + 1000, type: 'run', automationId: automation.id, contactId: contact.id, channel: contact.channel })
      const outs = 1 + Math.floor(rand() * 3)
      for (let k = 0; k < outs; k++) out.push({ id: uid('ev'), ts: ts + 2000 + k, type: 'message_out', automationId: automation.id, contactId: contact.id, channel: contact.channel })
      if (rand() < 0.62) out.push({ id: uid('ev'), ts: ts + 5000, type: 'completed', automationId: automation.id, channel: contact.channel })
      if (rand() < 0.38) out.push({ id: uid('ev'), ts: ts + 6000, type: 'click', automationId: automation.id, channel: contact.channel })
      if (rand() < 0.12) out.push({ id: uid('ev'), ts: ts + 7000, type: 'lead', contactId: contact.id, channel: contact.channel })
      if (rand() < 0.18) out.push({ id: uid('ev'), ts: ts - 1000, type: 'new_contact', contactId: contact.id, channel: contact.channel })
    }
  }
  return out.sort((a, b) => a.ts - b.ts)
}

export function createSeed(now = Date.now()): SeedData {
  const rand = mulberry32(20261019)
  const automations = makeAutomations(now)
  const contacts = makeContacts(now, rand)
  const sequence: Sequence = {
    id: uid('s'),
    name: 'Nutrição de leads — 7 dias',
    active: true,
    createdAt: now - 10 * DAY,
    steps: [
      { id: uid('st'), amount: 1, unit: 'days', text: 'Oi, {{first_name|tudo bem}}! Separei 3 erros que mais travam o crescimento no digital. Quer que eu te mande?' },
      { id: uid('st'), amount: 3, unit: 'days', text: 'Case rápido: como um cliente organizou o atendimento com automação e parou de perder mensagens. 📈' },
      { id: uid('st'), amount: 3, unit: 'days', text: 'Última da semana: que tal um diagnóstico gratuito de 15 minutos? É só responder "diagnóstico".' },
    ],
  }
  const ab = automations[TEMPLATES.findIndex((t) => t.id === 'ab-offer')]
  const lead = automations[TEMPLATES.findIndex((t) => t.id === 'lead-capture')]
  return {
    automations,
    contacts,
    sequences: [sequence],
    broadcasts: [
      {
        id: uid('bc'),
        name: 'Agenda de novembro aberta',
        text: 'Oi, {{first_name|tudo bem}}! Abrimos a agenda de projetos de novembro. Quer garantir um horário? 🗓️',
        buttons: [{ id: uid('b'), label: 'Quero um orçamento', action: 'automation', automationId: lead.id }],
        segment: { channels: [], includeTags: ['lead'], excludeTags: ['cliente'], minScore: 0 },
        status: 'sent',
        sentAt: now - 4 * DAY,
        sentTo: 214,
        skipped: 37,
        clicks: 41,
        createdAt: now - 5 * DAY,
      },
      {
        id: uid('bc'),
        name: 'Conteúdo da semana',
        text: 'Saiu conteúdo novo: 5 automações que todo negócio local deveria ter. Quer receber?',
        buttons: [{ id: uid('b'), label: 'Ver conteúdo', action: 'url', url: 'https://intelra.com.br' }],
        segment: { channels: ['instagram'], includeTags: ['newsletter'], excludeTags: [], minScore: 0 },
        status: 'draft',
        sentTo: 0,
        skipped: 0,
        clicks: 0,
        createdAt: now - DAY,
      },
    ],
    growthTools: [
      { id: uid('g'), name: 'Link da bio — diagnóstico', type: 'link', channel: 'instagram', ref: 'diagnostico', automationId: ab.id, entries: 212, createdAt: now - 12 * DAY },
      { id: uid('g'), name: 'QR do balcão', type: 'qr', channel: 'whatsapp', ref: 'diagnostico', automationId: ab.id, entries: 58, createdAt: now - 8 * DAY },
      { id: uid('g'), name: 'Botão do site', type: 'button', channel: 'whatsapp', ref: 'orçamento', automationId: lead.id, entries: 0, createdAt: now - 2 * DAY },
    ],
    savedReplies: [
      { id: uid('sr'), title: 'Horário', text: 'Nosso atendimento é de segunda a sexta, das 9h às 18h. 🙂' },
      { id: uid('sr'), title: 'Orçamento', text: 'Para montar seu orçamento, me conta: qual é o seu negócio e o que você precisa?' },
      { id: uid('sr'), title: 'Agendar', text: 'Vamos agendar uma conversa de 15 minutos? Qual o melhor dia e horário para você?' },
      { id: uid('sr'), title: 'Encerrar', text: 'Foi um prazer falar com você, {{first_name}}! Qualquer coisa, é só chamar. 💛' },
    ],
    activity: makeActivity(now, rand, contacts, automations),
  }
}
