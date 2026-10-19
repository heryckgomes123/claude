/** Modelos prontos de automação (PT-BR). Cada chamada gera ids novos. */
import type { Automation, FlowEdge, FlowNode, NodeData, Trigger } from '../lib/types'
import { uid } from '../lib/util'

export type AutomationDraft = Pick<Automation, 'name' | 'description' | 'triggers' | 'nodes' | 'edges'>

export interface Template {
  id: string
  name: string
  description: string
  category: 'Instagram' | 'Vendas' | 'Atendimento' | 'IA' | 'Crescimento'
  build: () => AutomationDraft
}

class FlowBuilder {
  nodes: FlowNode[] = []
  edges: FlowEdge[] = []

  add<T extends NodeData>(data: T, x: number, y: number): string {
    const id = uid('n')
    this.nodes.push({ id, type: data.kind, position: { x, y }, data })
    return id
  }

  link(source: string, target: string, sourceHandle = 'out'): void {
    this.edges.push({ id: uid('e'), source, target, sourceHandle })
  }
}

function trigger(partial: Partial<Trigger> & Pick<Trigger, 'type'>): Trigger {
  return { id: uid('t'), channels: [], keywords: [], match: 'contains', ...partial }
}

const btn = (label: string) => ({ id: uid('b'), label, action: 'next' as const })
const qr = (label: string) => ({ id: uid('q'), label })

