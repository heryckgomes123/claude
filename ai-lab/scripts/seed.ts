/**
 * Seed do INTELRA AI LAB.
 *   npm run db:seed            → cria o que não existe (não sobrescreve edições do admin)
 *   npm run db:seed -- --update → atualiza itens existentes com o conteúdo de /content
 *
 * Admin inicial (opcional): defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD.
 */
import { hashPassword } from 'better-auth/crypto'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { seedBundle, seedUpdates } from '../content'
import { contentBundleSchema } from '../src/lib/content-bundle'
import { ENTITLEMENTS } from '../src/server/access/entitlements'
import { ingestContent } from '../src/server/content-ingest'
import { account, contentItem, labUpdate, plan, planEntitlement, user } from '../src/server/db/schema'
import { connect } from './_db'

const PLANS = [
  { code: 'FREE', name: 'Free', description: 'Conta sem acesso à área de membros.', isActive: true, entitlements: [] as string[] },
  {
    code: 'PRO',
    name: 'Pro',
    description: 'Plano futuro — reservado. Entitlements ajustáveis.',
    isActive: false,
    entitlements: [ENTITLEMENTS.LAB_ACCESS, ENTITLEMENTS.PROMPT_BUILDER, ENTITLEMENTS.COLLECTIONS],
  },
  {
    code: 'LAB',
    name: 'INTELRA AI LAB',
    description: 'Acesso completo ao laboratório.',
    isActive: true,
    entitlements: [ENTITLEMENTS.LAB_ACCESS, ENTITLEMENTS.PROMPT_BUILDER, ENTITLEMENTS.COLLECTIONS, ENTITLEMENTS.EXPERIMENTS],
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Plano futuro — reservado para equipes.',
    isActive: false,
    entitlements: Object.values(ENTITLEMENTS),
  },
]

async function main() {
  const update = process.argv.includes('--update')
  const { db, close } = connect()
  try {
    // Planos e entitlements
    for (const [i, p] of PLANS.entries()) {
      const [row] = await db
        .insert(plan)
        .values({ code: p.code, name: p.name, description: p.description, isActive: p.isActive, sortOrder: i })
        .onConflictDoUpdate({ target: plan.code, set: { name: p.name, description: p.description, sortOrder: i } })
        .returning({ id: plan.id })
      if (p.entitlements.length)
        await db
          .insert(planEntitlement)
          .values(p.entitlements.map((key) => ({ planId: row.id, key })))
          .onConflictDoNothing()
    }
    console.log('✓ Planos e entitlements')

    // Conteúdo
    const bundle = contentBundleSchema.parse(seedBundle)
    const report = await ingestContent(db, bundle, { update })
    console.log(`✓ Conteúdo: ${report.created} criados, ${report.updated} atualizados, ${report.skipped} mantidos`)
    for (const w of report.warnings) console.warn(`  ⚠ ${w}`)

    // Novidades
    for (const u of seedUpdates) {
      const [exists] = await db.select({ id: labUpdate.id }).from(labUpdate).where(eq(labUpdate.title, u.title)).limit(1)
      if (exists) continue
      let contentId: string | null = null
      if ('contentSlug' in u && u.contentSlug) {
        const [c] = await db
          .select({ id: contentItem.id })
          .from(contentItem)
          .where(and(eq(contentItem.slug, u.contentSlug), eq(contentItem.type, 'WORKFLOW')))
          .limit(1)
        contentId = c?.id ?? null
      }
      await db.insert(labUpdate).values({ title: u.title, body: u.body, kind: u.kind, contentId, state: 'PUBLISHED', publishedAt: new Date() })
    }
    console.log('✓ Novidades do Lab')

    // Admin inicial (opcional)
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
    const password = process.env.SEED_ADMIN_PASSWORD
    if (email && password) {
      if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD precisa ter pelo menos 12 caracteres.')
      const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
      if (existing) {
        await db.update(user).set({ role: 'ADMIN' }).where(eq(user.id, existing.id))
        console.log(`✓ ${email} promovido a ADMIN`)
      } else {
        const id = randomUUID()
        await db.insert(user).values({ id, email, name: process.env.SEED_ADMIN_NAME ?? 'INTELRA Admin', role: 'ADMIN', emailVerified: true })
        await db.insert(account).values({ id: randomUUID(), accountId: id, providerId: 'credential', userId: id, password: await hashPassword(password) })
        console.log(`✓ Admin criado: ${email}`)
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
