import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { CASH_OUTFLOW_TYPES, type CashTransactionType, type PaymentMethod } from "@/config/domain";
import { db, type DbOrTx } from "@/db";
import { cashRegisters, cashTransactions, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertCan, type SessionUser } from "@/lib/auth/session";
import { ConflictError, ValidationError } from "@/lib/errors";
import type { cashTransactionInput, closeCashInput, openCashInput } from "@/schemas/cash";

export type CashSummary = {
  openingBalanceCents: number;
  incomeCents: number;
  expenseCents: number;
  withdrawalCents: number;
  depositCents: number;
  /** Entradas por forma de pagamento (conferência de Pix/cartão). */
  incomeByMethod: Partial<Record<PaymentMethod, number>>;
  /** Saldo esperado em DINHEIRO na gaveta. */
  expectedCashCents: number;
};

type TxRow = { type: CashTransactionType; method: PaymentMethod; amountCents: number };

/**
 * Saldo esperado (gaveta) = saldo inicial + entradas em dinheiro + suprimentos
 *                         − saídas em dinheiro − sangrias.
 */
export function summarize(openingBalanceCents: number, rows: TxRow[]): CashSummary {
  const summary: CashSummary = {
    openingBalanceCents,
    incomeCents: 0,
    expenseCents: 0,
    withdrawalCents: 0,
    depositCents: 0,
    incomeByMethod: {},
    expectedCashCents: openingBalanceCents,
  };
  for (const r of rows) {
    if (r.type === "INCOME") {
      summary.incomeCents += r.amountCents;
      summary.incomeByMethod[r.method] = (summary.incomeByMethod[r.method] ?? 0) + r.amountCents;
      if (r.method === "CASH") summary.expectedCashCents += r.amountCents;
    } else if (r.type === "EXPENSE") {
      summary.expenseCents += r.amountCents;
      if (r.method === "CASH") summary.expectedCashCents -= r.amountCents;
    } else if (r.type === "WITHDRAWAL") {
      summary.withdrawalCents += r.amountCents;
      summary.expectedCashCents -= r.amountCents;
    } else if (r.type === "DEPOSIT") {
      summary.depositCents += r.amountCents;
      summary.expectedCashCents += r.amountCents;
    }
  }
  return summary;
}

async function registerSummary(executor: DbOrTx, registerId: string, openingBalanceCents: number) {
  const rows = await executor
    .select({ type: cashTransactions.type, method: cashTransactions.method, amountCents: cashTransactions.amountCents })
    .from(cashTransactions)
    .where(eq(cashTransactions.cashRegisterId, registerId));
  return summarize(openingBalanceCents, rows);
}

export async function getOpenRegisterStatus() {
  const [row] = await db
    .select({ id: cashRegisters.id, openedAt: cashRegisters.openedAt })
    .from(cashRegisters)
    .where(eq(cashRegisters.status, "OPEN"))
    .limit(1);
  return row ?? null;
}

export async function getCurrentCash(actor: SessionUser) {
  assertCan(actor, "cash.view");
  const [register] = await db
    .select({
      id: cashRegisters.id,
      openedAt: cashRegisters.openedAt,
      openingBalanceCents: cashRegisters.openingBalanceCents,
      openedByName: users.name,
      notes: cashRegisters.notes,
    })
    .from(cashRegisters)
    .leftJoin(users, eq(users.id, cashRegisters.openedById))
    .where(eq(cashRegisters.status, "OPEN"))
    .limit(1);
  if (!register) return null;

  const [summary, transactions] = await Promise.all([
    registerSummary(db, register.id, register.openingBalanceCents),
    db
      .select({
        id: cashTransactions.id,
        type: cashTransactions.type,
        method: cashTransactions.method,
        amountCents: cashTransactions.amountCents,
        description: cashTransactions.description,
        paymentId: cashTransactions.paymentId,
        createdAt: cashTransactions.createdAt,
        createdByName: users.name,
      })
      .from(cashTransactions)
      .leftJoin(users, eq(users.id, cashTransactions.createdById))
      .where(eq(cashTransactions.cashRegisterId, register.id))
      .orderBy(desc(cashTransactions.createdAt)),
  ]);
  return { register, summary, transactions };
}

