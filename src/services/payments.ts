import "server-only";
import { asc, eq } from "drizzle-orm";
import type { z } from "zod";
import { PAYMENT_METHOD_LABELS } from "@/config/domain";
import { db } from "@/db";
import { appointments, attendanceItems, attendances, cashRegisters, cashTransactions, clients, commissions, payments } from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertCan, type SessionUser } from "@/lib/auth/session";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { paymentInput } from "@/schemas/attendance";
import { calculateCommissions } from "./commissions-calc";

/**
 * Registra o pagamento de um atendimento finalizado, em UMA transação:
 *   pagamento → comissões → movimentação de caixa → status final.
 * Valores são sempre recalculados a partir do banco; o cliente envia apenas a forma de pagamento.
 */
export async function registerPayment(actor: SessionUser, input: z.output<typeof paymentInput>) {
  assertCan(actor, "payments.create");

  return db.transaction(async (tx) => {
    const [att] = await tx.select().from(attendances).where(eq(attendances.id, input.attendanceId)).for("update").limit(1);
    if (!att) throw new NotFoundError("Atendimento não encontrado.");
    if (att.status === "PAID") throw new ConflictError("Este atendimento já foi pago.");
    if (att.status !== "AWAITING_PAYMENT") throw new ValidationError("Finalize o atendimento antes de registrar o pagamento.");

    const [register] = await tx
      .select({ id: cashRegisters.id })
      .from(cashRegisters)
      .where(eq(cashRegisters.status, "OPEN"))
      .for("update")
      .limit(1);
    if (!register) throw new ValidationError("O caixa está fechado. Abra o caixa para registrar pagamentos.");

    const items = await tx
      .select()
      .from(attendanceItems)
      .where(eq(attendanceItems.attendanceId, att.id))
      .orderBy(asc(attendanceItems.createdAt));
    if (items.length === 0) throw new ValidationError("Atendimento sem serviços.");

    const gross = items.reduce((sum, i) => sum + i.totalCents, 0);
    const discount = Math.min(att.discountCents, gross);
    const amount = gross - discount;
    if (amount < 0) throw new ValidationError("Valor final inválido.");

    const [client] = await tx.select({ name: clients.name }).from(clients).where(eq(clients.id, att.clientId));
    const paidAt = new Date();

    const [payment] = await tx
      .insert(payments)
      .values({
        attendanceId: att.id,
        clientId: att.clientId,
        cashRegisterId: register.id,
        grossCents: gross,
        discountCents: discount,
        amountCents: amount,
        method: input.method,
        installments: input.method === "CREDIT_INSTALLMENTS" ? input.installments : 1,
        paidAt,
        receivedById: actor.id,
      })
      .returning({ id: payments.id });

    // Comissões: calculadas uma única vez, no pagamento, e gravadas (nunca recalculadas automaticamente).
    const calculated = calculateCommissions(
      items.map((i) => ({ id: i.id, totalCents: i.totalCents, commissionRate: i.commissionRate })),
      discount,
    );
    for (const c of calculated) {
      const item = items.find((i) => i.id === c.itemId)!;
      await tx
        .update(attendanceItems)
        .set({ discountShareCents: c.discountShareCents, netCents: c.baseCents })
        .where(eq(attendanceItems.id, item.id));
      await tx.insert(commissions).values({
        attendanceId: att.id,
        attendanceItemId: item.id,
        paymentId: payment.id,
        professionalId: item.professionalId,
        serviceId: item.serviceId,
        baseCents: c.baseCents,
        rate: c.rate,
        amountCents: c.amountCents,
      });
    }

    if (amount > 0) {
      await tx.insert(cashTransactions).values({
        cashRegisterId: register.id,
        type: "INCOME",
        method: input.method,
        amountCents: amount,
        description: `Atendimento — ${client?.name ?? "Cliente"} (${PAYMENT_METHOD_LABELS[input.method]})`,
        paymentId: payment.id,
        createdById: actor.id,
      });
    }

    await tx
      .update(attendances)
      .set({ status: "PAID", finishedAt: att.finishedAt ?? paidAt, subtotalCents: gross, discountCents: discount, totalCents: amount })
      .where(eq(attendances.id, att.id));
    await tx.update(appointments).set({ status: "COMPLETED" }).where(eq(appointments.id, att.appointmentId));

    await audit(
      {
        userId: actor.id,
        action: "payment",
        entity: "payment",
        entityId: payment.id,
        metadata: { attendanceId: att.id, amountCents: amount, method: input.method },
      },
      tx,
    );

    return { paymentId: payment.id, amountCents: amount, commissionCents: calculated.reduce((s, c) => s + c.amountCents, 0) };
  });
}
