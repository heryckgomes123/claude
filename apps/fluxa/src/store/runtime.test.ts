import { beforeEach, describe, expect, it } from 'vitest'
import { receive, testContact } from './runtime'
import { useStore } from './store'

const contact = (id: string) => useStore.getState().contacts.find((c) => c.id === id)!

describe('runtime', () => {
  beforeEach(() => useStore.getState().resetDemo())

  it('dispara a automação pela palavra-chave e guarda a conversa', async () => {
    const c = testContact('whatsapp')
    await receive(c.id, { text: 'Quanto custa?' })
    const after = contact(c.id)
    expect(after.messages.map((m) => m.text)).toContain('O que você precisa?')
    expect(useStore.getState().runs[c.id]?.wait).toBe('input')
  })

  it('não responde quando a conversa está com o time', async () => {
    const c = testContact('instagram')
    useStore.getState().updateContact(c.id, { botPaused: true })
    await receive(c.id, { text: 'orçamento' })
    expect(contact(c.id).messages.filter((m) => m.from === 'bot')).toHaveLength(0)
    expect(contact(c.id).unread).toBe(1)
  })

  it('entrada por link conta na ferramenta de crescimento', async () => {
    const tool = useStore.getState().growthTools.find((t) => t.channel === 'instagram')!
    const c = testContact('instagram')
    await receive(c.id, { text: tool.ref }, { kind: 'ref', ref: tool.ref })
    expect(useStore.getState().growthTools.find((t) => t.id === tool.id)!.entries).toBe(tool.entries + 1)
    expect(contact(c.id).messages.some((m) => m.from === 'bot')).toBe(true)
  })

  it('boas-vindas para contato novo e resposta padrão depois', async () => {
    const c = testContact('telegram')
    await receive(c.id, { text: 'olá' })
    expect(contact(c.id).messages.some((m) => m.text.includes('Bem-vindo'))).toBe(true)
    await receive(c.id, { text: 'xyz' })
    expect(contact(c.id).messages.at(-1)?.text).toContain('Recebi sua mensagem')
  })
})
