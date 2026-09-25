"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { id } from "@/schemas/common";
import { movementInput, productInput } from "@/schemas/inventory";
import { registerMovement, saveProduct, setProductActive } from "@/services/inventory";

export const saveProductAction = createAction(
  { permission: "inventory.manage", schema: productInput.extend({ productId: id.nullable() }) },
  async ({ productId, ...input }, actor) => {
    const result = await saveProduct(actor, productId, input);
    revalidatePath("/painel/estoque");
    return result;
  },
);

export const setProductActiveAction = createAction(
  { permission: "inventory.manage", schema: z.object({ productId: id, isActive: z.boolean() }) },
  async ({ productId, isActive }, actor) => {
    await setProductActive(actor, productId, isActive);
    revalidatePath("/painel/estoque");
    return null;
  },
);

export const inventoryMovementAction = createAction({ permission: "inventory.manage", schema: movementInput }, async (input, actor) => {
  const result = await registerMovement(actor, input);
  revalidatePath("/painel", "layout");
  return result;
});
