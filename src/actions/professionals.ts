"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { id } from "@/schemas/common";
import { professionalInput } from "@/schemas/professional";
import { saveProfessional, setProfessionalActive } from "@/services/professionals";

export const saveProfessionalAction = createAction(
  { permission: "professionals.manage", schema: professionalInput.extend({ professionalId: id.nullable() }) },
  async ({ professionalId, ...input }, actor) => {
    const result = await saveProfessional(actor, professionalId, input);
    revalidatePath("/painel/profissionais");
    revalidatePath("/painel/servicos");
    revalidatePath("/painel/agenda");
    return result;
  },
);

export const setProfessionalActiveAction = createAction(
  { permission: "professionals.manage", schema: z.object({ professionalId: id, isActive: z.boolean() }) },
  async ({ professionalId, isActive }, actor) => {
    await setProfessionalActive(actor, professionalId, isActive);
    revalidatePath("/painel/profissionais");
    return null;
  },
);
