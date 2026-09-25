"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { id } from "@/schemas/common";
import { markCommissionsPaid } from "@/services/commissions";

export const markCommissionsPaidAction = createAction(
  { permission: "commissions.manage", schema: z.object({ commissionIds: z.array(id).min(1).max(500) }) },
  async ({ commissionIds }, actor) => {
    const result = await markCommissionsPaid(actor, commissionIds);
    revalidatePath("/painel/comissoes");
    return result;
  },
);
