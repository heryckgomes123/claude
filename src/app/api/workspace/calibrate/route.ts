import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { authedRoute, readJson } from "@/lib/server/http";
import { calibrationSchema, CREATOR_ROLES } from "@/lib/settings-schema";
import { createEntity } from "@/lib/server/repo";
import { newId } from "@/lib/id";

/**
 * First-run calibration. Saves the user's answers and sets up the workspace
 * using ONLY what the user told us (no fake sample data).
 */
export const POST = authedRoute(async (req, { auth }) => {
  const { habits, ...answers } = calibrationSchema.parse(await readJson(req));
  const creatorMode =
    answers.creatorMode ?? (CREATOR_ROLES.has(answers.role) || answers.focus.includes("content") || answers.focus.includes("all"));
  const settings = { ...auth.workspace.settings, ...answers, creatorMode, calibratedAt: new Date().toISOString() };
  const db = await getDb();
  // Atomically claim the first calibration so starter items are never seeded twice.
  const claimed = await db
    .update(schema.workspaces)
    .set({ settings, name: `${answers.displayName} · AIVA` })
    .where(and(eq(schema.workspaces.id, auth.workspace.id), sql`${schema.workspaces.settings}->>'calibratedAt' IS NULL`))
    .returning({ id: schema.workspaces.id });
  const firstTime = claimed.length > 0;
  if (!firstTime) {
    await db
      .update(schema.workspaces)
      .set({ settings: { ...settings, calibratedAt: auth.workspace.settings.calibratedAt ?? settings.calibratedAt }, name: `${answers.displayName} · AIVA` })
      .where(eq(schema.workspaces.id, auth.workspace.id));
  }
  if (answers.displayName) await db.update(schema.users).set({ name: answers.displayName }).where(eq(schema.users.id, auth.user.id));

  if (firstTime) {
    const ctx = { ...auth, workspace: { ...auth.workspace, settings } };
    if (answers.mainFocus) {
      await createEntity(ctx, "goals", {
        title: answers.mainFocus,
        horizon: "month",
        category: creatorMode && answers.focus.includes("content") ? "content" : answers.focus.includes("work") || answers.focus.includes("clients") ? "work" : "personal",
      });
    }
    if (creatorMode && answers.postsPerWeek) {
      await createEntity(ctx, "goals", { title: `Publicar ${answers.postsPerWeek} conteúdos por semana`, horizon: "week", category: "content", target: answers.postsPerWeek, unit: "conteúdos" });
    }
    for (const title of habits) await createEntity(ctx, "habits", { title, timeOfDay: "any" });
    const steps = [
      "Capture 3 coisas que estão na sua cabeça (botão +)",
      "Fale com a AIVA pelo botão de voz",
      "Adicione o AIVA à tela inicial do celular",
      ...(creatorMode ? ["Salve sua primeira ideia no Idea Vault"] : []),
      ...(answers.focus.includes("clients") || answers.focus.includes("all") ? ["Cadastre seu primeiro cliente"] : []),
    ];
    await createEntity(ctx, "tasks", {
      title: "Primeiros passos com a AIVA",
      status: "todo",
      priority: "medium",
      category: "AIVA",
      dueAt: new Date(),
      checklist: steps.map((text) => ({ id: newId(), text, done: false })),
    });
  }
  return { settings };
});