export async function listClosedRegisters(actor: SessionUser, limit = 15) {
  assertCan(actor, "cash.view");
  return db
    .select({
      id: cashRegisters.id,
      openedAt: cashRegisters.openedAt,
      closedAt: cashRegisters.closedAt,
      openingBalanceCents: cashRegisters.openingBalanceCents,
      expectedBalanceCents: cashRegisters.expectedBalanceCents,
      countedBalanceCents: cashRegisters.countedBalanceCents,
      differenceCents: cashRegisters.differenceCents,
      closedByName: users.name,
      incomeCents: sql<number>`(select coalesce(sum(amount_cents),0)::int from ${cashTransactions} where cash_register_id = ${cashRegisters.id} and type = 'INCOME')`,
    })
    .from(cashRegisters)
    .leftJoin(users, eq(users.id, cashRegisters.closedById))
    .where(eq(cashRegisters.status, "CLOSED"))
    .orderBy(desc(cashRegisters.closedAt))
    .limit(limit);
}

export async function openCashRegister(actor: SessionUser, input: z.output<typeof openCashInput>) {
  assertCan(actor, "cash.manage");
  return db.transaction(async (tx) => {
    const [open] = await tx.select({ id: cashRegisters.id }).from(cashRegisters).where(eq(cashRegisters.status, "OPEN")).limit(1);
    if (open) throw new ConflictError("Já existe um caixa aberto.");
    const [created] = await tx
      .insert(cashRegisters)
      .values({ openingBalanceCents: input.openingBalanceCents, openedById: actor.id, notes: input.notes })
      .returning({ id: cashRegisters.id });
    await audit(
      {
        userId: actor.id,
        action: "cash_open",
        entity: "cash_register",
        entityId: created.id,
        metadata: { openingBalanceCents: input.openingBalanceCents },
      },
      tx,
    );
    return created;
  });
}

export async function addCashTransaction(actor: SessionUser, input: z.output<typeof cashTransactionInput>) {
  assertCan(actor, "cash.manage");
  return db.transaction(async (tx) => {
    const [register] = await tx
      .select({ id: cashRegisters.id, openingBalanceCents: cashRegisters.openingBalanceCents })
      .from(cashRegisters)
      .where(eq(cashRegisters.status, "OPEN"))
      .for("update")
      .limit(1);
    if (!register) throw new ValidationError("Abra o caixa antes de lançar movimentações.");

    // Sangria e suprimento são sempre em dinheiro (gaveta).
    const method: PaymentMethod = input.type === "WITHDRAWAL" || input.type === "DEPOSIT" ? "CASH" : input.method;

    if (CASH_OUTFLOW_TYPES.includes(input.type) && method === "CASH") {
      const summary = await registerSummary(tx, register.id, register.openingBalanceCents);
      if (input.amountCents > summary.expectedCashCents) {
        throw new ValidationError("Valor maior que o saldo em dinheiro disponível no caixa.");
      }
    }

    const [created] = await tx
      .insert(cashTransactions)
      .values({
        cashRegisterId: register.id,
        type: input.type,
        method,
        amountCents: input.amountCents,
        description: input.description,
        createdById: actor.id,
      })
      .returning({ id: cashTransactions.id });
    await audit(
      {
        userId: actor.id,
        action: "cash_transaction",
        entity: "cash_transaction",
        entityId: created.id,
        metadata: { type: input.type, amountCents: input.amountCents },
      },
      tx,
    );
    return created;
  });
}

export async function closeCashRegister(actor: SessionUser, input: z.output<typeof closeCashInput>) {
  assertCan(actor, "cash.manage");
  return db.transaction(async (tx) => {
    const [register] = await tx
      .select()
      .from(cashRegisters)
      .where(and(eq(cashRegisters.status, "OPEN")))
      .for("update")
      .limit(1);
    if (!register) throw new ValidationError("Não há caixa aberto.");
    const summary = await registerSummary(tx, register.id, register.openingBalanceCents);
    const difference = input.countedBalanceCents - summary.expectedCashCents;
    await tx
      .update(cashRegisters)
      .set({
        status: "CLOSED",
        closedAt: new Date(),
        closedById: actor.id,
        expectedBalanceCents: summary.expectedCashCents,
        countedBalanceCents: input.countedBalanceCents,
        differenceCents: difference,
        notes: input.notes ?? register.notes,
      })
      .where(eq(cashRegisters.id, register.id));
    await audit(
      {
        userId: actor.id,
        action: "cash_close",
        entity: "cash_register",
        entityId: register.id,
        metadata: { expected: summary.expectedCashCents, counted: input.countedBalanceCents, difference },
      },
      tx,
    );
    return { expectedCents: summary.expectedCashCents, countedCents: input.countedBalanceCents, differenceCents: difference };
  });
}
