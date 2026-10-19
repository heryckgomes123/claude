import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../data/templates'
import type { AiProvider, EngineEnv, Effect } from './engine'
import { resumeRun, startRun, validateAnswer } from './engine'
import { localClassify } from './ai'
import { matchTriggers, keywordMatches } from './triggers'
import { validateFlow } from './flow'
import type { Automation, Contact } from './types'
import { interpolate } from './util'

const noAi: AiProvider = { classify: async (text, intents) => localClassify(text, intents), reply: async () => null }
const env = (over: Partial<EngineEnv> = {}): EngineEnv => ({ ai: noAi, now: () => 1_000, random: () => 0.1, timeScale: 'demo', ...over })

function contact(over: Partial<Contact> = {}): Contact {
  return {
    id: 'c1',
    firstName: 'Ana',
    lastName: 'Souza',
    channel: 'instagram',
    handle: '@ana',
    avatarHue: 10,
    tags: [],
    fields: {},
    score: 0,
    subscribed: true,
    botPaused: false,
    createdAt: 0,
    lastInboundAt: 0,
    lastActivityAt: 0,
    unread: 0,
    messages: [],
    sequences: [],
    ...over,
  }
}

function automation(templateId: string): Automation {
  const draft = TEMPLATES.find((t) => t.id === templateId)!.build()
  return { ...draft, id: templateId, active: true, stats: { runs: 0, completed: 0, clicks: 0, nodeVisits: {}, variants: {} }, createdAt: 0, updatedAt: 0 }
}

const sent = (effects: Effect[]) => effects.flatMap((e) => (e.type === 'send' ? [e.message.text] : []))

describe('variáveis', () => {
  it('interpola nome, campos e fallback', () => {
    const c = contact({ fields: { email: 'a@b.com' } })
    expect(interpolate('Oi {{first_name}} ({{email}}) {{cidade|sem cidade}}', c)).toBe('Oi Ana (a@b.com) sem cidade')
    expect(interpolate('{{first_name|amigo}}', contact({ firstName: '' }))).toBe('amigo')
  })
})

describe('gatilhos', () => {
  it('respeita fronteira de palavra no "contém"', () => {
    expect(keywordMatches({ keywords: ['oi'], match: 'contains' }, 'Oi, tudo bem?')).toBe(true)
    expect(keywordMatches({ keywords: ['oi'], match: 'contains' }, 'boiada')).toBe(false)
    expect(keywordMatches({ keywords: ['orçamento'], match: 'contains' }, 'quero um ORCAMENTO')).toBe(true)
  })

  it('prioriza palavra-chave sobre resposta padrão e boas-vindas', () => {
    const autos = [automation('ai-default'), automation('welcome-menu'), automation('lead-capture')]
    const match = matchTriggers(autos, { kind: 'message', channel: 'instagram', text: 'qual o preço?', isNewContact: true })
    expect(match?.automation.id).toBe('lead-capture')
    const welcome = matchTriggers(autos, { kind: 'message', channel: 'instagram', text: 'olá', isNewContact: true })
    expect(welcome?.automation.id).toBe('welcome-menu')
    const fallback = matchTriggers(autos, { kind: 'message', channel: 'instagram', text: 'olá', isNewContact: false })
    expect(fallback?.automation.id).toBe('ai-default')
  })

  it('comentário só dispara gatilho de comentário no canal certo', () => {
    const autos = [automation('comment-dm')]
    expect(matchTriggers(autos, { kind: 'comment', channel: 'instagram', text: 'EU QUERO!!', isNewContact: false })?.automation.id).toBe('comment-dm')
    expect(matchTriggers(autos, { kind: 'comment', channel: 'messenger', text: 'quero', isNewContact: false })).toBeNull()
    expect(matchTriggers(autos, { kind: 'message', channel: 'instagram', text: 'quero', isNewContact: false })).toBeNull()
  })

  it('ignora automações pausadas', () => {
    const a = { ...automation('lead-capture'), active: false }
    expect(matchTriggers([a], { kind: 'message', channel: 'whatsapp', text: 'orçamento', isNewContact: false })).toBeNull()
  })
})

