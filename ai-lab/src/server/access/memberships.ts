import 'server-only'
import { and, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { db } from '../db'
import { membership, plan, planEntitlement } from '../db/schema'
import { serverEnv } from '../env'
import { ACTIVE_MEMBERSHIP_STATUSES } from './entitlements'

/** Condição SQL de membership vigente agora. */
export function activeMembershipWhere() {
  const now = sql`now()`
  return and(
    inArray(membership.status, [...ACTIVE_MEMBERSHIP_STATUSES]),
    lte(membership.startsAt, now),
    or(isNull(membership.endsAt), gt(membership.endsAt, now)),
  )
}

export async function getActiveEntitlements(userId: string): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ key: planEntitlement.key })
    .from(membership)
    .innerJoin(planEntitlement, eq(planEntitlement.planId, membership.planId))
    .where(and(eq(membership.userId, userId), activeMembershipWhere()))
  return new Set(rows.map((r) => r.key))
}

export async function getActiveMemberships(userId: string) {
  return db
    .select({
      id: membership.id,
      status: membership.status,
      endsAt: membership.endsAt,
      planCode: plan.code,
      planName: plan.name,
    })
    .from(membership)
    .innerJoin(plan, eq(plan.id, membership.planId))
    .where(and(eq(membership.userId, userId), activeMembershipWhere()))
}

/** Concede o plano padrão de cadastro, se SIGNUP_DEFAULT_PLAN estiver configurado. */
export async function grantSignupDefaultPlan(userId: string) {
  const code = serverEnv().SIGNUP_DEFAULT_PLAN
  if (!code) return
  const [target] = await db.select({ id: plan.id }).from(plan).where(eq(plan.code, code.toUpperCase())).limit(1)
  if (!target) {
    console.warn(`[access] SIGNUP_DEFAULT_PLAN=${code} não corresponde a nenhum plano; nenhum acesso concedido.`)
    return
  }
  await db.insert(membership).values({ userId, planId: target.id, source: 'SIGNUP_DEFAULT', status: 'ACTIVE' })
}
