"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { clientInput } from "@/schemas/client";
import { id } from "@/schemas/common";
import { createClient, quickSearchClients, setClientActive, updateClient } from "@/services/clients";

export const createClientAction = createAction({ permission: "clients.create", schema: clientInput }, async (input, actor) => {
  const created = await createClient(actor, input);
  revalidatePath("/painel/clientes");
  return created;
});

export const updateClientAction = createAction(
  { permission: "clients.edit", schema: clientInput.extend({ clientId: id }) },
  async ({ clientId, ...input }, actor) => {
    await updateClient(actor, clientId, input);
    revalidatePath("/painel/clientes");
    revalidatePath(`/painel/clientes/${clientId}`);
    return { id: clientId };
  },
);

export const setClientActiveAction = createAction(
  { permission: "clients.deactivate", schema: z.object({ clientId: id, isActive: z.boolean() }) },
  async ({ clientId, isActive }, actor) => {
    await setClientActive(actor, clientId, isActive);
    revalidatePath("/painel/clientes");
    revalidatePath(`/painel/clientes/${clientId}`);
    return null;
  },
);

export const searchClientsAction = createAction(
  { permission: "clients.view", schema: z.object({ q: z.string().max(100) }) },
  async ({ q }, actor) => quickSearchClients(actor, q, 8),
);