export const TEMPLATES: Template[] = [
  {
    id: 'comment-dm',
    name: 'Comentário → Direct com link',
    description: 'Quem comenta a palavra-chave no post recebe o link no Direct e vira lead marcado.',
    category: 'Instagram',
    build() {
      const f = new FlowBuilder()
      const start = f.add({ kind: 'trigger' }, 0, 0)
      const yes = qr('Quero!')
      const no = qr('Agora não')
      const hello = f.add(
        { kind: 'message', text: 'Oi, {{first_name|tudo bem}}! 👋 Vi seu comentário. Quer que eu te mande o material agora?', buttons: [], quickReplies: [yes, no] },
        320,
        0,
      )
      const tag = f.add({ kind: 'action', actions: [{ id: uid('a'), kind: 'add_tag', value: 'lead-comentario' }, { id: uid('a'), kind: 'add_score', value: '15' }] }, 660, -80)
      const link = f.add(
        { kind: 'message', text: 'Aqui está! É só tocar no botão abaixo. Qualquer dúvida, me chama por aqui. 💛', buttons: [{ id: uid('b'), label: 'Abrir material', action: 'url', url: 'https://intelra.com.br' }], quickReplies: [] },
        960,
        -80,
      )
      const later = f.add({ kind: 'message', text: 'Sem problema! Quando quiser, é só comentar de novo ou me chamar aqui. 😉', buttons: [], quickReplies: [] }, 660, 160)
      f.link(start, hello)
      f.link(hello, tag, yes.id)
      f.link(hello, later, no.id)
      f.link(tag, link)
      return {
        name: 'Comentário → Direct com link',
        description: 'Comentou "QUERO" no post, recebe o link no Direct.',
        triggers: [trigger({ type: 'comment', channels: ['instagram'], keywords: ['quero', 'eu quero', 'link'], publicReply: 'Te chamei no Direct! 📩' })],
        nodes: f.nodes,
        edges: f.edges,
      }
    },
  },
  {
    id: 'welcome-menu',
    name: 'Boas-vindas com menu',
    description: 'Recebe contatos novos com um menu de opções e direciona para o time quando precisam.',
    category: 'Atendimento',
    build() {
      const f = new FlowBuilder()
      const start = f.add({ kind: 'trigger' }, 0, 0)
      const services = btn('Conhecer serviços')
      const prices = btn('Quero um orçamento')
      const human = btn('Falar com alguém')
      const menu = f.add({ kind: 'message', text: 'Olá, {{first_name|tudo bem}}! Bem-vindo(a) à INTELRA. 🖤💛\nComo posso te ajudar hoje?', buttons: [services, prices, human], quickReplies: [] }, 320, 0)
      const areas = [qr('Marketing'), qr('IA'), qr('Sites e sistemas')]
      const s = f.add(
        { kind: 'message', text: 'Trabalhamos com marketing, IA, sites e sistemas sob medida. Qual dessas frentes faz mais sentido para você?', buttons: [], quickReplies: areas },
        700,
        -200,
      )
      const sTag = f.add({ kind: 'action', actions: [{ id: uid('a'), kind: 'add_tag', value: 'interesse-servicos' }, { id: uid('a'), kind: 'add_score', value: '5' }] }, 1080, -200)
      const sMsg = f.add({ kind: 'message', text: 'Ótima escolha! Vou pedir para um especialista te chamar. Enquanto isso, me conta: qual é o seu negócio?', buttons: [], quickReplies: [] }, 1380, -200)
      const p = f.add({ kind: 'goto', automationId: '' }, 700, 20)
      const h = f.add({ kind: 'action', actions: [{ id: uid('a'), kind: 'handoff', value: '' }, { id: uid('a'), kind: 'notify', value: '{{first_name}} pediu atendimento humano.' }] }, 700, 200)
      const hMsg = f.add({ kind: 'message', text: 'Perfeito! Já avisei o time e alguém responde por aqui em instantes. ⏳', buttons: [], quickReplies: [] }, 1040, 200)
      f.link(start, menu)
      f.link(menu, s, services.id)
      f.link(menu, p, prices.id)
      f.link(menu, h, human.id)
      for (const q of areas) f.link(s, sTag, q.id)
      f.link(sTag, sMsg)
      f.link(h, hMsg)
      return {
        name: 'Boas-vindas com menu',
        description: 'Primeira mensagem de contatos novos.',
        triggers: [trigger({ type: 'welcome' })],
        nodes: f.nodes,
        edges: f.edges,
      }
    },
  },
  {
    id: 'lead-capture',
    name: 'Captura de lead (orçamento)',
    description: 'Coleta nome, e-mail e telefone com validação, pontua o lead e avisa o time.',
    category: 'Vendas',
    build() {
      const f = new FlowBuilder()
      const start = f.add({ kind: 'trigger' }, 0, 0)
      const intro = f.add({ kind: 'message', text: 'Bora montar seu orçamento! Leva menos de 1 minuto. ⚡', buttons: [], quickReplies: [] }, 300, 0)
      const service = f.add(
        { kind: 'question', prompt: 'O que você precisa?', inputType: 'choice', field: 'servico', choices: ['Marketing', 'IA e automação', 'Site ou sistema', 'Identidade visual'], retryText: 'Escolhe uma das opções, por favor. 🙂' },
        600,
        0,
      )
      const email = f.add({ kind: 'question', prompt: 'Qual é o seu melhor e-mail?', inputType: 'email', field: 'email', choices: [], retryText: 'Esse e-mail parece incompleto. Pode conferir?' }, 900, 0)
      const phone = f.add({ kind: 'question', prompt: 'E um WhatsApp com DDD para o especialista te chamar?', inputType: 'phone', field: 'telefone', choices: [], retryText: 'Envia só os números com DDD, por favor.' }, 1200, 0)
      const act = f.add(
        {
          kind: 'action',
          actions: [
            { id: uid('a'), kind: 'add_tag', value: 'lead' },
            { id: uid('a'), kind: 'add_score', value: '30' },
            { id: uid('a'), kind: 'notify', value: 'Novo lead: {{first_name}} quer {{servico}} ({{email}}).' },
          ],
        },
        1500,
        0,
      )
      const done = f.add({ kind: 'message', text: 'Prontinho, {{first_name}}! Recebemos tudo. Um especialista em {{servico}} vai te chamar em até 1 dia útil. 🚀', buttons: [], quickReplies: [] }, 1800, 0)
      const fail = f.add({ kind: 'action', actions: [{ id: uid('a'), kind: 'handoff', value: '' }] }, 1200, 220)
      f.link(start, intro)
      f.link(intro, service)
      f.link(service, email)
      f.link(email, phone)
      f.link(phone, act)
      f.link(act, done)
      f.link(email, fail, 'invalid')
      f.link(phone, fail, 'invalid')
      return {
        name: 'Captura de lead (orçamento)',
        description: 'Palavra-chave "orçamento" ou "preço".',
        triggers: [trigger({ type: 'keyword', keywords: ['orçamento', 'orcamento', 'preço', 'valor', 'quanto custa'] })],
        nodes: f.nodes,
        edges: f.edges,
      }
    },
  },
  {
    id: 'ai-qualify',
    name: 'Qualificação com IA',
    description: 'Entende a intenção da mensagem (sem palavra-chave exata) e leva cada perfil para o caminho certo.',
    category: 'IA',
    build() {
      const f = new FlowBuilder()
      const start = f.add({ kind: 'trigger' }, 0, 0)
      const buy = { id: uid('i'), label: 'Pronto para contratar ou comprar' }
      const research = { id: uid('i'), label: 'Pesquisando, comparando opções ou tirando dúvidas' }
      const support = { id: uid('i'), label: 'Já é cliente e precisa de suporte' }
      const ai = f.add(
        { kind: 'ai', mode: 'classify', instructions: 'Somos uma agência de marketing, IA e desenvolvimento.', fallbackText: '', intents: [buy, research, support], saveTo: 'intencao' },
        320,
        0,
      )
      const hot = f.add({ kind: 'action', actions: [{ id: uid('a'), kind: 'add_score', value: '40' }, { id: uid('a'), kind: 'add_tag', value: 'quente' }, { id: uid('a'), kind: 'handoff', value: '' }, { id: uid('a'), kind: 'notify', value: 'Lead quente: {{first_name}} quer contratar.' }] }, 720, -220)
      const hotMsg = f.add({ kind: 'message', text: 'Que demais! 🔥 Já chamei um especialista para falar com você agora mesmo.', buttons: [], quickReplies: [] }, 1060, -220)
      const resMsg = f.add({ kind: 'ai', mode: 'reply', instructions: 'Tire a dúvida de forma curta e ofereça um diagnóstico gratuito de 15 minutos.', fallbackText: 'Boa pergunta! Posso te enviar um diagnóstico gratuito de 15 minutos para entender seu caso. Topa?', intents: [], saveTo: '' }, 720, 0)
      const resTag = f.add({ kind: 'action', actions: [{ id: uid('a'), kind: 'add_score', value: '10' }, { id: uid('a'), kind: 'add_tag', value: 'pesquisando' }] }, 1060, 0)
      const supMsg = f.add({ kind: 'message', text: 'Entendi! Vou te passar para o nosso suporte. Pode descrever o que está acontecendo?', buttons: [], quickReplies: [] }, 720, 220)
      const supAct = f.add({ kind: 'action', actions: [{ id: uid('a'), kind: 'add_tag', value: 'suporte' }, { id: uid('a'), kind: 'handoff', value: '' }] }, 1060, 220)
      const other = f.add({ kind: 'message', text: 'Me conta um pouco mais sobre o que você precisa? 🙂', buttons: [], quickReplies: [] }, 720, 420)
      f.link(start, ai)
      f.link(ai, hot, buy.id)
      f.link(hot, hotMsg)
      f.link(ai, resMsg, research.id)
      f.link(resMsg, resTag)
      f.link(ai, supMsg, support.id)
      f.link(supMsg, supAct)
      f.link(ai, other, 'fallback')
      return {
        name: 'Qualificação com IA',
        description: 'Gatilho por intenção: interesse em serviços.',
        triggers: [trigger({ type: 'ai_intent', intent: 'Pessoa demonstra interesse em contratar serviços de marketing, site, sistema ou automação para a empresa ou negócio' })],
        nodes: f.nodes,
        edges: f.edges,
      }
    },
  },
  {
    id: 'follow-up',
    name: 'Follow-up com cupom',
    description: 'Envia um lembrete depois de um tempo e só oferece cupom para quem ainda não comprou.',
    category: 'Vendas',
    build() {
      const f = new FlowBuilder()
      const start = f.add({ kind: 'trigger' }, 0, 0)
      const first = f.add({ kind: 'message', text: 'Vi que você se interessou pelo nosso plano! Vou te mandar um presente daqui a pouco. 🎁', buttons: [], quickReplies: [] }, 300, 0)
      const wait = f.add({ kind: 'delay', amount: 1, unit: 'hours' }, 620, 0)
      const cond = f.add({ kind: 'condition', combinator: 'and', rules: [{ id: uid('r'), subject: 'tag', op: 'has', value: 'cliente' }] }, 900, 0)
      const thanks = f.add({ kind: 'message', text: 'Obrigado pela confiança, {{first_name}}! Qualquer coisa, estamos por aqui. 💛', buttons: [], quickReplies: [] }, 1220, -120)
      const coupon = f.add({ kind: 'message', text: 'Seu cupom de 10% está liberado por 48 h: INTELRA10 ✨', buttons: [{ id: uid('b'), label: 'Usar cupom', action: 'url', url: 'https://intelra.com.br' }], quickReplies: [] }, 1220, 120)
      const tag = f.add({ kind: 'action', actions: [{ id: uid('a'), kind: 'add_tag', value: 'cupom-enviado' }] }, 1540, 120)
      f.link(start, first)
      f.link(first, wait)
      f.link(wait, cond)
      f.link(cond, thanks, 'yes')
      f.link(cond, coupon, 'no')
      f.link(coupon, tag)
      return {
        name: 'Follow-up com cupom',
        description: 'Palavra-chave "plano".',
        triggers: [trigger({ type: 'keyword', keywords: ['plano', 'planos'] })],
        nodes: f.nodes,
        edges: f.edges,
      }
    },
  },
  {
    id: 'ab-offer',
    name: 'Teste A/B de oferta',
    description: 'Divide quem chega pelo link entre duas ofertas e mede qual gera mais cliques.',
    category: 'Crescimento',
    build() {
      const f = new FlowBuilder()
      const start = f.add({ kind: 'trigger' }, 0, 0)
      const a = { id: uid('v'), label: 'Oferta A', weight: 50 }
      const b = { id: uid('v'), label: 'Oferta B', weight: 50 }
      const split = f.add({ kind: 'split', variants: [a, b] }, 300, 0)
      const ctaA = btn('Quero o diagnóstico')
      const ctaB = btn('Bora!')
      const msgA = f.add({ kind: 'message', text: 'Diagnóstico de marketing GRATUITO esta semana. Quer garantir o seu?', buttons: [ctaA], quickReplies: [] }, 620, -120)
      const msgB = f.add({ kind: 'message', text: 'Mostramos em 15 minutos onde seu negócio está perdendo clientes. Bora?', buttons: [ctaB], quickReplies: [] }, 620, 120)
      const act = f.add({ kind: 'action', actions: [{ id: uid('a'), kind: 'add_tag', value: 'diagnostico' }, { id: uid('a'), kind: 'add_score', value: '20' }] }, 960, 0)
      const done = f.add({ kind: 'message', text: 'Fechado! Um especialista vai te chamar para agendar. 📅', buttons: [], quickReplies: [] }, 1260, 0)
      f.link(start, split)
      f.link(split, msgA, a.id)
      f.link(split, msgB, b.id)
      f.link(msgA, act, ctaA.id)
      f.link(msgB, act, ctaB.id)
      f.link(act, done)
      return {
        name: 'Teste A/B de oferta',
        description: 'Entrada por link de bio / QR.',
        triggers: [trigger({ type: 'ref_link', ref: 'diagnostico' })],
        nodes: f.nodes,
        edges: f.edges,
      }
    },
  },
  {
    id: 'ai-default',
    name: 'Resposta padrão com IA',
    description: 'Quando nada mais responde, a IA conversa com base nas orientações do seu negócio.',
    category: 'IA',
    build() {
      const f = new FlowBuilder()
      const start = f.add({ kind: 'trigger' }, 0, 0)
      const ai = f.add(
        {
          kind: 'ai',
          mode: 'reply',
          instructions:
            'A INTELRA é uma agência de soluções digitais: marketing, IA, sites, sistemas e branding. Atendimento de segunda a sexta, 9h às 18h. Para orçamento, peça para a pessoa digitar "orçamento".',
          fallbackText: 'Recebi sua mensagem, {{first_name|tudo bem}}! Para orçamento é só digitar "orçamento". Se preferir, nosso time te responde em breve. 🙌',
          intents: [],
          saveTo: '',
        },
        320,
        0,
      )
      f.link(start, ai)
      return {
        name: 'Resposta padrão com IA',
        description: 'Responde quando nenhuma outra automação se aplica.',
        triggers: [trigger({ type: 'default' })],
        nodes: f.nodes,
        edges: f.edges,
      }
    },
  },
  {
    id: 'story-reply',
    name: 'Resposta a story',
    description: 'Agradece quem responde aos stories e puxa conversa.',
    category: 'Instagram',
    build() {
      const f = new FlowBuilder()
      const start = f.add({ kind: 'trigger' }, 0, 0)
      const join = qr('Quero')
      const msg = f.add({ kind: 'message', text: 'Ahh, que bom que você curtiu o story! 😍 Quer receber conteúdos assim toda semana?', buttons: [], quickReplies: [join, qr('Não, obrigado')] }, 320, 0)
      const act = f.add({ kind: 'action', actions: [{ id: uid('a'), kind: 'add_tag', value: 'newsletter' }, { id: uid('a'), kind: 'add_score', value: '5' }] }, 680, -80)
      const ok = f.add({ kind: 'message', text: 'Combinado! Toda terça tem conteúdo novo por aqui. 💛', buttons: [], quickReplies: [] }, 980, -80)
      f.link(start, msg)
      f.link(msg, act, join.id)
      f.link(act, ok)
      return {
        name: 'Resposta a story',
        description: 'Qualquer resposta aos stories.',
        triggers: [trigger({ type: 'story_reply', channels: ['instagram'] })],
        nodes: f.nodes,
        edges: f.edges,
      }
    },
  },
]

export function blankAutomation(): AutomationDraft {
  const f = new FlowBuilder()
  const start = f.add({ kind: 'trigger' }, 0, 0)
  const msg = f.add({ kind: 'message', text: 'Olá, {{first_name|tudo bem}}! 👋', buttons: [], quickReplies: [] }, 320, 0)
  f.link(start, msg)
  return { name: 'Nova automação', description: '', triggers: [trigger({ type: 'keyword', keywords: ['oi'] })], nodes: f.nodes, edges: f.edges }
}

export function newTrigger(type: Trigger['type']): Trigger {
  return trigger({ type, channels: type === 'comment' || type === 'story_reply' ? ['instagram'] : [], ref: type === 'ref_link' ? 'minha-campanha' : undefined })
}
