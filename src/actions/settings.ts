"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { businessHoursInput, companyInput, userCreateInput, userUpdateInput } from "@/schemas/settings";
import { updateBusinessHours, updateCompany } from "@/services/settings";
import { createUser, updateUser } from "@/services/users";

export const updateCompanyAction = createAction({ permission: "settings.company", schema: companyInput }, async (input, actor) => {
  await updateCompany(actor, input);
  revalidatePath("/painel", "layout");
  return null;
});

export const updateBusinessHoursAction = createAction(
  { permission: "settings.schedule", schema: businessHoursInput },
  async (input, actor) => {
    await updateBusinessHours(actor, input);
    revalidatePath("/painel", "layout");
    return null;
  },
);

export const createUserAction = createAction({ permission: "users.manage", schema: userCreateInput }, async (input, actor) => {
  const result = await createUser(actor, input);
  revalidatePath("/painel/configuracoes");
  return result;
});

export const updateUserAction = createAction({ permission: "users.manage", schema: userUpdateInput }, async (input, actor) => {
  await updateUser(actor, input);
  revalidatePath("/painel/configuracoes");
  return null;
});
