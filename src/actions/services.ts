"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { id } from "@/schemas/common";
import { serviceInput } from "@/schemas/service";
import { saveService, setServiceActive } from "@/services/catalog";

export const saveServiceAction = createAction(
  { permission: ["services.create", "services.edit"], schema: serviceInput.extend({ serviceId: id.nullable() }) },
  async ({ serviceId, ...input }, actor) => {
    const result = await saveService(actor, serviceId, input);
    revalidatePath("/painel/servicos");
    revalidatePath("/painel/profissionais");
    return result;
  },
);

export const setServiceActiveAction = createAction(
  { permission: "services.edit", schema: z.object({ serviceId: id, isActive: z.boolean() }) },
  async ({ serviceId, isActive }, actor) => {
    await setServiceActive(actor, serviceId, isActive);
    revalidatePath("/painel/servicos");
    return null;
  },
);
