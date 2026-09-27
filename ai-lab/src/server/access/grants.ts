import 'server-only'
import { and, desc, eq, gt, ilike, isNull, or, sql } from 'drizzle-orm'
import { db } from '../db'
import { accessGrant, user, type GrantSource } from '../db/schema'

/** E-mails são comparados sempre em minúsculas e sem espaços. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function activeWhere() {
  return and(eq(accessGrant.status, 'ACTIVE'), or(isNull(accessGrant.expiresAt), gt(accessGrant.expiresAt, sql`now()`)))
}

export async function hasActiveGrant(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: accessGrant.id })
    .from(accessGrant)
    .where(and(eq(accessGrant.email, normalizeEmail(email)), activeWhere()))
    .limit(1)
  return Boolean(row)
}

type GrantInput = {
  email: string
  name?: string | null
  source: GrantSource
  externalRef?: string | null
  product?: string | null
  note?: string | null
}

/**
 * Libera (ou reativa) o acesso de um e-mail.
 * - Vendas (externalRef): idempotente por plataforma + id da venda.
 * - Manual: reaproveita a liberação manual existente do mesmo e-mail.
 */
export async function grantAccess(input: GrantInput): Promise<{ id: string; created: boolean }> {
  const email = normalizeEmail(input.email)
  const values = {
    email,
    name: input.name?.trim() || null,
    source: input.source,
    externalRef: input.externalRef?.trim() || null,
    product: input.product?.trim() || null,
    note: input.note?.trim() || null,
    status: 'ACTIVE',
    revokedAt: null,
  }

  const [existing] = await db
    .select({ id: accessGrant.id })
    .from(accessGrant)
    .where(
      values.externalRef
        ? and(eq(accessGrant.source, values.source), eq(accessGrant.externalRef, values.externalRef))
        : and(eq(accessGrant.source, values.source), eq(accessGrant.email, email), isNull(accessGrant.externalRef)),
    )
    .limit(1)

  if (existing) {
    await db
      .update(accessGrant)
      .set({ status: 'ACTIVE', revokedAt: null, email, name: values.name ?? undefined, product: values.product ?? undefined })
      .where(eq(accessGrant.id, existing.id))
    return { id: existing.id, created: false }
  }

  const [row] = await db
    .insert(accessGrant)
    .values(values)
    .onConflictDoUpdate({
      target: [accessGrant.source, accessGrant.externalRef],
      set: { status: 'ACTIVE', revokedAt: null },
    })
    .returning({ id: accessGrant.id })
  return { id: row.id, created: true }
}

/** Revoga a liberação de uma venda (reembolso, chargeback, cancelamento). Retorna quantas mudaram. */
export async function revokeSale(source: GrantSource, externalRef: string): Promise<number> {
  const rows = await db
    .update(accessGrant)
    .set({ status: 'REVOKED', revokedAt: new Date() })
    .where(and(eq(accessGrant.source, source), eq(accessGrant.externalRef, externalRef), eq(accessGrant.status, 'ACTIVE')))
    .returning({ id: accessGrant.id })
  return rows.length
}

/** Revoga todas as liberações de uma plataforma para um e-mail (ex.: assinatura cancelada sem id de venda). */
export async function revokeByEmail(source: GrantSource, email: string): Promise<number> {
  const rows = await db
    .update(accessGrant)
    .set({ status: 'REVOKED', revokedAt: new Date() })
    .where(and(eq(accessGrant.source, source), eq(accessGrant.email, normalizeEmail(email)), eq(accessGrant.status, 'ACTIVE')))
    .returning({ id: accessGrant.id })
  return rows.length
}

export async function setGrantStatus(id: string, status: 'ACTIVE' | 'REVOKED') {
  await db
    .update(accessGrant)
    .set({ status, revokedAt: status === 'REVOKED' ? new Date() : null })
    .where(eq(accessGrant.id, id))
}

/** Liberações com a indicação de conta criada (para o painel do professor). */
export async function listGrants({ q, limit = 200 }: { q?: string; limit?: number } = {}) {
  const search = q?.trim()
  return db
    .select({
      id: accessGrant.id,
      email: accessGrant.email,
      name: accessGrant.name,
      status: accessGrant.status,
      source: accessGrant.source,
      product: accessGrant.product,
      externalRef: accessGrant.externalRef,
      createdAt: accessGrant.createdAt,
      revokedAt: accessGrant.revokedAt,
      userId: user.id,
      userName: user.name,
    })
    .from(accessGrant)
    .leftJoin(user, eq(user.email, accessGrant.email))
    .where(search ? or(ilike(accessGrant.email, `%${search}%`), ilike(accessGrant.name, `%${search}%`)) : undefined)
    .orderBy(desc(accessGrant.createdAt))
    .limit(limit)
}

/**
 * Assinatura cancelada: o acesso segue até o fim do período pago (se a plataforma informar a data)
 * ou é revogado imediatamente.
 */
export async function endSubscription(source: GrantSource, email: string, until: Date | null): Promise<number> {
  if (!until || until.getTime() <= Date.now()) return revokeByEmail(source, email)
  const rows = await db
    .update(accessGrant)
    .set({ expiresAt: until })
    .where(and(eq(accessGrant.source, source), eq(accessGrant.email, normalizeEmail(email)), eq(accessGrant.status, 'ACTIVE')))
    .returning({ id: accessGrant.id })
  return rows.length
}
