"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { cashTransactionInput, closeCashInput, openCashInput } from "@/schemas/cash";
import { addCashTransaction, closeCashRegister, openCashRegister } from "@/services/cash";

function refresh() {
  revalidatePath("/painel", "layout");
}

export const openCashAction = createAction({ permission: "cash.manage", schema: openCashInput }, async (input, actor) => {
  const result = await openCashRegister(actor, input);
  refresh();
  return result;
});

export const cashTransactionAction = createAction({ permission: "cash.manage", schema: cashTransactionInput }, async (input, actor) => {
  const result = await addCashTransaction(actor, input);
  refresh();
  return result;
});

export const closeCashAction = createAction({ permission: "cash.manage", schema: closeCashInput }, async (input, actor) => {
  const result = await closeCashRegister(actor, input);
  refresh();
  return result;
});
