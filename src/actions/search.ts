"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { globalSearch } from "@/services/search";

export const globalSearchAction = createAction({ schema: z.object({ q: z.string().max(100) }) }, async ({ q }, actor) =>
  globalSearch(actor, q),
);
