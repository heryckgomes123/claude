import { z } from "zod";
import { CASH_TRANSACTION_TYPES, PAYMENT_METHODS } from "@/config/domain";
import { cents, optionalText, positiveCents } from "./common";

export const openCashInput = z.object({ openingBalanceCents: cents, notes: optionalText(300) });

export const cashTransactionInput = z.object({
  type: z.enum(CASH_TRANSACTION_TYPES),
  amountCents: positiveCents,
  method: z.enum(PAYMENT_METHODS).default("CASH"),
  description: z.string().trim().min(2, { error: "Descreva a movimentação." }).max(200),
});

export const closeCashInput = z.object({ countedBalanceCents: cents, notes: optionalText(500) });