describe('motor de fluxo', () => {
  it('captura lead com validação e aplica ações', async () => {
    const a = automation('lead-capture')
    let r = await startRun(a, contact(), env())
    expect(sent(r.effects)).toEqual(['Bora montar seu orçamento! Leva menos de 1 minuto. ⚡', 'O que você precisa?'])
    expect(r.state?.wait).toBe('input')

    r = await resumeRun(a, r.state!, r.contact, { text: '3' }, env())
    expect(r.contact.fields.servico).toBe('Site ou sistema')

    r = await resumeRun(a, r.state!, r.contact, { text: 'ana@' }, env())
    expect(sent(r.effects)).toEqual(['Esse e-mail parece incompleto. Pode conferir?'])
    expect(r.state?.attempts).toBe(1)

    r = await resumeRun(a, r.state!, r.contact, { text: 'Ana@Exemplo.com' }, env())
    r = await resumeRun(a, r.state!, r.contact, { text: '(11) 98888-7777' }, env())
    expect(r.state).toBeNull()
    expect(r.contact.fields).toMatchObject({ email: 'ana@exemplo.com', telefone: '11988887777' })
    expect(r.contact.tags).toContain('lead')
    expect(r.contact.score).toBe(30)
    expect(r.effects.some((e) => e.type === 'notify' && e.text.includes('Site ou sistema'))).toBe(true)
    expect(sent(r.effects).at(-1)).toContain('especialista em Site ou sistema')
    expect(r.effects.at(-1)).toEqual({ type: 'completed' })
  })

  it('após 3 respostas inválidas segue a saída "inválido"', async () => {
    const a = automation('lead-capture')
    let r = await startRun(a, contact(), env())
    r = await resumeRun(a, r.state!, r.contact, { text: 'Marketing' }, env())
    for (let i = 0; i < 3; i++) r = await resumeRun(a, r.state!, r.contact, { text: 'nao sei' }, env())
    expect(r.state).toBeNull()
    expect(r.contact.botPaused).toBe(true)
  })

  it('segue o botão clicado e encerra quando a mensagem não corresponde', async () => {
    const a = automation('comment-dm')
    let r = await startRun(a, contact(), env())
    expect(r.state?.wait).toBe('reply')
    const waiting = r.state!
    const miss = await resumeRun(a, waiting, r.contact, { text: 'qual o horário?' }, env())
    expect(miss.handled).toBe(false)

    r = await resumeRun(a, waiting, r.contact, { text: 'quero!' }, env())
    expect(r.effects[0]).toMatchObject({ type: 'click' })
    expect(r.contact.tags).toContain('lead-comentario')
    expect(sent(r.effects)).toHaveLength(1)
  })

  it('atraso pausa e condição escolhe o ramo', async () => {
    const a = automation('follow-up')
    let r = await startRun(a, contact(), env())
    expect(r.state).toMatchObject({ wait: 'delay', resumeAt: 2_000 })
    r = await resumeRun(a, r.state!, r.contact, null, env())
    expect(sent(r.effects)[0]).toContain('INTELRA10')

    let r2 = await startRun(a, contact({ tags: ['Cliente'] }), env())
    r2 = await resumeRun(a, r2.state!, r2.contact, null, env())
    expect(sent(r2.effects)[0]).toContain('Obrigado')
  })

  it('teste A/B usa o sorteio e registra a variante', async () => {
    const a = automation('ab-offer')
    const low = await startRun(a, contact(), env({ random: () => 0.2 }))
    const high = await startRun(a, contact(), env({ random: () => 0.8 }))
    expect(sent(low.effects)[0]).toContain('GRATUITO')
    expect(sent(high.effects)[0]).toContain('15 minutos')
    expect(low.effects.some((e) => e.type === 'variant')).toBe(true)
  })

  it('classificação por IA local escolhe o ramo e salva o campo', async () => {
    const a = automation('ai-qualify')
    const c = contact({ messages: [{ id: 'm', from: 'contact', text: 'Já sou cliente e preciso de suporte com meu site', ts: 0 }] })
    const r = await startRun(a, c, env())
    expect(r.contact.tags).toContain('suporte')
    expect(r.contact.fields.intencao).toBe('Já é cliente e precisa de suporte')
  })

  it('resposta por IA usa o texto alternativo quando não há IA', async () => {
    const a = automation('ai-default')
    const r = await startRun(a, contact(), env())
    expect(sent(r.effects)[0]).toContain('Recebi sua mensagem, Ana!')
  })

  it('resposta por IA usa o texto gerado quando disponível', async () => {
    const a = automation('ai-default')
    const ai: AiProvider = { classify: async () => null, reply: async () => 'Resposta do Claude' }
    const r = await startRun(a, contact(), env({ ai }))
    expect(sent(r.effects)).toEqual(['Resposta do Claude'])
  })
})

describe('validação', () => {
  it('aceita os modelos e acusa problemas comuns', () => {
    const a = automation('lead-capture')
    expect(validateFlow(a, [a]).filter((i) => i.level === 'error')).toEqual([])
    const broken: Automation = { ...a, edges: [], triggers: [] }
    const issues = validateFlow(broken, [broken])
    expect(issues.some((i) => i.text.includes('não está conectado'))).toBe(true)
    expect(issues.some((i) => i.text.includes('solto'))).toBe(true)
  })

  it('valida tipos de resposta', () => {
    const q = { kind: 'question' as const, prompt: '', inputType: 'number' as const, field: 'x', choices: [], retryText: '' }
    expect(validateAnswer(q, '1.500,50')).toBe('1500.5')
    expect(validateAnswer({ ...q, inputType: 'phone' }, '123')).toBeNull()
  })
})
