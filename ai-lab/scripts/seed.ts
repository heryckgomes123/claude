/**
 * Seed do INTELRA AI LAB (conteúdo inicial de exemplo).
 *   npm run db:seed            → cria o que não existe (nunca sobrescreve edições feitas no painel)
 *   npm run db:seed -- --update → atualiza os itens do seed com o conteúdo de scripts/seed-data
 *
 * Professor (admin) inicial: defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD.
 */
import { hashPassword } from 'better-auth/crypto'
import { eq, inArray } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { account, lesson, lessonPrompt, prompt, tool, user } from '../src/server/db/schema'
import { connect } from './_db'

type SeedContent = {
  prompts: {
    slug: string
    title: string
    category: string
    description: string
    body: string
    negative: string | null
    tips: string[]
    tools: string | null
    position: number
  }[]
  lessons: {
    slug: string
    module: string
    title: string
    summary: string
    content: string
    durationMin: number | null
    videoUrl: string | null
    prompts: string[]
    position: number
  }[]
  tools: { slug: string; name: string; category: string; description: string; url: string; howTo: string; position: number }[]
}

const content: SeedContent = JSON.parse(readFileSync(new URL('./seed-data/content.json', import.meta.url), 'utf8'))

async function main() {
  const update = process.argv.includes('--update')
  const skipContent = process.argv.includes('--no-content')
  const { db, close } = connect()
  try {
    if (!skipContent) {
      for (const p of content.prompts) {
        const q = db.insert(prompt).values(p)
        await (update ? q.onConflictDoUpdate({ target: prompt.slug, set: p }) : q.onConflictDoNothing())
      }
      for (const { prompts: slugs, ...l } of content.lessons) {
        const q = db.insert(lesson).values(l)
        const [row] = await (update ? q.onConflictDoUpdate({ target: lesson.slug, set: l }) : q.onConflictDoNothing()).returning({
          id: lesson.id,
        })
        if (!row || slugs.length === 0) continue
        const linked = await db.select({ id: prompt.id }).from(prompt).where(inArray(prompt.slug, slugs))
        if (linked.length)
          await db
            .insert(lessonPrompt)
            .values(linked.map((p) => ({ lessonId: row.id, promptId: p.id })))
            .onConflictDoNothing()
      }
      for (const t of content.tools) {
        const q = db.insert(tool).values(t)
        await (update ? q.onConflictDoUpdate({ target: tool.slug, set: t }) : q.onConflictDoNothing())
      }
      console.log(`✓ Conteúdo: ${content.prompts.length} prompts, ${content.lessons.length} aulas, ${content.tools.length} ferramentas`)
    }

    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
    const password = process.env.SEED_ADMIN_PASSWORD
    if (email && password) {
      if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD precisa ter pelo menos 12 caracteres.')
      const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
      if (existing) {
        await db.update(user).set({ role: 'ADMIN', emailVerified: true }).where(eq(user.id, existing.id))
        console.log(`✓ ${email} agora é professor (ADMIN)`)
      } else {
        const id = randomUUID()
        await db.insert(user).values({ id, email, name: process.env.SEED_ADMIN_NAME ?? 'Professor INTELRA', role: 'ADMIN', emailVerified: true })
        await db.insert(account).values({ id: randomUUID(), accountId: id, providerId: 'credential', userId: id, password: await hashPassword(password) })
        console.log(`✓ Professor criado: ${email}`)
      }
    }
  } finally {
    await close()
  }
}

main().catch((error) => {
  console.error('✖ Seed falhou:', error)
  process.exit(1)
})
