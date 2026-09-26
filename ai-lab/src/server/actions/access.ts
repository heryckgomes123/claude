'use server'
import { and, eq, gt, isNull, lt, or, sql, TransactionRollbackError } from 'drizzle-orm'
import { accessCodeInputSchema } from '@/lib/validation'
import { hashAccessCode } from '../access/codes'
import { db } from '../db'
import { accessCode, accessCodeRedemption, membership } from '../db/schema'
import { consumeRateLimit } from '../rate-limit'
import { getViewer } from '../auth/viewer'
import { fail, handleActionError, ok, type ActionResult } from './result'

/** Resgata um código de acesso (entregue após a compra) e cria a membership correspondente. */
export async function redeemAccessCode(rawCode: string): Promise<ActionResult<{ planName: string }>> {
  try {
    const viewer = await getViewer()
    if (!viewer) return fail('Faça login para ativar seu acesso.')

    const parsed = accessCodeInputSchema.safeParse(rawCode)
    if (!parsed.success) return fail('Código inválido. Confira e tente novamente.')

    const allowed = await consumeRateLimit(`redeem:${viewer.id}`, 8, 15 * 60)
    if (!allowed) return fail('Muitas tentativas. Aguarde alguns minutos e tente novamente.')

    const codeHash = hashAccessCode(parsed.data)

    return await db.transaction(async (tx) => {
      // Incremento atômico: só passa se o código é válido e ainda tem resgates disponíveis.
      const [code] = await tx
        .update(accessCode)
        .set({ redemptionCount: sql`${accessCode.redemptionCount} + 1` })
        .where(
          and(
            eq(accessCode.codeHash, codeHash),
            isNull(accessCode.disabledAt),
            lt(accessCode.redemptionCount, accessCode.maxRedemptions),
            or(isNull(accessCode.expiresAt), gt(accessCode.expiresAt, sql`now()`)),
          ),
        )
        .returning({ id: accessCode.id, planId: accessCode.planId, durationDays: accessCode.durationDays })

      if (!code) return fail('Código inválido, expirado ou já utilizado.')

      const inserted = await tx
        .insert(accessCodeRedemption)
        .values({ codeId: code.id, userId: viewer.id })
        .onConflictDoNothing()
        .returning({ codeId: accessCodeRedemption.codeId })
      if (inserted.length === 0) {
        tx.rollback()
      }

      const endsAt = code.durationDays ? new Date(Date.now() + code.durationDays * 86_400_000) : null
      await tx.insert(membership).values({
        userId: viewer.id,
        planId: code.planId,
        status: 'ACTIVE',
        source: 'ACCESS_CODE',
        endsAt,
        externalRef: `code:${code.id}`,
      })

      const plan = await tx.query.plan.findFirst({ where: (p, { eq }) => eq(p.id, code.planId), columns: { name: true } })
      return ok({ planName: plan?.name ?? 'INTELRA AI LAB' }, 'Acesso ativado!')
    })
  } catch (error) {
    if (error instanceof TransactionRollbackError) return fail('Você já utilizou este código.')
    return handleActionError(error)
  }
}
